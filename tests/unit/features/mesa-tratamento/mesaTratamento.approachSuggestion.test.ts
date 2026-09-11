import { describe, it, expect } from 'vitest';
import { suggestApproach } from '@/features/mesa-tratamento/mesaTratamento.approachSuggestion';
import type { QueueLeadDetail } from '@/features/mesa-tratamento/mesaTratamento.api';

function baseLead(overrides: Partial<QueueLeadDetail> = {}): QueueLeadDetail {
  return {
    id: 'lead-1',
    title: 'Transportadora Exemplo',
    status: 'Lead_Recebido',
    temperature: null,
    daysSinceTouch: null,
    owner: null,
    segment: 'Transportadora',
    contactName: null,
    contactRole: null,
    phone: null,
    email: null,
    score: null,
    bitrixStageLabel: null,
    nextAction: null,
    qualification: null,
    ...overrides,
  };
}

describe('suggestApproach', () => {
  it('Lead_Recebido sem contato nomeado sugere descoberta de dor e apresentação', () => {
    const result = suggestApproach(baseLead());
    expect(result.headline).toMatch(/primeiro contato/i);
    expect(result.talkingPoints.some((t) => t.toLowerCase().includes('dor'))).toBe(true);
  });

  it('nunca contatado antes (daysSinceTouch null) inclui aviso de primeiro contato', () => {
    const result = suggestApproach(baseLead({ daysSinceTouch: null }));
    expect(result.talkingPoints.some((t) => t.includes('Primeiro contato com este lead'))).toBe(
      true,
    );
  });

  it('muitos dias sem toque (>=14) inclui aviso de reconexão', () => {
    const result = suggestApproach(baseLead({ daysSinceTouch: 20, status: 'Cadencia_Iniciada' }));
    expect(result.talkingPoints.some((t) => t.includes('20 dias sem contato'))).toBe(true);
  });

  it('poucos dias sem toque (<5) não inclui aviso de reconexão', () => {
    const result = suggestApproach(baseLead({ daysSinceTouch: 1, status: 'Cadencia_Iniciada' }));
    expect(result.talkingPoints.some((t) => t.toLowerCase().includes('reconecte'))).toBe(false);
  });

  it('Qualificacao_SDR com dor já registrada referencia a dor no lugar de pedir do zero', () => {
    const result = suggestApproach(
      baseLead({
        status: 'Qualificacao_SDR',
        daysSinceTouch: 2,
        qualification: { dorPrincipal: 'Custo alto de combustível' },
      }),
    );
    expect(result.talkingPoints.some((t) => t.includes('Custo alto de combustível'))).toBe(true);
  });

  it('Qualificacao_SDR sem nenhuma qualificação registrada foca em descobrir BANT', () => {
    const result = suggestApproach(
      baseLead({ status: 'Qualificacao_SDR', daysSinceTouch: 2, qualification: null }),
    );
    expect(result.headline).toMatch(/sem dado registrado/i);
  });

  it('Reuniao_Agendada com nextAction formata data/hora na sugestão', () => {
    const result = suggestApproach(
      baseLead({
        status: 'Reuniao_Agendada',
        daysSinceTouch: 1,
        nextAction: '2026-10-05T14:30:00.000Z',
      }),
    );
    expect(result.talkingPoints.some((t) => t.startsWith('Confirme a presença para'))).toBe(true);
  });

  it('lead frio inclui nota de priorizar reengajamento', () => {
    const result = suggestApproach(baseLead({ temperature: 'Frio', daysSinceTouch: 1 }));
    expect(result.talkingPoints.some((t) => t.includes('Lead frio'))).toBe(true);
  });

  it('lead quente não inclui a nota de lead frio', () => {
    const result = suggestApproach(baseLead({ temperature: 'Quente', daysSinceTouch: 1 }));
    expect(result.talkingPoints.some((t) => t.includes('Lead frio'))).toBe(false);
  });

  it('contactRole aparece junto do nome quando ambos existem', () => {
    const result = suggestApproach(
      baseLead({ contactName: 'Maria Silva', contactRole: 'Diretora de Operações' }),
    );
    expect(
      result.talkingPoints.some((t) => t.includes('Maria Silva (Diretora de Operações)')),
    ).toBe(true);
  });
});
