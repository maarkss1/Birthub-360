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
      }),
    ).rejects.toThrow(/card was declined/);
  });

  it('rejeita valor não-positivo antes de qualquer chamada de rede', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(jsonResponse(200, { object: 'balance' }));
    const conn = await connectStripe(ORG_ID, { secretKey: 'sk_test_valid123' });
    fetchWithTimeoutMock.mockClear();

    await expect(
      createStripeCharge(ORG_ID, conn.id, { amountCents: 0, currency: 'BRL', customerEmail: 'a@b.com' }),
    ).rejects.toThrow(/maior que zero/);
    expect(fetchWithTimeoutMock).not.toHaveBeenCalled();
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
