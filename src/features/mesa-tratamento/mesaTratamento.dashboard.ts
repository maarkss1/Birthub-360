/**
 * Agregações puras do dashboard da Mesa de Tratamento — portadas do protótipo standalone
 * `acompanhamento-sdr` (js/dashboard-charts.js), mas operando sobre registros reais do Postgres
 * (`MesaTratamentoTreatment`/`PomodoroSession`) em vez do histórico em localStorage do protótipo.
 * Função pura (sem I/O) pelo mesmo motivo de mesaTratamento.priority.ts: testável sem banco/HTTP.
 */

export interface TreatmentRecord {
  outcome: string;
  createdAt: Date;
}

export interface PomodoroRecord {
  durationMinutes: number;
  createdAt: Date;
}

export interface DailyActivityPoint {
  /** Rótulo "DD/MM" (fuso local do servidor — organizações deste produto operam num único fuso). */
  date: string;
  tratados: number;
  reunioes: number;
  oportunidades: number;
  desqualificados: number;
  minutosFoco: number;
}

export interface OutcomeSlice {
  outcome: string;
  count: number;
}

export interface DashboardKpis {
  totalTratados: number;
  taxaConversaoPercent: number;
  taxaDesqualificacaoPercent: number;
  totalFocusMinutes: number;
  pomodoroCycles: number;
}

const REUNIAO_OUTCOMES = new Set(['reuniao_agendada', 'reuniao_realizada']);
const DESQUALIFICA_OUTCOMES = new Set(['sem_fit', 'dados_invalidos']);

function dayLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Semeia os últimos `days` dias com zero (mesmo comportamento do protótipo: o gráfico nunca
 *  aparece vazio, mesmo sem nenhum tratamento ainda hoje) e agrega por dia. */
export function buildDailyActivity(
  treatments: TreatmentRecord[],
  pomodoroSessions: PomodoroRecord[],
  days: number,
): DailyActivityPoint[] {
  const byDay = new Map<string, DailyActivityPoint>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    byDay.set(dayLabel(d), {
      date: dayLabel(d),
      tratados: 0,
      reunioes: 0,
      oportunidades: 0,
      desqualificados: 0,
      minutosFoco: 0,
    });
  }

  for (const t of treatments) {
    const key = dayLabel(t.createdAt);
    const point = byDay.get(key);
    if (!point) continue;
    point.tratados += 1;
    if (REUNIAO_OUTCOMES.has(t.outcome)) point.reunioes += 1;
    if (t.outcome === 'convertido') point.oportunidades += 1;
    if (DESQUALIFICA_OUTCOMES.has(t.outcome)) point.desqualificados += 1;
  }

  for (const p of pomodoroSessions) {
    const key = dayLabel(p.createdAt);
    const point = byDay.get(key);
    if (point) point.minutosFoco += p.durationMinutes;
  }

  return Array.from(byDay.values());
}

export function buildOutcomeCounts(treatments: TreatmentRecord[]): OutcomeSlice[] {
  const counts = new Map<string, number>();
  for (const t of treatments) {
    counts.set(t.outcome, (counts.get(t.outcome) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([outcome, count]) => ({ outcome, count }));
}

export function computeDashboardKpis(
  treatments: TreatmentRecord[],
  pomodoroSessions: PomodoroRecord[],
): DashboardKpis {
  const total = treatments.length;
  const reunioes = treatments.filter((t) => REUNIAO_OUTCOMES.has(t.outcome)).length;
  const convertidos = treatments.filter((t) => t.outcome === 'convertido').length;
  const desqualificados = treatments.filter((t) => DESQUALIFICA_OUTCOMES.has(t.outcome)).length;

  return {
    totalTratados: total,
    taxaConversaoPercent: total > 0 ? Math.round(((reunioes + convertidos) / total) * 100) : 0,
    taxaDesqualificacaoPercent: total > 0 ? Math.round((desqualificados / total) * 100) : 0,
    totalFocusMinutes: pomodoroSessions.reduce((acc, p) => acc + p.durationMinutes, 0),
    pomodoroCycles: pomodoroSessions.length,
  };
}

export type DashboardPeriod = 'today' | '7d' | '30d' | 'all';

/** Converte o período pedido pelo filtro da UI numa data de corte (`undefined` = sem corte,
 *  usado só por "all" — o range de "all" é limitado na própria query do Prisma, não aqui). */
export function periodStartDate(period: DashboardPeriod, now: Date = new Date()): Date | null {
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === '7d') return new Date(now.getTime() - 7 * 86_400_000);
  if (period === '30d') return new Date(now.getTime() - 30 * 86_400_000);
  return null;
}

/** Quantos dias o gráfico "Evolução diária" cobre pra cada período — 90d como teto de "all" pra
 *  nunca desenhar um eixo X com centenas de pontos. */
export function periodDayWindow(period: DashboardPeriod): number {
  if (period === 'today') return 1;
  if (period === '7d') return 7;
  if (period === '30d') return 30;
  return 90;
}
