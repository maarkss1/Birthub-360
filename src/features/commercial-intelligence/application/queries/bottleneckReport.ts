/**
 * Detecção automática de gargalo de funil — em vez de um dashboard passivo (aging por faixa fixa,
 * já coberto por `agingReport.ts`), este relatório COMPARA a duração média de cada etapa contra a
 * duração "normal" das DEMAIS etapas do mesmo pipeline e aponta ativamente qual etapa está
 * anormalmente lenta ("sua etapa de Proposta está 3x mais lenta que o normal"), em vez de só
 * listar aging por faixa fixa de dias.
 *
 * Mesma fonte de dado de `StageAging`/`FunnelStageConversion` (`LeadStageHistory` via
 * `buildStageDurationStats`) — nenhum cálculo de duração novo, só uma comparação relativa nova.
 */

import type {
  BottleneckSeverity,
  CommercialIntelligenceFilter,
  CommercialIntelligenceRepository,
  FunnelBottleneckReport,
  FunnelBottleneckStage,
} from '../../domain/CommercialIntelligence.js';
import { isDealOpen } from '../pipelineEligibility.js';
import { buildStageDurationStats, loadScoredDeals } from '../scoring/dealScoring.js';
import { applyScope } from '../scoring/scopeFilter.js';
import { median, roundMoney } from '../shared/mathUtils.js';

/**
 * Amostra mínima de passagens CONCLUÍDAS por etapa para confiar na duração média como baseline —
 * abaixo disso a etapa aparece no relatório, mas não classifica nem entra na baseline "normal" das
 * outras etapas (evita que 1-2 negócios atípicos virem "3x mais lento" por acaso de amostra).
 */
export const MIN_SAMPLE_SIZE_FOR_BASELINE = 3;
/** Múltiplo da baseline "normal" a partir do qual uma etapa é crítica — política documentada. */
export const BOTTLENECK_CRITICAL_MULTIPLIER = 2.5;
/** Múltiplo a partir do qual uma etapa já merece atenção, abaixo do limiar crítico. */
export const BOTTLENECK_WARNING_MULTIPLIER = 1.5;

function classify(multiplier: number | null): BottleneckSeverity {
  if (multiplier == null) return 'sem_dados';
  if (multiplier >= BOTTLENECK_CRITICAL_MULTIPLIER) return 'critico';
  if (multiplier >= BOTTLENECK_WARNING_MULTIPLIER) return 'atencao';
  return 'normal';
}

export async function buildFunnelBottlenecks(
  repository: CommercialIntelligenceRepository,
  organizationId: string,
  filter: CommercialIntelligenceFilter,
  now: Date,
): Promise<FunnelBottleneckReport> {
  const { scored, stages, history } = await loadScoredDeals(repository, organizationId, now);
  const inScope = applyScope(scored, filter);
  const open = inScope.filter((s) => isDealOpen(s.deal));

  const durationStats = buildStageDurationStats(history);
  const sampleSizeByStage = new Map<string, number>();
  for (const row of history) {
    if (!row.stageId || !row.exitedAt) continue;
    sampleSizeByStage.set(row.stageId, (sampleSizeByStage.get(row.stageId) ?? 0) + 1);
  }

  const openStages = stages
    .filter((stage) => !stage.isWon && !stage.isLost)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const countByStage = new Map<string, { count: number; amount: number }>();
  for (const s of open) {
    if (!s.deal.pipelineStageId) continue;
    const entry = countByStage.get(s.deal.pipelineStageId) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += s.deal.amount;
    countByStage.set(s.deal.pipelineStageId, entry);
  }

  // Candidatas à baseline "normal": etapas com amostra suficiente para confiar na própria duração média.
  const reliableDurations = openStages
    .map((stage) => ({
      stageId: stage.id,
      avg: durationStats.get(stage.id) ?? null,
      sample: sampleSizeByStage.get(stage.id) ?? 0,
    }))
    .filter(
      (d): d is { stageId: string; avg: number; sample: number } =>
        d.avg != null && d.sample >= MIN_SAMPLE_SIZE_FOR_BASELINE,
    );

  const stageResults: FunnelBottleneckStage[] = openStages.map((stage) => {
    const avg = durationStats.get(stage.id) ?? null;
    const sample = sampleSizeByStage.get(stage.id) ?? 0;
    const reliable = avg != null && sample >= MIN_SAMPLE_SIZE_FOR_BASELINE;

    const others = reliableDurations.filter((d) => d.stageId !== stage.id).map((d) => d.avg);
    const normalBaselineDays = others.length >= 2 ? median(others) : null;

    const multiplier =
      reliable && normalBaselineDays != null && normalBaselineDays > 0
        ? roundMoney((avg as number) / normalBaselineDays)
        : null;

    const bucket = countByStage.get(stage.id) ?? { count: 0, amount: 0 };

    return {
      stageId: stage.id,
      stageName: stage.name,
      sortOrder: stage.sortOrder,
      averageDaysInStage: avg != null ? roundMoney(avg) : null,
      sampleSize: sample,
      normalBaselineDays: normalBaselineDays != null ? roundMoney(normalBaselineDays) : null,
      multiplier,
      severity: classify(multiplier),
      openCount: bucket.count,
      openAmount: roundMoney(bucket.amount),
    };
  });

  const trackingSince =
    history.length > 0
      ? history
          .reduce((min, h) => (h.enteredAt < min ? h.enteredAt : min), history[0].enteredAt)
          .toISOString()
      : null;

  return {
    stages: stageResults,
    criticalMultiplier: BOTTLENECK_CRITICAL_MULTIPLIER,
    warningMultiplier: BOTTLENECK_WARNING_MULTIPLIER,
    minSampleSizeForBaseline: MIN_SAMPLE_SIZE_FOR_BASELINE,
    trackingSince,
  };
}
