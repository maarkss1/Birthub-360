import { Router } from 'express';
import { auditAccessMiddleware } from '../../../lib/security/auditLog.middleware';
import { container } from '../../../shared/di/container';
import { requireRole } from '../../../shared/middlewares/requireRole';
import type { CompanyDedupController } from '../presentation/CompanyDedupController';

const router = Router();
// Mesma restrição de leadDedup.routes.ts — operação sobre a base inteira do tenant.
const managementRoles = requireRole(['ADMIN', 'GESTOR']);

router.get('/preview', managementRoles, (req, res, next) =>
  container.resolve<CompanyDedupController>('CompanyDedupController').preview(req, res, next),
);

// merge é destrutivo (soft-delete de empresas duplicadas + reatribuição de Contact/Lead/Note/
// Attachment/EnrichmentLog/CrmCommercialDocument/CopilotoConversation + limpeza da cadeia de
// Account Intelligence) — auditado como o merge de leads.
router.post('/merge', managementRoles, auditAccessMiddleware('Company'), (req, res, next) =>
  container.resolve<CompanyDedupController>('CompanyDedupController').merge(req, res, next),
);

export const companyDedupRoutes = router;
