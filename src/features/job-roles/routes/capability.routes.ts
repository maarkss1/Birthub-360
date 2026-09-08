import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { routeParam } from '../../../shared/http/routeParams.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { authorizeCapability } from '../services/capabilityAuthorization.service.js';
import {
  getCapabilityDefinitionByCode,
  listCapabilityDefinitions,
} from '../services/capabilityCatalog.service.js';

const router = Router();

// GET /api/capabilities — lista todas as capabilities ativas
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const domain = typeof req.query.domain === 'string' ? req.query.domain : undefined;
    const capabilities = await listCapabilityDefinitions({ activeOnly, domain });
    res.json({ success: true, data: { capabilities } });
  } catch (error) {
    next(error);
  }
});

// GET /api/capabilities/:code — detalhe de uma capability pelo código
router.get('/:code', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const code = routeParam(req.params.code, 'code');
    const capability = await getCapabilityDefinitionByCode(code);
    if (!capability) {
      res.status(404).json({ success: false, error: 'Capability não encontrada.' });
      return;
    }
    res.json({ success: true, data: { capability } });
  } catch (error) {
    next(error);
  }
});

// POST /api/capabilities/check — checagem de autorização estritamente para o usuário logado
const checkCapabilitySchema = z.object({
  agentId: z.string().trim().min(1, 'agentId é obrigatório.'),
  capabilityCode: z.string().trim().min(1, 'capabilityCode é obrigatório.'),
  resource: z
    .object({
      type: z.string().trim().min(1),
      id: z.string().trim().min(1),
    })
    .optional(),
});

router.post(
  '/check',
  validateRequest(checkCapabilitySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { agentId, capabilityCode, resource } = req.body as z.infer<
        typeof checkCapabilitySchema
      >;

      const decision = await authorizeCapability({
        actor: {
          id: authReq.user.id,
          organizationId: authReq.user.organizationId,
          role: authReq.user.role,
        },
        agentId,
        capabilityCode,
        resource,
      });

      res.json({ success: true, data: { decision } });
    } catch (error) {
      next(error);
    }
  },
);

export const capabilityRoutes = router;
