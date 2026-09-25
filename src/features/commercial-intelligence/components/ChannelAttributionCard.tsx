import { AlertTriangle, Radar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import {
  type ChannelAttributionBreakdown,
  type ChannelAttributionReport,
  type CommercialFilter,
  commercialIntelligenceApi,
  formatCurrency,
  formatPercent,
} from '../commercialIntelligence.api.js';
import { MetricInfo } from './MetricInfo.js';

function BreakdownList({
  rows,
  maxAmount,
}: {
  rows: ChannelAttributionBreakdown[];
  maxAmount: number;
}) {
  if (rows.length === 0) return <p className="text-xs text-ink-2">Sem negócio ganho no período.</p>;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <div className="w-28 shrink-0 truncate text-xs font-semibold text-ink" title={row.label}>
            {row.label}
          </div>
          <div className="h-6 flex-1 overflow-hidden rounded-md bg-surface-2">
            <div
              className="h-full rounded-md bg-brand/70"
              style={{
                width: `${maxAmount > 0 ? Math.max(4, (row.wonAmount / maxAmount) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="w-12 shrink-0 text-right text-xs text-ink [font-variant-numeric:tabular-nums]">
            {formatPercent(row.pctOfWonAmount)}
          </div>
          <div className="w-24 shrink-0 text-right text-[11px] text-ink-2 [font-variant-numeric:tabular-nums]">
            {formatCurrency(row.wonAmount)}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Atribuição de receita (item 25) — versão de TOQUE ÚNICO, rotulada explicitamente como tal. O
 * pedido original é multi-touque; sem modelo de campanha/touchpoint no schema hoje (ver handoff
 * bloqueado), esta é a versão honesta possível com `Lead.channel`/`Lead.source` real.
 */
export function ChannelAttributionCard({ filter }: { filter: CommercialFilter }) {
  const [data, setData] = useState<ChannelAttributionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    commercialIntelligenceApi
      .channelAttribution(filter)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  if (loading) return <Skeleton className="h-56 rounded-2xl" />;
  if (error)
    return (
      <Card padding="sm">
        <div className="flex items-center gap-2 text-sm text-critical">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {error}
        </div>
      </Card>
    );
  if (!data) return null;

  const maxChannel = Math.max(1, ...data.byChannel.map((r) => r.wonAmount));
  const maxSource = Math.max(1, ...data.bySource.map((r) => r.wonAmount));

  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-2">
          <Radar className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">Atribuição de Receita</h3>
            <span className="rounded-full border border-line bg-surface-2/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-ink-2">
              Toque único
            </span>
            <MetricInfo metricKey="atribuicao_canal" />
          </div>
          <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-ink-2">
            {formatCurrency(data.totalWonAmount)} ganhos no período ({data.totalWonCount}{' '}
            negócio(s)), por canal e origem — não multi-touque: este produto não rastreia múltiplos
            pontos de contato antes do fechamento hoje.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-bold text-ink">Por canal</h4>
          <BreakdownList rows={data.byChannel} maxAmount={maxChannel} />
        </div>
        <div>
          <h4 className="mb-2 text-xs font-bold text-ink">Por origem</h4>
          <BreakdownList rows={data.bySource} maxAmount={maxSource} />
        </div>
      </div>
    </Card>
  );
}
