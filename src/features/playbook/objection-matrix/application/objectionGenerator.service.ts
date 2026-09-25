import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { cleanAndParseJson, getAiModel, logAiUsage } from '../../../../lib/ai/gateway.js';
import { logger } from '../../../../lib/logger.js';
import { prisma } from '../../../../lib/prisma.js';

/** Abaixo disso, um segmento vira sugestão a partir de um único caso anedótico — não um padrão
 * real observado. Mesmo espírito de `lossTaxonomy.ts`: nunca transformar um dado isolado em algo
 * que pareça uma conclusão estatística. */
const MIN_REAL_DEALS_PER_GROUP = 2;
/** Teto de chamadas de IA por rodada — controla custo/latência, não qualidade do dado de entrada
 * (os grupos descartados continuam reais, só ficam de fora desta rodada). */
const MAX_GROUPS_PER_RUN = 6;
const MAX_LOST_LEADS_SCANNED = 300;

export interface ObjectionSuggestion {
  segment: string;
  persona: string;
  objectionTitle: string;
  objectionText: string;
  responseScript: string;
  keyDifferentiator: string;
  /** Quantos negócios perdidos reais sustentam esta sugestão — nunca inventado, vem da própria
   * consulta ao banco, não do texto que a IA devolveu. */
  evidenceCount: number;
  /** Motivos de perda originais (texto livre do CRM) que embasaram a sugestão — proveniência para
   * quem for revisar antes de adicionar à matriz. */
  sourceLossReasons: string[];
}

export interface GenerateObjectionSuggestionsResult {
  suggestions: ObjectionSuggestion[];
  /** Presente só quando `suggestions` está vazio — por quê (nunca um array vazio silencioso). */
  emptyReason?: string;
}

interface LostDealGroup {
  segment: string;
  persona: string;
  lossReasons: string[];
}

interface GeneratedObjectionCandidate {
  objectionTitle: string;
  objectionText: string;
  responseScript: string;
  keyDifferentiator: string;
}

async function loadLostDealGroups(organizationId: string): Promise<LostDealGroup[]> {
  const leads = await prisma.lead.findMany({
    where: { organizationId, status: 'Negocios_Perdidos', lossReason: { not: null } },
    orderBy: { closedAt: 'desc' },
    take: MAX_LOST_LEADS_SCANNED,
    select: {
      lossReason: true,
      company: { select: { segment: true } },
      contact: { select: { role: true } },
    },
  });

  const groups = new Map<string, LostDealGroup>();
  for (const lead of leads) {
    const reason = lead.lossReason?.trim();
    if (!reason) continue;
    const segment = lead.company?.segment?.trim() || 'Segmento não informado';
    const persona = lead.contact?.role?.trim() || 'Decisor não informado';
    const key = `${segment}::${persona}`;
    const group = groups.get(key);
    if (group) {
      group.lossReasons.push(reason);
    } else {
      groups.set(key, { segment, persona, lossReasons: [reason] });
    }
  }

  return Array.from(groups.values())
    .filter((group) => group.lossReasons.length >= MIN_REAL_DEALS_PER_GROUP)
    .sort((a, b) => b.lossReasons.length - a.lossReasons.length)
    .slice(0, MAX_GROUPS_PER_RUN);
}

function buildPrompt(groups: LostDealGroup[]): { system: string; human: string } {
  const system = `Você é um especialista em capacitação comercial B2B. Para CADA grupo de negócios perdidos abaixo (segmento + persona do decisor + motivos de perda REAIS registrados no CRM), produza UMA entrada de matriz de objeções que reflita o padrão real observado.

REGRAS RÍGIDAS:
1. A objeção ("objectionText") precisa refletir o(s) motivo(s) de perda REAIS fornecidos para aquele grupo — nunca invente uma objeção genérica de mercado que não tenha base nos motivos listados.
2. Se os motivos fornecidos forem vagos, produza a melhor síntese possível deles — nunca substitua por um motivo diferente do que foi dado.
3. "responseScript" é uma resposta concreta e específica ao padrão observado, não um conselho genérico de vendas.
4. "keyDifferentiator" é o argumento/diferencial que endereça a causa raiz da perda, não uma frase motivacional vazia.
5. Responda em português do Brasil, tom direto e prático.

Retorne SEMPRE e APENAS um array JSON, na MESMA ORDEM dos grupos recebidos, um item por grupo:
[
  {
    "objectionTitle": "Título curto da objeção",
    "objectionText": "Como o prospect verbaliza essa objeção, refletindo os motivos reais fornecidos",
    "responseScript": "Script de resposta concreto",
    "keyDifferentiator": "Diferencial que endereça a causa raiz"
  }
]`;

  const human = `Grupos de negócios perdidos reais (${groups.length}):\n${JSON.stringify(
    groups.map((group, index) => ({
      grupo: index + 1,
      segmento: group.segment,
      persona: group.persona,
      motivosDePerdaReais: group.lossReasons,
    })),
    null,
    2,
  )}`;

  return { system, human };
}

/**
 * Gera sugestões de itens de matriz de objeções a partir de negócios REALMENTE perdidos (item 7
 * de "IA Agêntica de Vendas") — nunca script genérico de mercado. Retorna sugestões para revisão
 * humana; NÃO persiste em `ObjectionMatrixItem` (isso continua exigindo o fluxo de criação
 * existente, `POST /api/playbook/objection-matrix`, com o mesmo controle de acesso de sempre).
 */
export async function generateObjectionSuggestions(
  organizationId: string,
): Promise<GenerateObjectionSuggestionsResult> {
  const groups = await loadLostDealGroups(organizationId);
  if (groups.length === 0) {
    return {
      suggestions: [],
      emptyReason:
        'Nenhum grupo de negócios perdidos com motivo registrado tem casos reais suficientes (mínimo 2 por segmento/persona) para gerar uma sugestão ainda.',
    };
  }

  const { system, human } = buildPrompt(groups);
  const model = getAiModel('local-llama3-fast', 0.3, 'objection-generator');
  const startTime = Date.now();

  try {
    const response = await model.invoke([new SystemMessage(system), new HumanMessage(human)]);
    await logAiUsage({
      model: response.response_metadata.model,
      usage: response.response_metadata.tokenUsage,
      latencyMs: Date.now() - startTime,
      promptId: 'objection-generator',
    });

    const candidates = cleanAndParseJson<GeneratedObjectionCandidate[]>(response.content);
    if (!Array.isArray(candidates) || candidates.length !== groups.length) {
      logger.warn(
        { organizationId, groupsCount: groups.length, candidatesCount: candidates?.length },
        'Negociador de objeções: IA devolveu formato inesperado, descartando a rodada em vez de casar dados errados.',
      );
      return {
        suggestions: [],
        emptyReason: 'A IA devolveu um formato inesperado nesta tentativa — tente gerar novamente.',
      };
    }

    return {
      suggestions: groups.map((group, index) => ({
        segment: group.segment,
        persona: group.persona,
        objectionTitle: candidates[index].objectionTitle,
        objectionText: candidates[index].objectionText,
        responseScript: candidates[index].responseScript,
        keyDifferentiator: candidates[index].keyDifferentiator,
        evidenceCount: group.lossReasons.length,
        sourceLossReasons: group.lossReasons,
      })),
    };
  } catch (error: any) {
    logger.error(
      { err: error, organizationId },
      'Falha ao gerar sugestões de objeções a partir de negócios perdidos.',
    );
    return {
      suggestions: [],
      emptyReason: 'Falha ao gerar sugestões via IA nesta tentativa — tente novamente.',
    };
  }
}
