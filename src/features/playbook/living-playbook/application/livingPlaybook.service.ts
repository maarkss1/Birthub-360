import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { cleanAndParseJson, getAiModel, logAiUsage } from '../../../../lib/ai/gateway.js';
import { logger } from '../../../../lib/logger.js';
import { prisma } from '../../../../lib/prisma.js';
import { notificationService } from '../../../notifications/notification.service.js';

/**
 * Playbook Vivo (item 42 do roadmap): quando um vendedor descobre uma abordagem que converte
 * melhor, o sistema sugere essa abordagem para o time inteiro.
 *
 * Fonte de "converteu melhor": `AIPendingAction` executada (mensagem realmente enviada a um lead)
 * com `outcomeStatus: 'POSITIVE'` — um humano confirmou, depois do fato, que aquela mensagem
 * específica funcionou (ver `recordActionOutcome`, já existente). Nunca inferimos sucesso a
 * partir de métrica indireta (abertura de e-mail, etc.) — só o outcome registrado manualmente.
 *
 * Atribuição ao vendedor: via `payload.leadId -> Lead.owner` (User.id). Uma mensagem sem leadId
 * resolvível, ou de um lead sem owner definido, nunca entra na análise — nunca fabricamos autoria.
 *
 * Escopo desta versão (documentado, não escondido): não existe ainda uma tabela própria para
 * persistir "padrões vencedores" com proveniência (quem descobriu, quantas evidências, quando foi
 * anunciado) — isso exigiria um model novo em `prisma/schema.prisma`, propriedade exclusiva do
 * Agente 01. A proposta de schema está documentada em
 * `.agents/handoffs/onda-49/00-para-01-playbook-insight-schema-proposal.md`, não aplicada. Esta
 * versão computa as sugestões sob demanda (nunca persiste um "padrão" como fato adquirido) e
 * distribui via `notificationService` (exceção estrutural documentada no dependency-cruiser,
 * serviço transversal) — quem quiser tornar a sugestão permanente na Matriz de Objeções usa o
 * fluxo de criação já existente (`POST /api/playbook/objection-matrix`).
 */

/** Abaixo disso, um "padrão" é uma vitória isolada de um vendedor, não algo repetível — mesmo
 * espírito de `objectionGenerator.service.ts` (MIN_REAL_DEALS_PER_GROUP). */
const MIN_POSITIVE_OUTCOMES_PER_GROUP = 2;
const MAX_GROUPS_PER_RUN = 6;
const MAX_ACTIONS_SCANNED = 200;
const ELIGIBLE_ACTION_TYPES = ['send_email', 'send_whatsapp_reply'];

export interface WinningPatternSuggestion {
  sellerId: string;
  sellerName: string;
  segment: string;
  evidenceCount: number;
  patternTitle: string;
  patternDescription: string;
  suggestedScript: string;
  /** Trechos reais das mensagens que embasaram a sugestão — proveniência para revisão humana,
   * nunca resumido/reescrito pela IA nesta lista (isso é o dado bruto, não a síntese). */
  sourceExcerpts: string[];
  /** Taxa de conversão histórica do vendedor no segmento/geral (0 a 100) */
  conversionRate?: number;
}

export interface GenerateWinningPatternsResult {
  suggestions: WinningPatternSuggestion[];
  emptyReason?: string;
}

interface OutcomeGroup {
  sellerId: string;
  segment: string;
  excerpts: string[];
}

interface GeneratedPattern {
  patternTitle: string;
  patternDescription: string;
  suggestedScript: string;
}

function excerptFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = (payload as { body?: unknown }).body;
  return typeof body === 'string' && body.trim() ? body.trim() : null;
}

function leadIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const leadId = (payload as { leadId?: unknown }).leadId;
  return typeof leadId === 'string' && leadId ? leadId : null;
}

async function loadOutcomeGroups(organizationId: string): Promise<OutcomeGroup[]> {
  const positiveActions = await prisma.aIPendingAction.findMany({
    where: {
      organizationId,
      executed: true,
      outcomeStatus: 'POSITIVE',
      action: { in: ELIGIBLE_ACTION_TYPES },
    },
    orderBy: { outcomeMeasuredAt: 'desc' },
    take: MAX_ACTIONS_SCANNED,
    select: { payload: true },
  });

  const leadIds = Array.from(
    new Set(
      positiveActions
        .map((action) => leadIdFromPayload(action.payload))
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (leadIds.length === 0) return [];

  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds }, organizationId },
    select: { id: true, owner: true, company: { select: { segment: true } } },
  });
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));

  const groups = new Map<string, OutcomeGroup>();
  for (const action of positiveActions) {
    const leadId = leadIdFromPayload(action.payload);
    const excerpt = excerptFromPayload(action.payload);
    if (!leadId || !excerpt) continue;
    const lead = leadById.get(leadId);
    // Sem owner real definido no CRM, não fabricamos autoria — descarta esta evidência, nunca
    // atribui a um vendedor genérico.
    if (!lead?.owner) continue;
    const segment = lead.company?.segment?.trim() || 'Segmento não informado';
    const key = `${lead.owner}::${segment}`;
    const group = groups.get(key);
    if (group) {
      group.excerpts.push(excerpt);
    } else {
      groups.set(key, { sellerId: lead.owner, segment, excerpts: [excerpt] });
    }
  }

  return Array.from(groups.values())
    .filter((group) => group.excerpts.length >= MIN_POSITIVE_OUTCOMES_PER_GROUP)
    .sort((a, b) => b.excerpts.length - a.excerpts.length)
    .slice(0, MAX_GROUPS_PER_RUN);
}

async function loadSellerNames(sellerIds: string[]): Promise<Map<string, string>> {
  if (sellerIds.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, name: true },
  });
  return new Map(users.map((user) => [user.id, user.name]));
}

/**
 * Calcula a taxa histórica de conversão real para os vendedores com base nos leads finalizados.
 */
export async function calculateSellerConversionRates(
  organizationId: string,
  sellerIds: string[],
): Promise<Map<string, number>> {
  const conversionMap = new Map<string, number>();
  if (sellerIds.length === 0) return conversionMap;

  const leads = await prisma.lead.findMany({
    where: {
      organizationId,
      owner: { in: sellerIds },
    },
    select: { owner: true, status: true },
  });

  const countsBySeller = new Map<string, { total: number; converted: number }>();
  for (const lead of leads) {
    if (!lead.owner) continue;
    const current = countsBySeller.get(lead.owner) || { total: 0, converted: 0 };
    current.total += 1;
    if (
      lead.status === 'Convertido_em_Oportunidade' ||
      lead.status === 'Nova_Oportunidade' ||
      lead.status === 'Proposta_Enviada' ||
      lead.status === 'Negocios_Ganhos'
    ) {
      current.converted += 1;
    }
    countsBySeller.set(lead.owner, current);
  }

  for (const [sellerId, stats] of countsBySeller.entries()) {
    const rate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 1000) / 10 : 0;
    conversionMap.set(sellerId, rate);
  }

  return conversionMap;
}

function buildPrompt(groups: OutcomeGroup[]): { system: string; human: string } {
  const system = `Você é um especialista em capacitação comercial B2B. Para CADA grupo abaixo (mensagens REAIS que um vendedor enviou a leads do mesmo segmento e que tiveram resultado POSITIVO confirmado), identifique o padrão comum e sintetize UMA abordagem reutilizável.

REGRAS RÍGIDAS:
1. O padrão precisa refletir o que as mensagens REAIS têm em comum — nunca invente uma tática que não apareça nos exemplos fornecidos.
2. "suggestedScript" é um script genérico o bastante para outro vendedor adaptar, mas específico o bastante para ser útil — não um conselho vago de vendas.
3. Responda em português do Brasil, tom direto e prático.

Retorne SEMPRE e APENAS um array JSON, na MESMA ORDEM dos grupos recebidos, um item por grupo:
[
  {
    "patternTitle": "Título curto do padrão",
    "patternDescription": "O que esse vendedor faz de diferente, baseado nos exemplos reais",
    "suggestedScript": "Script/abordagem reutilizável pro time"
  }
]`;

  const human = `Grupos (${groups.length}):\n${JSON.stringify(
    groups.map((group, index) => ({
      grupo: index + 1,
      segmento: group.segment,
      mensagensReaisComResultadoPositivo: group.excerpts,
    })),
    null,
    2,
  )}`;

  return { system, human };
}

/**
 * Detecta padrões de abordagem com resultado positivo confirmado, por vendedor e segmento, e
 * sintetiza uma sugestão reutilizável pro time inteiro.
 */
export async function generateWinningPatterns(
  organizationId: string,
): Promise<GenerateWinningPatternsResult> {
  const groups = await loadOutcomeGroups(organizationId);
  if (groups.length === 0) {
    return {
      suggestions: [],
      emptyReason:
        'Nenhum vendedor tem casos reais suficientes (mínimo 2 outcomes POSITIVOS confirmados no mesmo segmento) para gerar uma sugestão ainda.',
    };
  }

  const sellerIds = groups.map((group) => group.sellerId);
  const [sellerNames, conversionRates] = await Promise.all([
    loadSellerNames(sellerIds),
    calculateSellerConversionRates(organizationId, sellerIds),
  ]);

  const { system, human } = buildPrompt(groups);
  const model = getAiModel('local-llama3-fast', 0.3, 'living-playbook');
  const startTime = Date.now();

  try {
    const response = await model.invoke([new SystemMessage(system), new HumanMessage(human)]);
    await logAiUsage({
      model: response.response_metadata.model,
      usage: response.response_metadata.tokenUsage,
      latencyMs: Date.now() - startTime,
      promptId: 'living-playbook',
    });

    const candidates = cleanAndParseJson<GeneratedPattern[]>(response.content);
    if (!Array.isArray(candidates) || candidates.length !== groups.length) {
      logger.warn(
        { organizationId, groupsCount: groups.length, candidatesCount: candidates?.length },
        'Playbook Vivo: IA devolveu formato inesperado, descartando a rodada em vez de casar dados errados.',
      );
      return {
        suggestions: [],
        emptyReason: 'A IA devolveu um formato inesperado nesta tentativa — tente gerar novamente.',
      };
    }

    return {
      suggestions: groups.map((group, index) => ({
        sellerId: group.sellerId,
        sellerName: sellerNames.get(group.sellerId) ?? 'Vendedor não identificado',
        segment: group.segment,
        evidenceCount: group.excerpts.length,
        patternTitle: candidates[index].patternTitle,
        patternDescription: candidates[index].patternDescription,
        suggestedScript: candidates[index].suggestedScript,
        sourceExcerpts: group.excerpts,
        conversionRate: conversionRates.get(group.sellerId) ?? 0,
      })),
    };
  } catch (error) {
    logger.error(
      { err: error, organizationId },
      'Falha ao gerar sugestões do Playbook Vivo a partir de outcomes positivos.',
    );
    return {
      suggestions: [],
      emptyReason: 'Falha ao gerar sugestões via IA nesta tentativa — tente novamente.',
    };
  }
}

/**
 * Persiste um insight gerado no banco de dados.
 */
export async function createPlaybookInsight(
  organizationId: string,
  data: {
    sellerId: string;
    segment: string;
    patternTitle: string;
    patternDescription: string;
    suggestedScript: string;
    evidenceCount: number;
    sourceActionIds?: string[];
    conversionRate?: number;
  },
) {
  return prisma.playbookInsight.create({
    data: {
      organizationId,
      sellerId: data.sellerId,
      segment: data.segment,
      patternTitle: data.patternTitle,
      patternDescription: data.patternDescription,
      suggestedScript: data.suggestedScript,
      evidenceCount: data.evidenceCount,
      sourceActionIds: data.sourceActionIds || [],
      conversionRate: data.conversionRate,
      status: 'SUGGESTED',
    },
  });
}

/**
 * Lista insights persistidos do Playbook Vivo para a organização.
 */
export async function listPlaybookInsights(
  organizationId: string,
  options?: {
    status?: 'SUGGESTED' | 'APPROVED' | 'BROADCAST' | 'DISMISSED' | 'ARCHIVED';
    sellerId?: string;
  },
) {
  return prisma.playbookInsight.findMany({
    where: {
      organizationId,
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.sellerId ? { sellerId: options.sellerId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Atualiza o status de um insight (ex.: após broadcast ou aprovação).
 */
export async function updatePlaybookInsightStatus(
  organizationId: string,
  insightId: string,
  status: 'SUGGESTED' | 'APPROVED' | 'BROADCAST' | 'DISMISSED' | 'ARCHIVED',
  meta?: { broadcastBy?: string; promotedToObjectionMatrixItemId?: string },
) {
  return prisma.playbookInsight.updateMany({
    where: { id: insightId, organizationId },
    data: {
      status,
      ...(status === 'BROADCAST'
        ? { broadcastAt: new Date(), broadcastBy: meta?.broadcastBy }
        : {}),
      ...(meta?.promotedToObjectionMatrixItemId
        ? { promotedToObjectionMatrixItemId: meta.promotedToObjectionMatrixItemId }
        : {}),
    },
  });
}

/**
 * Anuncia um padrão vencedor pro time inteiro (in-app, via `notificationService`) — credita o
 * vendedor de origem.
 */
export async function broadcastWinningPattern(
  organizationId: string,
  suggestion: Pick<
    WinningPatternSuggestion,
    'sellerName' | 'segment' | 'patternTitle' | 'suggestedScript'
  >,
): Promise<{ id: string } | null> {
  return notificationService.create({
    organizationId,
    title: `Playbook Vivo: "${suggestion.patternTitle}"`,
    body: `${suggestion.sellerName} descobriu uma abordagem que converte melhor no segmento "${suggestion.segment}":\n\n${suggestion.suggestedScript}`,
    kind: 'Sucesso',
    entity: null,
    entityId: null,
  });
}
