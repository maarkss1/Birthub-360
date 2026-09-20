import { Router } from 'express';
import { auditAccessMiddleware } from '../../../lib/security/auditLog.middleware.js';
import { companySchema } from '../../../lib/zod.js';
import { container } from '../../../shared/di/container';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import type { CompanyController } from '../presentation/CompanyController';

const router = Router();
const writeRoles = requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']);

router.get('/', (req, res, next) =>
  container.resolve<CompanyController>('CompanyController').getCompanies(req, res, next),
);

router.get('/:id', (req, res, next) =>
  container.resolve<CompanyController>('CompanyController').getCompanyById(req, res, next),
);
router.post('/', writeRoles, validateRequest(companySchema), (req, res, next) =>
  container.resolve<CompanyController>('CompanyController').createCompany(req, res, next),
);
router.put('/:id', writeRoles, validateRequest(companySchema.partial()), (req, res, next) =>
  container.resolve<CompanyController>('CompanyController').updateCompany(req, res, next),
);

// Apenas ADMIN e GESTOR podem deletar empresas. Trilha de auditoria (handoff
// roadmap-v2-transversais/15-para-00-auditaccessmiddleware-nao-utilizado.md) — mesmo padrão já
// usado no merge de duplicadas (companyDedup.routes.ts).
router.delete('/:id', requireRole(['ADMIN', 'GESTOR']), auditAccessMiddleware('Company'), (req, res, next) =>
  container.resolve<CompanyController>('CompanyController').deleteCompany(req, res, next),
);

// Re-enriquece uma empresa já existente no CRM (Receita Federal + heurísticas de domínio/e-mail).
router.post('/:id/enrich', writeRoles, (req, res, next) =>
  container.resolve<CompanyController>('CompanyController').enrichCompany(req, res, next),
);

export const companyRoutes = router;
