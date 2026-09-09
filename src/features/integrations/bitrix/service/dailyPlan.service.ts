import { env } from '../../../../config/env.js';
import { logger } from '../../../../lib/logger.js';
import { prisma } from '../../../../lib/prisma.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import type {
  DailyClosingMetrics,
  DailyPlanItem,
  DailyPlanItemChannel,
  DailyPlanItemOrigin,
  DailyPlanPriorityLevel,
  PendingDailyClosing,
  UserDailyPlanSummary,
} from '../../../../shared/contracts/dailyPlan.contract.js';
import { callBitrix, getConnectionWebhookUrl } from './client.js';
import { listBitrixConnections } from './connections.js';
import { getBitrixUsers } from './deals.js';
import { resolveOwnBitrixUserId } from './userMapping.js';

export type {
  DailyClosingMetrics,
  DailyPlanItem,
  DailyPlanItemChannel,
  DailyPlanItemOrigin,
  DailyPlanPriorityLevel,
  PendingDailyClosing,
  UserDailyPlanSummary,
} from '../../../../shared/contracts/dailyPlan.contract.js';

function deriveTacticalGuidance(
  channel: DailyPlanItemChannel,
  title: string,
  contactName?: string,
  companyName?: string,
): { recommendedAction: string; scriptOrPrompt?: string; suggestedHook?: string } {
  const target = contactName
    ? `${contactName}${companyName ? ` (${companyName})` : ''}`
    : companyName || 'decisor';

  switch (channel) {
    case 'CALL':
      return {
        recommendedAction: `Realizar ligação de qualificação/avanço com ${target}. Confirmar cenário de frota e dor principal.`,
        scriptOrPrompt: `Olá ${contactName || 'tudo bem'}! Aqui é da AtlasGR. Estou retornando nosso contato sobre a visibilidade e controle de frota da sua operação. Como estão as operações hoje?`,
        suggestedHook: 'Enfatizar redução de custos, rastreamento inteligente e suporte ágil 24/7.',
      };
    case 'WHATSAPP':
      return {
        recommendedAction: `Enviar mensagem personalizada de acompanhamento para ${target} pelo WhatsApp.`,
        scriptOrPrompt: `Olá ${contactName || 'tudo bem'}! Passando para checar se você conseguiu ver a apresentação que conversamos. Tem 5 minutos hoje para alinharmos?`,
        suggestedHook: 'Mensagem curta e com CTA direto para confirmação de horário.',
      };
    case 'MEETING':
      return {
        recommendedAction: `Reunião agendada com ${target}. Entrar no Meet 5 minutos antes e revisar histórico.`,
        scriptOrPrompt: `Apresentar caso prático do setor de transporte/logística, reforçando ROI e implementação rápida.`,
        suggestedHook: 'Travar próximos passos com data e responsável antes do fim da reunião.',
      };
    case 'EMAIL':
      return {
        recommendedAction: `Envio de proposta ou formalização de próximos passos para ${target}.`,
        scriptOrPrompt: `Prezado(a) ${contactName || ''}, conforme combinamos, segue o resumo dos pontos alinhados e nossa proposta customizada.`,
        suggestedHook: 'Anexar valores claros e link direto para agendamento de dúvidas.',
      };
    default:
      return {
        recommendedAction:
          contactName || companyName
            ? `Executar a tarefa "${title}" para ${target} e documentar o resultado nas observações para manter o histórico no Bitrix.`
            : `Executar a tarefa "${title}" e documentar o resultado nas observações para manter o histórico no Bitrix.`,
        scriptOrPrompt: 'Registrar evidência clara e atualizar status do lead.',
        suggestedHook: 'Concluir dentro do prazo para manter SLA operacional verde.',
      };
  }
}

type CrmEntityType = 'lead' | 'deal' | 'contact' | 'company';

interface CrmEnrichedInfo {
  contactName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
}

/** `OWNER_TYPE_ID` de `crm.activity.list` (crm.enum.ownertype): 1 = lead, 2 = negócio, 3 = contato, 4 = empresa. */
function crmEntityTypeFromOwnerTypeId(ownerTypeId?: string | number): CrmEntityType | null {
  switch (String(ownerTypeId ?? '')) {
    case '1':
      return 'lead';
    case '2':
      return 'deal';
    case '3':
      return 'contact';
    case '4':
      return 'company';
    default:
      return null;
  }
}

/** Vínculo CRM de uma tarefa (`UF_CRM_TASK`), ex.: "CO_123" empresa, "C_123" contato, "D_123" negócio, "L_123" lead. */
function crmEntityFromTaskLink(link: string): { type: CrmEntityType; id: string } | null {
  const match = /^(CO|C|D|L)_(\d+)$/.exec(link);
  if (!match) return null;
  const [, prefix, id] = match;
  const type: CrmEntityType | null =
    prefix === 'CO' ? 'company' : prefix === 'C' ? 'contact' : prefix === 'D' ? 'deal' : 'lead';
  return { type, id };
}

/** Limite de comandos por chamada `batch` do Bitrix24 (imposto pela própria API). */
const BITRIX_BATCH_CHUNK = 50;

/** Executa comandos `metodo?param=valor` via `batch` do Bitrix24, em blocos de até 50. */
async function callBitrixBatch(
  webhookUrl: string,
  commands: Record<string, string>,
): Promise<Record<string, unknown>> {
  const entries = Object.entries(commands);
  const out: Record<string, unknown> = {};
  for (let i = 0; i < entries.length; i += BITRIX_BATCH_CHUNK) {
    const chunk = Object.fromEntries(entries.slice(i, i + BITRIX_BATCH_CHUNK));
    try {
      const payload = await callBitrix<{ result?: { result?: Record<string, unknown> } }>(
        webhookUrl,
        'batch',
        { halt: 0, cmd: chunk },
      );
      Object.assign(out, payload?.result?.result || {});
    } catch (err) {
      logger.warn(
        { err },
        '[daily-plan] Falha ao resolver lote de contato/empresa/negócio do Bitrix24',
      );
    }
  }
  return out;
}

/**
 * Resolve nome do decisor, empresa, telefone e e-mail para um conjunto de referências CRM
 * (lead/negócio/contato/empresa) vindas de atividades e tarefas do Bitrix24, usando `batch` para
 * não gerar uma chamada HTTP por item — o Plano Diário pode trazer até `MAX_BITRIX_ACTIVITIES` +
 * `MAX_BITRIX_TASKS` itens numa única carga de tela. Negócio só devolve `CONTACT_ID`/`COMPANY_ID`
 * (mesmo padrão de `deals.ts`), então esses vínculos são resolvidos numa segunda leva.
 */
async function resolveCrmEnrichment(
  webhookUrl: string,
  refs: Array<{ type: CrmEntityType; id: string }>,
): Promise<Map<string, CrmEnrichedInfo>> {
  const result = new Map<string, CrmEnrichedInfo>();
  const uniqueRefs = new Map<string, { type: CrmEntityType; id: string }>();
  for (const ref of refs) {
    if (ref.id) uniqueRefs.set(`${ref.type}:${ref.id}`, ref);
  }
  if (uniqueRefs.size === 0) return result;

  const methodByType: Record<CrmEntityType, string> = {
    lead: 'crm.lead.get',
    deal: 'crm.deal.get',
    contact: 'crm.contact.get',
    company: 'crm.company.get',
  };
  const commands: Record<string, string> = {};
  for (const [key, ref] of uniqueRefs) {
    commands[key] = `${methodByType[ref.type]}?id=${encodeURIComponent(ref.id)}`;
  }
  const raw = await callBitrixBatch(webhookUrl, commands);

  const secondaryRefs: Array<{ type: CrmEntityType; id: string }> = [];
  const dealLinks = new Map<string, { contactId?: string; companyId?: string; title?: string }>();

  for (const [key, ref] of uniqueRefs) {
    const entity = raw[key] as Record<string, unknown> | undefined;
    if (!entity) continue;

    if (ref.type === 'contact') {
      const phones = entity.PHONE as Array<{ VALUE?: string }> | undefined;
      const emails = entity.EMAIL as Array<{ VALUE?: string }> | undefined;
      result.set(key, {
        contactName: [entity.NAME, entity.LAST_NAME].filter(Boolean).join(' ') || undefined,
        phone: phones?.[0]?.VALUE,
        email: emails?.[0]?.VALUE,
      });
    } else if (ref.type === 'company') {
      const phones = entity.PHONE as Array<{ VALUE?: string }> | undefined;
      const emails = entity.EMAIL as Array<{ VALUE?: string }> | undefined;
      result.set(key, {
        companyName: (entity.TITLE as string) || undefined,
        phone: phones?.[0]?.VALUE,
        email: emails?.[0]?.VALUE,
      });
    } else if (ref.type === 'lead') {
      const phones = entity.PHONE as Array<{ VALUE?: string }> | undefined;
      const emails = entity.EMAIL as Array<{ VALUE?: string }> | undefined;
      result.set(key, {
        contactName:
          [entity.NAME, entity.LAST_NAME].filter(Boolean).join(' ') ||
          (entity.TITLE as string) ||
          undefined,
        companyName: (entity.COMPANY_TITLE as string) || undefined,
        phone: phones?.[0]?.VALUE,
        email: emails?.[0]?.VALUE,
      });
    } else if (ref.type === 'deal') {
      const contactId = entity.CONTACT_ID ? String(entity.CONTACT_ID) : undefined;
      const companyId = entity.COMPANY_ID ? String(entity.COMPANY_ID) : undefined;
      dealLinks.set(key, { contactId, companyId, title: entity.TITLE as string | undefined });
      if (contactId) secondaryRefs.push({ type: 'contact', id: contactId });
      if (companyId) secondaryRefs.push({ type: 'company', id: companyId });
    }
  }

  if (secondaryRefs.length > 0) {
    const secondary = await resolveCrmEnrichment(webhookUrl, secondaryRefs);
    for (const [key, link] of dealLinks) {
      const contactInfo = link.contactId ? secondary.get(`contact:${link.contactId}`) : undefined;
      const companyInfo = link.companyId ? secondary.get(`company:${link.companyId}`) : undefined;
      result.set(key, {
        contactName: contactInfo?.contactName,
        companyName: companyInfo?.companyName || link.title,
        phone: contactInfo?.phone || companyInfo?.phone,
        email: contactInfo?.email || companyInfo?.email,
      });
    }
  }

  return result;
}

interface BitrixTaskRaw {
  ID: string | number;
  TITLE?: string;
  DESCRIPTION?: string;
  DEADLINE?: string;
  STATUS?: string;
  PRIORITY?: string;
  /** Vínculo com CRM (lead/negócio/contato/empresa) — ex.: ["D_123"], ["CO_45", "C_9"]. */
  UF_CRM_TASK?: string[];
}

interface BitrixActivityRaw {
  ID: string | number;
  TYPE_ID?: string | number;
  SUBJECT?: string;
  START_TIME?: string;
  END_TIME?: string;
  DEADLINE?: string;
  DESCRIPTION?: string;
  PRIORITY?: string;
  /** 1 = lead, 2 = negócio, 3 = contato, 4 = empresa (crm.enum.ownertype). */
  OWNER_TYPE_ID?: string | number;
  OWNER_ID?: string | number;
  COMMUNICATIONS?: Array<{ VALUE?: string }>;
}

/** Fuso do time comercial (mesma env já usada pela política de cold call). O Bitrix devolve datas
 * com offset do portal e o servidor de produção roda em UTC — sem fixar o fuso, "hoje" e a hora
 * exibida escorregam (22h em São Paulo já é amanhã em UTC). */
const PLAN_TIMEZONE = env.SDR_CALL_TIMEZONE;

/** Tetos de paginação por lista — o Bitrix devolve 50 por página e ignora `limit`; o plano traz
 * TODAS as pendências do usuário (pedido explícito), mas com um teto para um portal com backlog
 * gigante não virar dezenas de chamadas por carregamento. */
const BITRIX_PAGE_SIZE = 50;
const MAX_BITRIX_ACTIVITIES = 300;
const MAX_BITRIX_TASKS = 200;
const MAX_BITRIX_LEADS = 10;

function parseDate(value: Date | string | undefined | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** YYYY-MM-DD no fuso do time comercial. */
function toPlanDate(value: Date | string | undefined | null): string | undefined {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('en-CA', { timeZone: PLAN_TIMEZONE }) : undefined;
}

/** HH:MM no fuso do time comercial. */
function toPlanTime(value: Date | string | undefined | null): string | undefined {
  const d = parseDate(value);
  return d
    ? d.toLocaleTimeString('pt-BR', {
        timeZone: PLAN_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : undefined;
}

/** Percorre as páginas de um método *.list do Bitrix24 (`start`/`next`) até `maxItems`. */
async function fetchAllBitrixPages<T>(
  webhookUrl: string,
  method: string,
  params: Record<string, unknown>,
  pick: (payload: unknown) => T[] | undefined,
  maxItems: number,
): Promise<T[]> {
  const out: T[] = [];
  let start = 0;
  while (out.length < maxItems) {
    const payload = await callBitrix<{ next?: number }>(webhookUrl, method, { ...params, start });
    const chunk = pick(payload) ?? [];
    out.push(...chunk);
    if (chunk.length < BITRIX_PAGE_SIZE || typeof payload?.next !== 'number') break;
    start = payload.next;
  }
  return out.slice(0, maxItems);
}

/** Conexão Bitrix da organização via `listBitrixConnections`, que autoconecta o webhook padrão da
 * marca (env) quando ainda não há conexão salva — consultar a tabela direto devolvia
 * "desconectado" para o mesmo tenant que a tela de Integrações mostrava como conectado. */
async function resolvePlanConnection(organizationId: string): Promise<{ id: string } | null> {
  const connections = await listBitrixConnections(organizationId);
  return connections[0] ?? null;
}

/**
 * Resolve o usuário do Bitrix que corresponde ao login da Central, nesta ordem:
 * 1. `overrideBitrixUserId` (ADMIN/GESTOR olhando o plano de outro membro);
 * 2. `User.bitrixUserId` (vínculo explícito gravado no cadastro do usuário);
 * 3. e-mail e, por último, nome completo (ver `resolveOwnBitrixUserId`).
 */
async function resolvePlanBitrixUser(
  organizationId: string,
  connectionId: string,
  user: { email: string; name?: string | null; bitrixUserId?: number | null },
  overrideBitrixUserId?: string,
): Promise<{ id: string | null; name?: string }> {
  const users = await getBitrixUsers(organizationId, connectionId);
  const id =
    overrideBitrixUserId ??
    (user.bitrixUserId != null ? String(user.bitrixUserId) : null) ??
    resolveOwnBitrixUserId(users, user.email, user.name);
  if (!id) return { id: null };
  return { id, name: users.find((u) => u.id === id)?.name };
}

interface BitrixLeadRaw {
  ID: string | number;
  TITLE?: string;
  NAME?: string;
  LAST_NAME?: string;
  COMPANY_TITLE?: string;
  STATUS_ID?: string;
  PHONE?: Array<{ VALUE?: string }>;
  EMAIL?: Array<{ VALUE?: string }>;
}

/**
 * Busca e consolida o Plano Diário de um usuário com dados reais do Bitrix24 e da Central.
 */
export async function fetchUserDailyPlan(
  organizationId: string,
  userEmail: string,
  userId: string,
  userName?: string,
  overrideBitrixUserId?: string,
): Promise<UserDailyPlanSummary> {
  const now = new Date();
  const todayStr = toPlanDate(now) ?? now.toISOString().slice(0, 10);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, bitrixUserId: true },
  });
  const resolvedUserName = userName || user?.name || userEmail;

  // 1. Conexão Bitrix
  const connection = await resolvePlanConnection(organizationId);

  let bitrixUserId: string | null = null;
  let bitrixUserName: string | undefined;
  let rawBitrixTasks: BitrixTaskRaw[] = [];
  let rawBitrixActivities: BitrixActivityRaw[] = [];
  let rawBitrixLeads: BitrixLeadRaw[] = [];
  /** Nome do decisor/empresa/telefone/e-mail resolvidos para as atividades e tarefas do Bitrix24
   * (chave `${tipo}:${id}`, ver `resolveCrmEnrichment`) — sem isto, "Contatar cliente" chega à UI
   * sem nenhum dado real de quem é o cliente. */
  let crmEnrichment = new Map<string, CrmEnrichedInfo>();

  if (connection) {
    try {
      const resolved = await resolvePlanBitrixUser(
        organizationId,
        connection.id,
        { email: userEmail, name: resolvedUserName, bitrixUserId: user?.bitrixUserId },
        overrideBitrixUserId,
      );
      bitrixUserId = resolved.id;
      bitrixUserName = resolved.name;

      if (!bitrixUserId) {
        logger.warn(
          { organizationId, userId, userEmail },
          '[daily-plan] Login da Central sem usuário correspondente no Bitrix24 — plano só com dados locais',
        );
      }

      const webhookUrl = await getConnectionWebhookUrl(organizationId, connection.id);

      if (bitrixUserId) {
        // Todas as tarefas abertas do responsável (não só as de hoje). STATUS 5 = concluída.
        try {
          rawBitrixTasks = await fetchAllBitrixPages<BitrixTaskRaw>(
            webhookUrl,
            'tasks.task.list',
            {
              filter: { RESPONSIBLE_ID: bitrixUserId, '!STATUS': '5' },
              select: [
                'ID',
                'TITLE',
                'DESCRIPTION',
                'DEADLINE',
                'STATUS',
                'PRIORITY',
                'UF_CRM_TASK',
              ],
              order: { DEADLINE: 'ASC' },
            },
            (p) => (p as { result?: { tasks?: BitrixTaskRaw[] } }).result?.tasks,
            MAX_BITRIX_TASKS,
          );
        } catch (err) {
          logger.warn(
            { err, organizationId, bitrixUserId },
            '[daily-plan] Falha ao listar tarefas do Bitrix24',
          );
        }

        // Todas as atividades CRM pendentes do responsável (ligações, reuniões, e-mails...).
        try {
          rawBitrixActivities = await fetchAllBitrixPages<BitrixActivityRaw>(
            webhookUrl,
            'crm.activity.list',
            {
              filter: { RESPONSIBLE_ID: bitrixUserId, COMPLETED: 'N' },
              select: [
                'ID',
                'TYPE_ID',
                'SUBJECT',
                'START_TIME',
                'END_TIME',
                'DEADLINE',
                'DESCRIPTION',
                'PRIORITY',
                'OWNER_TYPE_ID',
                'OWNER_ID',
                'COMMUNICATIONS',
              ],
              order: { DEADLINE: 'ASC' },
            },
            (p) => (p as { result?: BitrixActivityRaw[] }).result,
            MAX_BITRIX_ACTIVITIES,
          );
        } catch (err) {
          logger.warn(
            { err, organizationId, bitrixUserId },
            '[daily-plan] Falha ao listar atividades CRM do Bitrix24',
          );
        }

        // Leads ativos atribuídos — só os mais recentes, como sugestão de follow-up (não são
        // "atividades pendentes"; o Bitrix ignora `limit`, então o corte é feito aqui).
        try {
          const leadRes = await callBitrix<{ result: BitrixLeadRaw[] }>(
            webhookUrl,
            'crm.lead.list',
            {
              filter: { ASSIGNED_BY_ID: bitrixUserId, '!STATUS_SEMANTIC_ID': ['S', 'F'] },
              select: [
                'ID',
                'TITLE',
                'NAME',
                'LAST_NAME',
                'COMPANY_TITLE',
                'STATUS_ID',
                'PHONE',
                'EMAIL',
              ],
              order: { DATE_MODIFY: 'DESC' },
            },
          );
          rawBitrixLeads = (leadRes?.result || []).slice(0, MAX_BITRIX_LEADS);
        } catch (err) {
          logger.warn(
            { err, organizationId, bitrixUserId },
            '[daily-plan] Falha ao listar leads do Bitrix24',
          );
        }

        // Nome do decisor/empresa/telefone/e-mail reais por trás de cada atividade e tarefa —
        // `crm.activity.list`/`tasks.task.list` só devolvem o vínculo (OWNER_ID/UF_CRM_TASK), não
        // os dados do contato/empresa em si.
        try {
          const activityRefs = rawBitrixActivities
            .map((act) => {
              const type = crmEntityTypeFromOwnerTypeId(act.OWNER_TYPE_ID);
              const id = act.OWNER_ID != null ? String(act.OWNER_ID) : undefined;
              return type && id ? { type, id } : null;
            })
            .filter((ref): ref is { type: CrmEntityType; id: string } => ref != null);

          const taskRefs = rawBitrixTasks
            .flatMap((t) => (Array.isArray(t.UF_CRM_TASK) ? t.UF_CRM_TASK : []))
            .map(crmEntityFromTaskLink)
            .filter((ref): ref is { type: CrmEntityType; id: string } => ref != null);

          crmEnrichment = await resolveCrmEnrichment(webhookUrl, [...activityRefs, ...taskRefs]);
        } catch (err) {
          logger.warn(
            { err, organizationId, bitrixUserId },
            '[daily-plan] Falha ao enriquecer atividades/tarefas com contato/empresa do Bitrix24 — seguem sem esses dados',
          );
        }
      }
    } catch (err) {
      logger.warn(
        { err, organizationId, userId },
        '[daily-plan] Bitrix24 indisponível — plano montado só com dados locais',
      );
    }
  }

  // 2. Busca atividades locais da Central
  const startOfDay = new Date(todayStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(todayStr);
  endOfDay.setHours(23, 59, 59, 999);

  // Atividades de hoje (pendentes ou concluídas) + pendentes atrasadas de dias anteriores.
  const localActivities = await prisma.activity.findMany({
    where: {
      organizationId,
      owner: userId,
      OR: [
        { date: { gte: startOfDay, lte: endOfDay } },
        { status: { not: 'Concluida' }, date: { lt: startOfDay } },
      ],
    },
    include: {
      lead: {
        include: {
          company: true,
          contact: true,
        },
      },
    },
    orderBy: { date: 'asc' },
    take: 30,
  });

  // 3. Normalização e Agrupamento
  const items: DailyPlanItem[] = [];

  // 3.1 Atividades locais
  for (const act of localActivities) {
    const isCompleted = act.status === 'Concluida';
    let channel: DailyPlanItemChannel = 'CALL';
    if (act.type === 'Reuniao') channel = 'MEETING';
    else if (act.type === 'WhatsApp') channel = 'WHATSAPP';
    else if (act.type === 'Email') channel = 'EMAIL';

    const isOverdue = !isCompleted && act.date < startOfDay;
    const priority: DailyPlanPriorityLevel = isCompleted
      ? 'COMPLETED'
      : isOverdue || act.type === 'Reuniao'
        ? 'URGENT'
        : 'HIGH';

    const contactName = act.lead?.contact?.name || undefined;
    const companyName = act.lead?.company?.tradeName || act.lead?.company?.legalName || undefined;
    const title = `${act.type}: ${companyName || contactName || act.lead?.title || 'Contato Comercial'}`;

    items.push({
      id: `local_${act.id}`,
      origin: 'LOCAL_ACTIVITY',
      channel,
      title,
      description: act.observations || undefined,
      contactName,
      companyName,
      phone: act.lead?.contact?.phone || undefined,
      email: act.lead?.contact?.email || undefined,
      dueDate: act.date.toISOString().slice(0, 10),
      dueTime: act.time || act.date.toISOString().slice(11, 16),
      priority,
      completed: isCompleted,
      completedAt: isCompleted ? act.updatedAt.toISOString() : undefined,
      leadId: act.leadId,
      tacticalGuidance: deriveTacticalGuidance(channel, title, contactName, companyName),
      notes: act.observations ? [act.observations] : [],
    });
  }

  // 3.2 Atividades Bitrix
  for (const act of rawBitrixActivities) {
    let channel: DailyPlanItemChannel = 'CALL';
    if (act.TYPE_ID === '1' || act.TYPE_ID === 1) channel = 'MEETING';
    else if (act.TYPE_ID === '4' || act.TYPE_ID === 4) channel = 'EMAIL';
    else if (act.SUBJECT?.toLowerCase().includes('whats')) channel = 'WHATSAPP';

    const comm = Array.isArray(act.COMMUNICATIONS) ? act.COMMUNICATIONS[0] : null;
    const dueRaw = act.DEADLINE || act.START_TIME;
    const dueDate = toPlanDate(dueRaw);
    const isOverdue = !!dueDate && dueDate < todayStr;
    const isToday = dueDate === todayStr;
    const isFlagged = channel === 'MEETING' || act.PRIORITY === '2';
    // Atrasada ou reunião/alta prioridade de hoje → URGENT; demais de hoje ou sem prazo → HIGH;
    // agendada para os próximos dias → MEDIUM.
    const priority: DailyPlanPriorityLevel =
      isOverdue || (isToday && isFlagged) ? 'URGENT' : isToday || !dueDate ? 'HIGH' : 'MEDIUM';
    const ownerType = String(act.OWNER_TYPE_ID ?? '');
    const ownerId = act.OWNER_ID != null ? String(act.OWNER_ID) : undefined;
    const ownerEntityType = crmEntityTypeFromOwnerTypeId(act.OWNER_TYPE_ID);
    const enrichment =
      ownerEntityType && ownerId ? crmEnrichment.get(`${ownerEntityType}:${ownerId}`) : undefined;
    const contactName = enrichment?.contactName;
    const companyName = enrichment?.companyName;

    items.push({
      id: `bitrix_act_${act.ID}`,
      externalId: String(act.ID),
      origin: 'BITRIX_ACTIVITY',
      channel,
      title: act.SUBJECT || 'Atividade Bitrix24',
      description: act.DESCRIPTION || undefined,
      contactName,
      companyName,
      phone: comm?.VALUE || enrichment?.phone || undefined,
      email: enrichment?.email,
      dueDate,
      dueTime: toPlanTime(dueRaw),
      priority,
      completed: false,
      bitrixLeadId: ownerType === '1' ? ownerId : undefined,
      bitrixDealId: ownerType === '2' ? ownerId : undefined,
      tacticalGuidance: deriveTacticalGuidance(
        channel,
        act.SUBJECT || 'Atividade',
        contactName,
        companyName,
      ),
      notes: [],
    });
  }

  // 3.3 Tarefas Bitrix
  for (const t of rawBitrixTasks) {
    const deadline = parseDate(t.DEADLINE);
    const dueDate = toPlanDate(deadline);
    const isOverdue = !!deadline && deadline < now;
    const priority: DailyPlanPriorityLevel = isOverdue
      ? 'URGENT'
      : dueDate === todayStr || t.PRIORITY === '2'
        ? 'HIGH'
        : 'MEDIUM';

    const crmLink = (Array.isArray(t.UF_CRM_TASK) ? t.UF_CRM_TASK : [])
      .map(crmEntityFromTaskLink)
      .find((ref): ref is { type: CrmEntityType; id: string } => ref != null);
    const enrichment = crmLink ? crmEnrichment.get(`${crmLink.type}:${crmLink.id}`) : undefined;
    const contactName = enrichment?.contactName;
    const companyName = enrichment?.companyName;

    items.push({
      id: `bitrix_task_${t.ID}`,
      externalId: String(t.ID),
      origin: 'BITRIX_TASK',
      channel: 'TASK',
      title: t.TITLE || 'Tarefa Bitrix24',
      description: t.DESCRIPTION || undefined,
      contactName,
      companyName,
      phone: enrichment?.phone,
      email: enrichment?.email,
      bitrixLeadId: crmLink?.type === 'lead' ? crmLink.id : undefined,
      bitrixDealId: crmLink?.type === 'deal' ? crmLink.id : undefined,
      dueDate,
      dueTime: toPlanTime(deadline),
      priority,
      completed: t.STATUS === '5',
      tacticalGuidance: deriveTacticalGuidance(
        'TASK',
        t.TITLE || 'Tarefa',
        contactName,
        companyName,
      ),
      notes: [],
    });
  }

  // 3.4 Leads Bitrix para acompanhamento
  for (const l of rawBitrixLeads) {
    const phone = Array.isArray(l.PHONE) ? l.PHONE[0]?.VALUE : undefined;
    const leadName = [l.NAME, l.LAST_NAME].filter(Boolean).join(' ') || l.TITLE || 'Lead';
    const company = l.COMPANY_TITLE || undefined;

    items.push({
      id: `bitrix_lead_${l.ID}`,
      externalId: String(l.ID),
      bitrixLeadId: String(l.ID),
      origin: 'BITRIX_LEAD',
      channel: 'WHATSAPP',
      title: `Follow-up de Lead: ${leadName}`,
      contactName: leadName,
      companyName: company,
      phone,
      priority: 'MEDIUM',
      completed: false,
      tacticalGuidance: deriveTacticalGuidance('WHATSAPP', leadName, leadName, company),
      notes: [],
    });
  }

  // 4. Ordenação por prioridade
  const priorityWeight: Record<DailyPlanPriorityLevel, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    COMPLETED: 1,
  };

  items.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (diff !== 0) return diff;
    const dateDiff = (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99');
    if (dateDiff !== 0) return dateDiff;
    return (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99');
  });

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.completed).length;
  const pendingItems = totalItems - completedItems;
  const urgentItems = items.filter((i) => !i.completed && i.priority === 'URGENT').length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    date: todayStr,
    userId,
    userName: resolvedUserName,
    userEmail,
    bitrixUserId,
    bitrixUserName,
    isBitrixConnected: !!connection,
    lastSyncedAt: new Date().toISOString(),
    kpis: {
      totalItems,
      pendingItems,
      completedItems,
      urgentItems,
      completionRate,
    },
    items,
  };
}

/**
 * Conclui um item do plano diário, sincronizando com o Bitrix24 se aplicável.
 */
export async function completeDailyPlanItem(
  organizationId: string,
  _userId: string,
  itemType: DailyPlanItemOrigin,
  itemId: string,
): Promise<{ success: boolean; message: string }> {
  const connection = await resolvePlanConnection(organizationId);

  if (itemType === 'LOCAL_ACTIVITY') {
    const rawId = itemId.replace(/^local_/, '');
    await prisma.activity.update({
      where: { id: rawId, organizationId },
      data: { status: 'Concluida' },
    });
    return { success: true, message: 'Atividade marcada como realizada na Central.' };
  }

  if (!connection) {
    throw new AppError('Conexão com Bitrix24 não encontrada para esta organização.', 400);
  }

  const webhookUrl = await getConnectionWebhookUrl(organizationId, connection.id);
  const rawId = itemId.replace(/^(bitrix_task_|bitrix_act_|bitrix_lead_)/, '');

  if (itemType === 'BITRIX_TASK') {
    await callBitrix(webhookUrl, 'tasks.task.complete', { taskId: rawId });
    return { success: true, message: 'Tarefa concluída e sincronizada no Bitrix24.' };
  }

  if (itemType === 'BITRIX_ACTIVITY') {
    await callBitrix(webhookUrl, 'crm.activity.update', {
      id: rawId,
      fields: { COMPLETED: 'Y' },
    });
    return { success: true, message: 'Atividade CRM concluída e sincronizada no Bitrix24.' };
  }

  if (itemType === 'BITRIX_LEAD') {
    await callBitrix(webhookUrl, 'crm.timeline.comment.add', {
      fields: {
        ENTITY_ID: rawId,
        ENTITY_TYPE: 'lead',
        COMMENT: 'Contato diário realizado via Central AtlasGR.',
      },
    });
    return { success: true, message: 'Contato com lead registrado no Bitrix24.' };
  }

  return { success: true, message: 'Item concluído.' };
}

/**
 * Adiciona observação / nota na tarefa ou timeline do Bitrix24.
 */
export async function addDailyPlanItemNote(
  organizationId: string,
  _userId: string,
  itemType: DailyPlanItemOrigin,
  itemId: string,
  noteText: string,
): Promise<{ success: boolean; message: string }> {
  if (!noteText.trim()) throw new AppError('A observação não pode ser vazia.', 400);

  const connection = await resolvePlanConnection(organizationId);

  if (itemType === 'LOCAL_ACTIVITY') {
    const rawId = itemId.replace(/^local_/, '');
    const act = await prisma.activity.findUnique({ where: { id: rawId, organizationId } });
    if (!act) throw new AppError('Atividade local não encontrada.', 404);

    const updatedObs = act.observations
      ? `${act.observations}\n[${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] ${noteText}`
      : noteText;

    await prisma.activity.update({
      where: { id: rawId },
      data: { observations: updatedObs },
    });
    return { success: true, message: 'Observação salva na atividade da Central.' };
  }

  if (!connection) {
    throw new AppError('Conexão Bitrix24 não encontrada.', 400);
  }

  const webhookUrl = await getConnectionWebhookUrl(organizationId, connection.id);
  const rawId = itemId.replace(/^(bitrix_task_|bitrix_act_|bitrix_lead_)/, '');

  if (itemType === 'BITRIX_TASK') {
    await callBitrix(webhookUrl, 'task.commentitem.add', {
      taskId: rawId,
      fields: { POST_MESSAGE: noteText },
    });
    return {
      success: true,
      message: 'Observação adicionada aos comentários da tarefa no Bitrix24.',
    };
  }

  if (itemType === 'BITRIX_ACTIVITY' || itemType === 'BITRIX_LEAD') {
    await callBitrix(webhookUrl, 'crm.timeline.comment.add', {
      fields: {
        ENTITY_ID: rawId,
        ENTITY_TYPE: 'lead',
        COMMENT: noteText,
      },
    });
    return { success: true, message: 'Observação sincronizada na linha do tempo do Bitrix24.' };
  }

  return { success: true, message: 'Observação registrada.' };
}

/**
 * Cria uma nova atividade/tarefa no Plano Diário e sincroniza no Bitrix24.
 */
export async function createDailyPlanActivity(
  organizationId: string,
  userId: string,
  userEmail: string,
  input: {
    title: string;
    channel: DailyPlanItemChannel;
    contactName?: string;
    phone?: string;
    dueTime?: string;
    observations?: string;
    leadId?: string;
  },
): Promise<{ success: boolean; message: string }> {
  if (!input.title.trim()) throw new AppError('Título é obrigatório.', 400);

  const connection = await resolvePlanConnection(organizationId);

  if (input.leadId) {
    const actType =
      input.channel === 'MEETING'
        ? 'Reuniao'
        : input.channel === 'WHATSAPP'
          ? 'WhatsApp'
          : input.channel === 'EMAIL'
            ? 'Email'
            : 'Ligacao';

    await prisma.activity.create({
      data: {
        organizationId,
        owner: userId,
        leadId: input.leadId,
        type: actType,
        date: new Date(),
        time: input.dueTime || null,
        status: 'Pendente',
        observations: input.observations || null,
      },
    });
  }

  if (connection) {
    try {
      const webhookUrl = await getConnectionWebhookUrl(organizationId, connection.id);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, bitrixUserId: true },
      });
      const { id: bitrixUserId } = await resolvePlanBitrixUser(organizationId, connection.id, {
        email: userEmail,
        name: user?.name,
        bitrixUserId: user?.bitrixUserId,
      });

      if (input.channel === 'TASK') {
        await callBitrix(webhookUrl, 'tasks.task.add', {
          fields: {
            TITLE: input.title,
            RESPONSIBLE_ID: bitrixUserId || undefined,
            DESCRIPTION: input.observations || '',
          },
        });
      } else {
        const typeId = input.channel === 'MEETING' ? 1 : input.channel === 'EMAIL' ? 4 : 2;
        await callBitrix(webhookUrl, 'crm.activity.add', {
          fields: {
            TYPE_ID: typeId,
            SUBJECT: input.title,
            RESPONSIBLE_ID: bitrixUserId || undefined,
            DESCRIPTION: input.observations || '',
            START_TIME: input.dueTime
              ? `${new Date().toISOString().slice(0, 10)} ${input.dueTime}:00`
              : undefined,
          },
        });
      }
    } catch (err) {
      // Banco local já salvou — não falha a criação, mas deixa rastro para diagnóstico.
      logger.warn(
        { err, organizationId, userId },
        '[daily-plan] Atividade salva na Central, mas não sincronizada no Bitrix24',
      );
    }
  }

  return { success: true, message: 'Atividade criada e sincronizada com sucesso.' };
}

/**
 * Métricas de um dia civil específico, só a partir de `Activity` locais (`LOCAL_ACTIVITY`) do
 * usuário — o Bitrix24 não expõe um snapshot histórico do que estava pendente naquele dia, só o
 * estado ao vivo, por isso o parecer de fechamento não inclui itens do Bitrix.
 */
async function computeLocalActivityMetricsForDay(
  organizationId: string,
  userId: string,
  dayStr: string,
): Promise<DailyClosingMetrics> {
  const startOfDay = new Date(dayStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dayStr);
  endOfDay.setHours(23, 59, 59, 999);

  const activities = await prisma.activity.findMany({
    where: { organizationId, owner: userId, date: { gte: startOfDay, lte: endOfDay } },
    select: { status: true },
  });

  const totalItems = activities.length;
  const completedItems = activities.filter((a) => a.status === 'Concluida').length;
  const pendingItems = totalItems - completedItems;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return { totalItems, completedItems, pendingItems, completionRate };
}

/**
 * Verifica se o usuário tem um fechamento de Plano Diário pendente: existe algum dia civil
 * anterior a hoje com pelo menos uma `Activity` local e sem `DailyPlanClosing` registrado. Só olha
 * o dia mais recente com atividade (não acumula múltiplos dias em atraso) — se o usuário ficar
 * vários dias sem logar, só o último dia com atividade é cobrado, para não travar indefinidamente
 * quem volta de férias/licença.
 */
export async function getPendingDailyClosing(
  organizationId: string,
  userId: string,
): Promise<PendingDailyClosing> {
  const now = new Date();
  const todayStr = toPlanDate(now) ?? now.toISOString().slice(0, 10);
  const startOfToday = new Date(todayStr);
  startOfToday.setHours(0, 0, 0, 0);

  const lastActivity = await prisma.activity.findFirst({
    where: { organizationId, owner: userId, date: { lt: startOfToday } },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  if (!lastActivity) return { pending: false };

  const referenceDate =
    toPlanDate(lastActivity.date) ?? lastActivity.date.toISOString().slice(0, 10);

  const existingClosing = await prisma.dailyPlanClosing.findUnique({
    where: { userId_referenceDate: { userId, referenceDate } },
  });
  if (existingClosing) return { pending: false };

  const metrics = await computeLocalActivityMetricsForDay(organizationId, userId, referenceDate);
  return { pending: true, referenceDate, metrics };
}

/**
 * Registra o fechamento do Plano Diário: parecer do usuário sobre `referenceDate` + metas para o
 * novo dia. `upsert` porque o gate pode ser reenviado (ex.: falha de rede após o primeiro submit)
 * sem violar a constraint única `(userId, referenceDate)`.
 */
export async function createDailyPlanClosing(
  organizationId: string,
  userId: string,
  input: { referenceDate: string; userComment: string; nextDayGoals: string[] },
): Promise<{ success: boolean }> {
  if (!input.referenceDate) throw new AppError('referenceDate é obrigatório.', 400);
  if (!input.userComment.trim()) throw new AppError('O parecer do dia é obrigatório.', 400);

  const goals = (input.nextDayGoals || [])
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (goals.length === 0) {
    throw new AppError('Defina ao menos uma meta para o novo dia.', 400);
  }

  const metrics = await computeLocalActivityMetricsForDay(
    organizationId,
    userId,
    input.referenceDate,
  );

  await prisma.dailyPlanClosing.upsert({
    where: { userId_referenceDate: { userId, referenceDate: input.referenceDate } },
    create: {
      organizationId,
      userId,
      referenceDate: input.referenceDate,
      userComment: input.userComment.trim(),
      nextDayGoals: goals,
      ...metrics,
    },
    update: {
      userComment: input.userComment.trim(),
      nextDayGoals: goals,
      ...metrics,
    },
  });

  return { success: true };
}
