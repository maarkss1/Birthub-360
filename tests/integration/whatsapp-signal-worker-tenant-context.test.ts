import { afterAll, describe, expect, it, vi } from 'vitest';

// Regressão (CI "application gate", step "Run E2E Tests", falha intermitente desde a migration
// 20260908020000_multi_cargo_agent_governance_foundation — ver PR que introduziu este teste):
// `analyzeConversation` (src/features/integrations/whatsapp/conversation-intelligence.service.ts)
// só é chamada pelo worker BullMQ `whatsappSignal.worker.ts`, fora de qualquer request HTTP. Antes
// da correção, a função nunca envolvia suas escritas em `requestContext.run({ tenantId })`
// (src/lib/async-context.ts) — a extensão do Prisma (src/lib/prisma.ts, `$allOperations`) via
// `requestContext.getStore()` retornando undefined, executava a query sem `SET LOCAL
// app.current_tenant_id`, e a policy de RLS de ConversationSignal (FORCE ROW LEVEL SECURITY, ver
// migration 20260825120000_scope_rls_bypass_to_bootstrap_allowlist) rejeitava a linha com "new row
// violates row-level security policy for table ConversationSignal". Este teste chama a função
// exatamente como o worker chama — sem nenhum `requestContext.run` ao redor — contra Postgres/RLS
// reais (nunca mock de banco), para provar que a correção realmente resolve o cenário de produção,
// não só o de teste unitário (que mocka `prisma` e não exercitava a RLS real).
const mockEnv: Record<string, unknown> = {};
vi.mock('../../src/config/env.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config/env.js')>();
  return {
    env: new Proxy(actual.env, {
      get: (target, prop) => mockEnv[prop as string] ?? (target as never)[prop],
    }),
  };
});

const invoke = vi.fn().mockResolvedValue({
  content: JSON.stringify({
    intent: 'alta_intencao_compra',
    urgency: 'alta',
    objections: [],
    budgetMentioned: false,
    nextStep: null,
    summary: 'Cliente pediu proposta.',
    confidence: 0.7,
  }),
  response_metadata: {
    model: 'local-llama3',
    tokenUsage: { totalTokens: 1, promptTokens: 1, completionTokens: 1 },
  },
});
vi.mock('../../src/lib/ai/gateway.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/ai/gateway.js')>();
  return {
    ...actual,
    getAiModel: () => ({ invoke }),
    logAiUsage: vi.fn().mockResolvedValue(undefined),
  };
});

const { prisma } = await import('../../src/lib/prisma.js');
const { requestContext } = await import('../../src/lib/async-context.js');
const { analyzeConversation } =
  await import('../../src/features/integrations/whatsapp/conversation-intelligence.service.js');

const withBypass = <T>(fn: () => Promise<T>): Promise<T> =>
  requestContext.run({ bypassRls: true }, fn);
const withTenant = <T>(tenantId: string, fn: () => Promise<T>): Promise<T> =>
  requestContext.run({ tenantId }, fn);

const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const ORG_ID = `test-cs-worker-org-${suffix}`;

describe('analyzeConversation chamada como o worker BullMQ chama (sem requestContext ambiente)', () => {
  afterAll(async () => {
    await withTenant(ORG_ID, () =>
      prisma.conversationSignal.deleteMany({ where: { organizationId: ORG_ID } }),
    );
    await withBypass(async () => {
      await prisma.whatsAppMessage.deleteMany({ where: { organizationId: ORG_ID } });
      await prisma.lead.deleteMany({ where: { organizationId: ORG_ID } });
      await prisma.organization.deleteMany({ where: { id: ORG_ID } });
    });
  });

  it('persiste o ConversationSignal mesmo chamada fora de qualquer requestContext.run ambiente', async () => {
    mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = '*';

    await withBypass(() =>
      prisma.organization.create({ data: { id: ORG_ID, name: 'Test CS Worker Org' } }),
    );
    const lead = await withTenant(ORG_ID, () =>
      prisma.lead.create({ data: { organizationId: ORG_ID, title: 'Negócio worker' } }),
    );
    await withTenant(ORG_ID, () =>
      prisma.whatsAppMessage.create({
        data: {
          organizationId: ORG_ID,
          waMessageId: `wa-${suffix}`,
          direction: 'inbound',
          phoneE164: '+5511999990000',
          body: 'Quero saber o preço da proposta.',
          leadId: lead.id,
        },
      }),
    );

    // Chamada direta, exatamente como whatsappSignal.worker.ts:73 chama — nenhum requestContext.run
    // ambiente aqui, de propósito: é o cenário real do worker BullMQ, fora de qualquer request HTTP.
    await analyzeConversation(lead.id, ORG_ID);

    const signals = await withTenant(ORG_ID, () =>
      prisma.conversationSignal.findMany({ where: { organizationId: ORG_ID, leadId: lead.id } }),
    );
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      organizationId: ORG_ID,
      leadId: lead.id,
      intent: 'alta_intencao_compra',
      summary: 'Cliente pediu proposta.',
    });
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
