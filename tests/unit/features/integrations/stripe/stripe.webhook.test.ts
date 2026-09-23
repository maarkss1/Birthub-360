import { createHmac } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mesmo raciocínio de bitrix.webhook.test.ts: testes de unidade não devem depender do Redis real,
// nem deixar entregas de um `it()` colidirem com o fingerprint de outro.
vi.mock('@/shared/security/webhookReplayGuard', () => ({
  claimWebhookDelivery: vi.fn().mockResolvedValue('fresh'),
  webhookDeliveryFingerprint: vi.fn(() => 'fingerprint-de-teste'),
  validateWebhookTimestamp: vi.fn().mockReturnValue({ valid: true }),
}));

const contextStore: { tenantId?: string; bypassRls?: boolean }[] = [];
vi.mock('@/lib/async-context', () => ({
  requestContext: {
    run: async (store: { tenantId?: string; bypassRls?: boolean }, fn: () => unknown) => {
      contextStore.push(store);
      return fn();
    },
  },
}));

const prismaMock = { stripeConnection: { findUnique: vi.fn() } };
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

const SECRET = 'whsec_test_segredo';
const CONNECTION = {
  id: 'conn-1',
  organizationId: 'org-1',
  secretKey: 'sk_test_xxx',
  webhookSecret: SECRET,
};

function signedRequest(payload: Record<string, unknown>, secret = SECRET, timestampSeconds?: number) {
  const body = JSON.stringify(payload);
  const t = timestampSeconds ?? Math.floor(Date.now() / 1000);
  const v1 = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return { body, header: `t=${t},v1=${v1}` };
}

async function buildApp() {
  const { stripeWebhookRoutes } = await import('@/features/integrations/stripe/stripe.webhook');
  const app = express();
  app.use(stripeWebhookRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  contextStore.length = 0;
});

/**
 * BILLING-007: antes desta rota, eventos assíncronos de pagamento (confirmação, estorno, falha) da
 * Stripe não tinham receiver nenhum. Estes testes cobrem autenticidade (assinatura HMAC por
 * conexão, não um segredo global), o escopo deliberadamente estreito (só loga o evento autenticado
 * — reconciliar com Fatura é BILLING-003, ainda não construído) e a garantia de que uma entrega sem
 * assinatura válida nunca é aceita como autêntica.
 */
describe('POST /webhook/:connectionId', () => {
  it('rejeita com 404 quando a conexão não existe, sem distinguir do caso "webhook não configurado"', async () => {
    prismaMock.stripeConnection.findUnique.mockResolvedValue(null);
    const app = await buildApp();
    const { body, header } = signedRequest({ id: 'evt_1', type: 'payment_intent.succeeded' });

    const res = await request(app)
      .post('/webhook/conn-inexistente')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', header)
      .send(body);

    expect(res.status).toBe(404);
  });

  it('rejeita com 404 quando a conexão existe mas nunca teve um webhookSecret configurado', async () => {
    prismaMock.stripeConnection.findUnique.mockResolvedValue({ ...CONNECTION, webhookSecret: null });
    const app = await buildApp();
    const { body, header } = signedRequest({ id: 'evt_1', type: 'payment_intent.succeeded' });

    const res = await request(app)
      .post('/webhook/conn-1')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', header)
      .send(body);

    expect(res.status).toBe(404);
  });

  it('rejeita com 401 quando a assinatura não bate com o segredo salvo da conexão', async () => {
    prismaMock.stripeConnection.findUnique.mockResolvedValue(CONNECTION);
    const app = await buildApp();
    const { body, header } = signedRequest(
      { id: 'evt_1', type: 'payment_intent.succeeded' },
      'whsec_segredo_errado',
    );

    const res = await request(app)
      .post('/webhook/conn-1')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', header)
      .send(body);

    expect(res.status).toBe(401);
  });

  it('rejeita com 401 quando o header Stripe-Signature está ausente', async () => {
    prismaMock.stripeConnection.findUnique.mockResolvedValue(CONNECTION);
    const app = await buildApp();

    const res = await request(app)
      .post('/webhook/conn-1')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded' }));

    expect(res.status).toBe(401);
  });

  it('aceita com 200 e ignora eventos que este receiver ainda não trata, em vez de derrubar o endpoint no Dashboard da Stripe', async () => {
    prismaMock.stripeConnection.findUnique.mockResolvedValue(CONNECTION);
    const app = await buildApp();
    const { body, header } = signedRequest({ id: 'evt_1', type: 'customer.created' });

    const res = await request(app)
      .post('/webhook/conn-1')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', header)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.ignored).toBe('customer.created');
  });

  it('aceita e loga um evento de confirmação de pagamento autenticado, escopado ao tenant certo (RLS)', async () => {
    prismaMock.stripeConnection.findUnique.mockResolvedValue(CONNECTION);
    const app = await buildApp();
    const { body, header } = signedRequest({
      id: 'evt_pago_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123', amount: 4990 } },
    });

    const res = await request(app)
      .post('/webhook/conn-1')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', header)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('logged');
    // Só a resolução do connectionId->organização usa bypassRls (nenhuma escrita acontece hoje,
    // só log) — mesmo raciocínio de bitrix.webhook.test.ts.
    expect(contextStore.some((s) => s.bypassRls === true)).toBe(true);
  });

  it('devolve 200 sem reprocessar quando a mesma entrega já foi vista (replay guard)', async () => {
    const { claimWebhookDelivery } = await import('@/shared/security/webhookReplayGuard');
    vi.mocked(claimWebhookDelivery).mockResolvedValueOnce('replay');
    prismaMock.stripeConnection.findUnique.mockResolvedValue(CONNECTION);
    const app = await buildApp();
    const { body, header } = signedRequest({
      id: 'evt_repetido',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_123' } },
    });

    const res = await request(app)
      .post('/webhook/conn-1')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', header)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('duplicate-delivery');
  });
});
