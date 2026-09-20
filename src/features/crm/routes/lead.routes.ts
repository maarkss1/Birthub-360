import { Router } from 'express';
import { auditAccessMiddleware } from '../../../lib/security/auditLog.middleware.js';
import { leadSchema } from '../../../lib/zod.js';
import { container } from '../../../shared/di/container.js';
import { requireLeadOwnership } from '../../../shared/middlewares/requireLeadOwnership.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import type { LeadController } from '../presentation/LeadController.js';

const router = Router();
const managementRoles = requireRole(['ADMIN', 'GESTOR']);
const writeRoles = requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']);
// CLOSER/SDR só edita/exclui/reenriquece leads que ele mesmo capturou — GESTOR/ADMIN continuam sem
// restrição (ver requireLeadOwnership.ts).
const ownLeadOnly = requireLeadOwnership();

router.get('/', (req, res, next) =>
  container.resolve<LeadController>('LeadController').getLeads(req, res, next),
);
// Export/import em massa é sensível (LGPD) — restrito a ADMIN/GESTOR. Dump completo de dados de
// lead (nome/telefone/e-mail) do tenant não tinha nenhuma trilha de auditoria (achado do handoff
// roadmap-v2-transversais/15-para-00-auditaccessmiddleware-nao-utilizado.md) — auditAccessMiddleware
// grava AuditLog com action:'EXPORT' para toda resposta 2xx desta rota.
router.get('/export/csv', managementRoles, auditAccessMiddleware('Lead'), (req, res, next) =>
  container.resolve<LeadController>('LeadController').exportCsv(req, res, next),
);
// Mesmo dump sensível (LGPD) de /export/csv acima, só que direto para o Bitrix24 — mesma trilha
// de auditoria (handoff roadmap-v2-transversais/15-para-00-auditaccessmiddleware-nao-utilizado.md).
router.post('/export/bitrix24', managementRoles, auditAccessMiddleware('Lead'), (req, res, next) =>
  container.resolve<LeadController>('LeadController').exportToBitrix24(req, res, next),
);
router.post('/import/bitrix24', managementRoles, (req, res, next) =>
  container.resolve<LeadController>('LeadController').importFromBitrix24(req, res, next),
);
router.post('/enrich-batch', managementRoles, (req, res, next) =>
  container.resolve<LeadController>('LeadController').enrichBatch(req, res, next),
);
router.get('/:id', (req, res, next) =>
  container.resolve<LeadController>('LeadController').getLeadById(req, res, next),
);
router.post('/batch-update', writeRoles, (req, res, next) =>
  container.resolve<LeadController>('LeadController').batchUpdate(req, res, next),
);
router.post('/', writeRoles, validateRequest(leadSchema), (req, res, next) =>
  container.resolve<LeadController>('LeadController').createLead(req, res, next),
);
router.put(
  '/:id',
  writeRoles,
  ownLeadOnly,
  validateRequest(leadSchema.partial()),
  (req, res, next) =>
    container.resolve<LeadController>('LeadController').updateLead(req, res, next),
);

// Apenas ADMIN e GESTOR podem deletar leads (restrição pré-existente, não afetada pela posse do
// lead — excluir é mais sensível do que editar, mantido restrito à gestão). Trilha de auditoria
// (handoff roadmap-v2-transversais/15-para-00-auditaccessmiddleware-nao-utilizado.md) — exclusão
// é a mutação mais irreversível deste router, mesmo padrão já usado no merge (leadDedup.routes.ts).
router.delete('/:id', managementRoles, auditAccessMiddleware('Lead'), (req, res, next) =>
  container.resolve<LeadController>('LeadController').deleteLead(req, res, next),
);

// Reenriquece um lead já prospectado
router.post('/:id/enrich', writeRoles, ownLeadOnly, (req, res, next) =>
  container.resolve<LeadController>('LeadController').enrichLead(req, res, next),
);

export const leadRoutes = router;
