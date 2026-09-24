import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AtlasGROutboundPayload } from '../validators/atlasgr.schema.js';

vi.mock('../lib/webhookIdempotency.js', () => ({
  buildAtlasGROutboundIdempotencyKey: vi.fn().mockReturnValue('idempotency:atlasgr-outbound-call:hash:test'),
  claimIdempotencyKey: vi.fn(),
}));

vi.mock('../../../services/settingService.js', () => ({
  getAiConsent: vi.fn(),
}));

import { claimIdempotencyKey } from '../lib/webhookIdempotency.js';
import { getAiConsent } from '../../../services/settingService.js';
import { BlandConfigurationError, VoiceProspectingService } from './voice.service.js';

const mockClaim = vi.mocked(claimIdempotencyKey);
const mockGetAiConsent = vi.mocked(getAiConsent);

const basePayload: AtlasGROutboundPayload = {
  phone_number: '+5511999998888',
  name: 'Fulano de Tal',
  company: 'Acme Logística',
};

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BLAND_API_KEY = 'test-bland-key';
  process.env.BLAND_WEBHOOK_TOKEN = 'test-callback-token';
  process.env.WEBHOOK_BASE_URL = 'https://hub.example.com';
  process.env.ATLASGR_TENANT_ID = 'tenant-atlas-test';
  mockClaim.mockResolvedValue(true);
  mockGetAiConsent.mockResolvedValue({
    granted: true,
    grantedAt: '2026-08-14T12:00:00.000Z',
    revokedAt: null,
    grantedByUserId: 'test-user',
  });
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe('VoiceProspectingService.triggerOutboundCall', () => {
  it('calls the Bland AI API and never logs the API key', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ call_id: 'call-abc', status: 'queued' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new VoiceProspectingService();
    const result = await service.triggerOutboundCall(basePayload);

    expect(result).toEqual({
      success: true,
      duplicate: false,
      message: 'Outbound call triggered successfully via Bland AI',
      callId: 'call-abc',
      status: 'queued',
    });
    expect(mockGetAiConsent).toHaveBeenCalledWith('tenant-atlas-test');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>).Authorization).toBe('test-bland-key');

    const allLoggedText = logSpy.mock.calls.map((call) => JSON.stringify(call)).join('\n');
    expect(allLoggedText).not.toContain('test-bland-key');
  });

  it('includes AMD, latency reduction, and retry configuration in Bland AI payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ call_id: 'call-abc', status: 'queued' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new VoiceProspectingService();
    await service.triggerOutboundCall(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);

    expect(body.answered_by_enabled).toBe(true);
    expect(body.reduce_latency).toBe(true);
    expect(body.retry).toEqual({ max_attempts: 2 });
    expect(body.webhook).toBe('https://hub.example.com/api/webhooks/bland/test-callback-token');
    expect(body.record).toBe(false);
  });

  it('supports optional Brazilian national caller ID from payload or environment', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ call_id: 'call-abc', status: 'queued' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new VoiceProspectingService();

    await service.triggerOutboundCall({ ...basePayload, from: '+551133334444' });
    let body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.from).toBe('+551133334444');

    process.env.BLAND_FROM_NUMBER = '+551155556666';
    await service.triggerOutboundCall(basePayload);
    body = JSON.parse((fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string);
    expect(body.from).toBe('+551155556666');
  });

  it('short-circuits and never calls Bland AI when the idempotency key was already claimed', async () => {
    mockClaim.mockResolvedValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const service = new VoiceProspectingService();
    const result = await service.triggerOutboundCall(basePayload);

    expect(result.duplicate).toBe(true);
    expect(result.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports (does not swallow) a Bland AI API error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => JSON.stringify({ message: 'Upstream provider error' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new VoiceProspectingService();
    await expect(service.triggerOutboundCall(basePayload)).rejects.toThrow('Upstream provider error');
  });

  it('handles non-JSON error response gracefully', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable HTML Body',
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new VoiceProspectingService();
    await expect(service.triggerOutboundCall(basePayload)).rejects.toThrow('Service Unavailable HTML Body');
  });

  it('throws BlandConfigurationError instead of calling Bland AI when BLAND_API_KEY is missing', async () => {
    delete process.env.BLAND_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const service = new VoiceProspectingService();
    await expect(service.triggerOutboundCall(basePayload)).rejects.toBeInstanceOf(BlandConfigurationError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockClaim).not.toHaveBeenCalled();
    expect(mockGetAiConsent).not.toHaveBeenCalled();
  });

  it('throws BlandConfigurationError instead of calling Bland AI when BLAND_WEBHOOK_TOKEN is missing', async () => {
    delete process.env.BLAND_WEBHOOK_TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const service = new VoiceProspectingService();
    await expect(service.triggerOutboundCall(basePayload)).rejects.toBeInstanceOf(BlandConfigurationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});