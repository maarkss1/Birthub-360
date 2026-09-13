import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import { logger } from '../../../lib/logger.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { synthesizeSpeech } from '../services/voicebox.service.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';

const router = Router();
const writeRoles = requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']);

const ttsRequestSchema = z.object({
  text: z.string().trim().min(1, 'Texto vazio').max(2_000),
});

router.post(
  '/tts',
  validateRequest(ttsRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body as z.infer<typeof ttsRequestSchema>;
      const audio = await synthesizeSpeech(text);
      res.setHeader('Content-Type', 'audio/wav');
      res.send(audio);
    } catch (error) {
      logger.error({ err: error }, 'Voicebox TTS request failed');
      next(error);
    }
  },
);

// --- SWARM & CONTINUOUS LEARNING ENDPOINTS ---
import { SwarmOrchestrator } from '../agents/supervisor.agent.js';
import {
  LearningAgent,
  getLearningProfileHistory,
  rollbackLearningProfile,
  approveLearningProfileVersion,
  rejectLearningProfileVersion,
} from '../agents/learning.agent.js';
import { getSwarmSloSnapshot } from '../services/swarmScheduler.service.js';
import { getEvaluationMetricsSnapshot } from '../services/evaluationMetrics.service.js';
import { getDatasetSummary, validateToolUseCases } from '../evaluation/goldenDataset.service.js';

const swarmMissionSchema = z.object({
  mission: z.string().trim().min(1, 'A missão é obrigatória.').max(4_000),
  sessionId: z.string().trim().min(1).max(200).optional(),
  // Opcional: quando presente, permite ao Agente SDR do enxame buscar o contexto real do lead no
  // CRM em vez de tentar (e sempre falhar) usar o texto da missão como se fosse um ID — ver
  // sdrNode em supervisor.agent.ts (IA-003).
  leadId: z.string().trim().min(1).max(200).optional(),
});

router.post(
  '/swarm/mission',
  writeRoles,
  validateRequest(swarmMissionSchema),
  async (req, res, next) => {
    try {
      const { mission, sessionId, leadId } = req.body as z.infer<typeof swarmMissionSchema>;
      const swarm = new SwarmOrchestrator();
      const result = await swarm.executeMission(mission, sessionId, leadId);
      // Retorna a última mensagem ou todo o contexto no formato esperado pelo api.ts (data envelope)
      res.json({ success: true, data: { messages: result.map((m) => m.content) } });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/swarm/stream',
  writeRoles,
  validateRequest(swarmMissionSchema),
  async (req, res, next) => {
    try {
      const { mission, sessionId, leadId } = req.body as z.infer<typeof swarmMissionSchema>;
      const sid = sessionId || `swarm-mission-${Date.now()}`;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const swarm = new SwarmOrchestrator();

      await swarm.executeMissionStream(
        mission,
        sid,
        (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        },
        leadId,
      );

      res.write('event: end\ndata: {}\n\n');
      res.end();
    } catch (err) {
      if (!res.headersSent) {
        next(err);
      } else {
        res.write(`event: error\ndata: ${JSON.stringify((err as Error).message)}\n\n`);
        res.end();
      }
    }
  },
);

// AI-009 (Sprint 07/onda-20): fonte de dados e UI (SwarmDashboard.tsx, aba "SLO por agente") já
// existiam desde a onda 7 — só faltava esta rota, nunca registrada (ver
// .agents/handoffs/onda-7/13-para-07-rota-slo-swarm.md). `validateRequest` só valida `req.body`
// hoje (não `query`), então o parse de querystring é manual aqui.
const sloQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional(),
});

router.get('/swarm/slo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = sloQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    const { organizationId } = (req as AuthRequest).user;
    const snapshot = await getSwarmSloSnapshot(organizationId, parsed.data.days ?? 30);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

// AI-006 (onda 35): harness real das 9 dimensões de avaliação do enxame — ver
// evaluationMetrics.service.ts. Mesma validação de querystring do /swarm/slo acima.
router.get('/evaluation-metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = sloQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    const { organizationId } = (req as AuthRequest).user;
    const snapshot = await getEvaluationMetricsSnapshot(organizationId, parsed.data.days ?? 30);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

// AI-005 (onda 36): Golden Dataset real e versionado — ver goldenDataset.service.ts. Não é
// escopado por tenant (o dataset é um fixture de QA compartilhado, não dado de produção de uma
// organização) — só reaproveita a autenticação já aplicada em '/api/agent' pelo server.ts.
router.get('/golden-dataset/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = getDatasetSummary();
    const toolUseValidation = await validateToolUseCases();
    res.json({ summary, toolUseValidation });
  } catch (err) {
    next(err);
  }
});

router.post('/swarm/learn', async (req, res, next) => {
  try {
    // userId/organizationId vêm da sessão autenticada, nunca do body — do contrário qualquer
    // usuário logado poderia passar o organizationId de outro tenant e ler o AuditLog dele
    // (vazamento entre tenants), além de contaminar o perfil de estilo aprendido que os outros
    // agentes daquele tenant herdam depois.
    const { id: userId, organizationId } = (req as AuthRequest).user;
    const learningAgent = new LearningAgent();
    const guidelines = await learningAgent.reflectAndLearn(userId, organizationId);
    res.json({
      success: true,
      learnedGuidelines: guidelines || 'Sem ações recentes suficientes para aprender.',
      // Item 103 da constituição de produto: uma reflexão nova nunca vira comportamento ativo
      // sozinha — fica pendente até um GESTOR+ aprovar em `/swarm/learn/:version/approve`.
      pendingApproval: Boolean(guidelines),
    });
  } catch (err) {
    next(err);
  }
});

// GOV-13 (onda 39): histórico e rollback do perfil de estilo versionado pelo LearningAgent — o
// mecanismo já existia em learning.agent.ts (append-only, nunca sobrescreve), mas ficava
// inacessível fora de um script manual, sem rota HTTP nenhuma (ver
// .agents/handoffs/onda-39/13-para-07-rota-rollback-learning-profile.md). Escopo: sempre o
// perfil do próprio usuário autenticado — o histórico é por (tenant, ator), nunca cross-user
// (decisão arquitetural deliberada, travada por
// `tests/unit/.../agent.routes.learning-profile.test.ts`: identidade só de `req.user`, nunca de
// querystring/body, mesmo para ADMIN). O gate de aprovação do item 103
// (`/swarm/learn/approve`/`/reject`, abaixo) segue o mesmo escopo self-service — nunca um GESTOR
// aprovando o perfil de outra pessoa, só o próprio.
router.get('/swarm/learn/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: actorId, organizationId } = (req as AuthRequest).user;
    const history = await getLearningProfileHistory(organizationId, actorId);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

// --- CÉLULA COMERCIAL DE AGENTES (onda 43, Agente 13) ---
import { COMMERCIAL_AGENT_REGISTRY } from '../agents/commercialAgentRegistry.js';
import { RevenueIntelligenceAgent } from '../agents/revenueIntelligence.agent.js';
import { ChurnRetentionAgent } from '../agents/churnRetention.agent.js';
import { ContractSignatureAgent } from '../agents/contractSignature.agent.js';
// AIAGENT-004 (onda 6): os 5 agentes da célula que a onda 43 deixou sem caminho de entrega.
// `billingRevenue.agent.ts` continua deliberadamente fora — ver `commercialAgentRegistry.ts`.
import { LdrIntelligenceAgent } from '../agents/ldrIntelligence.agent.js';
import { CoordinatorCommercialAgent } from '../agents/coordinatorCommercial.agent.js';
import { ManagerCommercialAgent } from '../agents/managerCommercial.agent.js';
import { ExecutiveDirectorAgent } from '../agents/executiveDirector.agent.js';
import { BitrixGuardianAgent } from '../agents/bitrixGuardian.agent.js';
import { container } from '../../../shared/di/container.js';

// AI-005/golden-dataset acima já estabelece o precedente: catálogo estático (não dado de tenant)
// só reaproveita a autenticação de '/api/agent'. `COMMERCIAL_AGENT_REGISTRY` é o mesmo caso —
// metadado de produto, não dado de organização.
router.get('/commercial-cell', (_req: Request, res: Response) => {
  res.json({ success: true, data: COMMERCIAL_AGENT_REGISTRY });
});

// Estrutural, não importado de commercial-intelligence (no-cross-feature-imports) — espelha só os
// 2 métodos que este agente consome de CommercialIntelligenceAiService, resolvido via DI container
// (registrado em src/shared/di/setup.ts). Ver comentário no registro do container para o racional.
interface RevenueIntelligenceSourceContract {
  generateExecutiveSummary(
    organizationId: string,
    filter: {
      month: string;
      owner?: string;
      product?: string;
      source?: string;
      icp?: string;
      company?: string;
    },
  ): Promise<{ summary: string; generatedAt: string }>;
  generateMentorPlaybook(
    organizationId: string,
    filter: {
      month: string;
      owner?: string;
      product?: string;
      source?: string;
      icp?: string;
      company?: string;
    },
  ): Promise<{
    recommendations: {
      priority: string;
      title: string;
      rationale: string;
      suggestedAction: string;
      relatedDealIds: string[];
    }[];
    source: 'ai' | 'fallback';
    generatedAt: string;
  }>;
}

// Espelha `CommercialIntelligenceFilter` (src/features/commercial-intelligence/domain/) — mesmo
// motivo dos contratos estruturais acima: não importamos o tipo do outro domínio. Usado por todas
// as rotas da célula comercial que leem o cockpit comercial (AIAGENT-004 reaproveitou este schema
// em vez de duplicá-lo por rota).
const commercialCellFilterSchema = z.object({
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'Use o formato YYYY-MM'),
  owner: z.string().trim().optional(),
  product: z.string().trim().optional(),
  source: z.string().trim().optional(),
  icp: z.string().trim().optional(),
  company: z.string().trim().optional(),
});

const revenueIntelligenceRunSchema = commercialCellFilterSchema;

router.post(
  '/commercial-cell/revenue-intelligence/run',
  writeRoles,
  validateRequest(revenueIntelligenceRunSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const filter = req.body as z.infer<typeof revenueIntelligenceRunSchema>;

      const aiService = container.resolve<RevenueIntelligenceSourceContract>(
        'CommercialIntelligenceAiService',
      );
      const [summaryResult, playbook] = await Promise.all([
        aiService.generateExecutiveSummary(organizationId, filter),
        aiService.generateMentorPlaybook(organizationId, filter),
      ]);

      const contextLines = [
        `- Resumo executivo do período ${filter.month}: ${summaryResult.summary}`,
        playbook.recommendations.length > 0
          ? `- Recomendações priorizadas (${playbook.source === 'ai' ? 'geradas por IA' : 'fallback determinístico'}):\n${playbook.recommendations
              .map((r) => `  - [${r.priority}] ${r.title}: ${r.rationale} → ${r.suggestedAction}`)
              .join('\n')}`
          : '- Nenhuma recomendação priorizada disponível para o período.',
      ];

      const agent = new RevenueIntelligenceAgent();
      const result = await agent.run(contextLines.join('\n'));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

const churnRetentionRunSchema = z.object({
  clientName: z.string().trim().min(1),
  contractAgeMonths: z.number().nonnegative(),
  monthlyRecurringRevenue: z.number().nonnegative(),
  openSupportTickets: z.number().int().nonnegative(),
  unresolvedComplaints: z.number().int().nonnegative(),
  paymentDelaysLast90Days: z.number().int().nonnegative(),
  platformUsageDropPercentage: z.number(),
  recentSentimentNotes: z.string().trim().optional(),
});

// Espelha (sem importar de src/features/analytics/**, ver no-cross-feature-imports) só o shape
// mínimo de entrada/saída de ChurnPredictionService.analyzeChurnRisk — a checagem de tipo real
// acontece em churn-prediction.service.ts (dono real), aqui é só o contrato de leitura. O
// parâmetro de entrada reaproveita o próprio schema Zod acima (mesmo shape).
interface ChurnPredictionSourceContract {
  analyzeChurnRisk(account: z.infer<typeof churnRetentionRunSchema>): Promise<{
    churnRisk: string;
    healthScore: number;
    primaryRiskDrivers: string[];
    immediateRetentionPlaybook: string[];
    suggestedRetentionDiscountOrBenefit?: string;
    executiveAlertSummary: string;
  }>;
}

router.post(
  '/commercial-cell/churn-retention/run',
  writeRoles,
  validateRequest(churnRetentionRunSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = req.body as z.infer<typeof churnRetentionRunSchema>;

      const churnService =
        container.resolve<ChurnPredictionSourceContract>('ChurnPredictionService');
      const prediction = await churnService.analyzeChurnRisk(account);

      const contextLines = [
        `- Conta: ${account.clientName}`,
        `- Nível de risco (já calculado): ${prediction.churnRisk}`,
        `- Health Score (já calculado): ${prediction.healthScore}`,
        `- Fatores de risco: ${prediction.primaryRiskDrivers.join('; ') || 'nenhum listado'}`,
        `- Playbook de retenção imediato: ${prediction.immediateRetentionPlaybook.join('; ') || 'nenhum listado'}`,
        prediction.suggestedRetentionDiscountOrBenefit
          ? `- Benefício/desconto sugerido: ${prediction.suggestedRetentionDiscountOrBenefit}`
          : '- Nenhum benefício/desconto sugerido pelo motor.',
        `- Resumo executivo (já calculado): ${prediction.executiveAlertSummary}`,
        account.monthlyRecurringRevenue
          ? `- MRR da conta: ${account.monthlyRecurringRevenue}`
          : '- MRR da conta: não informado.',
      ];

      const agent = new ChurnRetentionAgent();
      const result = await agent.run(contextLines.join('\n'));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ACH-17-02 (onda-43, handoff 13→17): fecha o handoff aberto — o Agente Contratos & Assinatura
// narrava prontidão/status sem poder verificar dado real. `SignatureRequestRepositoryPort` agora
// expõe `findByDocumentId` (RLS normal, resolvido via `organizationId` da sessão autenticada, nunca
// do body). Signatários esperados e dados de prontidão continuam vindo do chamador (mesmo padrão de
// `churn-retention` acima) — não existe hoje um serviço real de checklist de contrato para grounding
// desses campos, só do status real de assinatura.
interface SignatureStatusSourceContract {
  findByDocumentId(
    organizationId: string,
    documentId: string,
  ): Promise<{
    id: string;
    status: string;
    provider: string;
    signerEmail: string;
    requestedAt: Date;
    respondedAt: Date | null;
  } | null>;
}

const contractSignatureRunSchema = z.object({
  documentId: z.string().trim().min(1),
  contractTitle: z.string().trim().optional(),
  requiredSignatories: z
    .array(
      z.object({
        name: z.string().trim().optional(),
        email: z.string().trim().email(),
      }),
    )
    .optional(),
  missingData: z.array(z.string().trim().min(1)).optional(),
});

router.post(
  '/commercial-cell/contract-signature/run',
  writeRoles,
  validateRequest(contractSignatureRunSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const { documentId, contractTitle, requiredSignatories, missingData } = req.body as z.infer<
        typeof contractSignatureRunSchema
      >;

      const signatureRepository = container.resolve<SignatureStatusSourceContract>(
        'SignatureRequestRepositoryPort',
      );
      const signatureRequest = await signatureRepository.findByDocumentId(
        organizationId,
        documentId,
      );

      const contextLines = [
        `- Documento: ${contractTitle ?? documentId} (id ${documentId})`,
        signatureRequest
          ? `- Status real de assinatura (já verificado, não presumido): ${signatureRequest.status}, provedor ${signatureRequest.provider}, signatário ${signatureRequest.signerEmail}, solicitado em ${signatureRequest.requestedAt.toISOString()}${
              signatureRequest.respondedAt
                ? `, respondido em ${signatureRequest.respondedAt.toISOString()}`
                : ', ainda sem resposta'
            }.`
          : '- Nenhuma solicitação de assinatura encontrada para este documento — ainda não foi enviado para assinatura.',
        requiredSignatories && requiredSignatories.length > 0
          ? `- Signatários esperados informados pelo chamador: ${requiredSignatories
              .map((s) => `${s.name ?? 'sem nome'} <${s.email}>`)
              .join('; ')}`
          : '- Nenhum signatário adicional informado pelo chamador.',
        missingData && missingData.length > 0
          ? `- Dados obrigatórios ausentes reportados pelo chamador: ${missingData.join('; ')}`
          : '- Nenhum dado obrigatório reportado como ausente pelo chamador.',
      ];

      const agent = new ContractSignatureAgent();
      const result = await agent.run(contextLines.join('\n'));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── AIAGENT-004 (onda 6): as 5 rotas que faltavam da Célula Comercial ───────────────────────────
//
// A onda 43 implementou 9 agentes novos e conectou 3. Estes 5 tinham classe completa, prompt real e
// motor real por trás, mas nenhum caminho de entrega (`grep` confirmou: zero import sites fora do
// próprio arquivo). Todas seguem EXATAMENTE o padrão das 3 acima:
//   1. o motor real é resolvido por DI container com um contrato estrutural local (nunca import
//      direto — `no-cross-feature-imports`);
//   2. `organizationId` vem sempre de `req.user`, nunca do body;
//   3. a rota busca e FORMATA o dado real; o agente só narra (nunca busca dado sozinho);
//   4. resposta `{ success: true, data: <resultado do agente> }`.
//
// O 6º agente órfão (`BillingRevenueAgent`) continua sem rota de propósito — ver
// `commercialAgentRegistry.ts`, entrada `billing-revenue`.

/** Espelha só os métodos de `CommercialIntelligenceUseCases` que estas 4 rotas consomem. */
interface CommercialIntelligenceReportsContract {
  alerts(
    organizationId: string,
    filter: z.infer<typeof commercialCellFilterSchema>,
  ): Promise<
    Array<{
      severity: string;
      title: string;
      description: string;
      metricValue: number | null;
    }>
  >;
  aging(
    organizationId: string,
    filter: z.infer<typeof commercialCellFilterSchema>,
  ): Promise<{
    buckets: Array<{ label: string; count: number; amount: number }>;
    byStage: Array<{
      stageName: string;
      count: number;
      amountOverThreshold: number;
      averageDaysInStage: number | null;
      dataQuality: string;
    }>;
    criticalThresholdDays: number;
    trackingSince: string | null;
  }>;
  leadingIndicators(organizationId: string): Promise<{
    weekStart: string;
    weekEnd: string;
    indicators: Array<{
      label: string;
      current: number;
      previousWeek: number;
      movingAverage4w: number;
      trend: string;
    }>;
    trackingSince: string | null;
  }>;
  executiveOverview(
    organizationId: string,
    filter: z.infer<typeof commercialCellFilterSchema>,
  ): Promise<{
    period: string;
    goal: { amount: number; currency: string } | null;
    closedAmount: number;
    closedCount: number;
    pctOfGoal: number | null;
    commitAmount: number;
    bestCaseAmount: number;
    forecastAmount: number;
    gapForecast: number | null;
    gapCommit: number | null;
    pipelineTotal: number;
    pipelineEligible: number;
    coverage90: { coverage: number | null };
    forecastConfidence: { score: number | null; classification: string | null; sampleSize: number };
    isEmpty: boolean;
    dataAsOf: string;
  }>;
  performance(
    organizationId: string,
    filter: z.infer<typeof commercialCellFilterSchema>,
  ): Promise<{
    winRate: number | null;
    wonCount: number;
    lostCount: number;
    opportunities: { open: number; createdInPeriod: number; stalled: number; atRisk: number };
    averageTicket: { won: number | null; open: number | null };
    salesCycle: { meanDays: number | null; medianDays: number | null; sampleSize: number };
    funnel: Array<{
      label: string;
      count: number;
      historicalConversionFromPrevious: number | null;
    }>;
    firstContactSla: {
      medianHours: number | null;
      withinTargetPct: number | null;
      targetHours: number;
      leadsWithoutContact: number;
    };
  }>;
  losses(
    organizationId: string,
    filter: z.infer<typeof commercialCellFilterSchema>,
  ): Promise<{
    totalCount: number;
    totalAmount: number;
    byReason: Array<{ reason: string; count: number; amount: number }>;
  }>;
  historicalTrends(
    organizationId: string,
    filter: z.infer<typeof commercialCellFilterSchema>,
  ): Promise<{
    points: Array<{
      label: string;
      winRate: number | null;
      salesCycleMeanDays: number | null;
      averageTicketWon: number | null;
      pipelineCreatedAmount: number | null;
      closedSampleSize: number;
    }>;
  }>;
  forecastAccuracy(organizationId: string): Promise<{
    available: boolean;
    reason: string | null;
    sampleSize: number;
    meanAbsoluteErrorPercent: number | null;
  }>;
  healthScore(
    organizationId: string,
    filter: z.infer<typeof commercialCellFilterSchema>,
  ): Promise<{
    overallScore: number | null;
    pillars: Array<{
      label: string;
      score: number | null;
      classification: string | null;
      unavailableReason: string | null;
    }>;
  }>;
  crmQuality(
    organizationId: string,
    filter: z.infer<typeof commercialCellFilterSchema>,
  ): Promise<{
    overallScore: number | null;
    evaluatedCount: number;
    suspectedDuplicateGroups: number;
    bitrixSync: {
      connected: boolean;
      totalOpen: number;
      linked: number;
      notLinked: number;
      failed: number;
      linkedRate: number | null;
      lastSyncAt: string | null;
      syncedCount30d: number;
      failedCount30d: number;
      failures: Array<{ [key: string]: unknown }>;
    };
  }>;
}

/**
 * `null`/`undefined` viram um texto explícito de ausência — nunca 0 nem "-". O contrato destes
 * agentes proíbe fabricar dado, e um `0` no contexto seria lido pelo modelo como um fato medido.
 */
function orMissing(value: number | null | undefined, suffix = ''): string {
  return value === null || value === undefined ? 'não disponível' : `${value}${suffix}`;
}

function resolveCommercialIntelligence(): CommercialIntelligenceReportsContract {
  return container.resolve<CommercialIntelligenceReportsContract>('CommercialIntelligenceUseCases');
}

// ─── Agente LDR — Inteligência de Leads ──────────────────────────────────────────────────────────
//
// Fonte real: `AccountIntelligenceService.getIntelligence` (market-intelligence). Resolvido por
// FÁBRICA (não instância) porque o serviço é construído por requisição com o Prisma já escopado por
// tenant (`req.db`) — ver o registro em `src/shared/di/setup.ts`.
interface AccountIntelligenceFactoryContract {
  create(
    db: NonNullable<AuthRequest['db']>,
    organizationId: string,
  ): {
    getIntelligence(accountId: string): Promise<{
      account: {
        legalName: string | null;
        tradeName: string | null;
        cnpj: string | null;
        segment: string | null;
        size: string | null;
        employeeCount: number | null;
        city: string | null;
        state: string | null;
        enrichmentStatus: string | null;
        enrichedAt: Date | null;
      };
      state: string;
      facts: { version: number; generatedAt: Date; summary: string; status: string } | null;
      latestInference: {
        total: number;
        fit: number;
        timing: number;
        intent: number;
        relationship: number;
        positiveReasons: string[];
        negativeReasons: string[];
        scoreVersion: string;
        calculatedAt: Date;
      } | null;
      collections: {
        signals: number;
        decisionMakers: number;
        relationships: number;
        recommendations: number;
        evidence: number;
      };
    }>;
  };
}

const ldrIntelligenceRunSchema = z.object({
  accountId: z.string().trim().min(1),
});

router.post(
  '/commercial-cell/ldr-intelligence/run',
  writeRoles,
  validateRequest(ldrIntelligenceRunSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const { organizationId } = authReq.user;
      const { accountId } = req.body as z.infer<typeof ldrIntelligenceRunSchema>;

      if (!authReq.db) {
        // Mesmo erro honesto que `defaultServiceFactory` de accountIntelligence.routes.ts — não
        // cair para um cliente Prisma sem escopo de tenant.
        res
          .status(500)
          .json({ success: false, error: 'Contexto de organização não inicializado.' });
        return;
      }

      const factory = container.resolve<AccountIntelligenceFactoryContract>(
        'AccountIntelligenceServiceFactory',
      );
      const intelligence = await factory
        .create(authReq.db, organizationId)
        .getIntelligence(accountId);

      const { account, facts, latestInference, collections } = intelligence;
      const contextLines = [
        `- Conta: ${account.tradeName || account.legalName || accountId} (id ${accountId})`,
        `- Identificação: CNPJ ${account.cnpj ? 'informado' : 'não informado'}; segmento ${account.segment ?? 'não informado'}; porte ${account.size ?? 'não informado'}; funcionários ${orMissing(account.employeeCount)}; localização ${[account.city, account.state].filter(Boolean).join('/') || 'não informada'}.`,
        `- Enriquecimento: status ${account.enrichmentStatus ?? 'não informado'}${account.enrichedAt ? `, última coleta em ${account.enrichedAt.toISOString()}` : ', nunca enriquecida'}.`,
        `- Estado do snapshot de inteligência: ${intelligence.state}.`,
        facts
          ? `- Snapshot v${facts.version} (${facts.status}), gerado em ${facts.generatedAt.toISOString()}: ${facts.summary}`
          : '- Nenhum snapshot de inteligência gerado para esta conta ainda.',
        latestInference
          ? `- Score real (v${latestInference.scoreVersion}, calculado em ${latestInference.calculatedAt.toISOString()}): total ${latestInference.total}, fit ${latestInference.fit}, timing ${latestInference.timing}, intent ${latestInference.intent}, relacionamento ${latestInference.relationship}.`
          : '- Nenhum score calculado para esta conta ainda — não existe número de prioridade real.',
        latestInference && latestInference.positiveReasons.length > 0
          ? `- Razões positivas do score: ${latestInference.positiveReasons.join('; ')}`
          : '- Nenhuma razão positiva registrada no score.',
        latestInference && latestInference.negativeReasons.length > 0
          ? `- Razões negativas do score: ${latestInference.negativeReasons.join('; ')}`
          : '- Nenhuma razão negativa registrada no score.',
        `- Volume de evidência coletada: ${collections.signals} sinais, ${collections.decisionMakers} decisores, ${collections.relationships} relações econômicas, ${collections.recommendations} recomendações, ${collections.evidence} evidências.`,
      ];

      const agent = new LdrIntelligenceAgent();
      const result = await agent.run(contextLines.join('\n'));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Agente Coordenador Comercial ────────────────────────────────────────────────────────────────
router.post(
  '/commercial-cell/coordinator-commercial/run',
  writeRoles,
  validateRequest(commercialCellFilterSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const filter = req.body as z.infer<typeof commercialCellFilterSchema>;

      const useCases = resolveCommercialIntelligence();
      const [alerts, aging, leadingIndicators] = await Promise.all([
        useCases.alerts(organizationId, filter),
        useCases.aging(organizationId, filter),
        useCases.leadingIndicators(organizationId),
      ]);

      const contextLines = [
        `- Período de referência: ${filter.month}.`,
        alerts.length > 0
          ? `- Alertas executivos já calculados (${alerts.length}):\n${alerts
              .map(
                (a) =>
                  `  - [${a.severity}] ${a.title}: ${a.description}${a.metricValue !== null ? ` (valor ${a.metricValue})` : ''}`,
              )
              .join('\n')}`
          : '- Nenhum alerta executivo disparado para este período.',
        `- Aging (limite crítico ${aging.criticalThresholdDays} dias${aging.trackingSince ? `, histórico de etapa desde ${aging.trackingSince}` : ', SEM histórico de etapa registrado — dias em etapa são estimados'}):\n${aging.buckets
          .map((b) => `  - ${b.label}: ${b.count} negócios, R$ ${b.amount}`)
          .join('\n')}`,
        aging.byStage.length > 0
          ? `- Aging por etapa:\n${aging.byStage
              .map(
                (s) =>
                  `  - ${s.stageName}: ${s.count} acima do limite, R$ ${s.amountOverThreshold}, média ${orMissing(s.averageDaysInStage, ' dias')} (qualidade do dado: ${s.dataQuality})`,
              )
              .join('\n')}`
          : '- Nenhuma etapa com negócios acima do limite crítico.',
        `- Indicadores da semana (${leadingIndicators.weekStart} a ${leadingIndicators.weekEnd})${leadingIndicators.trackingSince ? '' : ' — SEM base histórica suficiente, comparações semanais são pouco confiáveis'}:\n${leadingIndicators.indicators
          .map(
            (i) =>
              `  - ${i.label}: ${i.current} (semana anterior ${i.previousWeek}, média 4 semanas ${i.movingAverage4w}, tendência ${i.trend})`,
          )
          .join('\n')}`,
      ];

      const agent = new CoordinatorCommercialAgent();
      const result = await agent.run(contextLines.join('\n'));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Agente Gerente Comercial ────────────────────────────────────────────────────────────────────
router.post(
  '/commercial-cell/manager-commercial/run',
  writeRoles,
  validateRequest(commercialCellFilterSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const filter = req.body as z.infer<typeof commercialCellFilterSchema>;

      const useCases = resolveCommercialIntelligence();
      const [overview, performance, aging, losses] = await Promise.all([
        useCases.executiveOverview(organizationId, filter),
        useCases.performance(organizationId, filter),
        useCases.aging(organizationId, filter),
        useCases.losses(organizationId, filter),
      ]);

      const contextLines = [
        `- Período: ${overview.period}. Dados apurados em ${overview.dataAsOf}.`,
        // A base vazia é um AVISO ADICIONAL, nunca substitui a linha de meta: sem ela o modelo
        // perderia a informação de que não há meta cadastrada e poderia atribuir o zero a
        // desempenho em vez de a ausência de dado.
        ...(overview.isEmpty
          ? [
              '- ATENÇÃO: a organização não tem nenhum negócio no funil neste período — todos os números abaixo são de uma base vazia, não de desempenho ruim.',
            ]
          : []),
        `- Meta: ${overview.goal ? `R$ ${overview.goal.amount} (${overview.goal.currency})` : 'NÃO CADASTRADA — sem meta não existe gap nem % de atingimento'}.`,
        `- Fechado: R$ ${overview.closedAmount} em ${overview.closedCount} negócios. Atingimento: ${orMissing(overview.pctOfGoal, '%')}.`,
        `- Forecast (Fechado + Commit + Best Case + Pipeline ponderado): R$ ${overview.forecastAmount}. Commit: R$ ${overview.commitAmount}. Best Case: R$ ${overview.bestCaseAmount}.`,
        `- Gap de Forecast: ${orMissing(overview.gapForecast)}. Gap de Commit: ${orMissing(overview.gapCommit)}.`,
        `- Pipeline total: R$ ${overview.pipelineTotal}; pipeline elegível: R$ ${overview.pipelineEligible}. Cobertura 90 dias: ${orMissing(overview.coverage90.coverage, 'x')}.`,
        `- Forecast Confidence: ${orMissing(overview.forecastConfidence.score)} (${overview.forecastConfidence.classification ?? 'sem classificação'}), amostra de ${overview.forecastConfidence.sampleSize} negócios abertos.`,
        `- Win rate: ${orMissing(performance.winRate, '%')} (${performance.wonCount} ganhos, ${performance.lostCount} perdidos). Ticket médio ganho: ${orMissing(performance.averageTicket.won)}.`,
        `- Ciclo de vendas: média ${orMissing(performance.salesCycle.meanDays, ' dias')}, mediana ${orMissing(performance.salesCycle.medianDays, ' dias')}, amostra ${performance.salesCycle.sampleSize}.`,
        `- Oportunidades: ${performance.opportunities.open} abertas, ${performance.opportunities.createdInPeriod} criadas no período, ${performance.opportunities.stalled} paradas, ${performance.opportunities.atRisk} em risco.`,
        `- SLA de primeiro contato: mediana ${orMissing(performance.firstContactSla.medianHours, 'h')}, ${orMissing(performance.firstContactSla.withinTargetPct, '%')} dentro da meta de ${performance.firstContactSla.targetHours}h; ${performance.firstContactSla.leadsWithoutContact} leads ainda sem nenhum contato registrado.`,
        performance.funnel.length > 0
          ? `- Funil (conversão por movimentação real, não snapshot):\n${performance.funnel
              .map(
                (s) =>
                  `  - ${s.label}: ${s.count} negócios, conversão da etapa anterior ${orMissing(s.historicalConversionFromPrevious, '%')}`,
              )
              .join('\n')}`
          : '- Nenhuma etapa de funil com dado no período.',
        `- Aging: ${aging.buckets.map((b) => `${b.label}=${b.count}`).join(', ') || 'sem dados'} (limite crítico ${aging.criticalThresholdDays} dias).`,
        losses.totalCount > 0
          ? `- Perdas no período: ${losses.totalCount} negócios, R$ ${losses.totalAmount}. Por motivo: ${losses.byReason.map((r) => `${r.reason} (${r.count}, R$ ${r.amount})`).join('; ')}`
          : '- Nenhuma perda registrada no período.',
      ];

      const agent = new ManagerCommercialAgent();
      const result = await agent.run(contextLines.join('\n'));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Agente Diretoria — Executivo Comercial ──────────────────────────────────────────────────────
router.post(
  '/commercial-cell/executive-director/run',
  writeRoles,
  validateRequest(commercialCellFilterSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const filter = req.body as z.infer<typeof commercialCellFilterSchema>;

      const useCases = resolveCommercialIntelligence();
      const [overview, trends, health, accuracy] = await Promise.all([
        useCases.executiveOverview(organizationId, filter),
        useCases.historicalTrends(organizationId, filter),
        useCases.healthScore(organizationId, filter),
        useCases.forecastAccuracy(organizationId),
      ]);

      const contextLines = [
        `- Período: ${overview.period}. Dados apurados em ${overview.dataAsOf}.`,
        // Mesmo motivo da rota do Gerente acima: aviso aditivo, nunca substitutivo.
        ...(overview.isEmpty
          ? [
              '- ATENÇÃO: nenhum negócio no funil neste período — a base é vazia, não "zerada por desempenho".',
            ]
          : []),
        `- Meta: ${overview.goal ? `R$ ${overview.goal.amount}` : 'NÃO CADASTRADA'}. Fechado: R$ ${overview.closedAmount}. Atingimento: ${orMissing(overview.pctOfGoal, '%')}.`,
        `- Forecast: R$ ${overview.forecastAmount}. Gap de Forecast: ${orMissing(overview.gapForecast)}. Gap de Commit: ${orMissing(overview.gapCommit)}.`,
        `- Pipeline elegível: R$ ${overview.pipelineEligible}. Cobertura 90 dias: ${orMissing(overview.coverage90.coverage, 'x')}.`,
        `- Forecast Confidence: ${orMissing(overview.forecastConfidence.score)} (${overview.forecastConfidence.classification ?? 'sem classificação'}).`,
        accuracy.available
          ? `- Erro histórico do Forecast (previsto x realizado, amostra de ${accuracy.sampleSize} períodos encerrados): ${orMissing(accuracy.meanAbsoluteErrorPercent, '%')} de erro absoluto médio.`
          : `- Erro histórico do Forecast: NÃO DISPONÍVEL (${accuracy.reason ?? 'sem histórico suficiente'}) — não existe base para afirmar quão confiável o forecast tem sido.`,
        `- Health Score composto: ${orMissing(health.overallScore)}.\n${health.pillars
          .map(
            (p) =>
              `  - ${p.label}: ${orMissing(p.score)}${p.classification ? ` (${p.classification})` : ''}${p.unavailableReason ? ` — indisponível: ${p.unavailableReason}` : ''}`,
          )
          .join('\n')}`,
        trends.points.length > 0
          ? `- Tendência dos últimos meses:\n${trends.points
              .map(
                (p) =>
                  `  - ${p.label}: win rate ${orMissing(p.winRate, '%')}, ciclo ${orMissing(p.salesCycleMeanDays, ' dias')}, ticket ganho ${orMissing(p.averageTicketWon)}, pipeline criado ${orMissing(p.pipelineCreatedAmount)} (amostra de ${p.closedSampleSize} fechados)`,
              )
              .join('\n')}`
          : '- Nenhuma série histórica disponível.',
      ];

      const agent = new ExecutiveDirectorAgent();
      const result = await agent.run(contextLines.join('\n'));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Agente Bitrix Guardian ──────────────────────────────────────────────────────────────────────
//
// Caminho 100% de leitura: consome `CrmQualityIndex.bitrixSync` (já calculado por
// commercial-intelligence). Nenhum acesso ao módulo de integrações e nenhum writeback — o writeback
// Bitrix continua exclusivo do domínio de integrações (Agente 06).
router.post(
  '/commercial-cell/bitrix-guardian/run',
  writeRoles,
  validateRequest(commercialCellFilterSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const filter = req.body as z.infer<typeof commercialCellFilterSchema>;

      const quality = await resolveCommercialIntelligence().crmQuality(organizationId, filter);
      const sync = quality.bitrixSync;

      const contextLines = [
        `- Período: ${filter.month}.`,
        sync.connected
          ? '- Conexão Bitrix24: ATIVA.'
          : '- Conexão Bitrix24: NENHUMA conexão ativa nesta organização — todos os números de sincronização abaixo são de uma base sem integração, não de uma integração com falha.',
        `- Negócios abertos: ${sync.totalOpen}; vinculados ao Bitrix: ${sync.linked}; não vinculados: ${sync.notLinked}; com falha: ${sync.failed}.`,
        `- Taxa de vínculo: ${orMissing(sync.linkedRate, '%')}.`,
        `- Última importação bem-sucedida: ${sync.lastSyncAt ?? 'nenhuma registrada'}.`,
        `- Últimos 30 dias: ${sync.syncedCount30d} registros sincronizados com sucesso, ${sync.failedCount30d} com falha.`,
        sync.failures.length > 0
          ? `- Amostra de falhas registradas: ${JSON.stringify(sync.failures)}`
          : '- Nenhuma falha individual registrada na amostra.',
        `- Qualidade geral do CRM no período: score ${orMissing(quality.overallScore, '%')} sobre ${quality.evaluatedCount} negócios avaliados; ${quality.suspectedDuplicateGroups} grupos suspeitos de duplicidade.`,
      ];

      const agent = new BitrixGuardianAgent();
      const result = await agent.run(contextLines.join('\n'));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

const learningRollbackSchema = z.object({
  targetVersion: z.number().int().min(1),
});

router.post(
  '/swarm/learn/rollback',
  validateRequest(learningRollbackSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: actorId, organizationId } = (req as AuthRequest).user;
      const { targetVersion } = req.body as z.infer<typeof learningRollbackSchema>;
      const result = await rollbackLearningProfile(organizationId, actorId, targetVersion);
      if (!result.success) {
        res.status(404).json({ success: false, error: result.reason });
        return;
      }
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

const learningDecisionSchema = z.object({
  targetVersion: z.number().int().min(1),
});

// Item 103 da constituição de produto — gate de aprovação humana para o único ponto do produto
// onde uma reflexão de IA mudava comportamento real de agente sozinha (ver `learning.agent.ts`).
// Self-service, mesmo escopo de `/swarm/learn/history`/`/rollback` acima (identidade sempre de
// `req.user`, nunca de body/querystring) — aprovar só afeta o comportamento do próprio agente do
// próprio usuário.
router.post(
  '/swarm/learn/approve',
  writeRoles,
  validateRequest(learningDecisionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: actorId, organizationId, role } = (req as AuthRequest).user;
      const { targetVersion } = req.body as z.infer<typeof learningDecisionSchema>;
      const result = await approveLearningProfileVersion(organizationId, actorId, targetVersion, {
        userId: actorId,
        userRole: role,
      });
      if (!result.success) {
        res.status(400).json({ success: false, error: result.reason });
        return;
      }
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/swarm/learn/reject',
  writeRoles,
  validateRequest(learningDecisionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: actorId, organizationId, role } = (req as AuthRequest).user;
      const { targetVersion } = req.body as z.infer<typeof learningDecisionSchema>;
      const result = await rejectLearningProfileVersion(organizationId, actorId, targetVersion, {
        userId: actorId,
        userRole: role,
      });
      if (!result.success) {
        res.status(400).json({ success: false, error: result.reason });
        return;
      }
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const agentRoutes = router;
