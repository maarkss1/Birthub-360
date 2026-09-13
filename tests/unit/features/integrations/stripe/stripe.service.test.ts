/**
 * Stripe: honestidade sobre criação de cobrança real — connectStripe só persiste depois de validar
 * a secretKey de verdade contra a API (GET /v1/balance); createStripeCharge nunca inventa um
 * status "succeeded" que a Stripe não confirmou. Mesma classe de garantia de threecx.service.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

let stripeStore: Array<Record<string, unknown>> = [];
const createStripeMock = vi.fn((args: { data: Record<string, unknown> }) => {
  const record = { id: `stripe-${stripeStore.length + 1}`, createdAt: new Date(), ...args.data };
  stripeStore.push(record);
  return Promise.resolve(record);
});
const findFirstStripeMock = vi.fn((args: { where: { id: string; organizationId: string } }) => {
  return Promise.resolve(
    stripeStore.find((c) => c.id === args.where.id && c.organizationId === args.where.organizationId) ??
      null,
  );
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stripeConnection: {
      create: (...args: [{ data: Record<string, unknown> }]) => createStripeMock(...args),
      findFirst: (...args: [{ where: { id: string; organizationId: string } }]) =>
        findFirstStripeMock(...args),
      findMany: () => Promise.resolve(stripeStore),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

const fetchWithTimeoutMock = vi.fn();
vi.mock('@/lib/http', () => ({
  fetchWithTimeout: (...args: unknown[]) => fetchWithTimeoutMock(...args),
}));

import {
  connectStripe,
  createStripeCharge,
  testStripeConnection,
} from '@/features/integrations/stripe/stripe.service';

const ORG_ID = 'org-stripe-test';

function jsonResponse(status: number, body: Record<string, unknown>) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

beforeEach(() => {
  vi.clearAllMocks();
  stripeStore = [];
});

describe('connectStripe', () => {
  it('recusa e não persiste quando a secretKey é inválida', async () => {
    fetchWithTimeoutMock.mockResolvedValue(
      jsonResponse(401, { error: { message: 'Invalid API Key provided' } }),
    );

    await expect(connectStripe(ORG_ID, { secretKey: 'sk_test_invalid' })).rejects.toThrow(
      /Chave secreta do Stripe inválida/,
    );
    expect(stripeStore).toHaveLength(0);
  });

  it('persiste quando a secretKey é validada com sucesso contra /v1/balance', async () => {
    fetchWithTimeoutMock.mockResolvedValue(jsonResponse(200, { object: 'balance' }));

    const conn = await connectStripe(ORG_ID, { secretKey: 'sk_test_valid123' });

    expect(conn.secretKeyLast4).toBe('d123');
    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/balance',
      expect.objectContaining({ method: 'GET' }),
      expect.any(Number),
      ['api.stripe.com'],
    );
  });
});

describe('createStripeCharge — honestidade sobre status real (nunca inventa "succeeded")', () => {
  it('devolve o status real reportado pela Stripe, mesmo quando não é "succeeded"', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { object: 'balance' }));
    const conn = await connectStripe(ORG_ID, { secretKey: 'sk_test_valid123' });

    fetchWithTimeoutMock.mockResolvedValueOnce(
      jsonResponse(200, {
        id: 'pi_123',
        amount: 49900,
        currency: 'brl',
        status: 'requires_payment_method',
        created: 1700000000,
      }),
    );

    const charge = await createStripeCharge(ORG_ID, conn.id, {
      amountCents: 49900,
      currency: 'BRL',
      customerEmail: 'financeiro@cliente.com',
      idempotencyKey: 'attempt-1',
    });

    expect(charge.status).toBe('requires_payment_method');
    expect(charge.paymentId).toBe('pi_123');
  });

  it('propaga o erro real da Stripe em vez de fingir sucesso', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { object: 'balance' }));
    const conn = await connectStripe(ORG_ID, { secretKey: 'sk_test_valid123' });

    fetchWithTimeoutMock.mockResolvedValueOnce(
      jsonResponse(402, { error: { message: 'Your card was declined.' } }),
    );

    await expect(
      createStripeCharge(ORG_ID, conn.id, {
        amountCents: 1000,
        currency: 'BRL',
        customerEmail: 'a@b.com',
        idempotencyKey: 'attempt-2',
      }),
    ).rejects.toThrow(/card was declined/);
  });

  it('rejeita valor não-positivo antes de qualquer chamada de rede', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { object: 'balance' }));
    const conn = await connectStripe(ORG_ID, { secretKey: 'sk_test_valid123' });
    fetchWithTimeoutMock.mockClear();

    await expect(
      createStripeCharge(ORG_ID, conn.id, {
        amountCents: 0,
        currency: 'BRL',
        customerEmail: 'a@b.com',
        idempotencyKey: 'attempt-3',
      }),
    ).rejects.toThrow(/maior que zero/);
    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
  });
});

describe('createStripeCharge — INTEGRATION-001: chave de idempotência (evita cobrança duplicada em retry)', () => {
  it('rejeita a criação da cobrança quando idempotencyKey não é informado, sem chamar a Stripe', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { object: 'balance' }));
    const conn = await connectStripe(ORG_ID, { secretKey: 'sk_test_valid123' });
    fetchWithTimeoutMock.mockClear();

    await expect(
      createStripeCharge(ORG_ID, conn.id, {
        amountCents: 1000,
        currency: 'BRL',
        customerEmail: 'a@b.com',
        // @ts-expect-error — testando exatamente a omissão do campo obrigatório
        idempotencyKey: undefined,
      }),
    ).rejects.toThrow(/idempotencyKey é obrigatório/);
    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
  });

  it('rejeita string vazia/só espaços do mesmo jeito que ausência do campo', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { object: 'balance' }));
    const conn = await connectStripe(ORG_ID, { secretKey: 'sk_test_valid123' });
    fetchWithTimeoutMock.mockClear();

    await expect(
      createStripeCharge(ORG_ID, conn.id, {
        amountCents: 1000,
        currency: 'BRL',
        customerEmail: 'a@b.com',
        idempotencyKey: '   ',
      }),
    ).rejects.toThrow(/idempotencyKey é obrigatório/);
    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
  });

  it('envia o header Idempotency-Key para a Stripe com o valor exato passado pelo chamador', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { object: 'balance' }));
    const conn = await connectStripe(ORG_ID, { secretKey: 'sk_test_valid123' });

    fetchWithTimeoutMock.mockResolvedValueOnce(
      jsonResponse(200, {
        id: 'pi_abc',
        amount: 1000,
        currency: 'brl',
        status: 'requires_payment_method',
        created: 1700000000,
      }),
    );

    await createStripeCharge(ORG_ID, conn.id, {
      amountCents: 1000,
      currency: 'BRL',
      customerEmail: 'a@b.com',
      idempotencyKey: 'charge-attempt-stable-id',
    });

    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/payment_intents',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': 'charge-attempt-stable-id' }),
      }),
      expect.any(Number),
      ['api.stripe.com'],
    );
  });

  it('simula um retry de rede: duas chamadas com o MESMO idempotencyKey enviam o MESMO header à Stripe — é isso que faz a Stripe tratar as duas como uma única cobrança em vez de duas cobranças reais', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { object: 'balance' }));
    const conn = await connectStripe(ORG_ID, { secretKey: 'sk_test_valid123' });

    const chargeResponse = jsonResponse(200, {
      id: 'pi_retry',
      amount: 5000,
      currency: 'brl',
      status: 'requires_payment_method',
      created: 1700000000,
    });

    const stableKey = 'retry-of-the-same-attempt';
    const input = {
      amountCents: 5000,
      currency: 'BRL',
      customerEmail: 'a@b.com',
      idempotencyKey: stableKey,
    };

    // Primeira tentativa (a requisição original).
    fetchWithTimeoutMock.mockResolvedValueOnce(chargeResponse);
    await createStripeCharge(ORG_ID, conn.id, input);

    // "Retry de rede": o chamador não recebeu a resposta a tempo (ex.: timeout) e tenta de novo,
    // reenviando o MESMO idempotencyKey — nunca um novo valor gerado na hora do retry.
    fetchWithTimeoutMock.mockResolvedValueOnce(chargeResponse);
    await createStripeCharge(ORG_ID, conn.id, input);

    const postCalls = fetchWithTimeoutMock.mock.calls.filter(
      ([, init]) => (init as { method?: string })?.method === 'POST',
    );
    expect(postCalls).toHaveLength(2);

    const idempotencyHeaders = postCalls.map(
      ([, init]) => (init as { headers: Record<string, string> }).headers['Idempotency-Key'],
    );
    expect(idempotencyHeaders[0]).toBe(stableKey);
    expect(idempotencyHeaders[1]).toBe(stableKey);
  });

  it('duas tentativas de cobrança DISTINTAS (idempotencyKey diferente) enviam headers diferentes — não é uma chave fixa/hardcoded', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { object: 'balance' }));
    const conn = await connectStripe(ORG_ID, { secretKey: 'sk_test_valid123' });

    const chargeResponse = jsonResponse(200, {
      id: 'pi_x',
      amount: 2000,
      currency: 'brl',
      status: 'requires_payment_method',
      created: 1700000000,
    });

    fetchWithTimeoutMock.mockResolvedValueOnce(chargeResponse);
    await createStripeCharge(ORG_ID, conn.id, {
      amountCents: 2000,
      currency: 'BRL',
      customerEmail: 'a@b.com',
      idempotencyKey: 'attempt-A',
    });

    fetchWithTimeoutMock.mockResolvedValueOnce(chargeResponse);
    await createStripeCharge(ORG_ID, conn.id, {
      amountCents: 2000,
      currency: 'BRL',
      customerEmail: 'a@b.com',
      idempotencyKey: 'attempt-B',
    });

    const postCalls = fetchWithTimeoutMock.mock.calls.filter(
      ([, init]) => (init as { method?: string })?.method === 'POST',
    );
    const idempotencyHeaders = postCalls.map(
      ([, init]) => (init as { headers: Record<string, string> }).headers['Idempotency-Key'],
    );
    expect(idempotencyHeaders[0]).toBe('attempt-A');
    expect(idempotencyHeaders[1]).toBe('attempt-B');
    expect(idempotencyHeaders[0]).not.toBe(idempotencyHeaders[1]);
  });
});

describe('testStripeConnection', () => {
  it('reporta falha honesta quando a Stripe responde erro', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { object: 'balance' }));
    const conn = await connectStripe(ORG_ID, { secretKey: 'sk_test_valid123' });

    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(500, {}));
    const result = await testStripeConnection(ORG_ID, conn.id);

    expect(result.success).toBe(false);
  });
});
