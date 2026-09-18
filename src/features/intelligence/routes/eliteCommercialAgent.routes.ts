import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { validateRequest } from '../../../shared/middlewares/validateRequest.js';
import { EliteCommercialAgentService } from '../services/eliteCommercialAgent.service.js';

const router = Router();
const service = new EliteCommercialAgentService();

const commercialRoles = requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']);

const executeActionSchema = z.object({
  body: z.object({
    actionId: z.string().min(1),
    channel: z.enum(['PHONE_VOICE', 'EMAIL', 'WHATSAPP', 'PROPOSAL_REVIEW']).optional(),
    notes: z.string().optional(),
    leadId: z.string().optional(),
    phone: z.string().optional(),
  }),
});

const orchestrateSchema = z.object({
  body: z.object({
    accountName: z.string().min(2),
    cnpj: z.string().optional(),
    segment: z.string().optional(),
    fleetSize: z.number().optional(),
    estimatedRevenue: z.number().optional(),
    dealValue: z.number().optional(),
    requestedDiscountPercent: z.number().optional(),
    containsSensitiveData: z.boolean().optional(),
    hasPiiConsent: z.boolean().optional(),
  }),
});

/**
 * GET /api/commercial-agent/workspace
 * Retorna visão executiva do vendedor ("O Que Fazer Agora" e métricas).
 */
router.get('/workspace', commercialRoles, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const organizationId = authReq.user?.organizationId ?? 'default-org';
    const userId = authReq.user?.id ?? 'default-user';

    const overview = await service.getWorkspaceOverview(userId, organizationId);
    return res.json({ success: true, data: overview });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar workspace comercial';
    return res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/commercial-agent/action/execute
 * Executa ação recomendada (Next Best Action) em 1 clique.
 */
router.post(
  '/action/execute',
  commercialRoles,
  validateRequest(executeActionSchema),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user?.organizationId ?? 'default-org';
      const { actionId, channel, notes, leadId, phone } = req.body;

      const result = await service.executeAction(actionId, organizationId, {
        channel,
        notes,
        leadId,
        phone,
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao executar ação comercial';
      return res.status(500).json({ success: false, error: message });
    }
  },
);

/**
 * POST /api/commercial-agent/orchestrate
 * Dispara nova missão comercial supervisionada por Tagarela/Giselle/Patrícia/Guardião.
 */
router.post(
  '/orchestrate',
  commercialRoles,
  validateRequest(orchestrateSchema),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const organizationId = authReq.user?.organizationId ?? 'default-org';
      const userId = authReq.user?.id ?? 'default-user';
      const userRole =
        (authReq.user?.role as 'SDR' | 'CLOSER' | 'GERENTE' | 'DIRETOR' | 'ADMIN') ?? 'CLOSER';

      const missionResponse = await service.orchestrateMission(
        {
          ...req.body,
          userRole,
        },
        organizationId,
        userId,
      );

      return res.json({ success: true, data: missionResponse });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro na orquestração da missão';
      return res.status(500).json({ success: false, error: message });
    }
  },
);

/**
 * GET /api/commercial-agent/mission/:id/trace
 * Retorna o grafo de execução em tempo real do Agent Center.
 */
router.get('/mission/:id/trace', commercialRoles, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const organizationId = authReq.user?.organizationId ?? 'default-org';
    const missionId = String(req.params.id);

    const trace = await service.getMissionTrace(missionId, organizationId);
    if (!trace) {
      return res
        .status(404)
        .json({ success: false, error: 'Rastreamento de missão não encontrado' });
    }
    return res.json({ success: true, data: trace });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao recuperar rastreamento da missão';
    return res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/commercial-agent/prospect
 * Pipeline Proativo: Usa a Malha de Caçadores (Agent Reach) para varrer a web,
 * enriquecer e gerar a missão organicamente.
 */
router.post('/prospect', commercialRoles, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const organizationId = authReq.user?.organizationId ?? 'default-org';
    const userId = authReq.user?.id ?? 'default-user';

    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'O parâmetro query é obrigatório' });
    }

    const missionIds = await service.prospectNewAccounts(query, organizationId, userId);
    return res.json({ success: true, data: { missionIds } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro na captação proativa';
    return res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/commercial-agent/nba/:recommendationId/execute
 * Executa a Próxima Melhor Ação
 */
router.post(
  '/nba/:recommendationId/execute',
  commercialRoles,
  async (req: Request, res: Response) => {
    try {
      const recommendationId = String(req.params.recommendationId);
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id ?? 'default-user';

      const { AdaptiveCadenceService } = await import('../cadence/adaptiveCadence.service.js');
      const cadenceService = new AdaptiveCadenceService();

      // Simulate event triggering execution
      await cadenceService.handleInteractionEvent(req.body.missionId, 'ACTION_EXECUTED_MANUALLY', {
        recommendationId,
        actorId: userId,
      });

      return res.json({ success: true, message: 'Executado via Adaptive Cadence' });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Erro ao executar NBA' });
    }
  },
);

/**
 * POST /api/commercial-agent/nba/:recommendationId/feedback
 * Registra recusa/adiamento e reavalia a cadência
 */
router.post(
  '/nba/:recommendationId/feedback',
  commercialRoles,
  async (req: Request, res: Response) => {
    try {
      const recommendationId = String(req.params.recommendationId);
      const { decision, reason, missionId } = req.body;

      const { prisma } = await import('../../../lib/prisma.js');
      await prisma.nextBestActionRecommendation.update({
        where: { id: recommendationId },
        data: { status: decision, feedbackReason: reason },
      });

      const { AdaptiveCadenceService } = await import('../cadence/adaptiveCadence.service.js');
      const cadenceService = new AdaptiveCadenceService();

      // Aciona loop de feedback para gerar nova recomendação
      await cadenceService.handleInteractionEvent(missionId, `ACTION_${decision}`, { reason });

      return res.json({ success: true, message: 'Feedback registrado e cadência adaptada.' });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Erro ao processar feedback' });
    }
  },
);

export const eliteCommercialAgentRoutes = router;
