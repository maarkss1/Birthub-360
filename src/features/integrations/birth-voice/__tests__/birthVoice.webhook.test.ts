import { createHmac } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ACH-06-01 — antes desta correção, `handleWebhook` validava a assinatura de TODA organização
 * contra um único segredo global do processo (`BIRTH_VOICES_WEBHOOK_SECRET`) e depois confiava
 * cegamente no `organizationId` vindo do próprio payload. Quem detivesse o segredo global podia
 * forjar eventos de resultado de ligação para QUALQUER outra organização (escrever Activity/
 * TimelineEvent, disparar WhatsApp, atualizar Lead de um tenant que nunca autorizou aquele
 * segredo). Estes testes provam o isolamento por organização a nível de handler HTTP.
 */

const envHolder: { BIRTH_VOICES_WEBHOOK_SECRET: string | undefined } = {
  BIRTH_VOICES_WEBHOOK_SECRET: 'segredo-global',
};
vi.mock('@/config/env', () => ({
  env: envHolder,
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mesmo cuidado do bitrix.webhook.test.ts: sem este mock, testes reenviando corpos parecidos
// colidiriam no fingerprint de `claimWebhookDelivery` (dedupe de entrega) e um teste seguinte
// seria tratado como replay do anterior.
vi.mock('@/shared/security/webhookReplayGuard', () => ({
  claimWebhookDelivery: vi.fn().mockResolvedValue('fresh'),
  webhookDeliveryFingerprint: vi.fn((...parts: unknown[]) => JSON.stringify(parts)),
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

const prismaMock = {
  voiceHubConnection: { findMany: vi.fn() },
  lead: { findFirst: vi.fn(), update: vi.fn() },
  activity: { findFirst: vi.fn(), create: vi.fn() },
  timelineEvent: { create: vi.fn() },
  voiceCallLog: { create: vi.fn() },
};
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

vi.mock('@/features/integrations/birth-voice/callSuppression.service', () => ({
  recordOptOut: vi.fn(),
}));

vi.mock('@/features/integrations/whatsapp/whatsapp.service', () => ({
  sendWhatsAppMessage: vi.fn(),
}));

vi.mock('@/shared/di/container', () => ({
  container: { resolve: vi.fn() },
}));

const ORG_A = 'org-a';
const ORG_B = 'org-b';
const SECRET_ORG_A = 'segredo-conexao-org-a';
const SECRET_ORG_B = 'segredo-conexao-org-b';
const SECRET_GLOBAL = 'segredo-global';

function sign(secret: string, body: Buffer): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function payload(organizationId: string, leadId = 'lead-1'): Buffer {
  return Buffer.from(
    JSON.stringify({
      type: 'agent.call.ended',
      data: {
        callSid: 'call-1',
        outcome: 'Não atendida',
        durationSeconds: 0,
        transcript: [],
        context: { organizationId, leadId },
      },
    }),
    'utf8',
  );
}

/** Simula `findMany({ where: { organizationId, webhookSecret: { not: null } } })` — cada
 *  organização só enxerga a própria conexão, nunca a de outra. */
function connectionsFor(map: Record<string, string>) {
  prismaMock.voiceHubConnection.findMany.mockImplementation(
    async ({ where }: { where: { organizationId: string } }) => {
      const secret = map[where.organizationId];
      return secret ? [{ id: `conn-${where.organizationId}`, webhookSecret: secret }] : [];
    },
  );
}

async function buildApp() {
  const { birthVoiceWebhookRoutes } = await import('../birthVoice.webhook.js');
  const app = express();
  app.use(birthVoiceWebhookRoutes);
  return app;
}

function post(app: express.Express, body: Buffer, signature: string | undefined) {
  // Content-Type NÃO pode ser 'application/json' aqui: superagent serializa qualquer corpo
  // não-string via `JSON.stringify` quando o Content-Type declarado é JSON — mesmo um Buffer já
  // pronto vira `{"type":"Buffer","data":[...]}` em vez dos bytes crus, o que quebraria a
  // assinatura HMAC pré-calculada sobre o Buffer original. 'application/octet-stream' evita essa
  // serialização e o handler aceita de qualquer forma (`express.raw({ type: '*/*' })`).
  const req = request(app).post('/webhook').set('Content-Type', 'application/octet-stream');
  if (signature !== undefined) req.set('x-birthvoices-signature', signature);
  return req.send(body);
}

beforeEach(() => {
  vi.clearAllMocks();
  contextStore.length = 0;
  envHolder.BIRTH_VOICES_WEBHOOK_SECRET = SECRET_GLOBAL;
  prismaMock.voiceHubConnection.findMany.mockResolvedValue([]);
  prismaMock.lead.findFirst.mockResolvedValue(null); // atalho: "lead-not-found" sem precisar montar todo o resto do registro
});

describe('POST /webhook (Birth Voices Hub) — isolamento de tenant do segredo (ACH-06-01)', () => {
  it('aceita quando a assinatura bate com o segredo PRÓPRIO da conexão da organização declarada no payload', async () => {
    connectionsFor({ [ORG_A]: SECRET_ORG_A });
    const body = payload(ORG_A);
    const app = await buildApp();

    const res = await post(app, body, sign(SECRET_ORG_A, body));

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('lead-not-found');
    expect(prismaMock.lead.findFirst).toHaveBeenCalled();
    expect(contextStore.some((s) => s.tenantId === ORG_A)).toBe(true);
  });

  it('REJEITA webhook declarando Org A quando assinado com o segredo de Org B (não pode forjar entre organizações)', async () => {
    connectionsFor({ [ORG_A]: SECRET_ORG_A, [ORG_B]: SECRET_ORG_B });
    const body = payload(ORG_A);
    const app = await buildApp();

    const res = await post(app, body, sign(SECRET_ORG_B, body));

    expect(res.status).toBe(401);
    expect(prismaMock.lead.findFirst).not.toHaveBeenCalled();
  });

  it('REJEITA quando a organização declarada tem conexão própria mas nenhum segredo bate (nem o próprio, nem qualquer outro)', async () => {
    connectionsFor({ [ORG_A]: SECRET_ORG_A });
    const body = payload(ORG_A);
    const app = await buildApp();

    const res = await post(app, body, sign('segredo-totalmente-errado', body));

    expect(res.status).toBe(401);
    expect(prismaMock.lead.findFirst).not.toHaveBeenCalled();
  });

  it('REGRESSÃO CENTRAL: organização com conexão própria NÃO aceita mais o segredo global — antes desta correção isto era exatamente o que permitia forjar eventos entre organizações', async () => {
    connectionsFor({ [ORG_A]: SECRET_ORG_A });
    const body = payload(ORG_A);
    const app = await buildApp();

    // Assinado com o segredo GLOBAL, não com o segredo específico de Org A.
    const res = await post(app, body, sign(SECRET_GLOBAL, body));

    expect(res.status).toBe(401);
    expect(prismaMock.lead.findFirst).not.toHaveBeenCalled();
  });

  it('cai para o segredo global quando a organização declarada NÃO tem nenhuma conexão própria cadastrada (compatibilidade com quem ainda não migrou)', async () => {
    connectionsFor({ [ORG_A]: SECRET_ORG_A }); // org-c não está no mapa — sem conexão própria
    const ORG_C = 'org-c';
    const body = payload(ORG_C);
    const app = await buildApp();

    const res = await post(app, body, sign(SECRET_GLOBAL, body));

    expect(res.status).toBe(200);
    expect(contextStore.some((s) => s.tenantId === ORG_C)).toBe(true);
  });

  it('503 fail-closed quando a organização não tem conexão própria E o segredo global também não está configurado', async () => {
    envHolder.BIRTH_VOICES_WEBHOOK_SECRET = undefined;
    connectionsFor({});
    const body = payload('org-sem-conexao');
    const app = await buildApp();

    const res = await post(app, body, 'qualquer-coisa');

    expect(res.status).toBe(503);
    expect(prismaMock.lead.findFirst).not.toHaveBeenCalled();
  });

  it('401 (não 503) quando a organização TEM conexão própria mas a assinatura não bate, mesmo com segredo global configurado', async () => {
    connectionsFor({ [ORG_A]: SECRET_ORG_A });
    const body = payload(ORG_A);
    const app = await buildApp();

    const res = await post(app, body, sign('segredo-errado', body));

    expect(res.status).toBe(401);
  });

  it('rejeita sem cabeçalho de assinatura', async () => {
    connectionsFor({ [ORG_A]: SECRET_ORG_A });
    const body = payload(ORG_A);
    const app = await buildApp();

    const res = await post(app, body, undefined);

    expect(res.status).toBe(401);
    expect(prismaMock.lead.findFirst).not.toHaveBeenCalled();
  });
});
