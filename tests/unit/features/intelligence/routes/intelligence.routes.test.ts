/**
 * PUT /api/intelligence/ai-settings grava configuração de provider/modelo/temperatura por
 * ferramenta de IA — `AiEngineSetting` não tem `organizationId` (é config global, compartilhada
 * por todos os tenants; ver ai-settings.service.ts). Antes desta correção (auditoria de
 * autorização da Onda 1), a rota não tinha `requireRole` nenhum: qualquer usuário autenticado de
 * qualquer tenant, de qualquer papel (inclusive VISUALIZADOR, que só deveria ter leitura), podia
 * mudar a configuração de IA usada pela plataforma inteira. Este teste tranca que só ADMIN grava.
 *
 * TENANT-002 (auditoria de débito técnico): `requireRole(['ADMIN'])` sozinho não bastava, porque
 * ADMIN é um papel POR ORGANIZAÇÃO — o admin de QUALQUER tenant cliente conseguia mudar a
 * configuração de IA de TODOS os outros tenants da plataforma. A rota agora também exige
 * `requirePlatformOperator` (mesma trava de `/admin/queues`, SEC-001/SEC-002) — só um operador de
 * infraestrutura de verdade, não um admin de cliente, pode gravar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const listAiSettingsMock = vi.fn();
const saveAiSettingsMock = vi.fn();

vi.mock('@/features/intelligence/services/ai-settings.service', () => ({
  listAiSettings: (...args: unknown[]) => listAiSettingsMock(...args),
  saveAiSettings: (...args: unknown[]) => saveAiSettingsMock(...args),
}));

const listPendingActionsMock = vi.fn();
const approvePendingActionMock = vi.fn();
const discardPendingActionMock = vi.fn();

vi.mock('@/features/intelligence/services/pending-actions.service', () => ({
  listPendingActions: (...args: unknown[]) => listPendingActionsMock(...args),
  approvePendingAction: (...args: unknown[]) => approvePendingActionMock(...args),
  discardPendingAction: (...args: unknown[]) => discardPendingActionMock(...args),
}));

// REVOPS-004: a rota manual de Win/Loss agora reusa analyzeOrgWinLoss/persistWinLossReport em vez
// de reimplementar a lógica inline — mockados aqui pelas mesmas razões dos serviços acima.
const analyzeOrgWinLossMock = vi.fn();
const persistWinLossReportMock = vi.fn();
vi.mock('@/features/intelligence/services/winLossAnalysis.worker', () => ({
  analyzeOrgWinLoss: (...args: unknown[]) => analyzeOrgWinLossMock(...args),
  persistWinLossReport: (...args: unknown[]) => persistWinLossReportMock(...args),
}));

const reportFindFirstMock = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: { report: { findFirst: (...args: unknown[]) => reportFindFirstMock(...args) } },
}));

// AI-007 (parte 3): mesmo gate LGPD já testado em base.agent.consent.test.ts/
// guardrails.service.test.ts, agora também para /toolkit/execute — fail-closed por padrão
// (undefined), cada teste do bloco liga a allowlist explicitamente quando precisa simular
// consentimento. `vi.hoisted` (em vez do truque de nome prefixado "mock") porque este arquivo já
// tem vários blocos `vi.mock` distintos e precisa de ordem de inicialização garantida.
const { mockEnv, summarizeLeadMock } = vi.hoisted(() => ({
  mockEnv: {
    AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS: undefined as unknown,
    // TENANT-002: PUT /ai-settings agora também exige requirePlatformOperator, que lê este valor
    // de `env` diretamente (src/shared/middlewares/requirePlatformOperator.ts). Fica indefinido
    // por padrão (fail-closed) e cada teste liga quando precisa simular o operador de plataforma.
    PLATFORM_OPERATOR_TOKEN: undefined as string | undefined,
    NODE_ENV: 'test',
  },
  summarizeLeadMock: vi.fn(),
}));
vi.mock('@/config/env', () => ({ env: mockEnv }));
vi.mock('@/lib/ai/features', () => ({
  summarizeLead: (...args: unknown[]) => summarizeLeadMock(...args),
  generateEmailDraft: vi.fn(),
  predictConversionScore: vi.fn(),
  generateMeetingAgenda: vi.fn(),
  draftFollowUp: vi.fn(),
  scoreLeadQuality: vi.fn(),
  suggestNextAction: vi.fn(),
  generateObjectionHandling: vi.fn(),
  analyzeCompetitors: vi.fn(),
  generateElevatorPitch: vi.fn(),
  identifyPainPoints: vi.fn(),
  createColdCallScript: vi.fn(),
  summarizeMeetingNotes: vi.fn(),
  generateLinkedInMessage: vi.fn(),
  evaluateDealRisk: vi.fn(),
  analyzeSentiment: vi.fn(),
  extractKeywords: vi.fn(),
  categorizeLead: vi.fn(),
  translateText: vi.fn(),
  extractActionItems: vi.fn(),
}));

import { intelligenceRoutes } from '@/features/intelligence/routes/intelligence.routes';
import { errorHandler } from '@/shared/middlewares/errorHandler';

function buildApp(role: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: { id: string; organizationId: string; role: string } }).user = {
      id: 'test-user',
      organizationId: 'test-org-id',
      role,
    };
    next();
  });
  app.use('/api/intelligence', intelligenceRoutes);
  app.use(errorHandler);
  return app;
}

const validPayload = {
  settings: [{ toolKey: 'copilot', provider: 'local', model: 'local-llama3', temperature: 0.5 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  listAiSettingsMock.mockResolvedValue([]);
  saveAiSettingsMock.mockResolvedValue([{ toolKey: 'copilot' }]);
  approvePendingActionMock.mockResolvedValue({
    action: { id: 'pending-1' },
    execution: { sent: true },
  });
  discardPendingActionMock.mockResolvedValue(true);
  summarizeLeadMock.mockResolvedValue('Resumo gerado.');
  analyzeOrgWinLossMock.mockResolvedValue(null);
  persistWinLossReportMock.mockResolvedValue(undefined);
  reportFindFirstMock.mockResolvedValue(null);
});

afterEach(() => {
  mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = undefined;
  mockEnv.PLATFORM_OPERATOR_TOKEN = undefined;
});

/**
 * SEC-011: aprovar/descartar uma AIPendingAction dispara efeito real (enviar e-mail, criar
 * nota/atividade — ver executeAction em aiPendingAction.service.ts). Antes desta correção, as duas
 * rotas não tinham `requireRole` — qualquer papel autenticado do tenant, inclusive VISUALIZADOR
 * (só leitura), podia confirmar uma ação de alto impacto. Este teste tranca que só
 * ADMIN/GESTOR/CLOSER/SDR podem aprovar/descartar.
 */
describe('POST /api/intelligence/pending/:id/approve — autorização (ação de alto impacto)', () => {
  it.each(['ADMIN', 'GESTOR', 'CLOSER', 'SDR'])(
    '%s aprova com sucesso (papel permitido)',
    async (role) => {
      const res = await request(buildApp(role)).post('/api/intelligence/pending/pending-1/approve');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(approvePendingActionMock).toHaveBeenCalledWith(
        expect.anything(),
        'test-org-id',
        'pending-1',
        'test-user',
      );
    },
  );

  it('VISUALIZADOR recebe 403 e não aprova (papel negado)', async () => {
    const res = await request(buildApp('VISUALIZADOR')).post(
      '/api/intelligence/pending/pending-1/approve',
    );

    expect(res.status).toBe(403);
    expect(approvePendingActionMock).not.toHaveBeenCalled();
  });

  it('sem sessão autenticada recebe 401 e não aprova', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/intelligence', intelligenceRoutes);
    app.use(errorHandler);

    const res = await request(app).post('/api/intelligence/pending/pending-1/approve');

    expect(res.status).toBe(401);
    expect(approvePendingActionMock).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/intelligence/pending/:id — autorização (descarte de ação de alto impacto)', () => {
  it.each(['ADMIN', 'GESTOR', 'CLOSER', 'SDR'])(
    '%s descarta com sucesso (papel permitido)',
    async (role) => {
      const res = await request(buildApp(role)).delete('/api/intelligence/pending/pending-1');

      expect(res.status).toBe(204);
      expect(discardPendingActionMock).toHaveBeenCalledWith(
        expect.anything(),
        'test-org-id',
        'pending-1',
        'test-user',
      );
    },
  );

  it('VISUALIZADOR recebe 403 e não descarta (papel negado)', async () => {
    const res = await request(buildApp('VISUALIZADOR')).delete(
      '/api/intelligence/pending/pending-1',
    );

    expect(res.status).toBe(403);
    expect(discardPendingActionMock).not.toHaveBeenCalled();
  });
});

describe('PUT /api/intelligence/ai-settings — autorização (config global, sem tenant)', () => {
  it('ADMIN de tenant SEM o token de operador de plataforma recebe 403 e não grava (TENANT-002)', async () => {
    // Simula exatamente o cenário do bug: um ADMIN de tenant válido, mas sem ser operador de
    // infraestrutura da plataforma. requirePlatformOperator nega mesmo com PLATFORM_OPERATOR_TOKEN
    // configurado no servidor, porque nenhum token foi apresentado na requisição.
    mockEnv.PLATFORM_OPERATOR_TOKEN = 'operator-secret-value';

    const res = await request(buildApp('ADMIN'))
      .put('/api/intelligence/ai-settings')
      .send(validPayload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(saveAiSettingsMock).not.toHaveBeenCalled();
  });

  it('ADMIN de tenant com token de operador de plataforma CORRETO grava com sucesso', async () => {
    mockEnv.PLATFORM_OPERATOR_TOKEN = 'operator-secret-value';

    const res = await request(buildApp('ADMIN'))
      .put('/api/intelligence/ai-settings')
      .set('x-platform-operator-token', 'operator-secret-value')
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(saveAiSettingsMock).toHaveBeenCalledWith(validPayload.settings);
  });

  it('ADMIN de tenant com token de operador de plataforma ERRADO recebe 403 e não grava', async () => {
    mockEnv.PLATFORM_OPERATOR_TOKEN = 'operator-secret-value';

    const res = await request(buildApp('ADMIN'))
      .put('/api/intelligence/ai-settings')
      .set('x-platform-operator-token', 'token-errado')
      .send(validPayload);

    expect(res.status).toBe(403);
    expect(saveAiSettingsMock).not.toHaveBeenCalled();
  });

  it('sem PLATFORM_OPERATOR_TOKEN configurado no servidor: nega por padrão (503, fail-closed) mesmo para ADMIN', async () => {
    mockEnv.PLATFORM_OPERATOR_TOKEN = undefined;

    const res = await request(buildApp('ADMIN'))
      .put('/api/intelligence/ai-settings')
      .send(validPayload);

    expect(res.status).toBe(503);
    expect(saveAiSettingsMock).not.toHaveBeenCalled();
  });

  it.each(['GESTOR', 'CLOSER', 'SDR', 'VISUALIZADOR'])(
    '%s recebe 403 e não grava (papel negado), mesmo apresentando o token de operador de plataforma',
    async (role) => {
      mockEnv.PLATFORM_OPERATOR_TOKEN = 'operator-secret-value';

      const res = await request(buildApp(role))
        .put('/api/intelligence/ai-settings')
        .set('x-platform-operator-token', 'operator-secret-value')
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(saveAiSettingsMock).not.toHaveBeenCalled();
    },
  );

  it('sem sessão autenticada recebe 401 e não grava', async () => {
    mockEnv.PLATFORM_OPERATOR_TOKEN = 'operator-secret-value';
    const app = express();
    app.use(express.json());
    app.use('/api/intelligence', intelligenceRoutes);
    app.use(errorHandler);

    const res = await request(app)
      .put('/api/intelligence/ai-settings')
      .set('x-platform-operator-token', 'operator-secret-value')
      .send(validPayload);

    expect(res.status).toBe(401);
    expect(saveAiSettingsMock).not.toHaveBeenCalled();
  });

  it('GET /api/intelligence/ai-settings continua acessível a qualquer papel autenticado (somente leitura), sem exigir token de operador', async () => {
    const res = await request(buildApp('VISUALIZADOR')).get('/api/intelligence/ai-settings');

    expect(res.status).toBe(200);
    expect(listAiSettingsMock).toHaveBeenCalled();
  });
});

/**
 * AI-007 (parte 3): `/toolkit/execute` despacha texto livre digitado/colado por um operador humano
 * (ex.: anotações de reunião, rascunho de e-mail) para o gateway de IA externo. Igual ao texto livre
 * de missão do BDR/Closer/CRM (ver base.agent.consent.test.ts), pode conter PII de um titular real
 * sem nenhum sinal estrutural — antes desta correção, o endpoint não tinha NENHUMA checagem de base
 * legal LGPD, ao contrário de todo outro caminho que envia dado pessoal a um provedor externo.
 */
describe('POST /api/intelligence/toolkit/execute — trava de consentimento LGPD', () => {
  it('bloqueia com 403 quando a organização não tem base legal registrada, sem chamar a função de IA', async () => {
    const res = await request(buildApp('ADMIN'))
      .post('/api/intelligence/toolkit/execute')
      .send({ functionName: 'summarizeLead', args: ['Anotação com dados do lead.'] });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('test-org-id');
    expect(summarizeLeadMock).not.toHaveBeenCalled();
  });

  it('executa normalmente quando a organização está na allowlist de consentimento', async () => {
    mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = 'test-org-id';

    const res = await request(buildApp('ADMIN'))
      .post('/api/intelligence/toolkit/execute')
      .send({ functionName: 'summarizeLead', args: ['Anotação com dados do lead.'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(summarizeLeadMock).toHaveBeenCalled();
  });

  it('sem sessão autenticada (sem req.user) também falha fechado e não chama a função de IA', async () => {
    // Em produção, `requireTenant` (montado em src/bootstrap/routes.ts, fora do escopo deste
    // teste de rota isolada) já barra com 401 antes de chegar aqui. Este caso cobre a rota em
    // si: mesmo sem `req.user`, `assertPiiExternalConsent(null)` também nega (organizationId
    // nulo nunca está na allowlist) — nunca um "undefined" solto chega a chamar a IA.
    const app = express();
    app.use(express.json());
    app.use('/api/intelligence', intelligenceRoutes);
    app.use(errorHandler);

    const res = await request(app)
      .post('/api/intelligence/toolkit/execute')
      .send({ functionName: 'summarizeLead', args: ['Anotação com dados do lead.'] });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(summarizeLeadMock).not.toHaveBeenCalled();
  });
});

/**
 * REVOPS-004 (onda 5): esta rota reimplementava a mesma lógica do worker inline; agora reusa
 * analyzeOrgWinLoss/persistWinLossReport (única implementação) e persiste o resultado, exposto por
 * GET /win-loss-analysis/latest logo abaixo.
 */
describe('POST /api/intelligence/win-loss-analysis — reusa análise única e persiste', () => {
  it('sem leads no período: devolve mensagem honesta e NÃO persiste nada', async () => {
    analyzeOrgWinLossMock.mockResolvedValue(null);

    const res = await request(buildApp('SDR')).post('/api/intelligence/win-loss-analysis');

    expect(res.status).toBe(200);
    expect(res.body.analysis).toMatch(/Nenhum lead fechado/);
    expect(persistWinLossReportMock).not.toHaveBeenCalled();
  });

  it('com leads no período: chama analyzeOrgWinLoss com a org do usuário e persiste como WIN_LOSS_ON_DEMAND', async () => {
    analyzeOrgWinLossMock.mockResolvedValue({
      organizationId: 'test-org-id',
      analysis: '1. Ganhos...\n2. Objeções...\n3. Recomendação...',
      leadsAnalyzed: 5,
    });

    const res = await request(buildApp('SDR')).post('/api/intelligence/win-loss-analysis');

    expect(res.status).toBe(200);
    expect(res.body.leadsAnalyzed).toBe(5);
    expect(analyzeOrgWinLossMock).toHaveBeenCalledWith('test-org-id');
    expect(persistWinLossReportMock).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'test-org-id', leadsAnalyzed: 5 }),
      'WIN_LOSS_ON_DEMAND',
    );
  });
});

describe('GET /api/intelligence/win-loss-analysis/latest — expõe o resultado persistido', () => {
  it('devolve o último Report de Win/Loss (automático ou manual) desta organização', async () => {
    reportFindFirstMock.mockResolvedValue({
      id: 'report-1',
      content: 'análise persistida',
      source: 'WEEKLY_WIN_LOSS_AUTO',
      createdAt: new Date('2026-09-12T19:00:00Z'),
    });

    const res = await request(buildApp('SDR')).get('/api/intelligence/win-loss-analysis/latest');

    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('análise persistida');
    expect(reportFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'test-org-id',
          source: { in: ['WEEKLY_WIN_LOSS_AUTO', 'WIN_LOSS_ON_DEMAND'] },
        },
      }),
    );
  });

  it('devolve null (não erro) quando nenhuma análise foi persistida ainda para esta organização', async () => {
    reportFindFirstMock.mockResolvedValue(null);

    const res = await request(buildApp('SDR')).get('/api/intelligence/win-loss-analysis/latest');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});
