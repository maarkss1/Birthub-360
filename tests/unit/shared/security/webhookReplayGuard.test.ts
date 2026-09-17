import { describe, it, expect, vi, beforeEach } from 'vitest';

let redisConfiguredValue = true;
const cacheSet = vi.fn();
vi.mock('../../../../src/lib/queue/redis.js', () => ({
  get redisConfigured() {
    return redisConfiguredValue;
  },
  cacheConnection: {
    set: (...args: unknown[]) => cacheSet(...args),
  },
}));

vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

const {
  claimWebhookDelivery,
  webhookDeliveryFingerprint,
  validateWebhookTimestamp,
  WEBHOOK_REPLAY_TTL_SECONDS,
} = await import('../../../../src/shared/security/webhookReplayGuard.js');

beforeEach(() => {
  vi.clearAllMocks();
  redisConfiguredValue = true;
});

describe('webhookDeliveryFingerprint', () => {
  it('é determinístico para as mesmas partes', () => {
    expect(webhookDeliveryFingerprint('a', 'b', 'c')).toBe(
      webhookDeliveryFingerprint('a', 'b', 'c'),
    );
  });

  it('muda quando qualquer parte muda', () => {
    expect(webhookDeliveryFingerprint('a', 'b', 'c')).not.toBe(
      webhookDeliveryFingerprint('a', 'b', 'd'),
    );
  });

  it('ignora partes nulas/undefined/vazias no fingerprint (mesmo resultado com ou sem elas)', () => {
    expect(webhookDeliveryFingerprint('a', null, undefined, 'c')).toBe(
      webhookDeliveryFingerprint('a', 'c'),
    );
  });
});

describe('claimWebhookDelivery', () => {
  it('reivindica como fresh na primeira entrega (SET NX bem-sucedido)', async () => {
    cacheSet.mockResolvedValue('OK');
    const result = await claimWebhookDelivery('bitrix', 'fp-1');
    expect(result).toBe('fresh');
    expect(cacheSet).toHaveBeenCalledWith(
      'webhook:replay:bitrix:fp-1',
      '1',
      'EX',
      WEBHOOK_REPLAY_TTL_SECONDS,
      'NX',
    );
  });

  it('detecta replay quando o fingerprint já foi reivindicado (SET NX falha)', async () => {
    cacheSet.mockResolvedValue(null);
    const result = await claimWebhookDelivery('bitrix', 'fp-1');
    expect(result).toBe('replay');
  });

  it('respeita um TTL customizado quando informado', async () => {
    cacheSet.mockResolvedValue('OK');
    await claimWebhookDelivery('3cx', 'fp-2', 60);
    expect(cacheSet).toHaveBeenCalledWith('webhook:replay:3cx:fp-2', '1', 'EX', 60, 'NX');
  });

  it('fail-open (unavailable) quando o Redis não está configurado, sem chamar o cache', async () => {
    redisConfiguredValue = false;
    const result = await claimWebhookDelivery('bitrix', 'fp-1');
    expect(result).toBe('unavailable');
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it('fail-open (unavailable) quando o Redis está configurado mas indisponível em runtime', async () => {
    cacheSet.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await claimWebhookDelivery('bitrix', 'fp-1');
    expect(result).toBe('unavailable');
  });
});

describe('validateWebhookTimestamp', () => {
  it('retorna invalid quando o header está ausente/nulo/vazio', () => {
    expect(validateWebhookTimestamp(undefined).valid).toBe(false);
    expect(validateWebhookTimestamp(null as unknown as string).valid).toBe(false);
    expect(validateWebhookTimestamp('').valid).toBe(false);
  });

  it('retorna invalid quando o valor não é nem número nem ISO-8601', () => {
    expect(validateWebhookTimestamp('not-a-timestamp').valid).toBe(false);
  });

  it('aceita epoch em segundos dentro da janela de 5 min', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    expect(validateWebhookTimestamp(String(nowSec)).valid).toBe(true);
  });

  it('aceita epoch em milissegundos dentro da janela de 5 min', () => {
    const nowMs = Date.now();
    expect(validateWebhookTimestamp(String(nowMs)).valid).toBe(true);
  });

  it('aceita ISO-8601 dentro da janela de 5 min', () => {
    expect(validateWebhookTimestamp(new Date().toISOString()).valid).toBe(true);
  });

  it('rejeita timestamp mais antigo que a janela (>5 min atrás)', () => {
    const oldSec = Math.floor(Date.now() / 1000) - 400;
    expect(validateWebhookTimestamp(String(oldSec)).valid).toBe(false);
  });

  it('rejeita timestamp muito à frente no futuro (>5 min)', () => {
    const futureSec = Math.floor(Date.now() / 1000) + 360;
    expect(validateWebhookTimestamp(String(futureSec)).valid).toBe(false);
  });
});
