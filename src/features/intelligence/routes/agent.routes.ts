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
    });
  } catch (err) {
    next(err);
  }
});

// GOV-13 (onda 39): histórico e rollback do perfil de estilo versionado pelo LearningAgent — o
// mecanismo já existia em learning.agent.ts (append-only, nunca sobrescreve), mas ficava
// inacessível fora de um script manual, sem rota HTTP nenhuma (ver
// .agents/handoffs/onda-39/13-para-07-rota-rollback-learning-profile.md). Escopo: sempre o
// perfil do próprio usuário autenticado — o histórico é por (tenant, ator), nunca cross-user,
// então não há aqui uma forma de um ADMIN reverter o perfil aprendido de outro usuário.
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

const revenueIntelligenceRunSchema = z.object({
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

export const agentRoutes = router;
