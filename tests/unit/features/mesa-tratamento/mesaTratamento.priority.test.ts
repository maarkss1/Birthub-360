import { describe, it, expect } from 'vitest';
import {
  rankLeadsForQueue,
  computeQueuePriorityScore,
} from '@/features/mesa-tratamento/mesaTratamento.priority';

/**
 * Piloto 026 — primeira cobertura de teste do módulo (auditoria confirmou zero testes
 * unitários/e2e reais exercitando a fila da Mesa de Tratamento). `rankLeadsForQueue` é a lógica
 * que decide qual lead o SDR vê primeiro — prioridade errada aqui significa o SDR trabalhando o
 * lead errado sem perceber, então o critério (etapa → dias sem toque → temperatura) precisa estar
 * coberto.
 */

type QueueLeadInput = {
  id: string;
  status: string;
  lastInteraction: Date | null;
  temperature: string | null;
};

function lead(overrides: Partial<QueueLeadInput> & { id: string }): QueueLeadInput {
  return {
    status: 'Lead_Recebido',
    lastInteraction: null,
    temperature: null,
    ...overrides,
  };
}

describe('rankLeadsForQueue', () => {
  it('prioriza a etapa mais urgente (Reunião Agendada) antes de etapas mais cedo do funil', () => {
    const ranked = rankLeadsForQueue([
      lead({ id: 'a', status: 'Lead_Recebido' }),
      lead({ id: 'b', status: 'Reuniao_Agendada' }),
      lead({ id: 'c', status: 'Cadencia_Iniciada' }),
      lead({ id: 'd', status: 'Qualificacao_SDR' }),
    ]);
    expect(ranked.map((l) => l.id)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('dentro da mesma etapa, prioriza quem está há mais dias sem toque', () => {
    const now = Date.now();
    const ranked = rankLeadsForQueue([
      lead({
        id: 'recent',
        status: 'Lead_Recebido',
        lastInteraction: new Date(now - 1 * 86_400_000),
      }),
      lead({
        id: 'stale',
        status: 'Lead_Recebido',
        lastInteraction: new Date(now - 10 * 86_400_000),
      }),
    ]);
    expect(ranked.map((l) => l.id)).toEqual(['stale', 'recent']);
  });

  it('lead nunca tocado (lastInteraction null) tem prioridade máxima de resgate, mesma etapa', () => {
    const ranked = rankLeadsForQueue([
      lead({ id: 'touched', status: 'Lead_Recebido', lastInteraction: new Date() }),
      lead({ id: 'never-touched', status: 'Lead_Recebido', lastInteraction: null }),
    ]);
    expect(ranked.map((l) => l.id)).toEqual(['never-touched', 'touched']);
  });

  it('empate de etapa e dias sem toque desempata por temperatura (Quente > Morno > Frio)', () => {
    const sameDate = new Date();
    const ranked = rankLeadsForQueue([
      lead({ id: 'frio', status: 'Lead_Recebido', lastInteraction: sameDate, temperature: 'Frio' }),
      lead({
        id: 'quente',
        status: 'Lead_Recebido',
        lastInteraction: sameDate,
        temperature: 'Quente',
      }),
      lead({
        id: 'morno',
        status: 'Lead_Recebido',
        lastInteraction: sameDate,
        temperature: 'Morno',
      }),
    ]);
    expect(ranked.map((l) => l.id)).toEqual(['quente', 'morno', 'frio']);
  });

  it('não muta o array original (retorna uma cópia ordenada)', () => {
    const original = [
      lead({ id: 'a', status: 'Lead_Recebido' }),
      lead({ id: 'b', status: 'Reuniao_Agendada' }),
    ];
    const originalOrder = original.map((l) => l.id);
    rankLeadsForQueue(original);
    expect(original.map((l) => l.id)).toEqual(originalOrder);
  });

  it('etapa desconhecida (nunca deveria chegar aqui, mas por segurança) cai para o fim da fila', () => {
    const ranked = rankLeadsForQueue([
      lead({ id: 'unknown-stage', status: 'Convertido_em_Oportunidade' }),
      lead({ id: 'known-stage', status: 'Lead_Recebido' }),
    ]);
    expect(ranked.map((l) => l.id)).toEqual(['known-stage', 'unknown-stage']);
  });
});

describe('computeQueuePriorityScore', () => {
  it('soma os três fatores (etapa + dias sem toque + temperatura) no score final', () => {
    const now = Date.now();
    const result = computeQueuePriorityScore(
      lead({
        id: 'x',
        status: 'Qualificacao_SDR',
        lastInteraction: new Date(now - 12 * 86_400_000),
        temperature: 'Morno',
      }),
    );
    const sumOfBreakdown = result.breakdown.reduce((acc, item) => acc + item.points, 0);
    expect(result.score).toBe(sumOfBreakdown);
  });

  it('etapa mais urgente pontua mais que uma etapa mais cedo do funil, tudo mais igual', () => {
    const sameDate = new Date();
    const reuniao = computeQueuePriorityScore(
      lead({ id: 'a', status: 'Reuniao_Agendada', lastInteraction: sameDate }),
    );
    const recebido = computeQueuePriorityScore(
      lead({ id: 'b', status: 'Lead_Recebido', lastInteraction: sameDate }),
    );
    expect(reuniao.score).toBeGreaterThan(recebido.score);
  });

  it('mais dias sem toque pontua mais nesse fator (mesma etapa/temperatura)', () => {
    const now = Date.now();
    const stale = computeQueuePriorityScore(
      lead({ id: 'a', status: 'Lead_Recebido', lastInteraction: new Date(now - 30 * 86_400_000) }),
    );
    const recent = computeQueuePriorityScore(
      lead({ id: 'b', status: 'Lead_Recebido', lastInteraction: new Date(now - 1 * 86_400_000) }),
    );
    const staleTouch = stale.breakdown.find((b) => b.label === 'Dias sem toque')!;
    const recentTouch = recent.breakdown.find((b) => b.label === 'Dias sem toque')!;
    expect(staleTouch.points).toBeGreaterThan(recentTouch.points);
  });

  it('dias sem toque tem teto — nunca ultrapassa DAYS_SINCE_TOUCH_MAX_POINTS mesmo muito acima do cap', () => {
    const result = computeQueuePriorityScore(
      lead({ id: 'a', status: 'Lead_Recebido', lastInteraction: null }),
    );
    const touch = result.breakdown.find((b) => b.label === 'Dias sem toque')!;
    expect(touch.points).toBe(40);
  });

  it('Quente pontua mais que Morno, que pontua mais que Frio, tudo mais igual', () => {
    const sameDate = new Date();
    const quente = computeQueuePriorityScore(
      lead({ id: 'a', status: 'Lead_Recebido', lastInteraction: sameDate, temperature: 'Quente' }),
    );
    const morno = computeQueuePriorityScore(
      lead({ id: 'b', status: 'Lead_Recebido', lastInteraction: sameDate, temperature: 'Morno' }),
    );
    const frio = computeQueuePriorityScore(
      lead({ id: 'c', status: 'Lead_Recebido', lastInteraction: sameDate, temperature: 'Frio' }),
    );
    expect(quente.score).toBeGreaterThan(morno.score);
    expect(morno.score).toBeGreaterThan(frio.score);
  });

  it('score fica entre 0 e 100', () => {
    const now = Date.now();
    const max = computeQueuePriorityScore(
      lead({
        id: 'max',
        status: 'Reuniao_Agendada',
        lastInteraction: null,
        temperature: 'Quente',
      }),
    );
    const min = computeQueuePriorityScore(
      lead({
        id: 'min',
        status: 'unknown_status',
        lastInteraction: new Date(now),
        temperature: null,
      }),
    );
    expect(max.score).toBeLessThanOrEqual(100);
    expect(min.score).toBeGreaterThanOrEqual(0);
  });

  it('sempre devolve exatamente 3 itens no detalhamento, na mesma ordem', () => {
    const result = computeQueuePriorityScore(
      lead({ id: 'a', status: 'Lead_Recebido', lastInteraction: new Date() }),
    );
    expect(result.breakdown.map((b) => b.label)).toEqual([
      'Etapa do funil',
      'Dias sem toque',
      'Temperatura',
    ]);
  });
});
