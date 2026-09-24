// Wave 7 (CPI) — Progressive Search: substitui "os primeiros N resultados" por um
// funil explícito, com contagens por etapa e um motivo explícito para o encerramento
// da busca. A regra do pacote CPI para esta wave é direta:
//
//   "NUNCA retornar 'os primeiros N' como se fossem 'os melhores N'."
//
// Escopo real vs. o exemplo do pacote CPI (documentado também em docs/CPI_BACKLOG.md):
// o pacote descreve um funil de "10.000 descobertos -> ... -> 50 finais" com
// paginação/cursor sobre um provider que devolve dezenas de milhares de resultados.
// Este app usa a Google Places Text Search (New) para descoberta, que:
//   - não devolve pageToken/cursor no adapter atual (server/search/providers/
//     googlePlaces.provider.ts) — uma única chamada, sem paginação real;
//   - tem um teto de 20 resultados por chamada (`pageSize`), então o "universo"
//     desta wave é de dezenas de candidatos, nunca milhares.
// Implementar paginação/cursor/checkpoints/retomada de verdade exige um provider
// de descoberta com suporte a isso (ou múltiplas chamadas encadeadas com
// deduplicação entre páginas) — fica para quando esse provider existir. Esta wave
// entrega o que é honesto com a arquitetura atual: overfetch configurável (um
// parâmetro nomeado e testável, não mais um número mágico embutido no adapter),
// um funil com contagens reais por etapa e um stopReason explícito.

/**
 * Etapas do funil que este pipeline consegue de fato observar e reportar hoje.
 * O pacote CPI cita também um estágio "pre_filter" separado de "discovery" — aqui
 * os dois acontecem dentro da mesma chamada ao provider de descoberta (overfetch +
 * descarte de empresas já conhecidas por domínio/nome, ambos em
 * `findLeads`/`searchPlaces`) e não são decompostos em contagens separadas sem
 * alterar a assinatura testada de `findLeads` — ver nota na etapa "discovery".
 */
export type SearchFunnelStage =
  | 'discovery'
  | 'company_validation'
  | 'enrichment'
  | 'decision_makers'
  | 'final';

/** Por que a busca parou onde parou — nunca implícito, sempre um destes 4 motivos. */
export type StopReason =
  | 'target_reached'
  | 'provider_exhausted'
  | 'all_duplicates'
  | 'no_provider_configured';

export interface FunnelDroppedReason {
  /** Motivo de alto nível, estável (para UI/telemetria) — não uma frase livre. */
  reason: string;
  count: number;
}

export interface FunnelStageCount {
  stage: SearchFunnelStage;
  candidatesIn: number;
  candidatesOut: number;
  /** Só motivos com count > 0 — nunca uma linha "0 descartados" fabricada para preencher a etapa. */
  droppedReasons: FunnelDroppedReason[];
  /** Contexto opcional em texto (ex.: por que a etapa não decompõe mais os números). */
  note?: string;
}

export interface SearchFunnelSummary {
  stages: FunnelStageCount[];
  targetCount: number;
  finalCount: number;
  stopReason: StopReason;
}

// --- Overfetch configurável -------------------------------------------------
//
// Antes desta wave, `googlePlaces.provider.ts` calculava `Math.min(limit * 4, 20)`
// como um número mágico embutido na chamada HTTP. Esta wave extrai isso para uma
// função nomeada e testável, com o multiplicador e o teto do provider como
// constantes — "overfetch configurável" no sentido real possível hoje: um único
// parâmetro central, não paginação de verdade (ver cabeçalho do arquivo).

export const DEFAULT_OVERFETCH_MULTIPLIER = 4;

// Google Places Text Search (New) aceita no máximo 20 resultados por chamada
// (`pageSize`). O adapter atual não usa `pageToken`, então este é o teto real do
// universo de descoberta desta wave, não um valor arbitrário.
export const MAX_DISCOVERY_PAGE_SIZE = 20;

/**
 * Quantos candidatos pedir ao provider de descoberta para um `targetCount` de
 * leads finais desejados. Busca mais do que o necessário porque parte dos
 * candidatos será descartada nas etapas seguintes (já prospectados, duplicados
 * por CNPJ) — nunca pede menos que 1, nunca mais do que o teto do provider.
 */
export function computeOverfetchTarget(
  targetCount: number,
  multiplier: number = DEFAULT_OVERFETCH_MULTIPLIER
): number {
  const safeTarget = Number.isFinite(targetCount) && targetCount > 0 ? Math.floor(targetCount) : 1;
  const safeMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : DEFAULT_OVERFETCH_MULTIPLIER;
  return Math.min(safeTarget * safeMultiplier, MAX_DISCOVERY_PAGE_SIZE);
}

// --- Stop conditions ---------------------------------------------------------

export interface StopReasonInput {
  targetCount: number;
  discoveryProviderConfigured: boolean;
  /** Candidatos que chegaram à etapa de company_validation (equivalente a `rawLeads.length`). */
  discoveredCount: number;
  /** Quantos desses foram descartados por já existir na base sob o mesmo CNPJ (Wave 5). */
  duplicatesSkippedCount: number;
  /** Quantos leads foram de fato retornados ao final do pipeline. */
  finalCount: number;
}

/**
 * Determina por que a busca parou onde parou. A ordem dos testes importa:
 * 1. Provider de descoberta não configurado é sempre o motivo raiz, mesmo que
 *    por acaso `finalCount` já bata com `targetCount` (não deveria acontecer,
 *    mas a checagem de configuração vem primeiro por ser a causa mais honesta).
 * 2. Atingiu a meta pedida.
 * 3. Havia candidatos, mas todos eram duplicados (mesmo CNPJ já na base).
 * 4. Sobrou: o provider de descoberta simplesmente não tinha mais candidatos
 *    para dar (sem paginação real nesta wave — ver cabeçalho do arquivo).
 */
export function determineStopReason(input: StopReasonInput): StopReason {
  const { targetCount, discoveryProviderConfigured, discoveredCount, duplicatesSkippedCount, finalCount } = input;

  if (!discoveryProviderConfigured) return 'no_provider_configured';
  if (finalCount >= targetCount) return 'target_reached';
  if (discoveredCount > 0 && duplicatesSkippedCount === discoveredCount) return 'all_duplicates';
  return 'provider_exhausted';
}

// --- Funnel summary -----------------------------------------------------------

export interface BuildFunnelSummaryInput {
  targetCount: number;
  discoveryProviderConfigured: boolean;
  /** `rawLeads.length` em `/prospect` — candidatos prontos para validação de CNPJ. */
  discoveredCount: number;
  /** `duplicatesSkipped.length` (Wave 5) — descartados na company_validation por CNPJ já conhecido. */
  duplicatesSkippedCount: number;
  /** `enrichedLeads.length` — o que de fato volta na resposta. */
  finalCount: number;
  /**
   * Opcional: quantos dos `finalCount` leads têm um decisor confirmado via Apollo
   * (não inventado). Quando omitido, a etapa "decision_makers" não descreve essa
   * proporção — nunca é assumida como 0 ou como 100%.
   */
  decisionMakersConfirmedCount?: number;
}

/**
 * Monta o resumo do funil a partir de contagens já calculadas no pipeline de
 * `/prospect` (nenhuma chamada de rede/DB aqui — função pura, testável sem
 * mocks). Nunca infere um número que não foi passado; quando uma contagem não é
 * observável nesta wave (ex.: quantos candidatos o pre-filtro de domínio/nome
 * descartou dentro de `findLeads`), a etapa documenta a limitação em `note` em
 * vez de estimar um valor.
 */
export function buildFunnelSummary(input: BuildFunnelSummaryInput): SearchFunnelSummary {
  const {
    targetCount,
    discoveryProviderConfigured,
    discoveredCount,
    duplicatesSkippedCount,
    finalCount,
    decisionMakersConfirmedCount
  } = input;

  const stages: FunnelStageCount[] = [];

  stages.push({
    stage: 'discovery',
    candidatesIn: discoveredCount,
    candidatesOut: discoveredCount,
    droppedReasons: [],
    note:
      'Inclui o overfetch (computeOverfetchTarget) e o descarte de empresas já ' +
      'conhecidas por domínio/nome (Wave 5) — ambos executados dentro da mesma ' +
      'chamada ao provider de descoberta (findLeads/searchPlaces) e não são ' +
      'decompostos em contagens separadas nesta wave.'
  });

  const afterValidation = Math.max(0, discoveredCount - duplicatesSkippedCount);
  stages.push({
    stage: 'company_validation',
    candidatesIn: discoveredCount,
    candidatesOut: afterValidation,
    droppedReasons:
      duplicatesSkippedCount > 0
        ? [{ reason: 'duplicate_cnpj_already_in_base', count: duplicatesSkippedCount }]
        : [],
    note:
      'CNPJ oficial resolvido e checado contra a base (Wave 5 - Entity Resolution). ' +
      'Um lead sem CNPJ confirmado pela Receita Federal NÃO é descartado aqui — ele ' +
      'segue com o campo desconhecido, nunca preenchido com um valor plausível.'
  });

  stages.push({
    stage: 'enrichment',
    candidatesIn: afterValidation,
    candidatesOut: finalCount,
    droppedReasons: [],
    note:
      'Apollo (decisor, LinkedIn da empresa) é ENRICHMENT, não HARD_FILTER (Wave 2 - ' +
      'Requirement Engine) — a ausência de um decisor real via Apollo não descarta o lead.'
  });

  stages.push({
    stage: 'decision_makers',
    candidatesIn: finalCount,
    candidatesOut: finalCount,
    droppedReasons: [],
    note:
      decisionMakersConfirmedCount === undefined
        ? undefined
        : `${decisionMakersConfirmedCount} de ${finalCount} lead(s) têm decisor confirmado via Apollo; ` +
          'os demais seguem com decisor desconhecido (nunca inventado).'
  });

  stages.push({
    stage: 'final',
    candidatesIn: finalCount,
    candidatesOut: finalCount,
    droppedReasons: [],
    note:
      'rankingApplied=false — esta lista está na ordem de descoberta do provider, ' +
      'não há ranking por adequação ainda (ver Wave 8 - Scoring).'
  });

  const stopReason = determineStopReason({
    targetCount,
    discoveryProviderConfigured,
    discoveredCount,
    duplicatesSkippedCount,
    finalCount
  });

  return { stages, targetCount, finalCount, stopReason };
}
