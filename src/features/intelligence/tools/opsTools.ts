/**
 * AVISO DE GOVERNANÇA (ACH-13-01):
 * Módulo legado de execução direta de ferramentas do OpsAgent.
 * Em produção, o OpsAgent utiliza `src/features/intelligence/agents/opsPendingActions.tool.ts`
 * para propor ações via `AIPendingAction` em vez de executar diretamente no banco.
 * Mantido apenas para compatibilidade histórica; não é mais fonte de verdade para verificações de segurança.
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTenantId } from '../../../lib/async-context.js';
import { prisma } from '../../../lib/prisma.js';
import { ACTIVITY_TYPE } from '../../../lib/zod.js';
import { activityService } from '../../activities/services/activity.service.js';
import {
  type NotificationKind,
  notificationService,
} from '../../notifications/notification.service.js';

// ATENÇÃO — módulo MORTO em produção, mantido no repo de propósito (histórico/referência), NÃO é
// mais a fonte de verdade para nada que precise refletir o comportamento real do OpsAgent.
//
// `ops.agent.ts` não importa mais nada daqui — ele usa `opsPendingActions.tool.ts`
// (`create_follow_up_task`/`notify_team` com o MESMO nome/schema, mas que registram uma
// `AIPendingAction` em vez de executar direto via `activityService`/`notificationService`; a
// execução real só acontece após aprovação humana em `POST /agent/pending/:id/approve`). Ver o
// comentário no topo de `opsPendingActions.tool.ts` para o raciocínio completo (GOV-13).
//
// Qualquer teste, validador de golden dataset, ou outra verificação de segurança do enxame que
// precise refletir o que o OpsAgent realmente pode fazer DEVE importar de
// `../agents/opsPendingActions.tool.js`, nunca daqui — importar deste arquivo testa um caminho que
// não existe mais em produção e não detecta deriva real entre os dois módulos (ver ACH-13-01).
//
/**
 * Ferramenta para o agente agendar uma tarefa/atividade de follow-up vinculada a um Lead real,
 * para um vendedor humano executar depois — a IA não conduz a ação externa (ligação, e-mail),
 * apenas agenda o lembrete.
 */
export const createFollowUpTaskTool = tool(
  async ({
    leadId,
    date,
    type,
    observations,
    owner,
  }: {
    leadId: string;
    date: string;
    type?: (typeof ACTIVITY_TYPE)[number];
    observations?: string;
    owner?: string;
  }) => {
    const organizationId = getTenantId();
    if (!organizationId) {
      return 'Erro: contexto de organização ausente — não é possível agendar a tarefa com segurança.';
    }

    // Sem `owner` explícito, o responsável real é o vendedor já dono do Lead — a tarefa é
    // sobre esse lead, então ele é o candidato natural, nunca um nome de IA fabricado (ver
    // `.agents/handoffs/onda-7/04-para-07-owner-fabricado-follow-up-ia.md` e o guard
    // `assertRealOwner` em `activity.service.ts`, que rejeita placeholders na origem).
    let resolvedOwner = owner?.trim();
    if (!resolvedOwner) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        select: { owner: true },
      });
      if (!lead) {
        return `Erro: Lead ${leadId} não encontrado no CRM — não é possível agendar a tarefa.`;
      }
      resolvedOwner = lead.owner?.trim() || undefined;
      if (!resolvedOwner) {
        return `Não foi possível agendar a tarefa: o lead ${leadId} ainda não tem um responsável definido no CRM, e nenhum responsável foi informado para a tarefa. Informe explicitamente quem deve executar este follow-up.`;
      }
    }

    try {
      const activity = await activityService.create(organizationId, {
        leadId,
        date,
        type: type || 'Follow-up',
        status: 'Pendente',
        owner: resolvedOwner,
        observations: observations ?? null,
      });
      return `Tarefa "${activity.type}" agendada com sucesso para o lead ${leadId} em ${activity.date.toISOString()}, atribuída a ${resolvedOwner}.`;
    } catch (error) {
      return `Erro ao agendar tarefa: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'create_follow_up_task',
    description:
      'Agenda uma tarefa/atividade de follow-up vinculada a um Lead no CRM, para um vendedor humano executar depois. Use quando a missão pedir para marcar um próximo contato ou lembrete concreto.',
    schema: z.object({
      leadId: z.string().describe('O ID do Lead ao qual a tarefa deve ser vinculada'),
      date: z
        .string()
        .describe(
          'Data (e opcionalmente hora) da tarefa, em formato ISO 8601, ex: 2026-08-05T14:00:00.000Z',
        ),
      type: z.enum(ACTIVITY_TYPE).optional().describe('Tipo da atividade (padrão: Follow-up)'),
      observations: z
        .string()
        .optional()
        .describe('Observações/contexto para quem for executar a tarefa'),
      owner: z.string().optional().describe('Nome do responsável humano pela tarefa, se conhecido'),
    }),
  },
);

/**
 * Ferramenta para o agente alertar a equipe comercial via o sino de notificações do CRM.
 */
export const notifyTeamTool = tool(
  async ({
    title,
    body,
    kind,
    leadId,
  }: {
    title: string;
    body?: string;
    kind?: NotificationKind;
    leadId?: string;
  }) => {
    const organizationId = getTenantId();
    if (!organizationId) {
      return 'Erro: contexto de organização ausente — não é possível notificar a equipe com segurança.';
    }
    const notification = await notificationService.create({
      organizationId,
      title,
      body: body ?? null,
      kind: kind || 'Info',
      entity: leadId ? 'Lead' : null,
      entityId: leadId ?? null,
    });
    if (!notification) {
      return 'Erro: falha ao registrar a notificação para a equipe.';
    }
    return `Notificação "${title}" enviada para a equipe.`;
  },
  {
    name: 'notify_team',
    description:
      'Cria uma notificação interna para a equipe comercial (aparece no sino de notificações do CRM). Use para alertar sobre um risco, oportunidade ou resultado importante da missão que exige atenção humana.',
    schema: z.object({
      title: z.string().min(1).max(160).describe('Título curto e direto da notificação'),
      body: z.string().max(1000).optional().describe('Detalhe opcional da notificação'),
      kind: z
        .enum(['Info', 'Sucesso', 'Alerta', 'Erro'])
        .optional()
        .describe('Severidade da notificação (padrão: Info)'),
      leadId: z.string().optional().describe('ID do Lead relacionado, se houver'),
    }),
  },
);
