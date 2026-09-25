import { Router } from 'express';
import { auditAccessMiddleware } from '../../../lib/security/auditLog.middleware.js';
import { container } from '../../../shared/di/container.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import type { LeadDedupController } from '../presentation/LeadDedupController.js';

const router = Router();
// Mesma restrição de export/import em massa (lead.routes.ts) — operação sobre a base inteira do
// tenant, não sobre um lead específico.
const managementRoles = requireRole(['ADMIN', 'GESTOR']);

router.get('/preview', managementRoles, (req, res, next) =>
  container.resolve<LeadDedupController>('LeadDedupController').preview(req, res, next),
);

// merge é destrutivo (soft-delete de leads duplicados + reatribuição de ~20 relações) — auditado
// como EXPORT/import em massa acima.
router.post('/merge', managementRoles, auditAccessMiddleware('Lead'), (req, res, next) =>
  container.resolve<LeadDedupController>('LeadDedupController').merge(req, res, next),
);

export const leadDedupRoutes = router;
