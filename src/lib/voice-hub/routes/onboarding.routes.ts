import express from 'express';
import { requireTenant } from '../middlewares/rbac';
import { getChecklistHandler, saveChecklistHandler, resetChecklistHandler } from '../controllers/onboarding.controller';

const router = express.Router();

router.get('/onboarding', requireTenant, getChecklistHandler);
router.post('/onboarding', requireTenant, saveChecklistHandler);
router.put('/onboarding', requireTenant, saveChecklistHandler);
router.delete('/onboarding', requireTenant, resetChecklistHandler);

export default router;
