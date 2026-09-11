import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { prisma } from '../../../lib/prisma.js';
import { routeParam } from '../../../shared/http/routeParams.js';
import {
  callLead,
  BirthVoiceNotConfiguredError,
  NoPhoneNumberError,
  SuppressedNumberError,
} from './birthVoice.service.js';
import { PiiConsentRequiredError } from '../../intelligence/services/guardrails.service.js';
import {
  listSuppressions,
  recordOptOut,
  normalizeSuppressionKey,
} from './callSuppression.service.js';
import { enabledOrganizations, callWindowFromEnv, dialPolicyFromEnv } from './coldCall.service.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import {
  listVoiceHubConnections,
  connectVoiceHub,
  disconnectVoiceHub,
  testVoiceHubConnection,
} from './voiceHubConnection.service.js';

const router = Router();
const managementRoles = requireRole(['ADMIN', 'GESTOR']);

// Status da campanha de prospecção fria: até aqui, a única forma de saber se ela existe e o que
// fez era ler `.env` e grep no log — nenhuma tela mostrava nada disto.
router.get(
  '/cold-call/status',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const enabled = (await enabledOrganizations()).includes(organizationId);
      const recentRuns = await prisma.coldCallRun.findMany({
        where: { organizationId },
        orderBy: { runAt: 'desc' },
        take: 20,
      });
      res.json({
        success: true,
        data: {
          enabled,
          window: callWindowFromEnv(),
          policy: dialPolicyFromEnv(),
          recentRuns,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Dispara uma ligação do SDR de voz para o lead informado.
router.post(
  '/call/:leadId',
  requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const agentType = req.body.agentType || 'sdr';
      const result = await callLead(
        organizationId,
        routeParam(req.params.leadId, 'leadId'),
        agentType,
      );
      res.status(202).json({ success: true, data: result });
    } catch (error) {
      // Mesmo status/formato usado em intelligence.routes.ts para o mesmo erro — ver
      // guardrails.service.ts:assertPiiExternalConsent.
      if (error instanceof PiiConsentRequiredError) {
        res.status(403).json({ success: false, error: error.message });
        return;
      }
      if (error instanceof BirthVoiceNotConfiguredError) {
        res.status(503).json({ success: false, error: error.message });
        return;
      }
      if (error instanceof NoPhoneNumberError) {
        res.status(422).json({ success: false, error: error.message });
        return;
      }
      // 409 e não 422: o pedido está bem formado e o lead é discável — o que impede a ligação é o
      // estado atual (opt-out registrado), e a distinção importa para a tela dizer o motivo certo.
      if (error instanceof SuppressedNumberError) {
        res.status(409).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  },
);

// Lista interna de bloqueio, para a operação conseguir auditar quem está fora da discagem e por quê.
router.get(
  '/suppressions',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const data = await listSuppressions(organizationId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

const addSuppressionSchema = z.object({
  phone: z.string().min(1, 'Informe o telefone a bloquear.'),
  reason: z.string().max(500).optional(),
  leadId: z.string().optional(),
});

// Bloqueio manual — pedido que chegou por outro canal (e-mail, WhatsApp, atendimento humano).
// CLOSER/SDR também podem registrar: opt-out é uma obrigação imediata do atendimento e não deve
// depender da disponibilidade de um gestor. VISUALIZADOR continua estritamente somente leitura.
router.post(
  '/suppressions',
  requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const parsed = addSuppressionSchema.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
        return;
      }

      // Recusa antes de gravar em vez de gravar um bloqueio que nunca vai casar com nada: o
      // número é a chave, e uma chave que não normaliza é um bloqueio silenciosamente inútil.
      if (!normalizeSuppressionKey(parsed.data.phone)) {
        res.status(422).json({
          success: false,
          error: 'Telefone fora de um formato brasileiro discável — não é possível bloqueá-lo.',
        });
        return;
      }

      await recordOptOut({
        organizationId,
        phone: parsed.data.phone,
        source: 'manual',
        reason: parsed.data.reason ?? null,
        leadId: parsed.data.leadId ?? null,
      });
      res.status(201).json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// --- Conexão com o Birth Voices Hub (tela de Integrações) --------------------------------------
// Mesmo padrão de threecx.routes.ts — lista é aberta a qualquer papel autenticado (a tela precisa
// mostrar o estado atual pra todo mundo), mutações restritas a ADMIN/GESTOR.

router.get('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as AuthRequest).user;
    const data = await listVoiceHubConnections(organizationId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/connect',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const data = await connectVoiceHub(organizationId, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/connections/:connectionId/test',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const data = await testVoiceHubConnection(
        organizationId,
        routeParam(req.params.connectionId, 'connectionId'),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/disconnect/:connectionId',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      await disconnectVoiceHub(organizationId, routeParam(req.params.connectionId, 'connectionId'));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// --- Atividade de chamadas de voz IA (VoiceCallLog) ---------------------------------------------
// Projeção estruturada do resultado de cada ligação (ver voiceResult.webhook.ts) — antes desta
// rota, o único jeito de ver o resultado de uma chamada era abrir o card do lead específico e ler
// a Note em texto livre; não havia visão agregada/recente entre leads.

router.get('/calls', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as AuthRequest).user;
    const take = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

    const calls = await prisma.voiceCallLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = calls.length > take;
    const page = hasMore ? calls.slice(0, take) : calls;

    // Título de exibição resolvido em lote — VoiceCallLog.leadId é de propósito sem @relation
    // Prisma (ver comentário do model), então não dá pra usar `include` aqui.
    const leadIds = [...new Set(page.map((c) => c.leadId))];
    const leads =
      leadIds.length > 0
        ? await prisma.lead.findMany({
            where: { id: { in: leadIds }, organizationId },
            select: {
              id: true,
              company: { select: { tradeName: true, legalName: true } },
              contact: { select: { name: true } },
            },
          })
        : [];
    const leadTitleById = new Map(
      leads.map((l) => [
        l.id,
        l.company?.tradeName || l.company?.legalName || l.contact?.name || null,
      ]),
    );

    res.json({
      success: true,
      data: {
        calls: page.map((c) => ({
          id: c.id,
          leadId: c.leadId,
          leadTitle: leadTitleById.get(c.leadId) ?? null,
          outcome: c.outcome,
          durationSeconds: c.durationSeconds,
          summary: c.summary,
          recordingUrl: c.recordingUrl,
          createdAt: c.createdAt,
        })),
        nextCursor: hasMore ? page[page.length - 1]?.id : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/calls/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = (req as AuthRequest).user;
    const id = routeParam(req.params.id, 'id');
    const call = await prisma.voiceCallLog.findFirst({ where: { id, organizationId } });
    if (!call) {
      res.status(404).json({ success: false, error: 'Chamada não encontrada.' });
      return;
    }
    res.json({ success: true, data: call });
  } catch (error) {
    next(error);
  }
});

export const birthVoiceRoutes = router;
