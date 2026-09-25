import { Router } from 'express';
import { noteSchema } from '../../../lib/zod';
import { container } from '../../../shared/di/container';
import { requireRole } from '../../../shared/middlewares/requireRole';
import { validateRequest } from '../../../shared/middlewares/validateRequest';
import type { NoteController } from '../presentation/NoteController';

// mergeParams: montado em três prefixos (leads/:leadId, companies/:companyId, contacts/:contactId)
// — o Controller resolve qual entidade é a partir de qual param chegou preenchido.
const router = Router({ mergeParams: true });

router.get('/', (req, res, next) =>
  container.resolve<NoteController>('NoteController').getNotesByEntity(req, res, next),
);

router.post(
  '/',
  requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']),
  validateRequest(noteSchema),
  (req, res, next) =>
    container.resolve<NoteController>('NoteController').createNote(req, res, next),
);

router.delete('/:noteId', requireRole(['ADMIN', 'GESTOR']), (req, res, next) =>
  container.resolve<NoteController>('NoteController').deleteNote(req, res, next),
);

export const noteRoutes = router;
