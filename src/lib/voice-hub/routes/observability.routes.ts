import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import { observabilityMetricsHandler } from '../controllers/observability.controller.js';

const router = express.Router();

router.get('/observability/metrics', requireTenant, observabilityMetricsHandler);

export default router;
