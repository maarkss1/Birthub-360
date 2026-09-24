import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import { getVoiceRuntimeHandler, createVoiceRuntimeHandler, updateVoiceRuntimeHandler, resetVoiceRuntimeHandler } from '../controllers/voiceRuntime.controller.js';

const router = express.Router();

router.get('/voice-runtime', requireTenant, getVoiceRuntimeHandler);
router.post('/voice-runtime', requireTenant, createVoiceRuntimeHandler);
router.put('/voice-runtime', requireTenant, updateVoiceRuntimeHandler);
router.delete('/voice-runtime', requireTenant, resetVoiceRuntimeHandler);

export default router;
