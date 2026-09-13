import { Router } from 'express';

import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { container } from '../../../shared/di/container.js';
import type { AttachmentController } from '../presentation/AttachmentController.js';

// mergeParams: montado em três prefixos (leads/:leadId, companies/:companyId, contacts/:contactId)
// — o Controller resolve qual entidade é a partir de qual param chegou preenchido (mesmo padrão
// de note.routes.ts).
const router = Router({ mergeParams: true });

router.get('/', (req, res, next) =>
  container.resolve<AttachmentController>('AttachmentController').listByEntity(req, res, next),
);

router.post(
  '/upload-url',
  requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']),
  (req, res, next) =>
    container
      .resolve<AttachmentController>('AttachmentController')
      .requestUploadUrl(req, res, next),
);

router.post('/', requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']), (req, res, next) =>
  container.resolve<AttachmentController>('AttachmentController').completeUpload(req, res, next),
);

router.get('/:attachmentId/download-url', (req, res, next) =>
  container.resolve<AttachmentController>('AttachmentController').getDownloadUrl(req, res, next),
);

router.delete('/:attachmentId', requireRole(['ADMIN', 'GESTOR']), (req, res, next) =>
  container.resolve<AttachmentController>('AttachmentController').delete(req, res, next),
);

export const attachmentRoutes = router;
