import { logger } from '../../../../lib/logger.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { callBitrix, getConnectionWebhookUrl } from './client.js';
import { listBitrixConnections } from './connections.js';
import { getBitrixUsers } from './deals.js';
import { type BitrixUserOption, resolveOwnBitrixUserId } from './userMapping.js';

export type { BitrixUserOption } from './userMapping.js';

/**
 * Widget "Tarefas pendentes" do Hub Executivo (`HubTaskWidget.tsx`) — pedido explícito do usuário:
 * "tudo tem que estar em sincronia com o Bitrix24". Antes disto, o widget só tinha 3 nomes fixos
 * (`ASSIGNEES`) e `useState` local sem nenhuma chamada de rede — marcar uma tarefa como concluída
 * ou delegar uma nova pra um colega parecia real (nome de responsável, checkbox), mas se perdia ao
 * recarregar a página. Aqui a tarefa É uma tarefa real do Bitrix24 (`tasks.task.*`), no mesmo
 * padrão já usado por `dailyPlan.service.ts` — nenhuma tabela nova no Postgres, o Bitrix é a fonte
 * de verdade.
 */
export interface HubTask {
  id: string;
  text: string;
  assigneeId: string;
  assigneeName: string;
  done: boolean;
}

interface HubTaskUserContext {
  id: string;
  email: string;
  name?: string | null;
  bitrixUserId?: number | null;
}

interface BitrixTaskRaw {
  ID: string | number;
  TITLE?: string;
  RESPONSIBLE_ID?: string | number;
  STATUS?: string;
}

/** Tetos de listagem — este é um widget compacto (mostra só as mais recentes), não o Plano Diário
 * completo; sem isso, um gestor com centenas de tarefas delegadas ao longo do tempo pagaria uma
 * lista gigante a cada carregamento do Hub. */
const HUB_TASK_LIST_LIMIT = 30;

async function resolveConnection(organizationId: string): Promise<{ id: string }> {
  const connections = await listBitrixConnections(organizationId);
  const connection = connections[0];
  if (!connection) {
    throw new AppError('Conexão com Bitrix24 não encontrada para esta organização.', 400);
  }
  return connection;
}

/** Resolve o usuário do Bitrix correspondente ao login da Central (mesma ordem de precedência de
 * `resolvePlanBitrixUser` em dailyPlan.service.ts: vínculo explícito, depois e-mail/nome). */
async function resolveCreatorBitrixUserId(
  organizationId: string,
  connectionId: string,
  user: HubTaskUserContext,
): Promise<string> {
  const bitrixUsers = await getBitrixUsers(organizationId, connectionId);
  const id =
    (user.bitrixUserId != null ? String(user.bitrixUserId) : null) ??
    resolveOwnBitrixUserId(bitrixUsers, user.email, user.name);
  if (!id) {
    throw new AppError(
      'Seu login não tem um usuário correspondente no Bitrix24 — peça para vincular seu e-mail/nome ao usuário certo antes de delegar tarefas.',
      400,
    );
  }
  return id;
}

/** Colegas para o seletor "Designar para" — usuários reais e ativos do Bitrix24, não mais os 3
 * nomes fixos hardcoded no componente. */
export async function listHubTaskAssignees(organizationId: string): Promise<BitrixUserOption[]> {
  const connection = await resolveConnection(organizationId);
  return getBitrixUsers(organizationId, connection.id);
}

export async function listHubTasks(
  organizationId: string,
  user: HubTaskUserContext,
): Promise<HubTask[]> {
  const connection = await resolveConnection(organizationId);
  const webhookUrl = await getConnectionWebhookUrl(organizationId, connection.id);

  const [creatorId, assignees] = await Promise.all([
    resolveCreatorBitrixUserId(organizationId, connection.id, user),
    getBitrixUsers(organizationId, connection.id),
  ]);
  const nameById = new Map(assignees.map((a) => [a.id, a.name]));

  let rawTasks: BitrixTaskRaw[];
  try {
    const payload = await callBitrix<{ result?: { tasks?: BitrixTaskRaw[] } }>(
      webhookUrl,
      'tasks.task.list',
      {
        filter: { CREATED_BY: creatorId },
        select: ['ID', 'TITLE', 'RESPONSIBLE_ID', 'STATUS'],
        order: { ID: 'DESC' },
      },
    );
    rawTasks = (payload.result?.tasks ?? []).slice(0, HUB_TASK_LIST_LIMIT);
  } catch (err) {
    logger.warn(
      { err, organizationId, creatorId },
      '[hub-tasks] Falha ao listar tarefas delegadas no Bitrix24',
    );
    throw err;
  }

  return rawTasks.map((t) => {
    const assigneeId = t.RESPONSIBLE_ID != null ? String(t.RESPONSIBLE_ID) : '';
    return {
      id: String(t.ID),
      text: t.TITLE || 'Tarefa sem título',
      assigneeId,
      assigneeName: nameById.get(assigneeId) || 'Responsável',
      done: t.STATUS === '5',
    };
  });
}

export async function createHubTask(
  organizationId: string,
  user: HubTaskUserContext,
  input: { text: string; assigneeId: string },
): Promise<HubTask[]> {
  const text = input.text.trim();
  if (!text) throw new AppError('Descrição da tarefa é obrigatória.', 400);
  if (!input.assigneeId) throw new AppError('Selecione quem vai receber a tarefa.', 400);

  const connection = await resolveConnection(organizationId);
  const webhookUrl = await getConnectionWebhookUrl(organizationId, connection.id);
  const creatorId = await resolveCreatorBitrixUserId(organizationId, connection.id, user);

  await callBitrix(webhookUrl, 'tasks.task.add', {
    fields: {
      TITLE: text,
      RESPONSIBLE_ID: input.assigneeId,
      CREATED_BY: creatorId,
    },
  });

  // Sem o ID/shape exato que `tasks.task.add` devolveria (varia por escopo do webhook) — relista
  // do Bitrix para devolver o estado canônico, mesmo custo de uma segunda chamada mas sem
  // depender de um contrato de resposta não documentado neste portal.
  return listHubTasks(organizationId, user);
}

export async function toggleHubTask(
  organizationId: string,
  user: HubTaskUserContext,
  taskId: string,
  done: boolean,
): Promise<HubTask[]> {
  const connection = await resolveConnection(organizationId);
  const webhookUrl = await getConnectionWebhookUrl(organizationId, connection.id);

  if (done) {
    await callBitrix(webhookUrl, 'tasks.task.complete', { taskId });
  } else {
    await callBitrix(webhookUrl, 'tasks.task.renew', { taskId });
  }

  return listHubTasks(organizationId, user);
}
