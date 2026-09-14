/**
 * Slack: honestidade sobre envio real de mensagem — nunca reporta sucesso sem uma resposta HTTP
 * real ok do Slack (Incoming Webhook ou chat.postMessage), mesma classe de garantia já coberta
 * para 3CX (threecx.service.test.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let slackStore: Array<Record<string, unknown>> = [];
const createSlackMock = vi.fn((args: { data: Record<string, unknown> }) => {
  const record = { id: `slack-${slackStore.length + 1}`, createdAt: new Date(), ...args.data };
  slackStore.push(record);
  return Promise.resolve(record);
});
const findFirstSlackMock = vi.fn((args: { where: { id: string; organizationId: string } }) => {
  return Promise.resolve(
    slackStore.find((c) => c.id === args.where.id && c.organizationId === args.where.organizationId) ??
      null,
  );
});
const deleteManySlackMock = vi.fn().mockResolvedValue({ count: 0 });

vi.mock('@/lib/prisma', () => ({
  prisma: {
    slackConnection: {
      create: (...args: [{ data: Record<string, unknown> }]) => createSlackMock(...args),
      findFirst: (...args: [{ where: { id: string; organizationId: string } }]) =>
        findFirstSlackMock(...args),
      findMany: () => Promise.resolve(slackStore),
      deleteMany: (...args: unknown[]) => deleteManySlackMock(...args),
    },
  },
}));

// DNS lookup real indisponível/instável em ambiente de teste sandboxed — mesmo padrão de
// threecx.service.test.ts.
const assertSafeExternalUrlMock = vi.fn().mockResolvedValue(undefined);
const safeFetchMock = vi.fn((...args: [string, RequestInit?]) => (globalThis.fetch as typeof fetch)(...args));
vi.mock('@/shared/security/urlGuard', () => ({
  assertSafeExternalUrl: (...args: unknown[]) => assertSafeExternalUrlMock(...args),
  safeFetch: (...args: [string, RequestInit?]) => safeFetchMock(...args),
}));

// Caminho Bot Token (chat.postMessage) usa fetchWithTimeout, não safeFetch/globalThis.fetch —
// mockado à parte, mesmo padrão de stripe.service.test.ts/omie.service.test.ts.
const fetchWithTimeoutMock = vi.fn();
vi.mock('@/lib/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/http')>()),
  fetchWithTimeout: (...args: unknown[]) => fetchWithTimeoutMock(...args),
}));

import { connectSlack, sendSlackMessage } from '@/features/integrations/slack/slack.service';

const ORG_ID = 'org-slack-test';

function jsonResponse(status: number, body: Record<string, unknown>) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

beforeEach(() => {
  vi.clearAllMocks();
  slackStore = [];
  assertSafeExternalUrlMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('connectSlack', () => {
  it('recusa quando nem webhookUrl nem botToken são informados', async () => {
    await expect(connectSlack(ORG_ID, {})).rejects.toThrow(/Incoming Webhook.*Bot Token/);
  });

  it('valida a webhookUrl contra SSRF antes de persistir', async () => {
    await connectSlack(ORG_ID, { webhookUrl: 'https://hooks.slack.com/services/T00/B00/X00' });
    expect(assertSafeExternalUrlMock).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/T00/B00/X00',
    );
  });
});

describe('sendSlackMessage — honestidade sobre envio real (nunca finge sucesso)', () => {
  it('quando o Incoming Webhook responde ok, reporta sucesso', async () => {
    const conn = await connectSlack(ORG_ID, {
      webhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendSlackMessage(ORG_ID, conn.id, 'Olá time!');

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/T00/B00/X00',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('quando o Incoming Webhook responde erro, NÃO reporta sucesso (esgota as tentativas de retry de um 5xx sustentado)', async () => {
    vi.useFakeTimers();
    try {
      const conn = await connectSlack(ORG_ID, {
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
      });
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('boom') });
      vi.stubGlobal('fetch', fetchMock);

      const promise = sendSlackMessage(ORG_ID, conn.id, 'Olá time!');
      // Handler vazio só pra evitar o unhandledRejection do Node entre o runAllTimersAsync
      // resolver a rejeição e o expect().rejects abaixo de fato anexar seu handler.
      promise.catch(() => {});
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(/Slack respondeu com erro/);
      // SLACK_MAX_ATTEMPTS = 4 (INTEGRATION-002) — 5xx é transiente, reintentado até esgotar.
      expect(fetchMock).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('recusa mensagem vazia antes de qualquer chamada de rede', async () => {
    const conn = await connectSlack(ORG_ID, {
      webhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendSlackMessage(ORG_ID, conn.id, '   ')).rejects.toThrow(/vazia/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('revalida a webhookUrl persistida contra SSRF antes de enviar de verdade', async () => {
    const conn = await connectSlack(ORG_ID, {
      webhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    assertSafeExternalUrlMock.mockRejectedValueOnce(
      new Error('Endereço não permitido (resolve para IP privado/reservado).'),
    );

    await expect(sendSlackMessage(ORG_ID, conn.id, 'Olá time!')).rejects.toThrow(
      /IP privado\/reservado/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('sendSlackMessage — INTEGRATION-002: retry/backoff em falha transiente (Incoming Webhook)', () => {
  it('reintenta em falha de rede e eventualmente sucede', async () => {
    vi.useFakeTimers();
    try {
      const conn = await connectSlack(ORG_ID, {
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
      });
      // connectSlack já chamou assertSafeExternalUrl uma vez ao cadastrar a conexão — limpa antes
      // de medir só as chamadas feitas pelas tentativas de retry abaixo.
      assertSafeExternalUrlMock.mockClear();
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error('fetch failed (ECONNRESET)'))
        .mockResolvedValueOnce({ ok: true, status: 200 });
      vi.stubGlobal('fetch', fetchMock);

      const promise = sendSlackMessage(ORG_ID, conn.id, 'Olá time!');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      // Revalida SSRF a cada tentativa (não só a primeira) — mesmo raciocínio de callBitrix.
      expect(assertSafeExternalUrlMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('NÃO reintenta quando a rejeição do guard de SSRF acontece numa tentativa posterior', async () => {
    vi.useFakeTimers();
    try {
      const conn = await connectSlack(ORG_ID, {
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
      });
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal('fetch', fetchMock);
      assertSafeExternalUrlMock.mockRejectedValueOnce(
        new Error('Falha de rede transitória'),
      );

      const promise = sendSlackMessage(ORG_ID, conn.id, 'Olá time!');
      promise.catch(() => {});
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(/Falha de rede transit/);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('sendSlackMessage — INTEGRATION-002: retry/backoff em falha transiente (Bot Token)', () => {
  async function connectWithBotToken() {
    return connectSlack(ORG_ID, { botToken: 'xoxb-test-token', defaultChannel: '#vendas' });
  }

  it('reintenta em falha de rede e eventualmente sucede', async () => {
    vi.useFakeTimers();
    try {
      const conn = await connectWithBotToken();
      fetchWithTimeoutMock
        .mockRejectedValueOnce(new Error('fetch failed (ECONNRESET)'))
        .mockResolvedValueOnce(jsonResponse(200, { ok: true, ts: '1700000000.000100' }));

      const promise = sendSlackMessage(ORG_ID, conn.id, 'Olá time!');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reintenta em HTTP 5xx e esgota as tentativas quando a falha persiste', async () => {
    vi.useFakeTimers();
    try {
      const conn = await connectWithBotToken();
      fetchWithTimeoutMock.mockResolvedValue(jsonResponse(503, {}));

      const promise = sendSlackMessage(ORG_ID, conn.id, 'Olá time!');
      promise.catch(() => {});
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('NÃO reintenta quando o Slack recusa a chamada com erro de negócio (HTTP 200, ok:false)', async () => {
    const conn = await connectWithBotToken();
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { ok: false, error: 'channel_not_found' }));

    await expect(sendSlackMessage(ORG_ID, conn.id, 'Olá time!')).rejects.toThrow(/channel_not_found/);
    expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
  });
});
