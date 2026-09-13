import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { routeParam } from '../../../shared/http/routeParams.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { getAgentDefinitionById, listAgentDefinitions } from '../services/agentCatalog.service.js';
import { runAgentExecution } from '../services/agentRuntime.service.js';
import { listCapabilitiesForAgent } from '../services/capability.service.js';

const router = Router();

// Catálogo de agentes é leitura livre para qualquer usuário autenticado da organização — mesmo
// precedente já estabelecido por `GET /api/agent/commercial-cell` (COMMERCIAL_AGENT_REGISTRY):
// metadado de produto, não dado de organização. Concessão (RoleAgentGrant) fica em
// jobRole.routes.ts (`/api/job-roles/:id/agents`), que sim é administrativa.
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const jobRoleId = typeof req.query.jobRoleId === 'string' ? req.query.jobRoleId : undefined;
    const agents = await listAgentDefinitions({ activeOnly, jobRoleId });
    res.json({ success: true, data: { agents } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agent = await getAgentDefinitionById(routeParam(req.params.id, 'id'));
    if (!agent) {
      res.status(404).json({ success: false, error: 'Agente não encontrado.' });
      return;
    }
    res.json({ success: true, data: { agent } });
  } catch (error) {
    next(error);
  }
});

// PROMPT 3 — Capability & Permission Engine: "que capabilities este agente foi desenhado para
// fazer?" (AgentCapabilityGrant), mesma regra de leitura livre do resto deste router.
router.get(
  '/:id/capabilities',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = routeParam(req.params.id, 'id');
      const agent = await getAgentDefinitionById(agentId);
      if (!agent) {
        res.status(404).json({ success: false, error: 'Agente não encontrado.' });
        return;
      }
      const capabilities = await listCapabilitiesForAgent(agentId);
      res.json({ success: true, data: { agent, capabilities } });
    } catch (error) {
      next(error);
    }
  },
);

// PROMPT 4 — Agent Runtime Genérico: única rota de execução. Identidade/tenant SEMPRE da sessão
// autenticada (`req.user`) — nunca aceitos no body (regra explícita do prompt da onda), mesmo
// padrão de `POST /api/capabilities/check` (PROMPT 3).
const runAgentSchema = z.object({
  requestedCapability: z.string().trim().min(1, 'requestedCapability é obrigatório.'),
  mission: z.string().trim().max(4000).optional(),
  resource: z.record(z.string(), z.unknown()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  correlationId: z.string().trim().max(200).optional(),
});

router.post(
  '/:agentCode/run',
  validateRequest(runAgentSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { requestedCapability, mission, resource, context, correlationId } =
        req.body as z.infer<typeof runAgentSchema>;
      const result = await runAgentExecution({
        actorId: authReq.user.id,
        organizationId: authReq.user.organizationId,
        actorRole: authReq.user.role,
        agentCode: routeParam(req.params.agentCode, 'agentCode'),
        requestedCapability,
        mission,
        resource,
        context,
        correlationId,
      });
      res
        .status(result.status === 'SUCCEEDED' ? 200 : result.status === 'DENIED' ? 403 : 200)
        .json({ success: result.status === 'SUCCEEDED', data: { execution: result } });
    } catch (error) {
      next(error);
    }
  },
);

export const agentCatalogRoutes = router;
