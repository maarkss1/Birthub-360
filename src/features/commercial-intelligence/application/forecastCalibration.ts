/**
 * Forecast auto-calibrado — fecha o loop que `forecastAccuracy.ts` deixa aberto: em vez de só
 * medir o erro histórico (previsto vs. realizado), usa esse erro para corrigir o Forecast
 * Ponderado Explicável ATUAL. Puro e testável em isolamento, mesmo espírito de
 * `predictiveForecast.ts`: nenhum I/O aqui, nenhum modelo estatístico novo — só um fator de
 * correção (média de realizado/previsto dos meses já encerrados) aplicado ao forecast que
 * `forecastEngine.ts` já calculou.
 */
import type {
  ForecastAccuracyResult,
  ForecastBiasDirection,
  ForecastCalibrationResult,
} from '../domain/CommercialIntelligence';
import { roundMoney } from './shared/mathUtils';

/**
 * Meses encerrados com snapshot exigidos antes de confiar num fator de calibração — abaixo disso,
 * 1-2 meses atípicos poderiam distorcer o forecast de todos os meses seguintes. Mesmo espírito de
 * `MIN_SAMPLES_FOR_RANKING`-like guards já usados no módulo (ex.: amostra mínima do Health Score).
 */
export const MIN_SAMPLES_FOR_CALIBRATION = 3;

/**
 * Limites do fator de correção — nunca deixa uma amostra pequena ou um mês atípico dobrar/zerar o
 * forecast. Política documentada, não medição: ±40% é a maior correção que este produto aplica
 * automaticamente; além disso, o problema é o motor de forecast em si (`forecastEngine.ts`), não
 * algo que uma calibração devesse mascarar.
 */
export const MIN_CALIBRATION_FACTOR = 0.6;
export const MAX_CALIBRATION_FACTOR = 1.4;

/** Faixa em torno de 1.0 tratada como "sem viés" (evita rotular ruído estatístico pequeno como tendência). */
const NEUTRAL_BIAS_BAND = 0.03;

function unavailable(
  rawForecastAmount: number,
  goalAmount: number | null,
  currency: string,
): ForecastCalibrationResult {
  return {
    available: false,
    reason: 'sem_historico_suficiente',
    sampleSize: 0,
    minSampleSize: MIN_SAMPLES_FOR_CALIBRATION,
    calibrationFactor: null,
    minFactor: MIN_CALIBRATION_FACTOR,
    maxFactor: MAX_CALIBRATION_FACTOR,
    biasDirection: null,
    rawForecastAmount,
    calibratedForecastAmount: null,
    goalAmount,
    currency,
    calibratedGapToGoal: null,
  };
}

/**
 * Calcula o fator de calibração e aplica ao forecast bruto atual.
 *
 * Fator = média de (realizado / previsto) dos meses encerrados com snapshot e previsto > 0 —
 * > 1.0 significa que o motor tem SUBESTIMADO (realizado veio maior que o previsto); < 1.0 que
 * tem SUPERESTIMADO. Clampado a [MIN_CALIBRATION_FACTOR, MAX_CALIBRATION_FACTOR].
 */
export function computeForecastCalibration(
  samples: ForecastAccuracyResult[],
  rawForecastAmount: number,
  goalAmount: number | null,
  currency: string,
): ForecastCalibrationResult {
  const usable = samples.filter(
    (
      s,
    ): s is ForecastAccuracyResult & {
      predictedForecastAmount: number;
      realizedClosedAmount: number;
    } =>
      s.available &&
      s.predictedForecastAmount != null &&
      s.predictedForecastAmount > 0 &&
      s.realizedClosedAmount != null,
  );

  if (usable.length < MIN_SAMPLES_FOR_CALIBRATION) {
    return unavailable(rawForecastAmount, goalAmount, currency);
  }

  const ratios = usable.map((s) => s.realizedClosedAmount / s.predictedForecastAmount);
  const meanRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  const calibrationFactor = roundMoney(
    Math.min(MAX_CALIBRATION_FACTOR, Math.max(MIN_CALIBRATION_FACTOR, meanRatio)),
  );

  let biasDirection: ForecastBiasDirection;
  if (calibrationFactor >= 1 + NEUTRAL_BIAS_BAND) biasDirection = 'subestimando';
  else if (calibrationFactor <= 1 - NEUTRAL_BIAS_BAND) biasDirection = 'superestimando';
  else biasDirection = 'neutro';

  const calibratedForecastAmount = roundMoney(rawForecastAmount * calibrationFactor);
  const calibratedGapToGoal =
    goalAmount == null ? null : Math.max(0, roundMoney(goalAmount - calibratedForecastAmount));

  return {
    available: true,
    reason: null,
    sampleSize: usable.length,
    minSampleSize: MIN_SAMPLES_FOR_CALIBRATION,
    calibrationFactor,
    minFactor: MIN_CALIBRATION_FACTOR,
    maxFactor: MAX_CALIBRATION_FACTOR,
    biasDirection,
    rawForecastAmount,
    calibratedForecastAmount,
    goalAmount,
    currency,
    calibratedGapToGoal,
  };
}
