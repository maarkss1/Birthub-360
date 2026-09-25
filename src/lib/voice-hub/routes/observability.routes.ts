import express from 'express';
import { requireTenant } from '../middlewares/rbac';
import { observabilityMetricsHandler } from '../controllers/observability.controller';

const router = express.Router();

router.get('/observability/metrics', requireTenant, observabilityMetricsHandler);

export default router;
