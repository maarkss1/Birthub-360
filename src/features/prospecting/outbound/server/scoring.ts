// Wave 8 (CPI) — Scoring: separa completude de dado (Data Quality) de
// adequação comercial (Fit) e de propensão temporal (Intent). Os três nunca
// são escondidos atrás de um único "Final Score" — a UI/API sempre recebe os
// quatro números (fit, intent, dataQuality, final) mais uma lista de
// "reasons" explicando como cada um chegou naquele valor.
//
// Regra central herdada da Wave 0/01_PROMPT_MESTRE_ORQUESTRADOR: UNKNOWN é
// sempre melhor que dado inventado. Isso vale também para score:
// - um requisito 'unknown' (Wave 2 — Requirement Engine) NUNCA é tratado como
//   reprovado (0) nem como aprovado — ele simplesmente sai do denominador;
// - um componente sem base nenhuma para ser calculado (ex: Intent Score sem
//   nenhum provider de sinal integrado) devolve `score: null` e
//   `confidence: 0` com uma explicação honesta — nunca um número "bonito"
//   fabricado para parecer uma medição real;
// - no Final Score, um componente com `score: null` tem seu peso
//   redistribuído entre os componentes que de fato têm base — nunca é
//   silenciosamente tratado como "vale 0".

import type {
  RequirementEvaluation,
  FitScore,
  IntentScore,
  Signal,
  DataQualityScore,
  ScoringWeights,
  LeadScores
} from '../src/types';
import type { EvidenceRecord, VerificationStatus } from './evidence';
import { isSignalActive } from './signals';

export type {
  FitScore,
  IntentScore,
  Signal,
  DataQualityScore,
  ScoringWeights,
  LeadScores
} from '../src/types';

/** Versão do modelo de score. Muda só quando a fórmula abaixo muda de forma
 * que um score antigo deixaria de ser comparável a um novo — permite versionar
 * o modelo no futuro sem quebrar leads já pontuados (eles guardam a versão
 * com que foram calculados). */
export const SCORING_MODEL_VERSION = 'v1';

// ---------------------------------------------------------------------------
// FIT SCORE — aderência ao ICP pedido (Wave 2 — Requirement Engine)
// ---------------------------------------------------------------------------

// Fit mede aderência aos critérios de segmentação (HARD_FILTER/SOFT_FILTER).
// ENRICHMENT (ex: cargo do decisor) não é critério de fit — é dado a buscar,
// não filtro que aprova/reprova a empresa (ver comentário do próprio
// requirementEngine.ts). SIGNAL/EXCLUSION não são emitidos pelo engine hoje.
const FIT_CONSIDERED_TYPES: RequirementEvaluation['type'][] = ['HARD_FILTER', 'SOFT_FILTER'];

export function computeFitScore(evaluations: RequirementEvaluation[]): FitScore {
  const considered = evaluations.filter(e => FIT_CONSIDERED_TYPES.includes(e.type));
  const unknownCount = considered.filter(e => e.status === 'unknown').length;
  // "known" = requisito de fato confirmado ou refutado por alguma fonte —
  // nunca inclui 'unknown', que fica fora do numerador E do denominador.
  const known = considered.filter(e => e.status === 'matched' || e.status === 'unmatched');

  const failedHard = considered.find(e => e.type === 'HARD_FILTER' && e.status === 'unmatched');
  if (failedHard) {
    // Um HARD_FILTER observado e reprovado domina o Fit Score: a empresa
    // provavelmente não serve, independente de quantos SOFT_FILTER combinem.
    return {
      score: 0,
      confidence: 1,
      reasons: [
        `Requisito obrigatório "${failedHard.criterion}" foi observado e diverge do pedido (${failedHard.reason}) — reprova o lead, independente dos demais critérios.`
      ],
      matchedWeight: 0,
      consideredWeight: known.reduce((sum, e) => sum + e.weight, 0),
      unknownCount,
      hardFilterFailed: true
    };
  }

  if (known.length === 0) {
    return {
      score: null,
      confidence: 0,
      reasons: considered.length === 0
        ? ['Nenhum critério de segmentação foi pedido nesta busca — sem base para calcular aderência.']
        : ['Nenhum critério pedido foi confirmado ou refutado por uma fonte até agora — sem base para calcular aderência.'],
      matchedWeight: 0,
      consideredWeight: 0,
      unknownCount,
      hardFilterFailed: false
    };
  }

  const consideredWeight = known.reduce((sum, e) => sum + e.weight, 0);
  const matchedWeight = known.filter(e => e.status === 'matched').reduce((sum, e) => sum + e.weight, 0);
  const score = Math.round((matchedWeight / consideredWeight) * 100);
  // Confiança do Fit Score = proporção do que foi pedido que de fato teve
  // alguma fonte confirmando ou refutando (não apenas "unknown").
  const confidence = known.length / considered.length;

  const reasons = known.map(e =>
    `"${e.criterion}" (peso ${e.weight}, fonte ${e.source}): ${e.status === 'matched' ? 'confirmado e compatível com o pedido' : 'confirmado, mas diverge do pedido (SOFT_FILTER — reduz, não reprova)'}.`
  );
  if (unknownCount > 0) {
    reasons.push(`${unknownCount} critério(s) pedido(s) sem confirmação de nenhuma fonte ainda — não contam a favor nem contra o score.`);
  }

  return { score, confidence, reasons, matchedWeight, consideredWeight, unknownCount, hardFilterFailed: false };
}

// ---------------------------------------------------------------------------
// INTENT SCORE — propensão temporal (sinais de compra)
// ---------------------------------------------------------------------------

// Wave 13 (CPI, Signals & Intent — server/signals.ts) alimenta esta função
// com `Signal[]` reais (hoje, na prática, só o sinal `nova_operacao`
// derivado de `data_inicio_atividade` do CNPJ oficial — ver
// detectSignalsForLead). Os demais tipos de sinal do pacote (vagas, notícias,
// mudança executiva, M&A, etc.) exigem um provider externo não integrado
// (registrados como `not_implemented` em server/providerRegistry.ts) e por
// isso nunca aparecem aqui. Sem nenhum sinal passado pelo chamador, ou com
// todos os sinais passados já expirados (`expiresAt` no passado), o
// resultado continua honesto: sem score, confiança zero, motivo declarado.
// NUNCA inventamos um número aqui só para a UI parecer completa.
export function computeIntentScore(signals: Signal[] = [], now: Date = new Date()): IntentScore {
  const active = signals.filter(s => isSignalActive(s, now));
  const expiredCount = signals.length - active.length;

  if (active.length === 0) {
    const reasons = signals.length === 0
      ? ['Nenhum provider de sinais de compra (crescimento, vagas, nova filial, novos contratos, notícias etc.) está integrado ainda — não é possível medir propensão temporal para este lead. Isto reflete ausência de instrumento de medição, não ausência de sinais no mercado.']
      : [`${expiredCount} sinal(is) recebido(s), mas todos já expiraram (expiresAt no passado) — nenhum sinal ativo para calcular propensão.`];
    return { score: null, confidence: 0, reasons, signalsUsed: [], signalsAvailable: false };
  }

  // Cada sinal contribui uma "probabilidade" de intenção de compra =
  // commercialRelevance * confidence (0-1 cada). Combinamos por "noisy-OR"
  // (1 - produto das probabilidades complementares) em vez de somar os pesos
  // sem limite: um único sinal forte (alta relevância + alta confiança) já
  // deve pesar bastante sozinho, e vários sinais fracos corroborando devem
  // se somar de forma sub-aditiva, sem nunca estourar 100 nem crescer
  // linearmente sem limite conforme mais sinais fracos se acumulam.
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const contributions = active.map(s => clamp01(s.commercialRelevance) * clamp01(s.confidence));
  const combinedProbability = 1 - contributions.reduce((acc, c) => acc * (1 - c), 1);
  const score = Math.round(clamp01(combinedProbability) * 100);

  // Confiança do Intent Score = confiança média dos sinais ativos, descontada
  // enquanto poucos sinais corroboram (menos de 3) — mais sinais
  // independentes confirmando a mesma propensão é mais confiável que um só,
  // mesmo que cada um individualmente já tenha confiança alta.
  const avgConfidence = active.reduce((sum, s) => sum + clamp01(s.confidence), 0) / active.length;
  const confidence = Math.min(1, avgConfidence * Math.min(1, active.length / 3));

  const reasons = active.map(s =>
    `${s.type} (fonte: ${s.source}, confiança ${s.confidence.toFixed(2)}, relevância comercial ${s.commercialRelevance.toFixed(2)}): ${s.evidence.join(' | ')}`
  );
  if (expiredCount > 0) {
    reasons.push(`${expiredCount} sinal(is) excluído(s) do cálculo por estarem expirados (expiresAt no passado).`);
  }

  return { score, confidence, reasons, signalsUsed: active, signalsAvailable: true };
}

// ---------------------------------------------------------------------------
// DATA QUALITY SCORE — confiabilidade do dado (Wave 6 — Evidence & Provenance)
// ---------------------------------------------------------------------------

// Campos considerados "relevantes" para confiabilidade — os mesmos que
// server/evidence.ts hoje sabe gerar evidência (buildCnpjEvidence +
// buildDecisionMakerEvidence). Um campo fora desta lista, ou sem nenhuma
// EvidenceRecord (porque nenhuma fonte confirmou), simplesmente não entra no
// cálculo — não é penalizado nem credita pontos ("unknown" honesto).
export const DATA_QUALITY_RELEVANT_FIELDS: readonly string[] = [
  'razao_social',
  'situacao_cadastral',
  'cnae_fiscal_descricao',
  'capital_social',
  'decision_maker_name',
  'decision_maker_title',
  'decision_maker_email',
  'decision_maker_linkedin'
];

// Pontuação por status de verificação. 'conflicted' é negativo de propósito
// (duas fontes divergindo sobre o mesmo campo é PIOR que não ter o campo —
// ver server/entityResolution.ts#resolveFieldConflict). 'unknown' fica fora
// do cálculo inteiramente (nem soma nem penaliza), então seu peso aqui é
// irrelevante na prática — mantido só para a tabela ficar completa/tipada.
const VERIFICATION_STATUS_POINTS: Record<VerificationStatus, number> = {
  verified: 1,
  unverified: 0.5,
  inferred: 0.25,
  conflicted: -1,
  unknown: 0
};

export function computeDataQualityScore(evidences: EvidenceRecord[]): DataQualityScore {
  const relevant = evidences.filter(e => DATA_QUALITY_RELEVANT_FIELDS.includes(e.field));
  // "unknown" nunca é produzido pelos builders atuais (campo ausente = sem
  // EvidenceRecord nenhuma), mas o tipo VerificationStatus permite — excluído
  // do denominador aqui pelo mesmo motivo que um requisito 'unknown' não
  // penaliza o Fit Score.
  const considered = relevant.filter(e => e.verificationStatus !== 'unknown');

  if (considered.length === 0) {
    return {
      score: null,
      confidence: 0,
      reasons: ['Nenhuma evidência disponível para os campos relevantes deste lead — nenhuma fonte confirmou, inferiu ou conflitou nada ainda.'],
      verifiedCount: 0,
      conflictedCount: 0,
      unverifiedCount: 0,
      inferredCount: 0,
      consideredCount: 0,
      relevantFieldCount: DATA_QUALITY_RELEVANT_FIELDS.length
    };
  }

  const verifiedCount = considered.filter(e => e.verificationStatus === 'verified').length;
  const conflictedCount = considered.filter(e => e.verificationStatus === 'conflicted').length;
  const unverifiedCount = considered.filter(e => e.verificationStatus === 'unverified').length;
  const inferredCount = considered.filter(e => e.verificationStatus === 'inferred').length;

  const rawPoints = considered.reduce((sum, e) => sum + VERIFICATION_STATUS_POINTS[e.verificationStatus], 0);
  // clamp em 0: um lead cheio de conflitos não vira "score negativo", só chão zero.
  const score = Math.max(0, Math.round((rawPoints / considered.length) * 100));
  // Confiança = quanto da "superfície" de campos relevantes tem alguma
  // evidência (verificada, não-verificada, inferida ou conflitante) — um
  // score alto com 1 campo confirmado é bem menos confiável que o mesmo score
  // com 8/8 campos confirmados.
  const confidence = Math.min(1, considered.length / DATA_QUALITY_RELEVANT_FIELDS.length);

  const reasons = [`${verifiedCount}/${considered.length} campo(s) relevante(s) com evidência confirmados por fonte verificada.`];
  if (conflictedCount > 0) {
    reasons.push(`${conflictedCount} campo(s) com fontes conflitantes (resolveFieldConflict) — penaliza a confiabilidade.`);
  }
  if (unverifiedCount > 0) {
    reasons.push(`${unverifiedCount} campo(s) vindo(s) de fonte não verificada (ex: Apollo) — soma parcialmente.`);
  }
  if (inferredCount > 0) {
    reasons.push(`${inferredCount} campo(s) inferido(s), não confirmado(s) diretamente — soma pouco.`);
  }
  const missingCount = DATA_QUALITY_RELEVANT_FIELDS.length - considered.length;
  if (missingCount > 0) {
    reasons.push(`${missingCount} campo(s) relevante(s) sem nenhuma evidência ainda — não contam a favor nem contra o score.`);
  }

  return { score, confidence, reasons, verifiedCount, conflictedCount, unverifiedCount, inferredCount, consideredCount: considered.length, relevantFieldCount: DATA_QUALITY_RELEVANT_FIELDS.length };
}

// ---------------------------------------------------------------------------
// FINAL SCORE — combina os três, nunca esconde nenhum
// ---------------------------------------------------------------------------

// Pesos default: Fit pesa mais porque é o que responde "essa empresa serve
// para o que o usuário pediu" — a pergunta central da prospecção. Intent hoje
// quase sempre chega como `null` (sem provider integrado — ver
// computeIntentScore), então seu peso é redistribuído entre Fit e Data
// Quality na prática (ver computeLeadScores) até existir algum provider real.
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = { fit: 0.6, intent: 0.15, dataQuality: 0.25 };

// Pesos configuráveis por marca/ICP (pacote CPI pede explicitamente "pesos
// configuráveis por marca/ICP"). Atlas (agro/frigorificado) e TotalTrac
// (transporte/logística geral) têm perfis de decisão um pouco diferentes:
// TotalTrac historicamente qualifica mais por completude cadastral/contato
// (venda mais transacional, decisor mais difícil de confirmar) do que por
// aderência fina de segmento; Atlas prioriza aderência de segmento primeiro.
// Ambos ainda somam 1 (fit + intent + dataQuality) — resolveScoringWeights
// normaliza defensivamente mesmo assim.
export const SCORING_WEIGHTS_BY_COMPANY: Record<string, ScoringWeights> = {
  atlas: { fit: 0.65, intent: 0.15, dataQuality: 0.2 },
  totaltrac: { fit: 0.55, intent: 0.15, dataQuality: 0.3 }
};

export function resolveScoringWeights(company?: string, override?: Partial<ScoringWeights>): ScoringWeights {
  const base = (company && SCORING_WEIGHTS_BY_COMPANY[company]) || DEFAULT_SCORING_WEIGHTS;
  const merged: ScoringWeights = { ...base, ...override };
  const total = merged.fit + merged.intent + merged.dataQuality;
  if (total <= 0) return DEFAULT_SCORING_WEIGHTS;
  // Normaliza para somar 1 mesmo se o override não somar exatamente 1.
  return { fit: merged.fit / total, intent: merged.intent / total, dataQuality: merged.dataQuality / total };
}

export interface ComputeLeadScoresParams {
  requirementEvaluations: RequirementEvaluation[];
  evidences: EvidenceRecord[];
  // Wave 13 (CPI, Signals & Intent) — sinais reais detectados para este lead
  // (server/signals.ts#detectSignalsForLead). Ausente/vazio mantém o Intent
  // Score honestamente `null`, exatamente como antes desta wave.
  signals?: Signal[];
  company?: string;
  weightsOverride?: Partial<ScoringWeights>;
}

/**
 * Combina os três scores num Final Score, mas SEMPRE devolve os três
 * individuais junto (fit/intent/dataQuality) além do final — nunca esconde
 * um componente atrás do número combinado. Um componente sem base para ser
 * calculado (`score: null`) tem seu peso redistribuído entre os componentes
 * que de fato têm um valor — nunca é tratado como "vale 0" (isso inflaria
 * artificialmente o quanto os outros dois puxam o final para baixo, e
 * puniria um lead só por faltar um provider de sinal que nem existe ainda).
 */
export function computeLeadScores(params: ComputeLeadScoresParams): LeadScores {
  const fit = computeFitScore(params.requirementEvaluations);
  const intent = computeIntentScore(params.signals);
  const dataQuality = computeDataQualityScore(params.evidences);
  const weights = resolveScoringWeights(params.company, params.weightsOverride);

  const components: Array<{ key: keyof ScoringWeights; label: string; value: number | null; weight: number }> = [
    { key: 'fit', label: 'fit', value: fit.score, weight: weights.fit },
    { key: 'intent', label: 'intent', value: intent.score, weight: weights.intent },
    { key: 'dataQuality', label: 'dataQuality', value: dataQuality.score, weight: weights.dataQuality }
  ];
  const available = components.filter(c => c.value !== null) as Array<{ key: keyof ScoringWeights; label: string; value: number; weight: number }>;
  const availableWeightSum = available.reduce((sum, c) => sum + c.weight, 0);

  const reasons: string[] = [];
  let final: number | null = null;

  if (available.length === 0) {
    reasons.push('Nenhum dos três componentes (fit, intent, dataQuality) tem base suficiente para gerar um Final Score.');
  } else if (availableWeightSum === 0) {
    // Pesos configurados são 0 para tudo que está disponível — cai para
    // média simples em vez de dividir por zero.
    final = Math.round(available.reduce((sum, c) => sum + c.value, 0) / available.length);
    reasons.push('Pesos configurados somam 0 entre os componentes disponíveis — usando média simples como fallback.');
  } else {
    final = Math.round(available.reduce((sum, c) => sum + c.value * c.weight, 0) / availableWeightSum);
  }

  if (available.length < components.length) {
    const missing = components.filter(c => c.value === null).map(c => c.label);
    reasons.push(`Componente(s) sem score calculado: ${missing.join(', ')} — peso redistribuído entre os demais, nunca tratado como 0.`);
  }

  reasons.push(...fit.reasons.map(r => `[fit] ${r}`));
  reasons.push(...intent.reasons.map(r => `[intent] ${r}`));
  reasons.push(...dataQuality.reasons.map(r => `[dataQuality] ${r}`));

  return { fit, intent, dataQuality, final, weights, reasons, scoringModelVersion: SCORING_MODEL_VERSION };
}
