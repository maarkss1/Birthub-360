import express from 'express';
import { requireTenant } from '../middlewares/rbac';
import { initiateOutboundCallHandler } from '../controllers/voiceOutbound.controller';

const router = express.Router();

router.post('/voice/outbound', requireTenant, initiateOutboundCallHandler);

export default router;
