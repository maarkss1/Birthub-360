import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { routeParam } from '../../../shared/http/routeParams.js';
import {
  listCapabilityDefinitions,
  getCapabilityDefinitionByCode,
} from '../services/capability.service.js';
import { authorizeCapability } from '../services/capabilityAuthorization.service.js';

const router = Router();

// Catálogo de capabilities é leitura livre para qualquer usuário autenticado da organização —
// mesmo precedente de `agentCatalog.routes.ts`/`jobRole.routes.ts`: metadado de produto, não dado
// sensível de tenant. A decisão de autorização em si (`POST /check`) é que usa identidade real.
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const capabilities = await listCapabilityDefinitions({ activeOnly });
    res.json({ success: true, data: { capabilities } });
  } catch (error) {
    next(error);
  }
});

const checkCapabilitySchema = z.object({
  agentCode: z.string().trim().min(1, 'agentCode é obrigatório.'),
  capabilityCode: z.string().trim().min(1, 'capabilityCode é obrigatório.'),
  resource: z.record(z.string(), z.unknown()).optional(),
});

// POST /check vem antes de /:code — rota literal sempre precede o parametrizado no Express,
// senão "check" seria interpretado como um `:code` de capability.
router.post(
  '/check',
  validateRequest(checkCapabilitySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { agentCode, capabilityCode, resource } = req.body as z.infer<
        typeof checkCapabilitySchema
      >;
      // Identidade/tenant nunca vêm do body — só do usuário autenticado (mesma regra do PROMPT 4
      // para `POST /api/agents/:agentCode/run`, aplicada aqui adiantada porque este endpoint já
      // decide autorização, mesmo sem executar nada ainda).
      const decision = await authorizeCapability({
        actor: {
          userId: authReq.user.id,
          organizationId: authReq.user.organizationId,
          userRole: authReq.user.role,
        },
        agentCode,
        capabilityCode,
        resource,
      });
      res.json({ success: true, data: { decision } });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/:code', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const capability = await getCapabilityDefinitionByCode(routeParam(req.params.code, 'code'));
    if (!capability) {
      res.status(404).json({ success: false, error: 'Capability não encontrada.' });
      return;
    }
    res.json({ success: true, data: { capability } });
  } catch (error) {
    next(error);
  }
});

export const capabilityRoutes = router;
