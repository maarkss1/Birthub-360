import { describe, expect, it } from 'vitest';
import {
  computeHourlyAnswerRates,
  type DialCandidateScoreInput,
  prioritizeDialCandidates,
  scoreDialCandidate,
} from '../coldCall.scoring.js';

// 2026-08-03T14:00:00Z = segunda-feira, 11:00 em São Paulo — mesma âncora de coldCall.policy.test.ts.
const SEGUNDA_11H_SP = new Date('2026-08-03T14:00:00Z');
const TZ = 'America/Sao_Paulo';

function callsAt(hourSp: number, outcome: string, count: number) {
  // 3 horas de deslocamento SP -> UTC neste teste (sem horário de verão em 2026).
  return Array.from({ length: count }, () => ({
    createdAt: new Date(`2026-08-03T${String(hourSp + 3).padStart(2, '0')}:00:00Z`),
    outcome,
  }));
}

describe('computeHourlyAnswerRates', () => {
  it('calcula a taxa real de uma hora com amostra suficiente', () => {
    const calls = [...callsAt(11, 'completed', 4), ...callsAt(11, 'no-answer', 6)];
    const rates = computeHourlyAnswerRates(calls, TZ);
    expect(rates.get(11)).toEqual({ rate: 0.4, sampleSize: 10 });
  });

  it('cai para a taxa geral quando a hora tem poucas amostras', () => {
    // 11h só tem 2 ligações (abaixo do mínimo de 5) — a taxa geral (50%) é usada no lugar.
    const calls = [
      ...callsAt(11, 'completed', 1),
      ...callsAt(11, 'no-answer', 1),
      ...callsAt(15, 'completed', 4),
      ...callsAt(15, 'no-answer', 4),
    ];
    const rates = computeHourlyAnswerRates(calls, TZ);
    expect(rates.get(11)?.rate).toBe(0.5);
    expect(rates.get(11)?.sampleSize).toBe(2);
  });

  it('devolve 0 para toda hora quando não há histórico algum', () => {
    const rates = computeHourlyAnswerRates([], TZ);
    expect(rates.get(9)).toEqual({ rate: 0, sampleSize: 0 });
    expect(rates.size).toBe(24);
  });
});

describe('scoreDialCandidate', () => {
  const hourlyRates = computeHourlyAnswerRates(
    [...callsAt(11, 'completed', 6), ...callsAt(11, 'no-answer', 4)],
    TZ,
  );

  it('usa a taxa da hora como base para um lead sem histórico próprio', () => {
    const candidate: DialCandidateScoreInput = { id: 'lead-1', ownRecentOutcomes: [] };
    expect(scoreDialCandidate(candidate, SEGUNDA_11H_SP, TZ, hourlyRates)).toBeCloseTo(0.6);
  });

  it('prioriza quem já atendeu antes, mesmo acima da taxa da hora', () => {
    const candidate: DialCandidateScoreInput = {
      id: 'lead-2',
      ownRecentOutcomes: ['completed'],
    };
    expect(scoreDialCandidate(candidate, SEGUNDA_11H_SP, TZ, hourlyRates)).toBeCloseTo(0.8);
  });

  it('desprioriza levemente uma sequência de não-atendimentos, sem zerar', () => {
    const candidate: DialCandidateScoreInput = {
      id: 'lead-3',
      ownRecentOutcomes: ['no-answer', 'no-answer', 'voicemail'],
    };
    const score = scoreDialCandidate(candidate, SEGUNDA_11H_SP, TZ, hourlyRates);
    expect(score).toBeLessThan(0.6);
    expect(score).toBeGreaterThan(0);
  });

  it('nunca sai do intervalo [0, 1]', () => {
    const noHistory = computeHourlyAnswerRates([], TZ);
    const candidate: DialCandidateScoreInput = {
      id: 'lead-4',
      ownRecentOutcomes: ['no-answer', 'no-answer', 'no-answer', 'no-answer'],
    };
    const score = scoreDialCandidate(candidate, SEGUNDA_11H_SP, TZ, noHistory);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('prioritizeDialCandidates', () => {
  it('ordena do maior para o menor score', () => {
    const candidates = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const scores = new Map([
      ['a', 0.2],
      ['b', 0.9],
      ['c', 0.5],
    ]);
    expect(prioritizeDialCandidates(candidates, scores).map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('mantém a ordem de entrada como desempate (sort estável)', () => {
    const candidates = [{ id: 'oldest' }, { id: 'newer' }];
    const scores = new Map([
      ['oldest', 0.5],
      ['newer', 0.5],
    ]);
    expect(prioritizeDialCandidates(candidates, scores).map((c) => c.id)).toEqual([
      'oldest',
      'newer',
    ]);
  });

  it('trata candidato sem score como 0, sem quebrar', () => {
    const candidates = [{ id: 'scored' }, { id: 'unscored' }];
    const scores = new Map([['scored', 0.1]]);
    expect(prioritizeDialCandidates(candidates, scores).map((c) => c.id)).toEqual([
      'scored',
      'unscored',
    ]);
  });
});
