import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';
import { NegotiatorDraftAgent } from '../agents/negotiatorDraft.agent.js';
import { searchPlaybookTool } from '../tools/playbookTool.js';

const RECENT_MESSAGES_LOOKBACK = 6;

export interface NegotiatorSignalContext {
  leadId: string;
  organizationId: string;
  conversationSignalId: string;
  intent: string | null;
  urgency: string | null;
  objections: string[];
  summary: string | null;
  leadFacts: string;
}

export interface NegotiatorDraft {
  to: string;
  body: string;
}

/** Última mensagem INBOUND (o lado remoto escreveu por último) é quem define o número de
 * destino da réplica — evita responder a um número errado quando o lead trocou de contato
 * recentemente. Retorna `null` quando não há canal de WhatsApp ativo para este lead. */
async function findReplyToNumber(
  organizationId: string,
  leadId: string,
): Promise<string | null> {
  const lastInbound = await prisma.whatsAppMessage.findFirst({
    where: { organizationId, leadId, direction: 'inbound' },
    orderBy: { receivedAt: 'desc' },
    select: { phoneE164: true },
  });
  return lastInbound?.phoneE164 ?? null;
}

async function loadRecentConversation(organizationId: string, leadId: string): Promise<string> {
  const messages = await prisma.whatsAppMessage.findMany({
    where: { organizationId, leadId },
    orderBy: { receivedAt: 'desc' },
    take: RECENT_MESSAGES_LOOKBACK,
    select: { direction: true, body: true, receivedAt: true },
  });
  if (messages.length === 0) return 'Sem histórico de mensagens recuperável.';
  return messages
    .reverse()
    .map((message) => {
      const speaker = message.direction === 'inbound' ? 'Lead' : 'Vendedor';
      return `${speaker}: ${message.body?.trim() || '(mensagem sem texto — mídia ou anexo)'}`;
    })
    .join('\n');
}

async function loadPlaybookGuidance(query: string): Promise<string> {
  try {
    const result = await searchPlaybookTool.invoke({ query });
    return typeof result === 'string' ? result : String(result);
  } catch (error) {
    logger.warn({ err: error }, 'Negociador de IA: falha ao consultar o playbook, seguindo sem ele.');
    return 'Playbook indisponível nesta rodada — responda só com o que está no histórico da conversa.';
  }
}

/**
 * Gera a réplica de WhatsApp sugerida para um sinal de conversa de alta intenção/objeção/urgência
 * (mesmo gatilho já usado por `findSignaledLeads` em swarmScheduler.service.ts). Retorna `null`
 * quando não há um número de WhatsApp real para responder — nunca inventa um destinatário.
 */
export async function draftNegotiatorReply(
  context: NegotiatorSignalContext,
): Promise<NegotiatorDraft | null> {
  const to = await findReplyToNumber(context.organizationId, context.leadId);
  if (!to) {
    logger.info(
      { leadId: context.leadId, conversationSignalId: context.conversationSignalId },
      'Negociador de IA: sinal sem mensagem WhatsApp inbound rastreável, sem destinatário para responder.',
    );
    return null;
  }

  const playbookQuery = [context.intent, ...context.objections].filter(Boolean).join(' ') || context.summary || 'objeção comercial';
  const [conversation, playbookGuidance] = await Promise.all([
    loadRecentConversation(context.organizationId, context.leadId),
    loadPlaybookGuidance(playbookQuery),
  ]);

  const mission = [
    context.leadFacts,
    `Intenção detectada: ${context.intent ?? 'não classificada'}; urgência: ${context.urgency ?? 'não classificada'}.`,
    context.objections.length > 0 ? `Objeções levantadas pelo lead: ${context.objections.join(', ')}.` : null,
    context.summary ? `Resumo da conversa: ${context.summary}` : null,
    '--- Histórico recente da conversa (mais antiga primeiro) ---',
    conversation,
    '--- Orientação do playbook (use se for relevante; não cite a fonte na mensagem) ---',
    playbookGuidance,
  ]
    .filter(Boolean)
    .join('\n');

  const sessionId = `negotiator-${context.leadId}-${context.conversationSignalId}`;
  const agent = new NegotiatorDraftAgent();
  const result = await agent.run(mission, sessionId);

  if (result.error || !result.reply?.trim()) {
    logger.warn(
      { leadId: context.leadId, err: result.error },
      'Negociador de IA: falha ao gerar a réplica sugerida.',
    );
    return null;
  }

  return { to, body: result.reply.trim() };
}
