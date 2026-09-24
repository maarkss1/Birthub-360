import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import { initiateOutboundCallHandler } from '../controllers/voiceOutbound.controller.js';

const router = express.Router();

router.post('/voice/outbound', requireTenant, initiateOutboundCallHandler);

export default router;
