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
 * Persistência (Onda 49, resolvendo o handoff
 * `.agents/handoffs/onda-49/00-para-01-playbook-insight-schema-proposal.md`): cada geração ainda
 * recalcula do zero a partir dos outcomes reais (nunca confia num "padrão" já persistido como fato
 * adquirido — a base de evidências pode mudar), mas o resultado agora é gravado em
 * `PlaybookInsight` para dar histórico (quem descobriu, quantas evidências, quando foi anunciado).
 * Uma rodada nova nunca duplica um insight idêntico ainda ativo (mesmo `sellerId`+`segment`+
 * `patternTitle`, dentro da janela `INSIGHT_DEDUPE_WINDOW_MS`) — atualiza o registro existente em
 * vez de criar outro. Distribuição continua via `notificationService` (exceção estrutural
 * documentada no dependency-cruiser, serviço transversal) — quem quiser tornar a sugestão
 * permanente na Matriz de Objeções usa o fluxo de criação já existente
 * (`POST /api/playbook/objection-matrix`).
 */

/** Abaixo disso, um "padrão" é uma vitória isolada de um vendedor, não algo repetível — mesmo
 * espírito de `objectionGenerator.service.ts` (MIN_REAL_DEALS_PER_GROUP). */
const MIN_POSITIVE_OUTCOMES_PER_GROUP = 2;
const MAX_GROUPS_PER_RUN = 6;
const MAX_ACTIONS_SCANNED = 200;
const ELIGIBLE_ACTION_TYPES = ['send_email', 'send_whatsapp_reply'];

/** Janela de deduplicação: uma rodada nova não cria um `PlaybookInsight` duplicado para o mesmo
 * (sellerId, segment, patternTitle) enquanto um registro ainda ativo (SUGGESTED/BROADCAST) dentro
 * desta janela existir — atualiza esse registro em vez de recriar. Mesmo espírito do
 * `idempotencyKey` de `AIPendingAction`. */
const INSIGHT_DEDUPE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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
  /** AIPendingAction.id das evidências reais — persistido em PlaybookInsight.sourceActionIds. */
  sourceActionIds: string[];
  /** id do `PlaybookInsight` já persistido para esta sugestão — usado por `broadcastWinningPattern`
   * para atualizar o registro em vez de só disparar a notificação. `null` quando a persistência
   * falhou (a geração/notificação em si nunca é bloqueada por isso — ver `persistInsights`). */
  insightId: string | null;
}

export interface GenerateWinningPatternsResult {
  suggestions: WinningPatternSuggestion[];
  emptyReason?: string;
}

interface OutcomeGroup {
  sellerId: string;
  segment: string;
  excerpts: string[];
  actionIds: string[];
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
    select: { id: true, payload: true },
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
      group.actionIds.push(action.id);
    } else {
      groups.set(key, {
        sellerId: lead.owner,
        segment,
        excerpts: [excerpt],
        actionIds: [action.id],
      });
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
 * Persiste (cria ou atualiza, deduplicando por `INSIGHT_DEDUPE_WINDOW_MS`) o `PlaybookInsight`
 * correspondente a uma sugestão gerada. Nunca lança para quem chamou: falha de persistência é
 * logada e devolve `null` — a sugestão ainda é retornada para revisão humana e a notificação de
 * broadcast continua funcionando sem histórico, em vez de quebrar a feature inteira por uma falha
 * de escrita no histórico.
 */
async function persistInsight(
  organizationId: string,
  suggestion: Pick<
    WinningPatternSuggestion,
    | 'sellerId'
    | 'segment'
    | 'patternTitle'
    | 'patternDescription'
    | 'suggestedScript'
    | 'evidenceCount'
    | 'sourceActionIds'
  >,
): Promise<string | null> {
  try {
    const dedupeSince = new Date(Date.now() - INSIGHT_DEDUPE_WINDOW_MS);
    const existing = await prisma.playbookInsight.findFirst({
      where: {
        organizationId,
        sellerId: suggestion.sellerId,
        segment: suggestion.segment,
        patternTitle: suggestion.patternTitle,
        status: { in: ['SUGGESTED', 'BROADCAST'] },
        createdAt: { gte: dedupeSince },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.playbookInsight.update({
        where: { id: existing.id },
        data: {
          patternDescription: suggestion.patternDescription,
          suggestedScript: suggestion.suggestedScript,
          evidenceCount: suggestion.evidenceCount,
          sourceActionIds: suggestion.sourceActionIds,
        },
        select: { id: true },
      });
      return updated.id;
    }

    const created = await prisma.playbookInsight.create({
      data: {
        organizationId,
        sellerId: suggestion.sellerId,
        segment: suggestion.segment,
        patternTitle: suggestion.patternTitle,
        patternDescription: suggestion.patternDescription,
        suggestedScript: suggestion.suggestedScript,
        evidenceCount: suggestion.evidenceCount,
        sourceActionIds: suggestion.sourceActionIds,
      },
      select: { id: true },
    });
    return created.id;
  } catch (error: any) {
    logger.error(
      { err: error, organizationId, sellerId: suggestion.sellerId, segment: suggestion.segment },
      'Falha ao persistir PlaybookInsight — a sugestão segue disponível para revisão nesta rodada, mas sem histórico.',
    );
    return null;
  }
}

/**
 * Detecta padrões de abordagem com resultado positivo confirmado, por vendedor e segmento, e
 * sintetiza uma sugestão reutilizável pro time inteiro. Retorna sugestões para revisão humana e
 * persiste cada uma como `PlaybookInsight` (deduplicando contra uma sugestão idêntica ainda ativa)
 * — quem aprovar decide se anuncia pro time (`broadcastWinningPattern`) e/ou adiciona como item
 * real da Matriz de Objeções (fluxo já existente).
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

  const sellerNames = await loadSellerNames(groups.map((group) => group.sellerId));
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

    const suggestionsWithoutInsightId = groups.map((group, index) => ({
      sellerId: group.sellerId,
      sellerName: sellerNames.get(group.sellerId) ?? 'Vendedor não identificado',
      segment: group.segment,
      evidenceCount: group.excerpts.length,
      patternTitle: candidates[index].patternTitle,
      patternDescription: candidates[index].patternDescription,
      suggestedScript: candidates[index].suggestedScript,
      sourceExcerpts: group.excerpts,
      sourceActionIds: group.actionIds,
    }));

    const insightIds = await Promise.all(
      suggestionsWithoutInsightId.map((suggestion) => persistInsight(organizationId, suggestion)),
    );

    return {
      suggestions: suggestionsWithoutInsightId.map((suggestion, index) => ({
        ...suggestion,
        insightId: insightIds[index],
      })),
    };
  } catch (error: any) {
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
 * Anuncia um padrão vencedor pro time inteiro (in-app, via `notificationService`) — credita o
 * vendedor de origem. Broadcast simples (organização inteira) nesta versão: ainda não há uma
 * tabela de "quem já viu"/"quem aceitou aplicar" a notificação em si (só o status agregado do
 * insight) — isso segue documentado como lacuna futura, não escondido.
 *
 * Quando `insightId` é informado (sugestão veio de uma chamada recente a `generateWinningPatterns`
 * e foi persistida), marca o `PlaybookInsight` como `BROADCAST` — histórico de quando e quem
 * anunciou. Uma falha nessa atualização é logada mas nunca desfaz a notificação já criada: o
 * comportamento observável (o time recebe o aviso) é preservado mesmo se o histórico falhar.
 */
export async function broadcastWinningPattern(
  organizationId: string,
  suggestion: Pick<
    WinningPatternSuggestion,
    'sellerName' | 'segment' | 'patternTitle' | 'suggestedScript'
  > & { insightId?: string | null },
  broadcastBy?: string,
): Promise<{ id: string } | null> {
  const notification = await notificationService.create({
    organizationId,
    title: `Playbook Vivo: "${suggestion.patternTitle}"`,
    body: `${suggestion.sellerName} descobriu uma abordagem que converte melhor no segmento "${suggestion.segment}":\n\n${suggestion.suggestedScript}`,
    kind: 'Sucesso',
    entity: null,
    entityId: null,
  });

  if (suggestion.insightId) {
    try {
      await prisma.playbookInsight.update({
        where: { id: suggestion.insightId },
        data: { status: 'BROADCAST', broadcastAt: new Date(), broadcastBy: broadcastBy ?? null },
      });
    } catch (error: any) {
      logger.error(
        { err: error, organizationId, insightId: suggestion.insightId },
        'Falha ao marcar PlaybookInsight como BROADCAST — a notificação ao time já foi criada normalmente.',
      );
    }
  }

  return notification;
}
