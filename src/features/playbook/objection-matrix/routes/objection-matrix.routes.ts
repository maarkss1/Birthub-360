import { Router } from 'express';
import { container } from '../../../../shared/di/container';
import { requireRole } from '../../../../shared/middlewares/requireRole';
import { validateRequest } from '../../../../shared/middlewares/validateRequest';
import { objectionMatrixItemSchema } from '../../playbook.schema';
import type { ObjectionMatrixController } from '../presentation/ObjectionMatrixController';

const router = Router();
const writeRoles = requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']);

router.get('/', (req, res, next) =>
  container.resolve<ObjectionMatrixController>('ObjectionMatrixController').list(req, res, next),
);

// Caminho literal antes de qualquer rota com :id no mesmo router (mesmo cuidado de lead.routes.ts
// com /export/csv e /batch-update) — aqui não há colisão real (nenhum POST/:id existe), mas
// mantém a convenção do repo.
router.post('/generate-suggestions', writeRoles, (req, res, next) =>
  container
    .resolve<ObjectionMatrixController>('ObjectionMatrixController')
    .generateSuggestions(req, res, next),
);

router.post('/', writeRoles, validateRequest(objectionMatrixItemSchema), (req, res, next) =>
  container.resolve<ObjectionMatrixController>('ObjectionMatrixController').create(req, res, next),
);

router.put(
  '/:id',
  writeRoles,
  validateRequest(objectionMatrixItemSchema.partial()),
  (req, res, next) =>
    container
      .resolve<ObjectionMatrixController>('ObjectionMatrixController')
      .update(req, res, next),
);

// Apenas ADMIN e GESTOR podem excluir itens da matriz — mesma restrição de contacts.delete.
router.delete('/:id', requireRole(['ADMIN', 'GESTOR']), (req, res, next) =>
  container.resolve<ObjectionMatrixController>('ObjectionMatrixController').remove(req, res, next),
);

export const objectionMatrixRoutes = router;
