/**
 * Benchmark de vendedor — Win Rate, Ciclo de Venda e Ticket Médio (ganho) de CADA vendedor no
 * período, comparados contra a média do time e contra o top performer, com UMA sugestão
 * específica e determinística por vendedor (nunca um texto de incentivo genérico, nunca gerado
 * por IA). Reaproveita o mesmo carregamento/scoring de `performanceReport.ts`
 * (`loadScoredDeals`/`applyScope`) — nenhuma consulta nova ao repositório, nenhum cálculo de
 * negócio individual novo, só uma agregação por vendedor em cima do que já existe.
 *
 * Ignora `filter.owner` de propósito: comparar vendedores não faz sentido já pré-filtrado a um
 * único vendedor. Os demais filtros (mês, produto, origem, ICP, empresa) continuam se aplicando.
 */

import type {
  CommercialIntelligenceFilter,
  CommercialIntelligenceRepository,
  SellerBenchmarkMetric,
  SellerBenchmarkReport,
  SellerBenchmarkRow,
  SellerBenchmarkSuggestion,
  SellerBenchmarkTeamAverages,
} from '../../domain/CommercialIntelligence';
import { isDealOpen } from '../pipelineEligibility';
import { loadScoredDeals, type ScoredDeal } from '../scoring/dealScoring';
import { applyScope } from '../scoring/scopeFilter';
import { daysBetween, mean, median, roundMoney } from '../shared/mathUtils';
import { monthRange } from '../shared/period';

/**
 * Amostra mínima de negócios FECHADOS (ganhos + perdidos) no período para um vendedor entrar no
 * ranking de Win Rate/top performer e receber uma sugestão comparativa — evita que 1 negócio
 * isolado vire "100% de Win Rate" ou "pior do time". Mesmo espírito de
 * `MIN_SAMPLE_SIZE_FOR_BASELINE` do detector de gargalo.
 */
export const MIN_DEALS_FOR_RANKING = 3;

interface RawSellerStats {
  owner: string;
  winRate: number | null;
  wonCount: number;
  lostCount: number;
  averageTicketWon: number | null;
  salesCycleMedianDays: number | null;
  openCount: number;
  openAmount: number;
}

function metricLabel(metric: SellerBenchmarkMetric): string {
  if (metric === 'winRate') return 'Win Rate';
  if (metric === 'salesCycleMedianDays') return 'Ciclo de venda (mediana)';
  return 'Ticket médio (ganho)';
}

interface MetricSpec {
  key: SellerBenchmarkMetric;
  value: (row: RawSellerStats) => number | null;
  /** `true` quando um valor MAIOR é melhor (Win Rate, Ticket); `false` quando MENOR é melhor (Ciclo de Venda). */
  higherIsBetter: boolean;
  formatGap: (gap: number) => string;
}

const METRIC_SPECS: MetricSpec[] = [
  {
    key: 'winRate',
    value: (r) => r.winRate,
    higherIsBetter: true,
    formatGap: (gap) => `${roundMoney(gap)} p.p.`,
  },
  {
    key: 'salesCycleMedianDays',
    value: (r) => r.salesCycleMedianDays,
    higherIsBetter: false,
    formatGap: (gap) => `${roundMoney(gap)} dia(s)`,
  },
  {
    key: 'averageTicketWon',
    value: (r) => r.averageTicketWon,
    higherIsBetter: true,
    formatGap: (gap) => gap.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  },
];

/**
 * Para um vendedor, escolhe a métrica com a MAIOR lacuna relativa frente ao top performer (entre
 * as métricas onde ele está abaixo da média do time) e gera um texto único e específico — não uma
 * lista de 3 lacunas genéricas.
 */
function buildSuggestion(
  row: RawSellerStats,
  teamAverages: SellerBenchmarkTeamAverages,
  topPerformer: RawSellerStats | null,
): SellerBenchmarkSuggestion | null {
  if (!topPerformer || topPerformer.owner === row.owner) return null;

  type Candidate = SellerBenchmarkSuggestion & { relativeGap: number };
  const candidates: Candidate[] = [];

  for (const spec of METRIC_SPECS) {
    const sellerValue = spec.value(row);
    const teamAverage = teamAverages[spec.key];
    const topValue = spec.value(topPerformer);
    if (sellerValue == null || teamAverage == null || topValue == null) continue;

    const belowTeam = spec.higherIsBetter ? sellerValue < teamAverage : sellerValue > teamAverage;
    if (!belowTeam) continue;

    const gapToTeam = spec.higherIsBetter ? teamAverage - sellerValue : sellerValue - teamAverage;
    const gapToTop = spec.higherIsBetter ? topValue - sellerValue : sellerValue - topValue;
    if (gapToTop <= 0) continue;

    const relativeGap = teamAverage !== 0 ? gapToTeam / Math.abs(teamAverage) : gapToTeam;
    const direction = spec.higherIsBetter ? 'abaixo' : 'acima';
    const text = `${metricLabel(spec.key)} está ${spec.formatGap(gapToTeam)} ${direction} da média do time e ${spec.formatGap(gapToTop)} ${direction} do top performer (${topPerformer.owner}).`;

    candidates.push({
      metric: spec.key,
      label: metricLabel(spec.key),
      sellerValue,
      teamAverage,
      topPerformerValue: topValue,
      text,
      relativeGap,
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.relativeGap - a.relativeGap);
  const { metric, label, sellerValue, teamAverage, topPerformerValue, text } = candidates[0];
  return { metric, label, sellerValue, teamAverage, topPerformerValue, text };
}

export async function buildSellerBenchmark(
  repository: CommercialIntelligenceRepository,
  organizationId: string,
  filter: CommercialIntelligenceFilter,
  now: Date,
): Promise<SellerBenchmarkReport> {
  const { scored } = await loadScoredDeals(repository, organizationId, now);
  const inScope = applyScope(scored, { ...filter, owner: undefined });
  const { start, end } = monthRange(filter.month);

  const byOwner = new Map<string, ScoredDeal[]>();
  for (const s of inScope) {
    if (!s.deal.owner) continue;
    if (!byOwner.has(s.deal.owner)) byOwner.set(s.deal.owner, []);
    byOwner.get(s.deal.owner)?.push(s);
  }

  const rawStats: RawSellerStats[] = [...byOwner.entries()].map(([owner, deals]) => {
    const closedInPeriod = deals.filter(
      (s) =>
        (s.deal.stageIsWon || s.deal.stageIsLost) &&
        s.deal.closedAt &&
        s.deal.closedAt >= start &&
        s.deal.closedAt < end,
    );
    const won = closedInPeriod.filter((s) => s.deal.stageIsWon);
    const lost = closedInPeriod.filter((s) => s.deal.stageIsLost);
    const open = deals.filter((s) => isDealOpen(s.deal));

    const cycleDays = won
      .filter((s) => s.deal.closedAt)
      .map((s) => daysBetween(s.deal.createdAt, s.deal.closedAt as Date))
      .filter((d) => d >= 0);

    return {
      owner,
      winRate:
        won.length + lost.length > 0
          ? roundMoney((won.length / (won.length + lost.length)) * 100)
          : null,
      wonCount: won.length,
      lostCount: lost.length,
      averageTicketWon:
        won.length > 0
          ? roundMoney(won.reduce((sum, s) => sum + s.deal.amount, 0) / won.length)
          : null,
      salesCycleMedianDays: median(cycleDays),
      openCount: open.length,
      openAmount: roundMoney(open.reduce((sum, s) => sum + s.deal.amount, 0)),
    };
  });

  const ranked = rawStats.filter((r) => r.wonCount + r.lostCount >= MIN_DEALS_FOR_RANKING);
  const topPerformer =
    ranked.length > 0
      ? ranked.reduce((best, r) => ((r.winRate ?? -1) > (best.winRate ?? -1) ? r : best), ranked[0])
      : null;

  const teamAverages: SellerBenchmarkTeamAverages = {
    winRate: mean(ranked.map((r) => r.winRate).filter((v): v is number => v != null)),
    salesCycleMedianDays: mean(
      ranked.map((r) => r.salesCycleMedianDays).filter((v): v is number => v != null),
    ),
    averageTicketWon: mean(
      ranked.map((r) => r.averageTicketWon).filter((v): v is number => v != null),
    ),
  };

  const sellers: SellerBenchmarkRow[] = rawStats
    .map((row) => {
      const eligibleForRanking = row.wonCount + row.lostCount >= MIN_DEALS_FOR_RANKING;
      return {
        ...row,
        isTopPerformer: eligibleForRanking && topPerformer?.owner === row.owner,
        suggestion: eligibleForRanking ? buildSuggestion(row, teamAverages, topPerformer) : null,
      };
    })
    .sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1));

  return {
    period: filter.month,
    minDealsForRanking: MIN_DEALS_FOR_RANKING,
    sellers,
    teamAverages,
    topPerformerOwner: topPerformer?.owner ?? null,
  };
}
