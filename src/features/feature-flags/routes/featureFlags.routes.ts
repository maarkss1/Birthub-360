import { Router } from 'express';
import { container } from '../../../shared/di/container';
import { requireRole } from '../../../shared/middlewares/requireRole';
import type { FeatureFlagsController } from '../presentation/FeatureFlagsController';

export const featureFlagsRouter = Router();

featureFlagsRouter.get('/', (req, res, next) =>
  container.resolve<FeatureFlagsController>('FeatureFlagsController').listResolved(req, res, next),
);

featureFlagsRouter.put('/:key', requireRole(['ADMIN']), (req, res, next) =>
  container.resolve<FeatureFlagsController>('FeatureFlagsController').setOverride(req, res, next),
);

featureFlagsRouter.delete('/:key', requireRole(['ADMIN']), (req, res, next) =>
  container.resolve<FeatureFlagsController>('FeatureFlagsController').clearOverride(req, res, next),
);
