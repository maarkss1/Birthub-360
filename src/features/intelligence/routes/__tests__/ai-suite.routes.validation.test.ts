/**
 * Cobre o contrato HTTP de `ai-suite.routes.ts` (ACH-07-02): 19 dos 20 endpoints do AI Suite Hub
 * liam `req.body` direto, sem `z.object().parse`, deixando payload arbitrário do cliente compor o
 * prompt de IA sem teto de tamanho nem shape garantido. Cada endpoint agora tem um schema Zod
 * (`validateRequest(schema)`) no molde de `knowledgeCopilotSchema`.
 *
 * Segue o mesmo padrão de
 * `src/features/prospecting/routes/__tests__/prospecting-tools.routes.test.ts`: mocka a camada de
 * serviço (`CentralAISuiteService`/`searchService`, cada serviço concreto já tem — ou deveria ter —
 * seus próprios testes) e foca só no contrato do router — 400 quando o payload não bate com o
 * schema, e o service NÃO é chamado quando a validação falha. Não cobre RBAC (`requireRole`, já
 * coberto por `hasRequiredRole`/`authorization.ts`) nem o gate de consentimento LGPD do ACH-07-01
 * (fora do escopo deste achado — ver `.claude/PILOTS.md`/relatório de auditoria) — a organização
 * de teste é autorizada via `AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS` só para não bloquear as
 * requisições antes da validação Zod que este arquivo cobre; a checagem 403 do gate em si tem
 * cobertura própria e completa em `ai-suite.routes.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../../../shared/middlewares/errorHandler.js';

// vi.mock é hoisted para o topo — precisa vir antes do import de `errorHandler` acima na cadeia de
// avaliação (mesmo padrão de ai-suite.routes.test.ts) para o gate de consentimento LGPD
// (ACH-07-01) não interceptar as requisições que este arquivo usa para testar só a validação Zod.
const mockEnv = vi.hoisted(() => ({
  AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS: 'org-1' as string | undefined,
}));
vi.mock('../../../../config/env.js', () => ({ env: mockEnv }));

const mapCommitteeMock = vi.fn();
const sanitizeLeadDataMock = vi.fn();
const generateNextStepMock = vi.fn();
const simulateCustomerResponseMock = vi.fn();
const evaluateSessionMock = vi.fn();
const generateProposalSectionsMock = vi.fn();
const determineNextActionMock = vi.fn();
const analyzeChurnRiskMock = vi.fn();
const matchLeadToRepMock = vi.fn();
const answerTechnicalQuestionMock = vi.fn();
const synthesizeMeetingMock = vi.fn();
const triageIncidentMock = vi.fn();
const generateCoachingReportMock = vi.fn();
const generatePlaybookChapterMock = vi.fn();
const sanitizeTextMock = vi.fn();
const getCapabilitiesInventoryMock = vi.fn();

vi.mock('../../services/CentralAISuiteService.js', () => ({
  aiSuite: {
    decisionCommittee: { mapCommittee: (...args: unknown[]) => mapCommitteeMock(...args) },
    bitrixHygiene: { sanitizeLeadData: (...args: unknown[]) => sanitizeLeadDataMock(...args) },
    cadenceAI: { generateNextStep: (...args: unknown[]) => generateNextStepMock(...args) },
    roleplayAI: {
      simulateCustomerResponse: (...args: unknown[]) => simulateCustomerResponseMock(...args),
      evaluateSession: (...args: unknown[]) => evaluateSessionMock(...args),
    },
    proposalAI: {
      generateProposalSections: (...args: unknown[]) => generateProposalSectionsMock(...args),
    },
    nextBestAction: {
      determineNextAction: (...args: unknown[]) => determineNextActionMock(...args),
    },
    churnPrediction: { analyzeChurnRisk: (...args: unknown[]) => analyzeChurnRiskMock(...args) },
    leadRouter: { matchLeadToRep: (...args: unknown[]) => matchLeadToRepMock(...args) },
    knowledgeCopilot: {
      answerTechnicalQuestion: (...args: unknown[]) => answerTechnicalQuestionMock(...args),
    },
    meetingSynthesis: {
      synthesizeMeeting: (...args: unknown[]) => synthesizeMeetingMock(...args),
    },
    mesaTriage: { triageIncident: (...args: unknown[]) => triageIncidentMock(...args) },
    sellerCoaching: {
      generateCoachingReport: (...args: unknown[]) => generateCoachingReportMock(...args),
    },
    playbookAI: {
      generatePlaybookChapter: (...args: unknown[]) => generatePlaybookChapterMock(...args),
    },
    lgpdSanitizer: { sanitizeText: (...args: unknown[]) => sanitizeTextMock(...args) },
    getCapabilitiesInventory: (...args: unknown[]) => getCapabilitiesInventoryMock(...args),
  },
}));

const hybridSearchMock = vi.fn();
vi.mock('../../../knowledge/search.service.js', () => ({
  searchService: { hybridSearch: (...args: unknown[]) => hybridSearchMock(...args) },
}));

import { aiSuiteRouter } from '../ai-suite.routes.js';

function buildApp(role = 'ADMIN') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: { id: string; organizationId: string; role: string } }).user = {
      id: 'test-user',
      organizationId: 'org-1',
      role,
    };
    next();
  });
  app.use('/api/intelligence/suite', aiSuiteRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/intelligence/suite/decision-committee', () => {
  it('rejeita contato sem nome antes de chamar o serviço', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/decision-committee')
      .send({ contacts: [{ role: 'Gerente' }] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mapCommitteeMock).not.toHaveBeenCalled();
  });

  it('rejeita companyContext acima do limite de 2000 caracteres', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/decision-committee')
      .send({ contacts: [{ name: 'Maria' }], companyContext: 'x'.repeat(2001) });

    expect(res.status).toBe(400);
    expect(mapCommitteeMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido e repassa para o serviço', async () => {
    mapCommitteeMock.mockResolvedValue({ members: [], primaryTarget: '', recommendations: [] });
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/decision-committee')
      .send({ contacts: [{ name: 'Maria', role: 'Diretora' }], companyContext: 'Transportadora' });

    expect(res.status).toBe(200);
    expect(mapCommitteeMock).toHaveBeenCalledWith(
      [{ name: 'Maria', role: 'Diretora' }],
      'Transportadora',
    );
  });
});

describe('POST /api/intelligence/suite/bitrix-hygiene', () => {
  it('rejeita payload sem companyName', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/intelligence/suite/bitrix-hygiene').send({});

    expect(res.status).toBe(400);
    expect(sanitizeLeadDataMock).not.toHaveBeenCalled();
  });

  it('rejeita rawNotes acima do limite de 2000 caracteres', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/bitrix-hygiene')
      .send({ companyName: 'TransLog LTDA', rawNotes: 'x'.repeat(2001) });

    expect(res.status).toBe(400);
    expect(sanitizeLeadDataMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    sanitizeLeadDataMock.mockResolvedValue({ cleanCompanyName: 'TransLog' });
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/bitrix-hygiene')
      .send({ companyName: 'TransLog LTDA' });

    expect(res.status).toBe(200);
    expect(sanitizeLeadDataMock).toHaveBeenCalledWith({ companyName: 'TransLog LTDA' });
  });
});

describe('POST /api/intelligence/suite/mesa/triage', () => {
  it('rejeita payload sem telemetryDataSummary', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/mesa/triage')
      .send({ alertId: 'a1', clientName: 'Cliente X', alertType: 'Botão de Pânico' });

    expect(res.status).toBe(400);
    expect(triageIncidentMock).not.toHaveBeenCalled();
  });

  it('rejeita telemetryDataSummary acima do limite de 2000 caracteres', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/mesa/triage')
      .send({
        alertId: 'a1',
        clientName: 'Cliente X',
        alertType: 'Botão de Pânico',
        telemetryDataSummary: 'x'.repeat(2001),
      });

    expect(res.status).toBe(400);
    expect(triageIncidentMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    triageIncidentMock.mockResolvedValue({ severityLevel: 'P2 - Médio Risco' });
    const app = buildApp();

    const res = await request(app).post('/api/intelligence/suite/mesa/triage').send({
      alertId: 'a1',
      clientName: 'Cliente X',
      alertType: 'Perda de Sinal',
      telemetryDataSummary: 'Sinal perdido às 10h.',
    });

    expect(res.status).toBe(200);
    expect(triageIncidentMock).toHaveBeenCalled();
  });
});

describe('POST /api/intelligence/suite/lgpd/sanitize', () => {
  it('rejeita payload sem maskLevel', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/lgpd/sanitize')
      .send({ rawText: 'CPF 123.456.789-00' });

    expect(res.status).toBe(400);
    expect(sanitizeTextMock).not.toHaveBeenCalled();
  });

  it('rejeita rawText acima do limite de 2000 caracteres', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/lgpd/sanitize')
      .send({ rawText: 'x'.repeat(2001), maskLevel: 'estrito' });

    expect(res.status).toBe(400);
    expect(sanitizeTextMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    sanitizeTextMock.mockResolvedValue({
      sanitizedText: '[CPF REDIGIDO]',
      detectedPersonalDataTypes: ['CPF'],
      redactionCount: 1,
      complianceScore: 100,
      requiresManualReview: false,
    });
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/lgpd/sanitize')
      .send({ rawText: 'CPF 123.456.789-00', maskLevel: 'estrito' });

    expect(res.status).toBe(200);
    expect(sanitizeTextMock).toHaveBeenCalledWith({
      rawText: 'CPF 123.456.789-00',
      maskLevel: 'estrito',
    });
  });
});

describe('POST /api/intelligence/suite/cadence-step', () => {
  it('rejeita channel fora do enum permitido', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/intelligence/suite/cadence-step').send({
      companyName: 'TransLog',
      contactName: 'João',
      channel: 'sms',
      stepNumber: 1,
    });

    expect(res.status).toBe(400);
    expect(generateNextStepMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    generateNextStepMock.mockResolvedValue({ content: 'oi' });
    const app = buildApp();

    const res = await request(app).post('/api/intelligence/suite/cadence-step').send({
      companyName: 'TransLog',
      contactName: 'João',
      channel: 'whatsapp',
      stepNumber: 1,
    });

    expect(res.status).toBe(200);
    expect(generateNextStepMock).toHaveBeenCalled();
  });
});

describe('POST /api/intelligence/suite/roleplay/turn', () => {
  const validPersona = {
    name: 'Carlos',
    role: 'Gerente de Frotas',
    companyProfile: 'Transportadora de médio porte',
    difficulty: 'Médio',
    mainObjection: 'Preço',
    personality: 'Direto',
  };

  it('rejeita persona sem difficulty válido', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/roleplay/turn')
      .send({ persona: { ...validPersona, difficulty: 'Impossível' }, userMessage: 'Oi' });

    expect(res.status).toBe(400);
    expect(simulateCustomerResponseMock).not.toHaveBeenCalled();
  });

  it('rejeita userMessage vazio', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/roleplay/turn')
      .send({ persona: validPersona, userMessage: '' });

    expect(res.status).toBe(400);
    expect(simulateCustomerResponseMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    simulateCustomerResponseMock.mockResolvedValue({ personaReply: 'Certo' });
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/roleplay/turn')
      .send({
        persona: validPersona,
        history: [{ sender: 'user', text: 'Olá' }],
        userMessage: 'Como vai a operação?',
      });

    expect(res.status).toBe(200);
    expect(simulateCustomerResponseMock).toHaveBeenCalled();
  });
});

describe('POST /api/intelligence/suite/proposal/generate', () => {
  it('rejeita payload sem diagnosedPains/proposedModules', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/proposal/generate')
      .send({ clientName: 'Cliente X' });

    expect(res.status).toBe(400);
    expect(generateProposalSectionsMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    generateProposalSectionsMock.mockResolvedValue({ executiveSummary: 'ok' });
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/proposal/generate')
      .send({
        clientName: 'Cliente X',
        diagnosedPains: ['Sinistro alto'],
        proposedModules: ['Telemetria'],
      });

    expect(res.status).toBe(200);
    expect(generateProposalSectionsMock).toHaveBeenCalled();
  });
});

describe('POST /api/intelligence/suite/next-best-action', () => {
  it('rejeita payload sem rawNote', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/next-best-action')
      .send({ leadOrClientName: 'Cliente X', stage: 'Negociação' });

    expect(res.status).toBe(400);
    expect(determineNextActionMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    determineNextActionMock.mockResolvedValue({ recommendedAction: 'Ligar' });
    const app = buildApp();

    const res = await request(app).post('/api/intelligence/suite/next-best-action').send({
      leadOrClientName: 'Cliente X',
      stage: 'Negociação',
      rawNote: 'Cliente pediu desconto.',
    });

    expect(res.status).toBe(200);
    expect(determineNextActionMock).toHaveBeenCalled();
  });
});

describe('POST /api/intelligence/suite/churn/predict', () => {
  it('rejeita indicadores numéricos ausentes', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/churn/predict')
      .send({ clientName: 'Cliente X' });

    expect(res.status).toBe(400);
    expect(analyzeChurnRiskMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    analyzeChurnRiskMock.mockResolvedValue({ churnRisk: 'Médio' });
    const app = buildApp();

    const res = await request(app).post('/api/intelligence/suite/churn/predict').send({
      clientName: 'Cliente X',
      contractAgeMonths: 12,
      monthlyRecurringRevenue: 5000,
      openSupportTickets: 1,
      unresolvedComplaints: 0,
      paymentDelaysLast90Days: 0,
      platformUsageDropPercentage: 10,
    });

    expect(res.status).toBe(200);
    expect(analyzeChurnRiskMock).toHaveBeenCalled();
  });
});

describe('POST /api/intelligence/suite/lead-router/match', () => {
  it('rejeita lead sem urgency válido', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/lead-router/match')
      .send({
        lead: {
          leadId: 'l1',
          companyName: 'Cliente X',
          estimatedFleet: 10,
          segment: 'Agro',
          urgency: 'Urgentíssima',
          region: 'Sul',
        },
      });

    expect(res.status).toBe(400);
    expect(matchLeadToRepMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    matchLeadToRepMock.mockResolvedValue({ recommendedRepId: 'rep-1' });
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/lead-router/match')
      .send({
        lead: {
          leadId: 'l1',
          companyName: 'Cliente X',
          estimatedFleet: 10,
          segment: 'Agro',
          urgency: 'Alta',
          region: 'Sul',
        },
        reps: [
          {
            repId: 'rep-1',
            name: 'Ana',
            specialties: ['Agro'],
            winRatePercent: 50,
            currentLeadCount: 3,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(matchLeadToRepMock).toHaveBeenCalled();
  });
});

describe('POST /api/intelligence/suite/meeting/synthesize', () => {
  it('rejeita payload sem rawTranscript', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/meeting/synthesize')
      .send({ meetingTitle: 'Reunião', participants: ['João'] });

    expect(res.status).toBe(400);
    expect(synthesizeMeetingMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    synthesizeMeetingMock.mockResolvedValue({ executiveSummary: 'ok' });
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/meeting/synthesize')
      .send({
        meetingTitle: 'Reunião',
        participants: ['João'],
        rawTranscript: 'Conversa completa sobre a proposta.',
      });

    expect(res.status).toBe(200);
    expect(synthesizeMeetingMock).toHaveBeenCalled();
  });
});

describe('POST /api/intelligence/suite/coaching/report', () => {
  it('rejeita payload sem métricas numéricas obrigatórias', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/coaching/report')
      .send({ sellerName: 'João', period: '2026-W10' });

    expect(res.status).toBe(400);
    expect(generateCoachingReportMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    generateCoachingReportMock.mockResolvedValue({ overallGrade: 'B' });
    const app = buildApp();

    const res = await request(app).post('/api/intelligence/suite/coaching/report').send({
      sellerName: 'João',
      period: '2026-W10',
      callsMade: 100,
      meetingsScheduled: 10,
      dealsClosed: 2,
      conversionRatePercent: 20,
      avgTicket: 3000,
    });

    expect(res.status).toBe(200);
    expect(generateCoachingReportMock).toHaveBeenCalled();
  });
});

describe('POST /api/intelligence/suite/playbook/generate-chapter', () => {
  it('rejeita targetAudience fora do enum', async () => {
    const app = buildApp();

    const res = await request(app).post('/api/intelligence/suite/playbook/generate-chapter').send({
      topic: 'Objeção de preço',
      targetAudience: 'Estagiário',
      industrySegment: 'Logística',
    });

    expect(res.status).toBe(400);
    expect(generatePlaybookChapterMock).not.toHaveBeenCalled();
  });

  it('aceita payload válido', async () => {
    generatePlaybookChapterMock.mockResolvedValue({ title: 'Capítulo' });
    const app = buildApp();

    const res = await request(app).post('/api/intelligence/suite/playbook/generate-chapter').send({
      topic: 'Objeção de preço',
      targetAudience: 'SDR',
      industrySegment: 'Logística',
    });

    expect(res.status).toBe(200);
    expect(generatePlaybookChapterMock).toHaveBeenCalled();
  });
});

describe('POST /api/intelligence/suite/knowledge/copilot (regressão — já validado antes do ACH-07-02)', () => {
  it('continua rejeitando pergunta curta demais', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/intelligence/suite/knowledge/copilot')
      .send({ question: 'oi' });

    expect(res.status).toBe(400);
    expect(hybridSearchMock).not.toHaveBeenCalled();
  });
});
