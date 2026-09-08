import { prisma } from '../../../../lib/prisma.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import type {
  DailyPlanItem,
  DailyPlanItemChannel,
  DailyPlanItemOrigin,
  DailyPlanPriorityLevel,
  UserDailyPlanSummary,
} from '../../../../shared/contracts/dailyPlan.contract.js';
import { callBitrix, getConnectionWebhookUrl } from './client.js';
import { getBitrixUsers } from './deals.js';
import { resolveOwnBitrixUserId } from './userMapping.js';

export type {
  DailyPlanItem,
  DailyPlanItemChannel,
  DailyPlanItemOrigin,
  DailyPlanPriorityLevel,
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
    case 'TASK':
    default:
      return {
        recommendedAction: `Executar a tarefa "${title}" e documentar o resultado nas observações para manter o histórico no Bitrix.`,
        scriptOrPrompt: 'Registrar evidência clara e atualizar status do lead.',
        suggestedHook: 'Concluir dentro do prazo para manter SLA operacional verde.',
      };
  }
}

interface BitrixTaskRaw {
  ID: string | number;
  TITLE?: string;
  DESCRIPTION?: string;
  DEADLINE?: string;
  STATUS?: string;
  PRIORITY?: string;
}

interface BitrixActivityRaw {
  ID: string | number;
  TYPE_ID?: string | number;
  SUBJECT?: string;
  START_TIME?: string;
  END_TIME?: string;
  DESCRIPTION?: string;
  PRIORITY?: string;
  COMMUNICATIONS?: Array<{ VALUE?: string }>;
}

interface BitrixLeadRaw {
  ID: string | number;
  TITLE?: string;
  NAME?: string;
  LAST_NAME?: string;
  COMPANY_TITLE?: string;
  STATUS_ID?: string;
  PHONE?: Array<{ VALUE?: string }>;
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();

  // Resolve nome do usuário se não informado
  let resolvedUserName = userName;
  if (!resolvedUserName) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    resolvedUserName = user?.name || userEmail;
  }

  // 1. Conexão Bitrix
  const connection = await prisma.bitrixConnection.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
  });

  let bitrixUserId: string | null = null;
  let bitrixUserName: string | undefined;
  let rawBitrixTasks: BitrixTaskRaw[] = [];
  let rawBitrixActivities: BitrixActivityRaw[] = [];
  let rawBitrixLeads: BitrixLeadRaw[] = [];

  if (connection) {
    try {
      const users = await getBitrixUsers(organizationId, connection.id);
      if (overrideBitrixUserId) {
        bitrixUserId = overrideBitrixUserId;
        const matched = users.find((u) => u.id === overrideBitrixUserId);
        if (matched) bitrixUserName = matched.name;
      } else {
        bitrixUserId = resolveOwnBitrixUserId(users, userEmail);
        const matched = users.find((u) => u.id === bitrixUserId);
        if (matched) bitrixUserName = matched.name;
      }

      const webhookUrl = await getConnectionWebhookUrl(organizationId, connection.id);

      if (bitrixUserId) {
        // Busca tarefas
        try {
          const taskRes = await callBitrix<{ result: { tasks: BitrixTaskRaw[] } }>(
            webhookUrl,
            'tasks.task.list',
            {
              filter: { RESPONSIBLE_ID: bitrixUserId, '!STATUS': '5' },
              select: ['ID', 'TITLE', 'DESCRIPTION', 'DEADLINE', 'STATUS', 'PRIORITY'],
              order: { DEADLINE: 'ASC' },
              limit: 25,
            },
          );
          rawBitrixTasks = taskRes?.result?.tasks || [];
        } catch {
          // Fallback silencioso
        }

        // Busca atividades CRM
        try {
          const actRes = await callBitrix<{ result: BitrixActivityRaw[] }>(
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
                'DESCRIPTION',
                'PRIORITY',
                'COMMUNICATIONS',
              ],
              limit: 25,
            },
          );
          rawBitrixActivities = actRes?.result || [];
        } catch {
          // Fallback silencioso
        }

        // Busca leads ativos atribuídos
        try {
          const leadRes = await callBitrix<{ result: BitrixLeadRaw[] }>(
            webhookUrl,
            'crm.lead.list',
            {
              filter: { ASSIGNED_BY_ID: bitrixUserId, '!STATUS_SEMANTIC_ID': ['S', 'F'] },
              select: ['ID', 'TITLE', 'NAME', 'LAST_NAME', 'COMPANY_TITLE', 'STATUS_ID', 'PHONE'],
              order: { DATE_MODIFY: 'DESC' },
              limit: 10,
            },
          );
          rawBitrixLeads = leadRes?.result || [];
        } catch {
          // Fallback silencioso
        }
      }
    } catch {
      // Conexão Bitrix offline ou erro transitório
    }
  }

  // 2. Busca atividades locais da Central
  const startOfDay = new Date(todayStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(todayStr);
  endOfDay.setHours(23, 59, 59, 999);

  const localActivities = await prisma.activity.findMany({
    where: {
      organizationId,
      owner: userId,
      date: { gte: startOfDay, lte: endOfDay },
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

    const priority: DailyPlanPriorityLevel = isCompleted
      ? 'COMPLETED'
      : act.type === 'Reuniao'
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

    const isUrgent = channel === 'MEETING' || act.PRIORITY === '2';
    const comm = Array.isArray(act.COMMUNICATIONS) ? act.COMMUNICATIONS[0] : null;

    items.push({
      id: `bitrix_act_${act.ID}`,
      externalId: String(act.ID),
      origin: 'BITRIX_ACTIVITY',
      channel,
      title: act.SUBJECT || 'Atividade Bitrix24',
      description: act.DESCRIPTION || undefined,
      phone: comm?.VALUE || undefined,
      dueTime: act.START_TIME ? new Date(act.START_TIME).toISOString().slice(11, 16) : undefined,
      priority: isUrgent ? 'URGENT' : 'HIGH',
      completed: false,
      tacticalGuidance: deriveTacticalGuidance(channel, act.SUBJECT || 'Atividade'),
      notes: [],
    });
  }

  // 3.3 Tarefas Bitrix
  for (const t of rawBitrixTasks) {
    const isOverdue = t.DEADLINE && new Date(t.DEADLINE) < now;
    const priority: DailyPlanPriorityLevel = isOverdue
      ? 'URGENT'
      : t.PRIORITY === '2'
        ? 'HIGH'
        : 'MEDIUM';

    items.push({
      id: `bitrix_task_${t.ID}`,
      externalId: String(t.ID),
      origin: 'BITRIX_TASK',
      channel: 'TASK',
      title: t.TITLE || 'Tarefa Bitrix24',
      description: t.DESCRIPTION || undefined,
      dueTime: t.DEADLINE ? new Date(t.DEADLINE).toISOString().slice(11, 16) : undefined,
      priority,
      completed: t.STATUS === '5',
      tacticalGuidance: deriveTacticalGuidance('TASK', t.TITLE || 'Tarefa'),
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
  const connection = await prisma.bitrixConnection.findFirst({
    where: { organizationId },
  });

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

  const connection = await prisma.bitrixConnection.findFirst({
    where: { organizationId },
  });

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

  const connection = await prisma.bitrixConnection.findFirst({
    where: { organizationId },
  });

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
      const users = await getBitrixUsers(organizationId, connection.id);
      const bitrixUserId = resolveOwnBitrixUserId(users, userEmail);

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
    } catch {
      // Silencioso se Bitrix falhar mas banco local salvou
    }
  }

  return { success: true, message: 'Atividade criada e sincronizada com sucesso.' };
}
