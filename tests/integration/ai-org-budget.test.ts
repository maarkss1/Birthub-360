import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * DEC-09 (dossiê CPI, onda 42) — teto mensal de IA POR ORGANIZAÇÃO
 * (`Organization.monthlyAiBudgetUsd`), contra Postgres real.
 *
 * Este teste é o "Teste esperado depois da migration" descrito em
 * `.agents/handoffs/onda-42/03-para-00-campo-orcamento-organization.md`: até a migration
 * `20260827210000_onda42_decisoes_schema` rodar, `getOrgAiBudgetUsd` (src/lib/ai/budget.ts) lia a
 * coluna via um `select`/cast temporário e qualquer erro (inclusive "coluna não existe") virava
 * fail-open silencioso. Com a migration aplicada e o cast removido (commit 363879f9), este teste
 * prova contra um Postgres real que:
 *   1. `prisma.organization.findUnique({ select: { monthlyAiBudgetUsd: true } })` funciona sem
 *      cast e sem erro;
 *   2. o valor default de uma organização recém-criada é `null` (sem teto) — não `0`, então ela
 *      nunca é bloqueada por um teto implícito;
 *   3. uma organização COM teto configurado e custo do mês >= teto é bloqueada de verdade
 *      (fail-CLOSED), não só logada.
 *
 * `AI_MONTHLY_BUDGET_USD` (teto GLOBAL, AI-011) é neutralizado para isolar o teto por organização
 * — já coberto por tests/integration/ai-budget.test.ts.
 */
vi.mock('../../src/config/env.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config/env.js')>();
  return { ...actual, env: { ...actual.env, AI_MONTHLY_BUDGET_USD: undefined } };
});

const { prisma } = await import('../../src/lib/prisma');
const { requestContext } = await import('../../src/lib/async-context');
const { env } = await import('../../src/config/env');
const { cacheConnection } = await import('../../src/lib/queue/redis');
const {
  assertAiBudgetNotExceeded,
  AiOrgBudgetExceededError,
  __resetAiBudgetCacheForTests,
  __resetOrgAiBudgetCacheForTests,
} = await import('../../src/lib/ai/budget');

const ORG_ID = 'test-org-id-ai-org-budget';
const PROMPT_PREFIX = 'onda-42-ai-org-budget-';

/**
 * O cache por organização (`getOrgMonthCostUsd`, src/lib/ai/budget.ts) vive em Redis com TTL de
 * 60s, chaveado por `ai-gateway:budget:org:<orgId>:<YYYY-MM>` — `__resetOrgAiBudgetCacheForTests`
 * só limpa o fallback em memória local, não essa chave Redis. Sem limpar as duas, um teste
 * anterior deste arquivo (rodando dentro da mesma janela de 60s) deixaria um custo do mês
 * cacheado stale, e o teste de "excede o teto" falharia silenciosamente lendo um custo antigo.
 */
async function resetOrgBudgetCache() {
  __resetOrgAiBudgetCacheForTests();
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  await cacheConnection.del(`ai-gateway:budget:org:${ORG_ID}:${monthKey}`);
}

async function createOrg() {
  await requestContext.run({ bypassRls: true }, () =>
    prisma.organization.create({ data: { id: ORG_ID, name: 'Test Org AI Org Budget' } }),
  );
}

async function setOrgBudget(monthlyAiBudgetUsd: number | null) {
  await requestContext.run({ bypassRls: true }, () =>
    prisma.organization.update({ where: { id: ORG_ID }, data: { monthlyAiBudgetUsd } }),
  );
}

function createLog(cost: number, promptId: string) {
  return requestContext.run({ tenantId: ORG_ID }, () =>
    prisma.aILog.create({
      data: { organizationId: ORG_ID, tokens: 100, cost, latencyMs: 10, model: 'test-model', promptId },
    }),
  );
}

async function cleanupLogs() {
  await requestContext.run({ bypassRls: true }, () =>
    prisma.aILog.deleteMany({ where: { promptId: { startsWith: PROMPT_PREFIX } } }),
  );
}

describe('DEC-09: teto mensal de IA por organização (Postgres real, pós-migration)', () => {
  beforeEach(async () => {
    (env as { AI_MONTHLY_BUDGET_USD?: number }).AI_MONTHLY_BUDGET_USD = undefined;
    await __resetAiBudgetCacheForTests();
    await resetOrgBudgetCache();
    await cleanupLogs();
    await requestContext.run({ bypassRls: true }, () =>
      prisma.organization.deleteMany({ where: { id: ORG_ID } }),
    );
    await createOrg();
  });

  afterEach(async () => {
    await cleanupLogs();
    await requestContext.run({ bypassRls: true }, () =>
      prisma.organization.deleteMany({ where: { id: ORG_ID } }),
    );
    await __resetAiBudgetCacheForTests();
    await resetOrgBudgetCache();
    (env as { AI_MONTHLY_BUDGET_USD?: number }).AI_MONTHLY_BUDGET_USD = undefined;
  });

  it('organização recém-criada tem monthlyAiBudgetUsd null (sem teto), não 0', async () => {
    const org = await requestContext.run({ bypassRls: true }, () =>
      prisma.organization.findUnique({ where: { id: ORG_ID }, select: { monthlyAiBudgetUsd: true } }),
    );
    expect(org?.monthlyAiBudgetUsd).toBeNull();
  });

  it('sem teto configurado, nunca bloqueia mesmo com custo alto no mês', async () => {
    await createLog(999, `${PROMPT_PREFIX}no-budget`);
    await __resetAiBudgetCacheForTests();
    await resetOrgBudgetCache();

    await expect(
      requestContext.run({ tenantId: ORG_ID }, () => assertAiBudgetNotExceeded()),
    ).resolves.toBeUndefined();
  });

  it('com teto configurado e custo do mês abaixo do teto, não bloqueia', async () => {
    await setOrgBudget(10);
    await createLog(1, `${PROMPT_PREFIX}under`);
    await __resetAiBudgetCacheForTests();
    await resetOrgBudgetCache();

    await expect(
      requestContext.run({ tenantId: ORG_ID }, () => assertAiBudgetNotExceeded()),
    ).resolves.toBeUndefined();
  });

  it('com teto configurado e custo do mês >= teto, bloqueia com AiOrgBudgetExceededError (fail-closed)', async () => {
    await setOrgBudget(5);
    await createLog(5, `${PROMPT_PREFIX}exceed`);
    await __resetAiBudgetCacheForTests();
    await resetOrgBudgetCache();

    await expect(
      requestContext.run({ tenantId: ORG_ID }, () => assertAiBudgetNotExceeded()),
    ).rejects.toThrow(AiOrgBudgetExceededError);
  });
});
