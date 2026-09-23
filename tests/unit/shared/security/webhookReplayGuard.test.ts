import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateWebhookTimestamp, webhookDeliveryFingerprint, claimWebhookDelivery } from '../../../../src/shared/security/webhookReplayGuard.js';
import { cacheConnection } from '../../../../src/lib/queue/redis.js';

vi.mock('../../../../src/lib/queue/redis.js', () => ({
  cacheConnection: {
    set: vi.fn(),
  },
  redisConfigured: true,
}));

describe('webhookReplayGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateWebhookTimestamp', () => {
    it('returns missing if timestamp is not provided', () => {
      const result = validateWebhookTimestamp(undefined);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.reason).toBe('missing');
      }
    });

    it('validates a fresh timestamp', () => {
      const now = Date.now();
      const result = validateWebhookTimestamp(now, 300, now);
      expect(result.valid).toBe(true);
    });

    it('rejects stale timestamp', () => {
      const now = Date.now();
      const stale = now - (6 * 60 * 1000); // 6 minutes ago
      const result = validateWebhookTimestamp(stale, 300, now);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('expired');
      }
    });

    it('rejects future timestamp', () => {
      const now = Date.now();
      const future = now + (6 * 60 * 1000); // 6 minutes in future
      const result = validateWebhookTimestamp(future, 300, now);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('future');
      }
    });

    it('accepts string epoch timestamp', () => {
      const now = Date.now();
      const nowStr = String(now);
      const result = validateWebhookTimestamp(nowStr, 300, now);
      expect(result.valid).toBe(true);
    });

    it('accepts string ISO timestamp', () => {
      const now = new Date();
      const nowStr = now.toISOString();
      const result = validateWebhookTimestamp(nowStr, 300, now.getTime());
      expect(result.valid).toBe(true);
    });
  });

  describe('webhookDeliveryFingerprint', () => {
    it('generates consistent fingerprint for same parts', () => {
      const a = webhookDeliveryFingerprint('foo', 'bar');
      const b = webhookDeliveryFingerprint('foo', 'bar');
      expect(a).toBe(b);
    });

    it('generates different fingerprint for different parts', () => {
      const a = webhookDeliveryFingerprint('foo', 'bar');
      const b = webhookDeliveryFingerprint('foo', 'baz');
      expect(a).not.toBe(b);
    });
  });

  describe('claimWebhookDelivery', () => {
    it('returns "fresh" when redis SET NX succeeds', async () => {
      vi.mocked(cacheConnection.set).mockResolvedValueOnce('OK');
      const result = await claimWebhookDelivery('test-namespace', 'test-fingerprint');
      expect(result).toBe('fresh');
      expect(cacheConnection.set).toHaveBeenCalledWith(
        'webhook:replay:test-namespace:test-fingerprint',
        '1',
        'EX',
        1800,
        'NX'
      );
    });

    it('returns "replay" when redis SET NX fails (returns null)', async () => {
      vi.mocked(cacheConnection.set).mockResolvedValueOnce(null as any);
      const result = await claimWebhookDelivery('test-namespace', 'test-fingerprint');
      expect(result).toBe('replay');
    });

    it('returns "unavailable" on redis error', async () => {
      vi.mocked(cacheConnection.set).mockRejectedValueOnce(new Error('Redis connection failed'));
      const result = await claimWebhookDelivery('test-namespace', 'test-fingerprint');
      expect(result).toBe('unavailable');
    });
  });
});
