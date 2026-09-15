/**
 * Atribuição de receita por canal/origem — TOQUE ÚNICO (item 25, versão reduzida). Ver o comentário
 * de topo de `ChannelAttributionReport` em `domain/CommercialIntelligence.ts`: o pedido original
 * ("de qual canal/campanha realmente veio o fechamento, não só o primeiro toque") é multi-touque,
 * e não há modelo de touchpoint/campanha no schema hoje — ver
 * `.agents/handoffs/analytics-suite/25-para-01-schema-atribuicao-multicanal.md`. Este relatório usa
 * só o dado real que já existe (`Lead.channel`/`Lead.source`, toque único), nunca fabricando uma
 * jornada multi-touque que o produto não rastreia.
 */

import type {
  ChannelAttributionBreakdown,
  ChannelAttributionReport,
  CommercialIntelligenceFilter,
  CommercialIntelligenceRepository,
  DealRow,
} from '../../domain/CommercialIntelligence';
import { loadScoredDeals, type ScoredDeal } from '../scoring/dealScoring';
import { applyScope } from '../scoring/scopeFilter';
import { roundMoney } from '../shared/mathUtils';
import { monthRange } from '../shared/period';

const NOT_INFORMED = 'Não informado';

function buildBreakdown(
  won: ScoredDeal[],
  pick: (deal: DealRow) => string | null,
  totalWonAmount: number,
): ChannelAttributionBreakdown[] {
  const byLabel = new Map<string, { count: number; amount: number }>();
  for (const s of won) {
    const raw = pick(s.deal)?.trim();
    const label = raw ? raw : NOT_INFORMED;
    const entry = byLabel.get(label) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += s.deal.amount;
    byLabel.set(label, entry);
  }

  return [...byLabel.entries()]
    .map(([label, v]) => ({
      label,
      wonCount: v.count,
      wonAmount: roundMoney(v.amount),
      pctOfWonAmount: totalWonAmount > 0 ? roundMoney((v.amount / totalWonAmount) * 100) : null,
      averageTicket: v.count > 0 ? roundMoney(v.amount / v.count) : null,
    }))
    .sort((a, b) => b.wonAmount - a.wonAmount);
}

export async function buildChannelAttribution(
  repository: CommercialIntelligenceRepository,
  organizationId: string,
  filter: CommercialIntelligenceFilter,
  now: Date,
): Promise<ChannelAttributionReport> {
  const { scored } = await loadScoredDeals(repository, organizationId, now);
  const inScope = applyScope(scored, filter);
  const { start, end } = monthRange(filter.month);

  const won = inScope.filter(
    (s) =>
      s.deal.stageIsWon && s.deal.closedAt && s.deal.closedAt >= start && s.deal.closedAt < end,
  );

  const totalWonAmount = roundMoney(won.reduce((sum, s) => sum + s.deal.amount, 0));

  return {
    period: filter.month,
    model: 'toque_unico',
    totalWonAmount,
    totalWonCount: won.length,
    byChannel: buildBreakdown(won, (d) => d.channel, totalWonAmount),
    bySource: buildBreakdown(won, (d) => d.source, totalWonAmount),
  };
}
