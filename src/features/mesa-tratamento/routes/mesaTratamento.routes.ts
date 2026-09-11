import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Prisma } from '@prisma/client';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { hasRequiredRole } from '../../../lib/auth/authorization.js';
import { prisma } from '../../../lib/prisma.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import { routeParam } from '../../../shared/http/routeParams.js';
import {
  findUnimportedBitrixLeadIds,
  importSelectedBitrixLeads,
  getLeadStatuses,
  getBitrixUsers,
  resolveOwnBitrixUserId,
  resolveAtlasUserIdByEmail,
  postCommentToBitrix,
  exportLeadToBitrixNow,
} from '../../integrations/bitrix/bitrix.service.js';
import { rankLeadsForQueue, computeQueuePriorityScore } from '../mesaTratamento.priority.js';
import { resolveLossReasonLabel } from '../constants/lossReasons.js';
import {
  buildDailyActivity,
  buildOutcomeCounts,
  computeDashboardKpis,
  periodDayWindow,
  periodStartDate,
  type DashboardPeriod,
} from '../mesaTratamento.dashboard.js';

const router = Router();
const mesaRoles = requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']);

/** Etapas "abertas" do funil de Lead (SDR) — as únicas que aparecem na Mesa de Tratamento.
 *  Convertido/Desqualificado saem da fila assim que o resultado é registrado. As etapas do funil
 *  Negócio (Nova_Oportunidade, Proposta_Enviada etc.) não são leads de SDR — nunca entram aqui. */
const OPEN_LEAD_STATUSES = [
  'Lead_Recebido',
  'Cadencia_Iniciada',
  'Qualificacao_SDR',
  'Reuniao_Agendada',
] as const;

const leadSelect = {
  id: true,
  status: true,
  temperature: true,
  score: true,
  owner: true,
  lastInteraction: true,
  nextAction: true,
  qualification: true,
  bitrixLeadId: true,
  bitrixStageLabel: true,
  company: { select: { tradeName: true, legalName: true, segment: true } },
  contact: { select: { name: true, role: true, phone: true, email: true } },
} satisfies Prisma.LeadSelect;

type QueueLead = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

function leadTitle(lead: QueueLead): string {
  return (
    lead.company?.tradeName || lead.company?.legalName || lead.contact?.name || `Lead ${lead.id}`
  );
}

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

/** `Lead.owner` grava sempre `User.id` (ver comentário de resolveScope abaixo), nunca um nome —
 *  `ownerNames` resolve esse id pro nome de exibição. CORREÇÃO: antes desta mudança o campo
 *  `owner` da resposta devolvia o `User.id` cru (ex.: um cuid), que a UI (`QueueList.tsx`)
 *  mostrava direto como "Responsável: <cuid>" — nunca foi percebido porque a fila de CLOSER/SDR
 *  estava sempre vazia por causa do MESMO bug de `owner` vs nome corrigido em `resolveScope`
 *  (só ADMIN/GESTOR, vendo a fila do time todo, chegavam a ver esse campo — e aparentemente nunca
 *  reportaram). `null` quando o id não resolve pra nenhum usuário Atlas (nunca fabrica um nome). */
function toQueueSummary(lead: QueueLead, ownerNames: Map<string, string>) {
  return {
    id: lead.id,
    title: leadTitle(lead),
    status: lead.status,
    temperature: lead.temperature,
    daysSinceTouch: daysSince(lead.lastInteraction),
    owner: lead.owner ? (ownerNames.get(lead.owner) ?? null) : null,
    // AGENTS.md: "Pontuação do lead com detalhamento por fator" — explica a posição na fila, não
    // decide ela (ver mesaTratamento.priority.ts::computeQueuePriorityScore).
    priorityScore: computeQueuePriorityScore(lead),
  };
}

function toQueueDetail(lead: QueueLead, ownerNames: Map<string, string>) {
  return {
    ...toQueueSummary(lead, ownerNames),
    segment: lead.company?.segment ?? null,
    contactName: lead.contact?.name ?? null,
    contactRole: lead.contact?.role ?? null,
    phone: lead.contact?.phone ?? null,
    email: lead.contact?.email ?? null,
    score: lead.score,
    bitrixStageLabel: lead.bitrixStageLabel,
    nextAction: lead.nextAction,
    // Já buscado do banco (leadSelect) mas descartado antes desta correção (achado do Piloto
    // 026) — checklist de qualificação do SDR (Playbook Comercial Birth Hub 360 §4.2), útil pra decidir
    // o que fazer agora sem reabrir o cadastro completo do lead em outra tela.
    qualification: lead.qualification,
  };
}

/** "Cada usuário só vê o próprio dado do Bitrix", mesmo princípio de resolveScopedAssignedById em
 *  bitrix.routes.ts (não exportada de lá — reimplementada aqui com as mesmas peças exportadas).
 *
 *  CORREÇÃO: esta função filtrava `Lead.owner` (que sempre grava `User.id` — ver o comentário de
 *  `resolveAtlasUserIdByEmail` em `integrations/bitrix/service/userMapping.ts` e o uso real em
 *  `LeadUseCases.ts`) contra `user.name` (um NOME de exibição), então `where.owner = scope.ownerName`
 *  nunca batia com nenhum Lead real — todo CLOSER/SDR via a fila sempre vazia. O mesmo bug existia
 *  na checagem de posse de `/lead/:id/register` abaixo. Corrigido usando `userId` (já disponível no
 *  token, sem precisar buscar o nome) nos dois lugares — `assignedById`/`resolveOwnBitrixUserId`
 *  continuam corretos (é assim que a importação do Bitrix já resolve o vínculo). */
async function resolveScope(
  req: Request,
  organizationId: string,
  connectionId: string,
): Promise<{
  ownerId: string | undefined;
  assignedById: string | undefined;
  restricted: boolean;
  matched: boolean;
}> {
  const { role, id: userId, email } = (req as AuthRequest).user;
  if (hasRequiredRole(role, ['ADMIN', 'GESTOR'])) {
    return { ownerId: undefined, assignedById: undefined, restricted: false, matched: true };
  }
  const bitrixUsers = await getBitrixUsers(organizationId, connectionId);
  const assignedById = resolveOwnBitrixUserId(bitrixUsers, email) ?? undefined;
  return {
    ownerId: userId,
    assignedById,
    restricted: true,
    matched: !!assignedById,
  };
}

router.get(
  '/queue',
  mesaRoles,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const connection = await prisma.bitrixConnection.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      });
      if (!connection) {
        res.json({
          success: true,
          data: { queue: [], current: null, connectionId: null, leadStatuses: [] },
        });
        return;
      }

      const scope = await resolveScope(req, organizationId, connection.id);
      if (scope.restricted && !scope.matched) {
        res.json({
          success: true,
          data: { queue: [], current: null, connectionId: connection.id, leadStatuses: [] },
          meta: {
            warning:
              'Seu usuário não foi encontrado no Bitrix24 (confira o e-mail cadastrado) — não é possível montar sua fila.',
          },
        });
        return;
      }

      // Traz pro Prisma qualquer lead do Bitrix ainda não importado, atribuído a este usuário
      // (ADMIN/GESTOR: sem filtro — importa novidades do time todo, até um teto por chamada).
      const { ids } = await findUnimportedBitrixLeadIds(organizationId, connection.id, 50, {
        assignedById: scope.assignedById,
      });
      if (ids.length > 0) {
        await importSelectedBitrixLeads(organizationId, connection.id, ids, scope.assignedById);
      }

      const where: Prisma.LeadWhereInput = {
        organizationId,
        bitrixLeadId: { not: null },
        status: { in: [...OPEN_LEAD_STATUSES] },
      };
      if (scope.ownerId) where.owner = scope.ownerId;

      const [leads, leadStatuses] = await Promise.all([
        prisma.lead.findMany({ where, select: leadSelect }),
        getLeadStatuses(organizationId, connection.id),
      ]);

      // `Lead.owner` não é uma relação Prisma (coluna `String?` solta — ver comentário de
      // toQueueSummary) — resolve os nomes em lote, não um `findUnique` por lead.
      const ownerIds = [...new Set(leads.map((l) => l.owner).filter((v): v is string => !!v))];
      const owners =
        ownerIds.length > 0
          ? await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true } })
          : [];
      const ownerNames = new Map(owners.map((u) => [u.id, u.name]));

      const ranked = rankLeadsForQueue(leads);
      res.json({
        success: true,
        data: {
          queue: ranked.map((l) => toQueueSummary(l, ownerNames)),
          current: ranked[0] ? toQueueDetail(ranked[0], ownerNames) : null,
          connectionId: connection.id,
          leadStatuses,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/lead/:id/register',
  mesaRoles,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const id = routeParam(req.params.id, 'id');
      const body = req.body as {
        outcome?:
          | 'contato'
          | 'reuniao_agendada'
          | 'reuniao_realizada'
          | 'retorno'
          | 'convertido'
          | 'sem_fit'
          | 'dados_invalidos'
          | 'revisao';
        note?: string;
        bitrixStatusId?: string;
        lossReasonId?: string;
        nextActionTitle?: string;
        nextActionWhen?: string;
      };

      if (!body.outcome) throw new AppError('Selecione o resultado do contato.', 400);
      if (!body.note?.trim())
        throw new AppError('Registre uma observação antes de continuar.', 400);

      const isDisqualify = body.outcome === 'sem_fit' || body.outcome === 'dados_invalidos';
      if (isDisqualify && !body.lossReasonId)
        throw new AppError('Selecione o motivo de desqualificação.', 400);

      const lead = await prisma.lead.findFirst({
        where: { id, organizationId },
        select: { id: true, owner: true, bitrixLeadId: true },
      });
      if (!lead) throw new AppError('Lead não encontrado.', 404);
      if (!lead.bitrixLeadId)
        throw new AppError('Este Lead ainda não está vinculado ao Bitrix24.', 400);

      // CLOSER/SDR só registra em leads que são dele — mesmo princípio de requireLeadOwnership.ts
      // (lead.routes.ts), reimplementado aqui pois aquele middleware é específico da rota /api/leads.
      // `Lead.owner` sempre grava `User.id` (ver comentário de resolveScope acima) — comparar
      // contra `userId` direto, não contra um nome buscado à parte (bug corrigido nesta mudança:
      // a comparação anterior contra `user.name` nunca era verdadeira, então todo CLOSER/SDR
      // recebia 403 mesmo em leads legitimamente seus).
      const { role, id: userId } = (req as AuthRequest).user;
      if (!hasRequiredRole(role, ['ADMIN', 'GESTOR']) && lead.owner !== userId) {
        throw new AppError('Este Lead não é seu.', 403);
      }

      const connection = await prisma.bitrixConnection.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      });
      if (!connection)
        throw new AppError('Bitrix24 não está conectado para esta organização.', 400);

      const data: Prisma.LeadUpdateInput = {
        lastInteraction: new Date(),
        nextAction: body.nextActionWhen ? new Date(body.nextActionWhen) : undefined,
      };
      // Só mexemos no status local do Atlas nos dois casos inequívocos (desqualificar/converter)
      // — os demais resultados mudam a etapa real só no Bitrix (via bitrixStatusId abaixo), que é
      // a fonte da verdade pro funil de SDR. Ver AGENTS.md desta pasta.
      if (isDisqualify) {
        data.status = 'Lead_Desqualificado';
        // Bug real corrigido aqui: `body.lossReasonId` é o ID numérico opaco do Bitrix (ex.
        // "21638"), mas todo o resto do produto que lê `Lead.lossReason` (Win/Loss Analysis,
        // `lossTaxonomy.ts` do Comercial Inteligente, e a própria sincronização de volta ao
        // Bitrix em `buildOutboundCustomFields`) espera o TEXTO do motivo — é assim que a
        // importação de leads do Bitrix já grava esse campo (`applyInboundCustomFields`, que
        // resolve o ID pra texto antes de persistir). Gravar o ID cru fazia "21638" aparecer como
        // "Principal motivo de perda" na tela de Win/Loss, quebrava a classificação de motivo de
        // perda (sempre caía em "Outro") e fazia a exportação de volta ao Bitrix falhar em
        // silêncio (o texto não bate com nenhum valor do enum, `buildOutboundCustomFields` só
        // loga em debug e não envia o campo). Traduz pro texto aqui, na escrita, pra todo
        // consumidor a jusante já receber o mesmo formato que o Bitrix também produz.
        data.lossReason = resolveLossReasonLabel(body.lossReasonId as string);
      } else if (body.outcome === 'convertido') {
        data.status = 'Convertido_em_Oportunidade';
      }

      // Bitrix é a fonte da verdade pro funil de SDR (ver AGENTS.md desta pasta) — grava lá
      // primeiro. Se a escrita no Bitrix falhar (rede, webhook inválido, rate limit), o Atlas não
      // muda nada localmente antes de propagar o erro, evitando os dois sistemas divergirem: antes
      // desta correção, `prisma.lead.update` já commitava o novo status local (podendo tirar o
      // lead da fila via `OPEN_LEAD_STATUSES`) mesmo quando a chamada ao Bitrix falhava depois,
      // deixando Atlas e Bitrix dessincronizados sem que o SDR soubesse (achado do Piloto 026).
      const comment = `Mesa de Tratamento SDR • ${new Date().toLocaleString('pt-BR')}\nResultado: ${body.outcome}\nObservação: ${body.note.trim()}`;
      await postCommentToBitrix(organizationId, id, comment);
      await exportLeadToBitrixNow(
        organizationId,
        id,
        connection.id,
        body.bitrixStatusId ? { statusId: body.bitrixStatusId } : undefined,
      );

      await prisma.lead.update({ where: { id }, data });

      // Histórico próprio pro dashboard — antes desta rodada o único registro do desfecho ficava
      // só no comentário de texto livre do Bitrix, ilegível pra agregação. Vem depois da escrita
      // no Bitrix/Prisma acima de propósito: um erro aqui nunca deve reverter ou bloquear o
      // registro real do atendimento, só a métrica do dashboard.
      await prisma.mesaTratamentoTreatment.create({
        data: { organizationId, userId, leadId: id, outcome: body.outcome },
      });

      if (body.nextActionTitle && body.nextActionWhen) {
        const owner = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        await prisma.activity.create({
          data: {
            type: 'Tarefa',
            owner: owner?.name || 'Mesa de Tratamento',
            date: new Date(body.nextActionWhen),
            status: 'Pendente',
            observations: body.nextActionTitle,
            leadId: id,
            organizationId,
          },
        });
      }

      res.json({ success: true, data: { registered: true } });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/pomodoro/session',
  mesaRoles,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId } = (req as AuthRequest).user;
      const body = req.body as { durationMinutes?: number; cycleNumber?: number };
      const durationMinutes = Number(body.durationMinutes);
      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        throw new AppError('Duração do bloco de foco inválida.', 400);
      }

      await prisma.pomodoroSession.create({
        data: {
          organizationId,
          userId,
          durationMinutes: Math.round(durationMinutes),
          cycleNumber: Number.isFinite(Number(body.cycleNumber))
            ? Math.round(Number(body.cycleNumber))
            : undefined,
        },
      });

      res.json({ success: true, data: { logged: true } });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/dashboard',
  mesaRoles,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, role, id: userId } = (req as AuthRequest).user;
      const period = (
        ['today', '7d', '30d', 'all'].includes(String(req.query.period))
          ? String(req.query.period)
          : 'all'
      ) as DashboardPeriod;

      // Mesmo princípio de resolveScope acima: ADMIN/GESTOR veem o time todo, CLOSER/SDR só o
      // próprio histórico — mas aqui filtrando por `userId` interno do Atlas (dono real do
      // registro), não pelo nome/ID do Bitrix (resolveScope existe pra escopar Leads, que não têm
      // FK de usuário — este histórico tem).
      const own = !hasRequiredRole(role, ['ADMIN', 'GESTOR']);
      const start = periodStartDate(period);
      const dayWindow = periodDayWindow(period);
      const windowStart = new Date(Date.now() - dayWindow * 86_400_000);
      const effectiveStart = start && start > windowStart ? start : windowStart;

      const [treatments, pomodoroSessions] = await Promise.all([
        prisma.mesaTratamentoTreatment.findMany({
          where: {
            organizationId,
            ...(own ? { userId } : {}),
            createdAt: { gte: effectiveStart },
          },
          select: { outcome: true, createdAt: true },
        }),
        prisma.pomodoroSession.findMany({
          where: {
            organizationId,
            ...(own ? { userId } : {}),
            createdAt: { gte: effectiveStart },
          },
          select: { durationMinutes: true, createdAt: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          period,
          dailyActivity: buildDailyActivity(treatments, pomodoroSessions, dayWindow),
          outcomeCounts: buildOutcomeCounts(treatments),
          kpis: computeDashboardKpis(treatments, pomodoroSessions),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// --- Painel de gestão (ADMIN/GESTOR) ---------------------------------------------------------
// AGENTS.md: "Painel de gestão com ações (reatribuir responsável, comentar, marcar como
// decidido)". Reusa inteiramente a integração Bitrix já existente (`bitrix.service.ts`) — nenhuma
// chamada nova ao Bitrix é inventada aqui, só combinações novas de funções já existentes.
const managementRoles = requireRole(['ADMIN', 'GESTOR']);

router.post(
  '/lead/:id/reassign',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const id = routeParam(req.params.id, 'id');
      const body = req.body as { bitrixUserId?: string };
      if (!body.bitrixUserId?.trim())
        throw new AppError('Selecione o novo responsável.', 400);

      const lead = await prisma.lead.findFirst({
        where: { id, organizationId },
        select: { id: true, bitrixLeadId: true },
      });
      if (!lead) throw new AppError('Lead não encontrado.', 404);
      if (!lead.bitrixLeadId)
        throw new AppError('Este Lead ainda não está vinculado ao Bitrix24.', 400);

      const connection = await prisma.bitrixConnection.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      });
      if (!connection)
        throw new AppError('Bitrix24 não está conectado para esta organização.', 400);

      const bitrixUsers = await getBitrixUsers(organizationId, connection.id);
      const chosen = bitrixUsers.find((u) => u.id === body.bitrixUserId);
      if (!chosen) throw new AppError('Usuário do Bitrix24 não encontrado.', 400);

      // Bitrix primeiro (fonte da verdade do funil de SDR, mesmo princípio do /register acima) —
      // só grava local depois de confirmar que a escrita lá deu certo.
      await exportLeadToBitrixNow(organizationId, id, connection.id, {
        assignedById: body.bitrixUserId,
      });

      // `Lead.owner` precisa do User.id do Atlas (não do id/nome do Bitrix) — mesma convenção da
      // importação (ver comentário de resolveScope acima). Fica `null` quando o novo responsável
      // do Bitrix não tem usuário correspondente no Atlas (ex.: só existe no Bitrix) — a fila
      // simplesmente não filtra por ele até esse vínculo existir, nunca fabrica um dono.
      const newOwnerId = chosen.email
        ? await resolveAtlasUserIdByEmail(organizationId, chosen.email)
        : null;
      await prisma.lead.update({ where: { id }, data: { owner: newOwnerId } });

      await postCommentToBitrix(
        organizationId,
        id,
        `Mesa de Tratamento SDR (gestão) • ${new Date().toLocaleString('pt-BR')}\nResponsável reatribuído para ${chosen.name}.`,
      );

      res.json({
        success: true,
        data: { reassigned: true, ownerId: newOwnerId, ownerName: chosen.name },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/lead/:id/comment',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = (req as AuthRequest).user;
      const id = routeParam(req.params.id, 'id');
      const body = req.body as { comment?: string };
      if (!body.comment?.trim()) throw new AppError('Escreva um comentário.', 400);

      const lead = await prisma.lead.findFirst({
        where: { id, organizationId },
        select: { id: true, bitrixLeadId: true },
      });
      if (!lead) throw new AppError('Lead não encontrado.', 404);
      if (!lead.bitrixLeadId)
        throw new AppError('Este Lead ainda não está vinculado ao Bitrix24.', 400);

      await postCommentToBitrix(
        organizationId,
        id,
        `Mesa de Tratamento SDR (gestão) • ${new Date().toLocaleString('pt-BR')}\n${body.comment.trim()}`,
      );

      res.json({ success: true, data: { commented: true } });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/lead/:id/decide',
  managementRoles,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, id: userId } = (req as AuthRequest).user;
      const id = routeParam(req.params.id, 'id');
      const body = req.body as { note?: string };

      const lead = await prisma.lead.findFirst({
        where: { id, organizationId },
        select: { id: true, bitrixLeadId: true },
      });
      if (!lead) throw new AppError('Lead não encontrado.', 404);

      // Comentário no Bitrix é best-effort (só quando o lead já está vinculado) — "marcar como
      // decidido" ainda registra o histórico local mesmo sem vínculo Bitrix, diferente de
      // /register e /comment (que exigem o vínculo porque a ação PRINCIPAL deles é a escrita lá).
      if (lead.bitrixLeadId) {
        const note = body.note?.trim();
        await postCommentToBitrix(
          organizationId,
          id,
          `Mesa de Tratamento SDR (gestão) • ${new Date().toLocaleString('pt-BR')}\nRevisado e decidido pela gestão.${note ? `\n${note}` : ''}`,
        );
      }

      // Mesmo histórico usado por /register — entra na mesma agregação do dashboard
      // (mesaTratamento.dashboard.ts) sem precisar de um outcome novo lá.
      await prisma.mesaTratamentoTreatment.create({
        data: { organizationId, userId, leadId: id, outcome: 'decidido_pela_gestao' },
      });

      res.json({ success: true, data: { decided: true } });
    } catch (error) {
      next(error);
    }
  },
);

export const mesaTratamentoRoutes = router;
