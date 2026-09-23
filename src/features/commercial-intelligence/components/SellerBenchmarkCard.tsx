/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- região rolável focável por teclado, mesmo padrão de ForecastAccuracyCard.tsx */

import { AlertTriangle, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  type CommercialFilter,
  commercialIntelligenceApi,
  formatCurrency,
  formatPercent,
  type SellerBenchmarkReport,
} from '../commercialIntelligence.api';
import { MetricInfo } from './MetricInfo';

/**
 * Benchmark de vendedor — Win Rate, Ciclo de Venda e Ticket Médio de CADA vendedor comparados
 * contra a média do time e o top performer, com uma sugestão específica (não incentivo genérico)
 * de onde a lacuna é maior. Ignora o filtro de vendedor do topo da tela de propósito — comparar
 * um único vendedor contra si mesmo não faz sentido.
 */
export function SellerBenchmarkCard({ filter }: { filter: CommercialFilter }) {
  const [data, setData] = useState<SellerBenchmarkReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    commercialIntelligenceApi
      .sellerBenchmark(filter)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;
  if (error)
    return (
      <Card padding="sm">
        <div className="flex items-center gap-2 text-sm text-critical">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {error}
        </div>
      </Card>
    );
  if (!data) return null;

  if (data.sellers.length === 0) {
    return (
      <EmptyState
        title="Nenhum vendedor com negócio no período"
        description="O Benchmark de Vendedor precisa de negócios do funil Negócio atribuídos a um responsável no mês selecionado."
      />
    );
  }

  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-2">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">Benchmark do Time</h3>
            <MetricInfo metricKey="benchmark_vendedor" />
          </div>
          <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-ink-2">
            Win Rate, Ciclo de Venda e Ticket Médio de cada vendedor vs. a média do time (
            {data.sellers.filter((s) => s.wonCount + s.lostCount >= data.minDealsForRanking).length}{' '}
            no ranking, mínimo de {data.minDealsForRanking} negócio(s) fechado(s) no mês).
          </p>
        </div>
      </div>

      <div
        className="mt-4 overflow-x-auto"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: região rolável horizontal precisa ser focável por teclado (axe scrollable-region-focusable, WCAG 2.1.1)
        tabIndex={0}
        role="region"
        aria-label="Tabela de benchmark de vendedores (rolável)"
      >
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b border-line text-ink-2">
              <th className="py-1.5 text-left font-semibold">Vendedor</th>
              <th className="py-1.5 text-right font-semibold">Win Rate</th>
              <th className="py-1.5 text-right font-semibold">Ciclo (mediana)</th>
              <th className="py-1.5 text-right font-semibold">Ticket médio (ganho)</th>
              <th className="py-1.5 text-right font-semibold">Aberto</th>
              <th className="py-1.5 text-left font-semibold">Sugestão</th>
            </tr>
          </thead>
          <tbody className="[font-variant-numeric:tabular-nums]">
            {data.sellers.map((seller) => (
              <tr key={seller.owner} className="border-b border-line last:border-0 align-top">
                <td className="py-1.5 font-bold text-ink">
                  <span className="inline-flex items-center gap-1.5">
                    {seller.owner}
                    {seller.isTopPerformer && (
                      <span className="rounded-full border border-brand/30 bg-brand/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-brand-ink dark:text-brand">
                        Top performer
                      </span>
                    )}
                  </span>
                  <p className="mt-0.5 font-normal text-[10px] text-ink-2">
                    {seller.wonCount} ganho(s) / {seller.lostCount} perdido(s)
                  </p>
                </td>
                <td className="py-1.5 text-right text-ink-2">{formatPercent(seller.winRate)}</td>
                <td className="py-1.5 text-right text-ink-2">
                  {seller.salesCycleMedianDays != null
                    ? `${seller.salesCycleMedianDays} dia(s)`
                    : 'Não disponível'}
                </td>
                <td className="py-1.5 text-right text-ink-2">
                  {formatCurrency(seller.averageTicketWon)}
                </td>
                <td className="py-1.5 text-right text-ink-2">
                  {seller.openCount} · {formatCurrency(seller.openAmount)}
                </td>
                <td className="py-1.5 max-w-[240px] text-left text-[11px] leading-relaxed text-ink-2">
                  {seller.suggestion
                    ? seller.suggestion.text
                    : seller.wonCount + seller.lostCount < data.minDealsForRanking
                      ? 'Amostra insuficiente para comparar.'
                      : 'Sem lacuna relevante frente ao time.'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
