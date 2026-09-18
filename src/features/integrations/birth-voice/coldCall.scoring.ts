/**
 * Item #16 do roadmap comercial — "discador preditivo com IA priorizando quem tem mais chance de
 * atender agora (horário, histórico de resposta)". Puro de propósito, mesmo raciocínio de
 * `coldCall.policy.ts`: sem banco, sem rede, testável isoladamente.
 *
 * Decisão consciente: "preditivo" aqui é estatística simples e auditável sobre dado real do
 * próprio tenant (taxa histórica de atendimento por hora + histórico de atendimento do próprio
 * lead), não uma chamada a LLM por lead candidato — 200 candidatos por execução (`SCAN_LIMIT`) a
 * um provedor externo seria lento, caro e, pior, opaco (ninguém consegue auditar por que um lead
 * foi ligado antes de outro). Um score determinístico é exatamente a inteligência que este caso de
 * uso pede: dá pra explicar cada decisão de prioridade só olhando os dois números que a compõem.
 *
 * Isto NUNCA decide QUEM pode ser ligado (isso é `coldCall.policy.ts`/`evaluateLead`, que já rodou
 * antes) — só a ORDEM de discagem dentro do lote já elegível de uma execução, preservando de
 * propósito a seleção original por "lead mais antigo primeiro" (`coldCall.service.ts`, comentário:
 * "o que está parado há semanas é exatamente o que a campanha existe para resgatar") — a
 * priorização por chance de atender reordena quem liga primeiro dentro do lote resgatado, nunca
 * substitui quais leads são resgatados.
 */
import type { CallOutcomeState } from './birthVoice.helpers.js';

export interface HourlyAnswerRate {
  rate: number;
  sampleSize: number;
}

/** Amostra mínima antes de confiar na taxa de uma hora específica — com poucas ligações, uma taxa
 * de 100%/0% é ruído, não sinal. Abaixo disso, cai para a taxa geral (todas as horas juntas). */
const MIN_HOURLY_SAMPLE = 5;

function localHour(date: Date, timeZone: string): number {
  const hourPart = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
  }).formatToParts(date)[0]?.value;
  return hourPart ? Number(hourPart) : date.getUTCHours();
}

/**
 * Taxa de atendimento (`outcome === 'completed'`) por hora local, a partir do histórico real de
 * ligações da organização. Horas sem amostra suficiente recebem a taxa geral como fallback — nunca
 * ficam sem número (o que forçaria tratar "sem dado" como "ninguém atende", o oposto do que os
 * dados realmente dizem).
 */
export function computeHourlyAnswerRates(
  calls: { createdAt: Date; outcome: string }[],
  timeZone: string,
): Map<number, HourlyAnswerRate> {
  const byHour = new Map<number, { completed: number; total: number }>();
  let totalCompleted = 0;

  for (const call of calls) {
    const hour = localHour(call.createdAt, timeZone);
    const bucket = byHour.get(hour) ?? { completed: 0, total: 0 };
    bucket.total += 1;
    if (call.outcome === 'completed') {
      bucket.completed += 1;
      totalCompleted += 1;
    }
    byHour.set(hour, bucket);
  }

  const overallRate = calls.length > 0 ? totalCompleted / calls.length : 0;

  const result = new Map<number, HourlyAnswerRate>();
  for (let hour = 0; hour < 24; hour++) {
    const bucket = byHour.get(hour);
    if (bucket && bucket.total >= MIN_HOURLY_SAMPLE) {
      result.set(hour, { rate: bucket.completed / bucket.total, sampleSize: bucket.total });
    } else {
      result.set(hour, { rate: overallRate, sampleSize: bucket?.total ?? 0 });
    }
  }
  return result;
}

/** Quanto o histórico PRÓPRIO deste lead (mais recente primeiro) ajusta o score-base da hora —
 * nunca decide sozinho (é somado ao score de horário, nunca o substitui): um lead que já atendeu
 * antes vale a pena tentar de novo mesmo numa hora historicamente fraca; um lead com sucessivas
 * chamadas não atendidas é discretamente despriorizado, mas continua elegível (quem exclui de vez é
 * `evaluateLead`, via `maxAttemptsPerLead`). */
function ownHistoryAdjustment(recentOutcomesNewestFirst: CallOutcomeState[]): number {
  const [mostRecent] = recentOutcomesNewestFirst;
  if (mostRecent === 'completed') return 0.2;

  const consecutiveMisses = recentOutcomesNewestFirst.findIndex((o) => o === 'completed');
  const missStreak =
    consecutiveMisses === -1 ? recentOutcomesNewestFirst.length : consecutiveMisses;
  // Até -0.15, nunca mais: uma sequência ruim reduz prioridade, não zera a chance.
  return -Math.min(missStreak * 0.05, 0.15);
}

export interface DialCandidateScoreInput {
  id: string;
  /** Outcomes das ligações anteriores para ESTE lead, mais recente primeiro. */
  ownRecentOutcomes: CallOutcomeState[];
}

/**
 * Score 0-1 de "chance de atender agora" para um candidato — horário (taxa histórica da hora
 * corrente) ajustado pelo histórico próprio do lead. Determinístico e auditável: dado o mesmo
 * `hourlyRates` e o mesmo histórico, sempre o mesmo número, com os dois fatores que o compõem
 * sempre inspecionáveis separadamente.
 */
export function scoreDialCandidate(
  candidate: DialCandidateScoreInput,
  now: Date,
  timeZone: string,
  hourlyRates: Map<number, HourlyAnswerRate>,
): number {
  const hour = localHour(now, timeZone);
  const base = hourlyRates.get(hour)?.rate ?? 0;
  const adjusted = base + ownHistoryAdjustment(candidate.ownRecentOutcomes);
  return Math.max(0, Math.min(1, adjusted));
}

/**
 * Reordena os candidatos (já elegíveis por `evaluateLead`) do mais para o menos provável de
 * atender agora. `Array.prototype.sort` é estável no V8/Node — candidatos com o mesmo score
 * mantêm a ordem de entrada (mais antigo primeiro), preservando o critério de resgate original
 * como desempate.
 */
export function prioritizeDialCandidates<T extends { id: string }>(
  candidates: T[],
  scoresById: Map<string, number>,
): T[] {
  return [...candidates].sort((a, b) => (scoresById.get(b.id) ?? 0) - (scoresById.get(a.id) ?? 0));
}
