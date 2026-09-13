import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// AIAGENT-004 (onda 6 — "Execução Real de Agentes de IA"): a onda 43 implementou 9 agentes novos da
// Célula Comercial e conectou apenas 3 a rotas HTTP. Os outros 6 tinham classe completa e ZERO
// import sites em todo o `src/` (confirmado por grep no reaudit desta onda). Este arquivo trava:
//
//  - que as 5 rotas criadas nesta onda existem, consomem o motor REAL via DI container e nunca
//    aceitam `organizationId` do body;
//  - que `billing-revenue` continua sem rota DE PROPÓSITO, com o motivo registrado no catálogo
//    (ele é o único dos 6 sem fonte de dado real — ver `commercialAgentRegistry.ts`);
//  - que `GET /api/agent/commercial-cell` deixou de implicar paridade entre quem tem e quem não
//    tem caminho de entrega (campo `httpRoute`).

const ldrRun = vi.fn();
const coordinatorRun = vi.fn();
const managerRun = vi.fn();
const executiveRun = vi.fn();
const bitrixGuardianRun = vi.fn();

// As rotas instanciam o agente com `new` (mesmo padrão dos 3 já roteados), então o mock precisa ser
// construtível — uma arrow function de `vi.fn()` não é.
vi.mock('../../../../../src/features/intelligence/agents/ldrIntelligence.agent.js', () => ({
  LdrIntelligenceAgent: class {
    run = ldrRun;
  },
}));
vi.mock('../../../../../src/features/intelligence/agents/coordinatorCommercial.agent.js', () => ({
  CoordinatorCommercialAgent: class {
    run = coordinatorRun;
  },
}));
vi.mock('../../../../../src/features/intelligence/agents/managerCommercial.agent.js', () => ({
  ManagerCommercialAgent: class {
    run = managerRun;
  },
}));
vi.mock('../../../../../src/features/intelligence/agents/executiveDirector.agent.js', () => ({
  ExecutiveDirectorAgent: class {
    run = executiveRun;
  },
}));
vi.mock('../../../../../src/features/intelligence/agents/bitrixGuardian.agent.js', () => ({
  BitrixGuardianAgent: class {
    run = bitrixGuardianRun;
  },
}));

// Os 3 agentes já roteados desde a onda 43 e o resto do módulo de rotas — mesmo conjunto de mocks
// já usado por `agent.routes.slo.test.ts`, para que importar `agent.routes.ts` não puxe o gateway
// de IA real nem o enxame.
vi.mock('../../../../../src/features/intelligence/agents/revenueIntelligence.agent.js', () => ({
  RevenueIntelligenceAgent: vi.fn(),
}));
vi.mock('../../../../../src/features/intelligence/agents/churnRetention.agent.js', () => ({
  ChurnRetentionAgent: vi.fn(),
}));
vi.mock('../../../../../src/features/intelligence/agents/contractSignature.agent.js', () => ({
  ContractSignatureAgent: vi.fn(),
}));
vi.mock('../../../../../src/lib/ai/gateway.js', () => ({
  getAiModel: vi.fn(),
  logAiUsage: vi.fn(),
}));
vi.mock('../../../../../src/features/intelligence/services/guardrails.service.js', () => ({
  redactAndTrackPiiLeak: vi.fn(async (text: string) => text),
}));
vi.mock('../../../../../src/features/intelligence/services/swarmScheduler.service.js', () => ({
  getSwarmSloSnapshot: vi.fn(),
}));
vi.mock('../../../../../src/features/intelligence/services/evaluationMetrics.service.js', () => ({
  getEvaluationMetricsSnapshot: vi.fn(),
}));
vi.mock('../../../../../src/features/intelligence/services/voicebox.service.js', () => ({
  synthesizeSpeech: vi.fn(),
}));
vi.mock('../../../../../src/features/intelligence/agents/supervisor.agent.js', () => ({
  SwarmOrchestrator: vi.fn(),
}));
vi.mock('../../../../../src/features/intelligence/agents/learning.agent.js', () => ({
  LearningAgent: vi.fn(),
  getLearningProfileHistory: vi.fn(),
  rollbackLearningProfile: vi.fn(),
  approveLearningProfileVersion: vi.fn(),
  rejectLearningProfileVersion: vi.fn(),
}));

import { agentRoutes } from '@/features/intelligence/routes/agent.routes';
import { COMMERCIAL_AGENT_REGISTRY } from '@/features/intelligence/agents/commercialAgentRegistry';
import { container } from '@/shared/di/container';
import { errorHandler } from '@/shared/middlewares/errorHandler';

// ─── Fakes do motor real (mesmo shape dos serviços registrados em src/shared/di/setup.ts) ─────────

const alerts = vi.fn();
const aging = vi.fn();
const leadingIndicators = vi.fn();
const executiveOverview = vi.fn();
const performance = vi.fn();
const losses = vi.fn();
const historicalTrends = vi.fn();
const forecastAccuracy = vi.fn();
const healthScore = vi.fn();
const crmQuality = vi.fn();
const getIntelligence = vi.fn();
const accountServiceFactoryCreate = vi.fn(() => ({ getIntelligence }));

function buildApp(organizationId = 'org-1', withDb = true) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const typed = req as unknown as {
      user: { id: string; organizationId: string; role: string };
      db?: unknown;
    };
    typed.user = { id: 'test-user', organizationId, role: 'GESTOR' };
    if (withDb) typed.db = { __tenantScopedPrisma: true };
    next();
  });
  app.use('/api/agent', agentRoutes);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  container.register('CommercialIntelligenceUseCases', {
    alerts,
    aging,
    leadingIndicators,
    executiveOverview,
    performance,
    losses,
    historicalTrends,
    forecastAccuracy,
    healthScore,
    crmQuality,
  });
  container.register('AccountIntelligenceServiceFactory', {
    create: accountServiceFactoryCreate,
  });

  alerts.mockResolvedValue([
    { severity: 'critical', title: 'Cobertura abaixo do mínimo', description: 'x', metricValue: 1 },
  ]);
  aging.mockResolvedValue({
    buckets: [{ label: '30-60 dias', count: 4, amount: 12000 }],
    byStage: [
      {
        stageName: 'Proposta',
        count: 2,
        amountOverThreshold: 8000,
        averageDaysInStage: 41,
        dataQuality: 'measured',
      },
    ],
    criticalThresholdDays: 30,
    trackingSince: '2026-01-01',
  });
  leadingIndicators.mockResolvedValue({
    weekStart: '2026-09-07',
    weekEnd: '2026-09-13',
    indicators: [
      { label: 'Reuniões', current: 9, previousWeek: 7, movingAverage4w: 8, trend: 'up' },
    ],
    trackingSince: '2026-01-01',
  });
  executiveOverview.mockResolvedValue({
    period: '2026-09',
    goal: { amount: 500000, currency: 'BRL' },
    closedAmount: 120000,
    closedCount: 6,
    pctOfGoal: 24,
    commitAmount: 90000,
    bestCaseAmount: 60000,
    forecastAmount: 310000,
    gapForecast: 190000,
    gapCommit: 290000,
    pipelineTotal: 800000,
    pipelineEligible: 620000,
    coverage90: { coverage: 2.1 },
    forecastConfidence: { score: 68, classification: 'atencao', sampleSize: 22 },
    isEmpty: false,
    dataAsOf: '2026-09-13T00:00:00.000Z',
  });
  performance.mockResolvedValue({
    winRate: 31.5,
    wonCount: 6,
    lostCount: 13,
    opportunities: { open: 40, createdInPeriod: 18, stalled: 5, atRisk: 3 },
    averageTicket: { won: 20000, open: 15000 },
    salesCycle: { meanDays: 44, medianDays: 38, sampleSize: 19 },
    funnel: [{ label: 'Proposta', count: 12, historicalConversionFromPrevious: 48 }],
    firstContactSla: {
      medianHours: 6,
      withinTargetPct: 72,
      targetHours: 24,
      leadsWithoutContact: 4,
    },
  });
  losses.mockResolvedValue({
    totalCount: 13,
    totalAmount: 210000,
    byReason: [{ reason: 'Preço', count: 7, amount: 130000 }],
  });
  historicalTrends.mockResolvedValue({
    points: [
      {
        label: 'ago/26',
        winRate: 28,
        salesCycleMeanDays: 47,
        averageTicketWon: 19000,
        pipelineCreatedAmount: 300000,
        closedSampleSize: 17,
      },
    ],
  });
  forecastAccuracy.mockResolvedValue({
    available: false,
    reason: 'sem_historico_suficiente',
    sampleSize: 0,
    meanAbsoluteErrorPercent: null,
  });
  healthScore.mockResolvedValue({
    overallScore: 61,
    pillars: [
      {
        label: 'Pipeline',
        score: 70,
        classification: 'saudavel',
        unavailableReason: null,
      },
      {
        label: 'Confiabilidade de Forecast',
        score: null,
        classification: null,
        unavailableReason: 'sem histórico de snapshot',
      },
    ],
  });
  crmQuality.mockResolvedValue({
    overallScore: 74,
    evaluatedCount: 40,
    suspectedDuplicateGroups: 2,
    bitrixSync: {
      connected: true,
      totalOpen: 40,
      linked: 33,
      notLinked: 7,
      failed: 1,
      linkedRate: 82.5,
      lastSyncAt: '2026-09-12T10:00:00.000Z',
      syncedCount30d: 410,
      failedCount30d: 9,
      failures: [],
    },
  });
  getIntelligence.mockResolvedValue({
    account: {
      legalName: 'Acme Industria LTDA',
      tradeName: 'Acme',
      cnpj: '00.000.000/0001-00',
      segment: 'Logística',
      size: 'MEDIA',
      employeeCount: 240,
      city: 'Curitiba',
      state: 'PR',
      enrichmentStatus: 'ENRICHED',
      enrichedAt: new Date('2026-09-01T00:00:00.000Z'),
    },
    state: 'available',
    facts: {
      version: 3,
      generatedAt: new Date('2026-09-10T00:00:00.000Z'),
      summary: 'Acme — Logística, Curitiba/PR.',
      status: 'Complete',
    },
    latestInference: {
      total: 78,
      fit: 30,
      timing: 18,
      intent: 20,
      relationship: 10,
      positiveReasons: ['Segmento aderente ao ICP'],
      negativeReasons: ['Sem decisor mapeado'],
      scoreVersion: 'v2',
      calculatedAt: new Date('2026-09-10T00:00:00.000Z'),
    },
    collections: {
      signals: 5,
      decisionMakers: 0,
      relationships: 2,
      recommendations: 3,
      evidence: 11,
    },
  });

  ldrRun.mockResolvedValue({ briefing: 'briefing real', sessionId: 's-ldr' });
  coordinatorRun.mockResolvedValue({ dailyControl: 'fila do dia', sessionId: 's-coord' });
  managerRun.mockResolvedValue({ managementReview: 'review', sessionId: 's-mgr' });
  executiveRun.mockResolvedValue({ executiveBrief: 'brief', sessionId: 's-exec' });
  bitrixGuardianRun.mockResolvedValue({ healthReport: 'diagnóstico', sessionId: 's-bitrix' });
});

// ─── Catálogo ────────────────────────────────────────────────────────────────────────────────────

describe('GET /api/agent/commercial-cell — caminho de entrega explícito (AIAGENT-004)', () => {
  it('devolve o catálogo com o campo httpRoute em todos os 12 agentes', async () => {
    const res = await request(buildApp()).get('/api/agent/commercial-cell');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(12);
    for (const agent of res.body.data) {
      expect(agent).toHaveProperty('httpRoute');
      expect(agent).toHaveProperty('noRouteReason');
    }
  });

  it('todo agente sem httpRoute declara o motivo — ausência de rota nunca é implícita', () => {
    const semRota = COMMERCIAL_AGENT_REGISTRY.filter((agent) => agent.httpRoute === null);

    expect(semRota.map((agent) => agent.id)).toEqual(['billing-revenue']);
    for (const agent of semRota) {
      expect(agent.noRouteReason).toBeTruthy();
    }
  });

  it('billing-revenue continua sem rota de propósito, citando SOURCE_REQUIRED', () => {
    const billing = COMMERCIAL_AGENT_REGISTRY.find((agent) => agent.id === 'billing-revenue');

    expect(billing?.agentModule).toBe('./billingRevenue.agent.js');
    expect(billing?.httpRoute).toBeNull();
    expect(billing?.noRouteReason).toContain('SOURCE_REQUIRED');
  });

  it('os 5 agentes órfãos da AIAGENT-004 agora declaram rota própria', () => {
    const esperado: Record<string, string> = {
      'ldr-intelligence': '/api/agent/commercial-cell/ldr-intelligence/run',
      'coordinator-commercial': '/api/agent/commercial-cell/coordinator-commercial/run',
      'manager-commercial': '/api/agent/commercial-cell/manager-commercial/run',
      'executive-director': '/api/agent/commercial-cell/executive-director/run',
      'bitrix-guardian': '/api/agent/commercial-cell/bitrix-guardian/run',
    };

    for (const [id, route] of Object.entries(esperado)) {
      const agent = COMMERCIAL_AGENT_REGISTRY.find((entry) => entry.id === id);
      expect(agent?.httpRoute, id).toBe(route);
      expect(agent?.noRouteReason, id).toBeNull();
    }
  });
});

// ─── Rotas novas ─────────────────────────────────────────────────────────────────────────────────

describe('POST /api/agent/commercial-cell/ldr-intelligence/run', () => {
  it('busca a inteligência real da conta e narra pelo agente', async () => {
    const res = await request(buildApp('org-1'))
      .post('/api/agent/commercial-cell/ldr-intelligence/run')
      .send({ accountId: 'acc-1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { briefing: 'briefing real', sessionId: 's-ldr' },
    });
    expect(accountServiceFactoryCreate).toHaveBeenCalledWith(
      { __tenantScopedPrisma: true },
      'org-1',
    );
    expect(getIntelligence).toHaveBeenCalledWith('acc-1');

    const contexto = ldrRun.mock.calls[0][0] as string;
    expect(contexto).toContain('Acme');
    expect(contexto).toContain('total 78');
    expect(contexto).toContain('Segmento aderente ao ICP');
  });

  it('organizationId vem de req.user, nunca do body', async () => {
    await request(buildApp('org-real'))
      .post('/api/agent/commercial-cell/ldr-intelligence/run')
      .send({ accountId: 'acc-1', organizationId: 'org-de-outro-tenant' });

    expect(accountServiceFactoryCreate).toHaveBeenCalledWith(expect.anything(), 'org-real');
  });

  it('sem contexto de tenant (req.db ausente) falha honestamente em vez de usar Prisma sem escopo', async () => {
    const res = await request(buildApp('org-1', false))
      .post('/api/agent/commercial-cell/ldr-intelligence/run')
      .send({ accountId: 'acc-1' });

    expect(res.status).toBe(500);
    expect(accountServiceFactoryCreate).not.toHaveBeenCalled();
    expect(ldrRun).not.toHaveBeenCalled();
  });

  it('accountId ausente devolve 400 sem chamar o serviço nem o agente', async () => {
    const res = await request(buildApp())
      .post('/api/agent/commercial-cell/ldr-intelligence/run')
      .send({});

    expect(res.status).toBe(400);
    expect(getIntelligence).not.toHaveBeenCalled();
    expect(ldrRun).not.toHaveBeenCalled();
  });
});

describe('POST /api/agent/commercial-cell/coordinator-commercial/run', () => {
  it('monta o contexto com alertas, aging e indicadores reais', async () => {
    const res = await request(buildApp('org-1'))
      .post('/api/agent/commercial-cell/coordinator-commercial/run')
      .send({ month: '2026-09' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ dailyControl: 'fila do dia', sessionId: 's-coord' });
    expect(alerts).toHaveBeenCalledWith('org-1', { month: '2026-09' });
    expect(aging).toHaveBeenCalledWith('org-1', { month: '2026-09' });
    expect(leadingIndicators).toHaveBeenCalledWith('org-1');

    const contexto = coordinatorRun.mock.calls[0][0] as string;
    expect(contexto).toContain('Cobertura abaixo do mínimo');
    expect(contexto).toContain('30-60 dias');
    expect(contexto).toContain('Reuniões');
  });

  it('month fora do formato YYYY-MM devolve 400 sem chamar o motor', async () => {
    const res = await request(buildApp())
      .post('/api/agent/commercial-cell/coordinator-commercial/run')
      .send({ month: 'setembro' });

    expect(res.status).toBe(400);
    expect(alerts).not.toHaveBeenCalled();
    expect(coordinatorRun).not.toHaveBeenCalled();
  });

  it('organizationId vem de req.user, nunca do body', async () => {
    await request(buildApp('org-real'))
      .post('/api/agent/commercial-cell/coordinator-commercial/run')
      .send({ month: '2026-09', organizationId: 'org-de-outro-tenant' });

    expect(alerts).toHaveBeenCalledWith('org-real', expect.anything());
  });
});

describe('POST /api/agent/commercial-cell/manager-commercial/run', () => {
  it('monta o contexto com overview, performance, aging e perdas reais', async () => {
    const res = await request(buildApp('org-1'))
      .post('/api/agent/commercial-cell/manager-commercial/run')
      .send({ month: '2026-09', owner: 'ana' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ managementReview: 'review', sessionId: 's-mgr' });
    expect(executiveOverview).toHaveBeenCalledWith('org-1', { month: '2026-09', owner: 'ana' });
    expect(losses).toHaveBeenCalledWith('org-1', { month: '2026-09', owner: 'ana' });

    const contexto = managerRun.mock.calls[0][0] as string;
    expect(contexto).toContain('Forecast');
    expect(contexto).toContain('31.5%');
    expect(contexto).toContain('Preço');
  });

  it('valor ausente vira "não disponível", nunca 0 fabricado', async () => {
    executiveOverview.mockResolvedValueOnce({
      period: '2026-09',
      goal: null,
      closedAmount: 0,
      closedCount: 0,
      pctOfGoal: null,
      commitAmount: 0,
      bestCaseAmount: 0,
      forecastAmount: 0,
      gapForecast: null,
      gapCommit: null,
      pipelineTotal: 0,
      pipelineEligible: 0,
      coverage90: { coverage: null },
      forecastConfidence: { score: null, classification: null, sampleSize: 0 },
      isEmpty: true,
      dataAsOf: '2026-09-13T00:00:00.000Z',
    });

    await request(buildApp())
      .post('/api/agent/commercial-cell/manager-commercial/run')
      .send({ month: '2026-09' });

    const contexto = managerRun.mock.calls[0][0] as string;
    expect(contexto).toContain('NÃO CADASTRADA');
    expect(contexto).toContain('Atingimento: não disponível');
    expect(contexto).toContain('Gap de Forecast: não disponível');
    expect(contexto).toContain('nenhum negócio no funil');
  });
});

describe('POST /api/agent/commercial-cell/executive-director/run', () => {
  it('monta o contexto com overview, tendências, health score e erro histórico', async () => {
    const res = await request(buildApp('org-1'))
      .post('/api/agent/commercial-cell/executive-director/run')
      .send({ month: '2026-09' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ executiveBrief: 'brief', sessionId: 's-exec' });
    expect(healthScore).toHaveBeenCalledWith('org-1', { month: '2026-09' });
    expect(forecastAccuracy).toHaveBeenCalledWith('org-1');

    const contexto = executiveRun.mock.calls[0][0] as string;
    expect(contexto).toContain('Health Score composto: 61');
    expect(contexto).toContain('ago/26');
  });

  it('erro histórico indisponível é declarado como lacuna, não omitido', async () => {
    await request(buildApp())
      .post('/api/agent/commercial-cell/executive-director/run')
      .send({ month: '2026-09' });

    const contexto = executiveRun.mock.calls[0][0] as string;
    expect(contexto).toContain('Erro histórico do Forecast: NÃO DISPONÍVEL');
    expect(contexto).toContain('sem_historico_suficiente');
    // Pilar sem dado carrega o motivo, em vez de virar um score fabricado.
    expect(contexto).toContain('sem histórico de snapshot');
  });
});

describe('POST /api/agent/commercial-cell/bitrix-guardian/run', () => {
  it('narra a saúde de sincronização real (somente leitura)', async () => {
    const res = await request(buildApp('org-1'))
      .post('/api/agent/commercial-cell/bitrix-guardian/run')
      .send({ month: '2026-09' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ healthReport: 'diagnóstico', sessionId: 's-bitrix' });
    expect(crmQuality).toHaveBeenCalledWith('org-1', { month: '2026-09' });

    const contexto = bitrixGuardianRun.mock.calls[0][0] as string;
    expect(contexto).toContain('Conexão Bitrix24: ATIVA');
    expect(contexto).toContain('Taxa de vínculo: 82.5%');
    expect(contexto).toContain('410 registros sincronizados');
  });

  it('sem conexão Bitrix, o contexto diz que a base não tem integração — não "integração com falha"', async () => {
    crmQuality.mockResolvedValueOnce({
      overallScore: null,
      evaluatedCount: 0,
      suspectedDuplicateGroups: 0,
      bitrixSync: {
        connected: false,
        totalOpen: 0,
        linked: 0,
        notLinked: 0,
        failed: 0,
        linkedRate: null,
        lastSyncAt: null,
        syncedCount30d: 0,
        failedCount30d: 0,
        failures: [],
      },
    });

    await request(buildApp())
      .post('/api/agent/commercial-cell/bitrix-guardian/run')
      .send({ month: '2026-09' });

    const contexto = bitrixGuardianRun.mock.calls[0][0] as string;
    expect(contexto).toContain('NENHUMA conexão ativa');
    expect(contexto).toContain('Taxa de vínculo: não disponível');
    expect(contexto).toContain('Última importação bem-sucedida: nenhuma registrada');
  });
});
