import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { routeParam } from '../../../shared/http/routeParams.js';
import {
  listJobRoles,
  getJobRoleById,
  getJobRoleAssignmentMatrix,
  assignJobRole,
  deactivateUserJobRole,
  JobRoleServiceError,
} from '../services/jobRole.service.js';
import { listAgentsForJobRole } from '../services/agentCatalog.service.js';
import { listCapabilitiesForJobRole } from '../services/capability.service.js';

const router = Router();

// Catálogo de cargos é leitura livre para qualquer usuário autenticado da organização (mesmo
// tratamento de MODULE_CATALOG/COMMERCIAL_AGENT_REGISTRY — metadado de produto, não dado sensível
// de tenant) — precisa vir antes do requireRole(['ADMIN']) abaixo, que só protege a gestão de
// atribuição de cargo.
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const jobRoles = await listJobRoles({ activeOnly });
    res.json({ success: true, data: { jobRoles } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const jobRole = await getJobRoleById(routeParam(req.params.id, 'id'));
    if (!jobRole) {
      res.status(404).json({ success: false, error: 'Cargo não encontrado.' });
      return;
    }
    res.json({ success: true, data: { jobRole } });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/:id/agents',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jobRoleId = routeParam(req.params.id, 'id');
      const jobRole = await getJobRoleById(jobRoleId);
      if (!jobRole) {
        res.status(404).json({ success: false, error: 'Cargo não encontrado.' });
        return;
      }
      const agents = await listAgentsForJobRole(jobRoleId);
      res.json({ success: true, data: { jobRole, agents } });
    } catch (error) {
      next(error);
    }
  },
);

// PROMPT 3 — Capability & Permission Engine: "que capabilities este cargo pode permitir?"
// (RoleCapabilityGrant) — mesma leitura livre das rotas de catálogo acima.
router.get(
  '/:id/capabilities',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jobRoleId = routeParam(req.params.id, 'id');
      const jobRole = await getJobRoleById(jobRoleId);
      if (!jobRole) {
        res.status(404).json({ success: false, error: 'Cargo não encontrado.' });
        return;
      }
      const capabilities = await listCapabilitiesForJobRole(jobRoleId);
      res.json({ success: true, data: { jobRole, capabilities } });
    } catch (error) {
      next(error);
    }
  },
);

// A partir daqui: gestão de atribuição de cargo — mesmo nível de restrição de team.routes.ts
// (só ADMIN cria/altera; leitura de catálogo acima é livre para o próprio usuário se orientar).
router.use(requireRole(['ADMIN']));

router.get(
  '/assignments/matrix',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await getJobRoleAssignmentMatrix((req as AuthRequest).user.organizationId);
      res.json({ success: true, data: { users } });
    } catch (error) {
      next(error);
    }
  },
);

const assignJobRoleSchema = z.object({
  userId: z.string().trim().min(1, 'userId é obrigatório.'),
  jobRoleId: z.string().trim().min(1, 'jobRoleId é obrigatório.'),
  isPrimary: z.boolean().optional(),
});

router.post(
  '/assignments',
  validateRequest(assignJobRoleSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { userId, jobRoleId, isPrimary } = req.body as z.infer<typeof assignJobRoleSchema>;
      const assignment = await assignJobRole({
        organizationId: authReq.user.organizationId,
        userId,
        jobRoleId,
        isPrimary,
        assignedBy: authReq.user.id,
      });
      res.status(201).json({ success: true, data: { assignment } });
    } catch (error) {
      if (error instanceof JobRoleServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  },
);

router.delete(
  '/assignments/:userId/:jobRoleId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      await deactivateUserJobRole({
        organizationId: authReq.user.organizationId,
        userId: routeParam(req.params.userId, 'userId'),
        jobRoleId: routeParam(req.params.jobRoleId, 'jobRoleId'),
        actorId: authReq.user.id,
      });
      res.json({ success: true });
    } catch (error) {
      if (error instanceof JobRoleServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  },
);

export const jobRoleRoutes = router;
