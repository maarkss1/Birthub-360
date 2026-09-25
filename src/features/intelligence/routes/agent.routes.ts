import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { logger } from '../../../lib/logger.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { synthesizeSpeech } from '../services/voicebox.service.js';

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
    } catch (error: any) {
      logger.error({ err: error }, 'Voicebox TTS request failed');
      next(error);
    }
  },
);

import {
  approveLearningProfileVersion,
  getLearningProfileHistory,
  LearningAgent,
  rejectLearningProfileVersion,
  rollbackLearningProfile,
} from '../agents/learning.agent.js';
// --- SWARM & CONTINUOUS LEARNING ENDPOINTS ---
import { SwarmOrchestrator } from '../agents/supervisor.agent.js';
import { getDatasetSummary, validateToolUseCases } from '../evaluation/goldenDataset.service.js';
import { getEvaluationMetricsSnapshot } from '../services/evaluationMetrics.service.js';
import { getSwarmSloSnapshot } from '../services/swarmScheduler.service.js';

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
    } catch (err: any) {
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
    } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
    next(err);
  }
});

// --- CÉLULA COMERCIAL DE AGENTES (onda 43, Agente 13; onda 6/AIAGENT-004) ---
// Extraída para `commercialCell.routes.ts` na onda 6 — ver o cabeçalho daquele arquivo para o
// motivo (gate de hotspot) e a garantia de que nenhuma URL pública mudou. Montado aqui como
// sub-router, então os caminhos continuam `/api/agent/commercial-cell/...`.
import { commercialCellRoutes } from './commercialCell.routes.js';

router.use(commercialCellRoutes);

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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
      next(err);
    }
  },
);

export const agentRoutes = router;
