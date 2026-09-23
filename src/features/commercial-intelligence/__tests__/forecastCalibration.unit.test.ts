import { describe, expect, it } from 'vitest';
import {
  computeForecastCalibration,
  MAX_CALIBRATION_FACTOR,
  MIN_CALIBRATION_FACTOR,
  MIN_SAMPLES_FOR_CALIBRATION,
} from '../application/forecastCalibration';
import type { ForecastAccuracyResult } from '../domain/CommercialIntelligence';

function sample(overrides: Partial<ForecastAccuracyResult> = {}): ForecastAccuracyResult {
  return {
    available: true,
    period: '2026-06',
    reason: null,
    snapshotAt: '2026-06-02T06:00:00.000Z',
    rulesVersion: 'v1',
    predictedForecastAmount: 100_000,
    realizedClosedAmount: 100_000,
    errorAmount: 0,
    errorPercent: 0,
    direction: 'acertou',
    ...overrides,
  };
}

describe('forecastCalibration.computeForecastCalibration — honestidade sobre ausência de dado', () => {
  it(`com menos de ${MIN_SAMPLES_FOR_CALIBRATION} amostras avaliáveis: available=false, nenhuma correção aplicada`, () => {
    const result = computeForecastCalibration(
      [sample(), sample({ period: '2026-07' })],
      200_000,
      300_000,
      'BRL',
    );
    expect(result.available).toBe(false);
    expect(result.reason).toBe('sem_historico_suficiente');
    expect(result.calibrationFactor).toBeNull();
    expect(result.calibratedForecastAmount).toBeNull();
    expect(result.rawForecastAmount).toBe(200_000);
  });

  it('motor subestimando sistematicamente (realizado > previsto): fator > 1, biasDirection="subestimando"', () => {
    const samples = [
      sample({ period: '2026-05', predictedForecastAmount: 100_000, realizedClosedAmount: 120_000 }),
      sample({ period: '2026-06', predictedForecastAmount: 100_000, realizedClosedAmount: 110_000 }),
      sample({ period: '2026-07', predictedForecastAmount: 100_000, realizedClosedAmount: 115_000 }),
    ];
    const result = computeForecastCalibration(samples, 200_000, 300_000, 'BRL');
    expect(result.available).toBe(true);
    expect(result.sampleSize).toBe(3);
    expect(result.calibrationFactor).toBeGreaterThan(1);
    expect(result.biasDirection).toBe('subestimando');
    expect(result.calibratedForecastAmount).toBeCloseTo(200_000 * (result.calibrationFactor as number), 2);
  });

  it('motor superestimando sistematicamente (realizado < previsto): fator < 1, biasDirection="superestimando"', () => {
    const samples = [
      sample({ period: '2026-05', predictedForecastAmount: 100_000, realizedClosedAmount: 70_000 }),
      sample({ period: '2026-06', predictedForecastAmount: 100_000, realizedClosedAmount: 75_000 }),
      sample({ period: '2026-07', predictedForecastAmount: 100_000, realizedClosedAmount: 72_000 }),
    ];
    const result = computeForecastCalibration(samples, 200_000, null, 'BRL');
    expect(result.calibrationFactor).toBeLessThan(1);
    expect(result.biasDirection).toBe('superestimando');
    expect(result.goalAmount).toBeNull();
    expect(result.calibratedGapToGoal).toBeNull();
  });

  it('erro histórico dentro da banda neutra: biasDirection="neutro"', () => {
    const samples = [
      sample({ period: '2026-05', predictedForecastAmount: 100_000, realizedClosedAmount: 101_000 }),
      sample({ period: '2026-06', predictedForecastAmount: 100_000, realizedClosedAmount: 99_000 }),
      sample({ period: '2026-07', predictedForecastAmount: 100_000, realizedClosedAmount: 100_000 }),
    ];
    const result = computeForecastCalibration(samples, 200_000, null, 'BRL');
    expect(result.biasDirection).toBe('neutro');
  });

  it('nunca deixa o fator sair de [MIN_CALIBRATION_FACTOR, MAX_CALIBRATION_FACTOR] mesmo com viés extremo', () => {
    const samples = [
      sample({ period: '2026-05', predictedForecastAmount: 100_000, realizedClosedAmount: 400_000 }),
      sample({ period: '2026-06', predictedForecastAmount: 100_000, realizedClosedAmount: 400_000 }),
      sample({ period: '2026-07', predictedForecastAmount: 100_000, realizedClosedAmount: 400_000 }),
    ];
    const result = computeForecastCalibration(samples, 200_000, null, 'BRL');
    expect(result.calibrationFactor).toBe(MAX_CALIBRATION_FACTOR);
  });

  it('meta cadastrada: calibratedGapToGoal nunca fica negativo quando o calibrado supera a meta', () => {
    const samples = [
      sample({ period: '2026-05', predictedForecastAmount: 100_000, realizedClosedAmount: 120_000 }),
      sample({ period: '2026-06', predictedForecastAmount: 100_000, realizedClosedAmount: 120_000 }),
      sample({ period: '2026-07', predictedForecastAmount: 100_000, realizedClosedAmount: 120_000 }),
    ];
    const result = computeForecastCalibration(samples, 500_000, 100_000, 'BRL');
    expect(result.calibratedForecastAmount).toBeGreaterThan(100_000);
    expect(result.calibratedGapToGoal).toBe(0);
  });

  it('ignora amostras indisponíveis ou com previsto <= 0 ao calcular o fator', () => {
    const samples = [
      sample({ period: '2026-04', available: false, predictedForecastAmount: null, realizedClosedAmount: null }),
      sample({ period: '2026-05', predictedForecastAmount: 0, realizedClosedAmount: 10_000 }),
      sample({ period: '2026-06', predictedForecastAmount: 100_000, realizedClosedAmount: 100_000 }),
      sample({ period: '2026-07', predictedForecastAmount: 100_000, realizedClosedAmount: 100_000 }),
      sample({ period: '2026-08', predictedForecastAmount: 100_000, realizedClosedAmount: 100_000 }),
    ];
    const result = computeForecastCalibration(samples, 200_000, null, 'BRL');
    expect(result.available).toBe(true);
    expect(result.sampleSize).toBe(3);
    expect(result.calibrationFactor).toBeCloseTo(1, 5);
  });

  it(`respeita o clamp mínimo (${MIN_CALIBRATION_FACTOR}x)`, () => {
    const samples = [
      sample({ period: '2026-05', predictedForecastAmount: 100_000, realizedClosedAmount: 1_000 }),
      sample({ period: '2026-06', predictedForecastAmount: 100_000, realizedClosedAmount: 1_000 }),
      sample({ period: '2026-07', predictedForecastAmount: 100_000, realizedClosedAmount: 1_000 }),
    ];
    const result = computeForecastCalibration(samples, 200_000, null, 'BRL');
    expect(result.calibrationFactor).toBe(MIN_CALIBRATION_FACTOR);
  });
});
