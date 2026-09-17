import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchLiveKitCall, isLiveKitConfigured } from '../livekitVoice.service.js';

describe('LiveKitVoiceService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('deve indicar se LiveKit está configurado', () => {
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    expect(isLiveKitConfigured()).toBe(false);

    process.env.LIVEKIT_URL = 'https://livekit.local';
    process.env.LIVEKIT_API_KEY = 'apikey';
    process.env.LIVEKIT_API_SECRET = 'secret';
    expect(isLiveKitConfigured()).toBe(true);
  });

  it('deve despachar agente e retornar resultado com identificador de sessão', async () => {
    process.env.LIVEKIT_URL = 'https://livekit.local';
    process.env.LIVEKIT_API_KEY = 'apikey';
    process.env.LIVEKIT_API_SECRET = 'secret';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sid: 'room-sid-1' }),
    } as unknown as Response);

    const result = await dispatchLiveKitCall({
      organizationId: 'org-test-123',
      leadId: 'lead-test-456',
      phone: '+5511999998888',
      prompt: 'Olá, sou o assistente virtual',
      script: { personaName: 'Ana' },
      organizationName: 'Atlas Log',
      callbackUrl: 'https://app.local/callback',
    });

    expect(result.sessionId).toContain('call-lead-test-456-');
    expect(result.status).toBe('initiated_livekit');
  });
});
