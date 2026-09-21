import { describe, expect, it } from 'vitest';
import { clampQueryLimit, DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT } from '../../../../src/shared/http/queryLimit';

// CRM-010: LeadController/ContactController/CompanyController compartilham este helper para que
// o cap de `limit` não volte a divergir entre os três controllers.
// Evidência: docs/audits/repository-debt-audit/agents/CRM.md (CRM-010).
describe('clampQueryLimit', () => {
  it('limita um valor acima do teto ao MAX_QUERY_LIMIT', () => {
    expect(clampQueryLimit('99999')).toBe(MAX_QUERY_LIMIT);
  });

  it('preserva um valor razoável dentro do teto', () => {
    expect(clampQueryLimit('30')).toBe(30);
  });

  it('usa o padrão quando o parâmetro está ausente', () => {
    expect(clampQueryLimit(undefined)).toBe(DEFAULT_QUERY_LIMIT);
  });

  it('usa o padrão quando o parâmetro não é numérico', () => {
    expect(clampQueryLimit('abc')).toBe(DEFAULT_QUERY_LIMIT);
  });

  it('usa o padrão quando o parâmetro é zero ou negativo', () => {
    expect(clampQueryLimit('0')).toBe(DEFAULT_QUERY_LIMIT);
    expect(clampQueryLimit('-5')).toBe(DEFAULT_QUERY_LIMIT);
  });

  it('ignora valores que não são string (array/objeto de query tamperada)', () => {
    expect(clampQueryLimit(['100', '200'])).toBe(DEFAULT_QUERY_LIMIT);
    expect(clampQueryLimit({ malicious: true })).toBe(DEFAULT_QUERY_LIMIT);
  });

  it('aceita exatamente o teto sem alterar', () => {
    expect(clampQueryLimit(String(MAX_QUERY_LIMIT))).toBe(MAX_QUERY_LIMIT);
  });
});
