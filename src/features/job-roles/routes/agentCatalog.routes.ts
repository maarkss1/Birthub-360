import { Router, type Request, type Response, type NextFunction } from 'express';
import { routeParam } from '../../../shared/http/routeParams.js';
import { listAgentDefinitions, getAgentDefinitionById } from '../services/agentCatalog.service.js';

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

export const agentCatalogRoutes = router;
