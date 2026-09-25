import { describe, expect, it } from 'vitest';
import {
  HIRING_SIMULATION_WINDOW_DAYS,
  NEW_REP_RAMP_UP_DAYS,
  simulateHiringScenario,
} from '../application/hiringScenarioSimulator.js';

describe('hiringScenarioSimulator.simulateHiringScenario — honestidade sobre ausência de dado', () => {
  it('número de vendedores adicionais inválido (<= 0): available=false', () => {
    const result = simulateHiringScenario(0, 50_000, 5, 30, 20, 'BRL');
    expect(result.available).toBe(false);
    expect(result.reason).toBe('numero_de_reps_invalido');
    expect(result.incrementalPipelineAmount).toBeNull();
  });

  it('sem nenhum vendedor com pipeline criado no período: available=false, nunca uma taxa fabricada', () => {
    const result = simulateHiringScenario(2, null, 0, 30, 20, 'BRL');
    expect(result.available).toBe(false);
    expect(result.reason).toBe('sem_dados_de_pipeline_por_vendedor');
  });

  it('projeta pipeline adicional descontando os dias de ramp-up', () => {
    const result = simulateHiringScenario(2, 60_000, 4, 25, 15, 'BRL');
    expect(result.available).toBe(true);
    const productiveDays = HIRING_SIMULATION_WINDOW_DAYS - NEW_REP_RAMP_UP_DAYS;
    const expectedPipeline = 2 * 60_000 * (productiveDays / 30);
    expect(result.incrementalPipelineAmount).toBeCloseTo(expectedPipeline, 2);
  });

  it('receita estimada = pipeline adicional × win rate', () => {
    const result = simulateHiringScenario(1, 100_000, 5, 40, 15, 'BRL');
    expect(result.estimatedIncrementalRevenue).toBeCloseTo(
      (result.incrementalPipelineAmount as number) * 0.4,
      2,
    );
  });

  it('sem Win Rate calculável: estimatedIncrementalRevenue fica null, mas o pipeline continua disponível', () => {
    const result = simulateHiringScenario(2, 50_000, 3, null, 20, 'BRL');
    expect(result.incrementalPipelineAmount).not.toBeNull();
    expect(result.estimatedIncrementalRevenue).toBeNull();
  });

  it('sinaliza cycleExceedsWindow quando o ciclo de venda mediano supera os dias produtivos da janela', () => {
    const productiveDays = HIRING_SIMULATION_WINDOW_DAYS - NEW_REP_RAMP_UP_DAYS;
    const result = simulateHiringScenario(2, 50_000, 3, 30, productiveDays + 10, 'BRL');
    expect(result.cycleExceedsWindow).toBe(true);
  });

  it('não sinaliza cycleExceedsWindow quando o ciclo cabe dentro da janela produtiva', () => {
    const productiveDays = HIRING_SIMULATION_WINDOW_DAYS - NEW_REP_RAMP_UP_DAYS;
    const result = simulateHiringScenario(2, 50_000, 3, 30, productiveDays - 10, 'BRL');
    expect(result.cycleExceedsWindow).toBe(false);
  });

  it('sem Ciclo de Venda calculável, nunca assume que o ciclo excede a janela', () => {
    const result = simulateHiringScenario(2, 50_000, 3, 30, null, 'BRL');
    expect(result.cycleExceedsWindow).toBe(false);
  });
});
