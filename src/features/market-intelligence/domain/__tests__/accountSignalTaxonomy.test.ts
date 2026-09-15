import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_SIGNAL_TAXONOMY_VERSION,
  accountSignalTypeLabel,
  classifySignalType,
} from '../accountSignalTaxonomy';

describe('classifySignalType', () => {
  it('classifica rodada de investimento', () => {
    expect(classifySignalType('Startup capta R$ 20 milhões em rodada Série B')).toBe(
      'funding_round',
    );
  });

  it('classifica troca de executivo', () => {
    expect(classifySignalType('Empresa anuncia novo CEO após reestruturação')).toBe(
      'executive_change',
    );
  });

  it('classifica contratação em massa', () => {
    expect(classifySignalType('Companhia abre vagas em processo seletivo para expansão')).toBe(
      'mass_hiring',
    );
  });

  it('classifica expansão geográfica', () => {
    expect(classifySignalType('Rede inaugura nova unidade em São Paulo')).toBe(
      'geographic_expansion',
    );
  });

  it('classifica fusão/aquisição e prioriza sobre rodada de investimento quando ambos aparecem', () => {
    expect(
      classifySignalType('Empresa X adquire concorrente após rodada de investimento recorde'),
    ).toBe('mna');
  });

  it('cai no fallback news_mention quando nenhuma palavra-chave bate', () => {
    expect(classifySignalType('Empresa participa de evento do setor')).toBe('news_mention');
  });

  it('é case-insensitive', () => {
    expect(classifySignalType('EMPRESA ANUNCIA NOVO CEO')).toBe('executive_change');
  });
});

describe('accountSignalTypeLabel', () => {
  it('retorna o rótulo em português pra cada tipo conhecido', () => {
    expect(accountSignalTypeLabel('funding_round')).toBe('Rodada de investimento');
    expect(accountSignalTypeLabel('mna')).toBe('Fusão/Aquisição');
    expect(accountSignalTypeLabel('news_mention')).toBe('Menção em notícia');
  });

  it('devolve o próprio slug quando o tipo é desconhecido (nunca quebra)', () => {
    expect(accountSignalTypeLabel('tipo_inexistente')).toBe('tipo_inexistente');
  });
});

describe('ACCOUNT_SIGNAL_TAXONOMY_VERSION', () => {
  it('é v2 (bump em relação ao v1 fixo anterior)', () => {
    expect(ACCOUNT_SIGNAL_TAXONOMY_VERSION).toBe('v2');
  });
});
