import express from 'express';
import { requireTenant } from '../middlewares/rbac.js';
import { requireAiProviderConsent } from '../middlewares/aiConsent.js';
import {
  chatHandler,
  generateMusicHandler,
  generateVideoHandler,
  videoStatusHandler,
  videoDownloadHandler,
  refactorWorkflowHandler,
  generateWorkflowHandler,
  getAiConsentHandler,
  setAiConsentHandler,
} from '../controllers/ai.controller.js';

const router = express.Router();

// Chat goes through LLMGateway, which performs its own tenant-scoped consent check and failover.
router.post('/chat', requireTenant, chatHandler);

// This legacy HTTP TTS endpoint previously returned an empty audio payload with HTTP 200. That
// made callers believe synthesis succeeded when no TTS provider had run. Fail explicitly until a
// real tenant-scoped TTS implementation is wired here; phone-call synthesis uses the voice runtime
// instead of this endpoint.
router.post('/tts', requireTenant, (_req, res) => {
  res.status(501).json({
    error: 'TTS HTTP ainda não está disponível neste endpoint. Use o runtime de voz configurado para chamadas.',
    code: 'TTS_HTTP_NOT_IMPLEMENTED',
  });
});

// These handlers call GoogleGenAI directly rather than LLMGateway. Therefore the route itself is
// the privacy boundary: no tenant/user prompt, image or operation id reaches the external provider
// unless the authenticated tenant has explicitly granted AI-provider consent.
router.post('/generate-music', requireTenant, requireAiProviderConsent, generateMusicHandler);
router.post('/generate-video', requireTenant, requireAiProviderConsent, generateVideoHandler);
router.post('/video-status', requireTenant, requireAiProviderConsent, videoStatusHandler);
router.get('/video-download', requireTenant, requireAiProviderConsent, videoDownloadHandler);
router.post('/ai/refactor', requireTenant, requireAiProviderConsent, refactorWorkflowHandler);
router.post('/ai/generate-workflow', requireTenant, requireAiProviderConsent, generateWorkflowHandler);

router.get('/ai/consent', requireTenant, getAiConsentHandler);
router.post('/ai/consent', requireTenant, setAiConsentHandler);

export default router;
