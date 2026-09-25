import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import { listMetricsHandler, createMetricHandler, updateMetricsHandler, clearMetricsHandler } from '../controllers/metrics.controller.js';

const router = express.Router();

router.get('/metrics', requireTenant, listMetricsHandler);
router.post('/metrics', requireTenant, createMetricHandler);
router.put('/metrics', requireTenant, updateMetricsHandler);
router.delete('/metrics', requireTenant, clearMetricsHandler);

export default router;
