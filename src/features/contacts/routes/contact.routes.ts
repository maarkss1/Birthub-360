import { Router } from 'express';
import { auditAccessMiddleware } from '../../../lib/security/auditLog.middleware.js';
import { contactSchema } from '../../../lib/zod.js';
import { container } from '../../../shared/di/container.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import type { ContactController } from '../presentation/ContactController.js';

const router = Router();
const writeRoles = requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']);

router.get('/', (req, res, next) =>
  container.resolve<ContactController>('ContactController').getContacts(req, res, next),
);

router.get('/:id', (req, res, next) =>
  container.resolve<ContactController>('ContactController').getContactById(req, res, next),
);

router.post('/', writeRoles, validateRequest(contactSchema), (req, res, next) =>
  container.resolve<ContactController>('ContactController').createContact(req, res, next),
);

router.put('/:id', writeRoles, validateRequest(contactSchema.partial()), (req, res, next) =>
  container.resolve<ContactController>('ContactController').updateContact(req, res, next),
);

// Apenas ADMIN e GESTOR podem deletar contatos. Trilha de auditoria (handoff
// roadmap-v2-transversais/15-para-00-auditaccessmiddleware-nao-utilizado.md) — mesmo padrão já
// usado no merge de duplicadas (leadDedup.routes.ts) e no delete de Lead/Company acima.
router.delete('/:id', requireRole(['ADMIN', 'GESTOR']), auditAccessMiddleware('Contact'), (req, res, next) =>
  container.resolve<ContactController>('ContactController').deleteContact(req, res, next),
);

// Enriquece a empresa vinculada ao contato com IA (Receita Federal + Google Negócios + Apollo).
router.post('/:id/enrich', writeRoles, (req, res, next) =>
  container.resolve<ContactController>('ContactController').enrichContact(req, res, next),
);

export const contactRoutes = router;
