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

import { connectSlack, sendSlackMessage } from '@/features/integrations/slack/slack.service';

const ORG_ID = 'org-slack-test';

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

  it('quando o Incoming Webhook responde erro, NÃO reporta sucesso', async () => {
    const conn = await connectSlack(ORG_ID, {
      webhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('boom') }),
    );

    await expect(sendSlackMessage(ORG_ID, conn.id, 'Olá time!')).rejects.toThrow(
      /Slack respondeu com erro/,
    );
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
