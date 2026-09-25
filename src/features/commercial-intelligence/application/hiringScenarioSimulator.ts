/**
 * Simulação de cenário — "se eu contratar +N vendedores, qual o impacto em receita em 90 dias?"
 * Puro e testável em isolamento, mesmo espírito de `predictiveForecast.ts`/`forecastCalibration.ts`:
 * recebe as taxas REAIS já calculadas por quem chama (`CommercialIntelligenceUseCases.hiringScenario`,
 * a partir de `PipelineCreation.byOwner` e `PerformanceMetrics`), nenhum I/O aqui, nenhum benchmark
 * de mercado genérico — só a extrapolação do throughput/conversão que este time já demonstrou.
 */
import type { HiringScenarioResult } from '../domain/CommercialIntelligence.js';
import { roundMoney } from './shared/mathUtils.js';

/** Janela fixa pedida pelo produto — "impacto em receita em 90 dias". */
export const HIRING_SIMULATION_WINDOW_DAYS = 90;

/**
 * Dias de onboarding em que um vendedor novo é considerado sem produção de pipeline ainda —
 * política documentada (não medição, este produto não rastreia ramp-up real de contratação).
 * Modelo deliberadamente simples (zero produção até este dia, produção plena depois) em vez de uma
 * curva de rampa gradual inventada — mais fácil de auditar e de discordar explicitamente.
 */
export const NEW_REP_RAMP_UP_DAYS = 30;

function unavailable(
  reason: HiringScenarioResult['reason'],
  additionalReps: number,
  avgPipelineAmountPerRepPerMonth: number | null,
  activeRepsInPeriod: number,
  winRatePct: number | null,
  salesCycleMedianDays: number | null,
  currency: string,
): HiringScenarioResult {
  return {
    available: false,
    reason,
    additionalReps,
    windowDays: HIRING_SIMULATION_WINDOW_DAYS,
    rampUpDays: NEW_REP_RAMP_UP_DAYS,
    avgPipelineAmountPerRepPerMonth,
    activeRepsInPeriod,
    incrementalPipelineAmount: null,
    winRatePct,
    salesCycleMedianDays,
    cycleExceedsWindow: false,
    estimatedIncrementalRevenue: null,
    currency,
  };
}

export function simulateHiringScenario(
  additionalReps: number,
  avgPipelineAmountPerRepPerMonth: number | null,
  activeRepsInPeriod: number,
  winRatePct: number | null,
  salesCycleMedianDays: number | null,
  currency: string,
): HiringScenarioResult {
  if (!Number.isFinite(additionalReps) || additionalReps <= 0) {
    return unavailable(
      'numero_de_reps_invalido',
      additionalReps,
      avgPipelineAmountPerRepPerMonth,
      activeRepsInPeriod,
      winRatePct,
      salesCycleMedianDays,
      currency,
    );
  }
  if (avgPipelineAmountPerRepPerMonth == null || activeRepsInPeriod === 0) {
    return unavailable(
      'sem_dados_de_pipeline_por_vendedor',
      additionalReps,
      avgPipelineAmountPerRepPerMonth,
      activeRepsInPeriod,
      winRatePct,
      salesCycleMedianDays,
      currency,
    );
  }

  const productiveDays = Math.max(0, HIRING_SIMULATION_WINDOW_DAYS - NEW_REP_RAMP_UP_DAYS);
  const productiveMonths = productiveDays / 30;
  const incrementalPipelineAmount = roundMoney(
    additionalReps * avgPipelineAmountPerRepPerMonth * productiveMonths,
  );

  const cycleExceedsWindow = salesCycleMedianDays != null && salesCycleMedianDays > productiveDays;

  const estimatedIncrementalRevenue =
    winRatePct != null ? roundMoney(incrementalPipelineAmount * (winRatePct / 100)) : null;

  return {
    available: true,
    reason: null,
    additionalReps,
    windowDays: HIRING_SIMULATION_WINDOW_DAYS,
    rampUpDays: NEW_REP_RAMP_UP_DAYS,
    avgPipelineAmountPerRepPerMonth,
    activeRepsInPeriod,
    incrementalPipelineAmount,
    winRatePct,
    salesCycleMedianDays,
    cycleExceedsWindow,
    estimatedIncrementalRevenue,
    currency,
  };
}
