import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import client from 'prom-client';

/**
 * BILLING-009 (Onda 2): `estimateCostUsd` caía silenciosamente no preço de `local-llama3-fast`
 * para qualquer modelo desconhecido, sem log nem métrica — cobre aqui que o fallback continua
 * calculando o mesmo custo de antes, mas agora emite um warning e incrementa
 * `ai_pricing_fallback_total` rotulado pelo modelo real.
 */
describe('src/lib/ai/gateway/pricing.ts', () => {
  beforeEach(() => {
    client.register.clear();
    vi.resetModules();
  });

  afterEach(() => {
    client.register.clear();
    vi.resetModules();
    vi.doUnmock('../../../../../src/config/env.js');
  });

  it('calculates cost normally for a known model, without warning or fallback metric', async () => {
    vi.doMock('../../../../../src/config/env.js', () => ({ env: {} }));
    const { estimateCostUsd } = await import('../../../../../src/lib/ai/gateway/pricing.js');

    const cost = estimateCostUsd('openai/gpt-oss-20b', {
      totalTokens: 2_000_000,
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });

    expect(cost).toBeCloseTo(0.075 + 0.3, 6);

    const metrics = await client.register.getMetricsAsJSON();
    const fallback = metrics.find((m) => m.name === 'ai_pricing_fallback_total');
    expect((fallback as unknown as { values: unknown[] } | undefined)?.values ?? []).toHaveLength(
      0,
    );
  });

  it('falls back to local-llama3-fast pricing for an unknown model, but now logs a warning and records the fallback metric labeled by model', async () => {
    vi.doMock('../../../../../src/config/env.js', () => ({ env: {} }));
    const warn = vi.fn();
    vi.doMock('../../../../../src/lib/logger.js', () => ({ logger: { warn, info: vi.fn() } }));
    const { estimateCostUsd } = await import('../../../../../src/lib/ai/gateway/pricing.js');

    const cost = estimateCostUsd('some-brand-new-model', {
      totalTokens: 2_000_000,
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });

    // Mesmo custo que local-llama3-fast produziria — o comportamento numérico não muda.
    expect(cost).toBeCloseTo(0.075 + 0.3, 6);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatchObject({ model: 'some-brand-new-model' });

    const metrics = await client.register.getMetricsAsJSON();
    const fallback = metrics.find((m) => m.name === 'ai_pricing_fallback_total');
    const values = (
      fallback as unknown as { values: Array<{ value: number; labels: Record<string, string> }> }
    )?.values;
    const entry = values?.find((v) => v.labels.model === 'some-brand-new-model');
    expect(entry?.value).toBe(1);
  });
});
