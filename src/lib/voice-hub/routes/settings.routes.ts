import express from 'express';
import { requireTenant } from '../middlewares/rbac';
import { getSettingsHandler, createSettingsHandler, updateSettingsHandler, resetSettingsHandler } from '../controllers/settings.controller';

const router = express.Router();

router.get('/settings', requireTenant, getSettingsHandler);
router.post('/settings', requireTenant, createSettingsHandler);
router.put('/settings', requireTenant, updateSettingsHandler);
router.delete('/settings', requireTenant, resetSettingsHandler);

export default router;
