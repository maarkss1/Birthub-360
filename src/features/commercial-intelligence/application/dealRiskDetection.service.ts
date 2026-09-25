import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { LeadStatus } from '@prisma/client';
import { cleanAndParseJson, getAiModel, logAiUsage } from '../../../lib/ai/gateway';
import { logger } from '../../../lib/logger';
import { prisma } from '../../../lib/prisma';
import { notificationService } from '../../notifications/notification.service';

/**
 * Detecção de deal em risco (item 5 de "IA Agêntica de Vendas"): três sinais — silêncio do lead,
 * mudança de tom na conversa e menção de concorrente — geram um alerta direto ao(s) gestor(es) da
 * organização, antes da perda ser registrada.
 *
 * Escopo deliberado desta primeira versão: os sinais de tom/concorrente NÃO viram coluna nova em
 * `ConversationSignal` (schema é propriedade exclusiva do Agente 01 — ver AGENTS.md raiz) nem
 * tocam `conversation-intelligence.service.ts` (propriedade exclusiva do Agente 06, coordenação
 * de IA com o Agente 07 — ver `src/features/integrations/AGENTS.md`). Em vez disso, é uma
 * segunda leitura independente, própria deste serviço, sobre as mesmas `WhatsAppMessage` já
 * persistidas — não duplica nem conflita com a extração existente (intenção/urgência/objeção),
 * só adiciona os dois sinais que faltavam. O alerta em si usa `notificationService` (exceção
 * estrutural documentada em `.dependency-cruiser.cjs`: serviço transversal, importável direto por
 * qualquer feature).
 */

const OPEN_STATUSES_EXCLUDED: LeadStatus[] = [
  'Negocios_Ganhos',
  'Negocios_Perdidos',
  'Lead_Desqualificado',
];
const SILENCE_THRESHOLD_DAYS = 5;
const ALERT_COOLDOWN_HOURS = 48;
const MAX_LEADS_SCANNED_FOR_SILENCE = 200;
/** Teto de leads por rodada de análise de tom/concorrente — controla custo/latência de uma única
 * chamada de IA em lote, não a qualidade do sinal (leads fora do teto entram na próxima rodada). */
const MAX_LEADS_SCANNED_FOR_CONVERSATION = 15;
const RECENT_MESSAGE_WINDOW_HOURS = 24;
const MESSAGES_PER_LEAD_ANALYZED = 6;

export type DealRiskReason = 'silencio' | 'tom_negativo' | 'concorrente_mencionado';

interface RiskCandidate {
  leadId: string;
  reason: DealRiskReason;
  detail: string;
}

export interface DetectDealRisksResult {
  scanned: number;
  alertsCreated: number;
  skippedCooldown: number;
  errors: number;
}

interface ConversationAnalysis {
  toneNegative: boolean;
  competitorMentioned: string | null;
}

function titlePrefix(reason: DealRiskReason): string {
  if (reason === 'silencio') return 'Risco de perda — silêncio do lead';
  if (reason === 'tom_negativo') return 'Risco de perda — mudança de tom';
  return 'Risco de perda — concorrente mencionado';
}

async function findSilentLeads(organizationId: string, now: Date): Promise<RiskCandidate[]> {
  const cutoff = new Date(now.getTime() - SILENCE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const leads = await prisma.lead.findMany({
    where: {
      organizationId,
      status: { notIn: OPEN_STATUSES_EXCLUDED },
      OR: [
        { lastInteraction: { lte: cutoff } },
        { lastInteraction: null, createdAt: { lte: cutoff } },
      ],
    },
    take: MAX_LEADS_SCANNED_FOR_SILENCE,
    select: {
      id: true,
      lastInteraction: true,
      createdAt: true,
      company: { select: { tradeName: true } },
    },
  });

  return leads.map((lead) => {
    const since = lead.lastInteraction ?? lead.createdAt;
    const days = Math.floor((now.getTime() - since.getTime()) / (24 * 60 * 60 * 1000));
    return {
      leadId: lead.id,
      reason: 'silencio' as const,
      detail: `${lead.company?.tradeName ?? 'Lead sem empresa identificada'} — sem interação há ${days} dias.`,
    };
  });
}

async function findLeadsWithRecentInbound(organizationId: string, now: Date): Promise<string[]> {
  const since = new Date(now.getTime() - RECENT_MESSAGE_WINDOW_HOURS * 60 * 60 * 1000);
  const rows = await prisma.whatsAppMessage.findMany({
    where: {
      organizationId,
      direction: 'inbound',
      receivedAt: { gte: since },
      leadId: { not: null },
    },
    orderBy: { receivedAt: 'desc' },
    distinct: ['leadId'],
    take: MAX_LEADS_SCANNED_FOR_CONVERSATION,
    select: { leadId: true },
  });
  return rows.map((row) => row.leadId).filter((id): id is string => Boolean(id));
}

async function loadRecentConversation(organizationId: string, leadId: string): Promise<string> {
  const messages = await prisma.whatsAppMessage.findMany({
    where: { organizationId, leadId },
    orderBy: { receivedAt: 'desc' },
    take: MESSAGES_PER_LEAD_ANALYZED,
    select: { direction: true, body: true },
  });
  return messages
    .reverse()
    .map(
      (message) =>
        `${message.direction === 'inbound' ? 'Lead' : 'Vendedor'}: ${message.body?.trim() || '(mídia/anexo)'}`,
    )
    .join('\n');
}

async function findConversationRisks(organizationId: string, now: Date): Promise<RiskCandidate[]> {
  const leadIds = await findLeadsWithRecentInbound(organizationId, now);
  if (leadIds.length === 0) return [];

  const conversations = await Promise.all(
    leadIds.map(async (leadId) => ({
      leadId,
      text: await loadRecentConversation(organizationId, leadId),
    })),
  );

  const system = `Você analisa conversas de WhatsApp entre um vendedor e um lead comercial B2B. Para CADA conversa numerada abaixo, avalie SOMENTE o que está escrito — nunca invente.

Responda com um array JSON, na MESMA ORDEM das conversas recebidas, um item por conversa:
[
  {
    "toneNegative": true ou false — true SOMENTE se o lado do LEAD demonstrar claramente frustração, insatisfação ou tom hostil nas mensagens mais recentes (não é "toneNegative" só por objeção comercial normal, tipo pedir desconto),
    "competitorMentioned": nome do concorrente EXATAMENTE como mencionado pelo lead, ou null se nenhum concorrente foi citado — nunca invente um nome que não apareça no texto
  }
]`;

  const human = `Conversas (${conversations.length}):\n${JSON.stringify(
    conversations.map((c, i) => ({ conversa: i + 1, mensagens: c.text })),
    null,
    2,
  )}`;

  const model = getAiModel('local-llama3-fast', 0.1, 'deal-risk-detection');
  const startTime = Date.now();

  try {
    const response = await model.invoke([new SystemMessage(system), new HumanMessage(human)]);
    await logAiUsage({
      model: response.response_metadata.model,
      usage: response.response_metadata.tokenUsage,
      latencyMs: Date.now() - startTime,
      promptId: 'deal-risk-detection',
    });

    const results = cleanAndParseJson<ConversationAnalysis[]>(response.content);
    if (!Array.isArray(results) || results.length !== conversations.length) {
      logger.warn(
        { organizationId, expected: conversations.length, got: results?.length },
        'Detecção de risco de deal: IA devolveu formato inesperado, descartando esta rodada de análise de tom/concorrente.',
      );
      return [];
    }

    const candidates: RiskCandidate[] = [];
    conversations.forEach((conversation, index) => {
      const analysis = results[index];
      if (analysis.toneNegative) {
        candidates.push({
          leadId: conversation.leadId,
          reason: 'tom_negativo',
          detail: 'Tom negativo/frustrado detectado nas mensagens mais recentes do WhatsApp.',
        });
      }
      if (analysis.competitorMentioned) {
        candidates.push({
          leadId: conversation.leadId,
          reason: 'concorrente_mencionado',
          detail: `Concorrente mencionado pelo lead: "${analysis.competitorMentioned}".`,
        });
      }
    });
    return candidates;
  } catch (error) {
    logger.error(
      { err: error, organizationId },
      'Falha ao analisar tom/concorrente das conversas recentes.',
    );
    return [];
  }
}

/** Não repete o mesmo alerta pro mesmo lead+motivo dentro da janela de cooldown. */
async function isWithinCooldown(
  organizationId: string,
  leadId: string,
  reason: DealRiskReason,
  now: Date,
): Promise<boolean> {
  const cutoff = new Date(now.getTime() - ALERT_COOLDOWN_HOURS * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: {
      organizationId,
      entity: 'Lead',
      entityId: leadId,
      title: { startsWith: titlePrefix(reason) },
      createdAt: { gte: cutoff },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

/** Alerta vai para os gestores/admins reais da organização, um por pessoa — nunca broadcast
 * silencioso quando existe destinatário certo. Só cai no broadcast (toda a organização) se a
 * organização genuinamente não tiver nenhum ADMIN/GESTOR cadastrado. */
async function notifyManagers(organizationId: string, candidate: RiskCandidate): Promise<void> {
  const managers = await prisma.user.findMany({
    where: { organizationId, role: { in: ['ADMIN', 'GESTOR'] } },
    select: { id: true },
  });

  const title = `${titlePrefix(candidate.reason)}`;
  if (managers.length === 0) {
    await notificationService.create({
      organizationId,
      title,
      body: candidate.detail,
      kind: 'Alerta',
      entity: 'Lead',
      entityId: candidate.leadId,
    });
    return;
  }

  await Promise.all(
    managers.map((manager) =>
      notificationService.create({
        organizationId,
        title,
        body: candidate.detail,
        kind: 'Alerta',
        entity: 'Lead',
        entityId: candidate.leadId,
        userId: manager.id,
      }),
    ),
  );
}

/**
 * Uma rodada de detecção de deal em risco. Cada candidato passa pelo cooldown antes de gerar
 * notificação — nunca span o gestor com o mesmo alerta a cada execução do worker.
 */
export async function detectDealRisks(
  organizationId: string,
  now: Date = new Date(),
): Promise<DetectDealRisksResult> {
  const result: DetectDealRisksResult = {
    scanned: 0,
    alertsCreated: 0,
    skippedCooldown: 0,
    errors: 0,
  };

  const [silentLeads, conversationRisks] = await Promise.all([
    findSilentLeads(organizationId, now),
    findConversationRisks(organizationId, now),
  ]);

  const candidates = [...silentLeads, ...conversationRisks];
  result.scanned = candidates.length;

  for (const candidate of candidates) {
    try {
      if (await isWithinCooldown(organizationId, candidate.leadId, candidate.reason, now)) {
        result.skippedCooldown++;
        continue;
      }
      await notifyManagers(organizationId, candidate);
      result.alertsCreated++;
    } catch (error) {
      result.errors++;
      logger.error(
        { err: error, organizationId, leadId: candidate.leadId, reason: candidate.reason },
        'Falha ao processar alerta de risco de deal para um lead.',
      );
    }
  }

  return result;
}
