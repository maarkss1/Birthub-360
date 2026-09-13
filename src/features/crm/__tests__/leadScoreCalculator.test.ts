import { describe, expect, it } from 'vitest';
import { calculateLeadScore } from '../domain/leadScoreCalculator';

describe('Lead Score Calculator (BANT / SPIN)', () => {
  it('calculates perfect score (100) for ideal BANT qualification', () => {
    const result = calculateLeadScore({
      budget: 'aprovado',
      authority: 'decisor_clevel',
      need: 'critica_urgente',
      timing: 'imediato_30d',
      fuelCostPain: true,
    });

    expect(result.score).toBe(100);
    expect(result.temperature).toBe('Quente');
    expect(result.breakdown.budgetScore).toBe(25);
    expect(result.breakdown.authorityScore).toBe(25);
    expect(result.breakdown.needScore).toBe(25);
    expect(result.breakdown.timingScore).toBe(25);
    expect(result.recommendation).toContain('Alta propensão');
  });

  it('calculates warm score (Morno, 40-69) for partially qualified lead', () => {
    const result = calculateLeadScore({
      budget: 'em_planejamento', // 15
      authority: 'influenciador_gerente', // 18
      need: 'moderada_otimizacao', // 15
      timing: 'medio_90d', // 10
    });

    expect(result.score).toBe(58);
    expect(result.temperature).toBe('Morno');
    expect(result.recommendation).toContain('Lead qualificado');
  });

  it('calculates cold score (Frio, < 40) for unqualified lead', () => {
    const result = calculateLeadScore({
      budget: 'sem_verba', // 0
      authority: 'usuario_operacional', // 10
      need: 'curiosidade_benchmarking', // 5
      timing: 'longo_prazo', // 0
    });

    expect(result.score).toBe(15);
    expect(result.temperature).toBe('Frio');
    expect(result.recommendation).toContain('Qualificar dores');
  });

  it('handles empty input gracefully', () => {
    const result = calculateLeadScore({});

    expect(result.score).toBe(0);
    expect(result.temperature).toBe('Frio');
    expect(result.breakdown.budgetScore).toBe(0);
    expect(result.breakdown.authorityScore).toBe(0);
    expect(result.breakdown.needScore).toBe(0);
    expect(result.breakdown.timingScore).toBe(0);
  });

  it('supports legacy string values from CRM select', () => {
    const result = calculateLeadScore({
      authority: 'Decisor', // 25
      need: 'Alto', // 25
    });

    expect(result.score).toBe(50);
    expect(result.temperature).toBe('Morno');
    expect(result.breakdown.authorityScore).toBe(25);
    expect(result.breakdown.needScore).toBe(25);
  });

  it('covers the middle branches of budget ("indefinido") and timing ("curto_60d")', () => {
    const result = calculateLeadScore({
      budget: 'indefinido', // 5
      timing: 'curto_60d', // 18
    });

    expect(result.breakdown.budgetScore).toBe(5);
    expect(result.breakdown.timingScore).toBe(18);
  });

  // ACH-05-07 fazia fuelCostPain/theftRiskPain bonificarem +5 no needScore só quando o playbook
  // ativo era o de risco de carga/logística ('atlasgr'). A unificação de playbook comercial em
  // 'geral' (decisão do usuário, ver CLAUDE.md seção 1) removeu a única forma de saber se um lead
  // era desse vertical — manter o bônus pra qualquer organização contrariaria o próprio motivo do
  // ACH-05-07 ("CRM multi-tenant não pode amarrar o produto a um vertical"), então o bônus foi
  // removido (não substituído por "aplica pra todo mundo"). `fuelCostPain`/`theftRiskPain`
  // continuam aceitos no input (não quebram chamadores existentes), só não pontuam mais nada.
  it('fuelCostPain/theftRiskPain não bonificam mais o needScore (ACH-05-07 removido)', () => {
    const semDores = calculateLeadScore({ need: 'moderada_otimizacao' });
    const comFuelPain = calculateLeadScore({ need: 'moderada_otimizacao', fuelCostPain: true });
    const comTheftPain = calculateLeadScore({ need: 'moderada_otimizacao', theftRiskPain: true });
    const comAmbas = calculateLeadScore({
      need: 'moderada_otimizacao',
      fuelCostPain: true,
      theftRiskPain: true,
    });

    expect(semDores.breakdown.needScore).toBe(15);
    expect(comFuelPain.breakdown.needScore).toBe(15);
    expect(comTheftPain.breakdown.needScore).toBe(15);
    expect(comAmbas.breakdown.needScore).toBe(15);
  });

  it('activePlaybook não afeta mais o score (campo aceito, ignorado no cálculo)', () => {
    const semPlaybook = calculateLeadScore({ need: 'moderada_otimizacao', fuelCostPain: true });
    const comPlaybook = calculateLeadScore({
      need: 'moderada_otimizacao',
      fuelCostPain: true,
      activePlaybook: 'geral',
    });

    expect(semPlaybook.breakdown.needScore).toBe(15);
    expect(comPlaybook.breakdown.needScore).toBe(15);
  });

  it('valores desconhecidos de budget/authority/need/timing caem no default (0), não quebram', () => {
    const result = calculateLeadScore({
      budget: 'valor-nunca-visto',
      authority: 'valor-nunca-visto',
      need: 'valor-nunca-visto',
      timing: 'valor-nunca-visto',
    });

    expect(result.score).toBe(0);
    expect(result.temperature).toBe('Frio');
  });
});
