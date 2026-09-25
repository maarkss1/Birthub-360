/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- região rolável focável por teclado, mesmo padrão de ForecastAccuracyCard.tsx */

import { AlertTriangle, Waypoints } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import {
  type BottleneckSeverity,
  type CommercialFilter,
  commercialIntelligenceApi,
  formatCurrency,
  type FunnelBottleneckReport,
} from '../commercialIntelligence.api.js';
import { MetricInfo } from './MetricInfo.js';

const SEVERITY_LABEL: Record<BottleneckSeverity, string> = {
  critico: 'Gargalo crítico',
  atencao: 'Atenção',
  normal: 'Normal',
  sem_dados: 'Sem dados suficientes',
};

const SEVERITY_TONE: Record<BottleneckSeverity, string> = {
  critico: 'text-critical',
  atencao: 'text-warn',
  normal: 'text-success-active dark:text-success',
  sem_dados: 'text-ink-2',
};

/**
 * Detecção automática de gargalo de funil — em vez de listar aging por faixa fixa (já coberto na
 * aba Aging), esta comparação aponta ativamente qual etapa está anormalmente lenta frente às
 * demais ("sua etapa de Proposta está 3x mais lenta que o normal"). Etapas sem amostra suficiente
 * aparecem como "sem dados", nunca com um multiplicador fabricado.
 */
export function FunnelBottleneckCard({ filter }: { filter: CommercialFilter }) {
  const [data, setData] = useState<FunnelBottleneckReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    commercialIntelligenceApi
      .funnelBottlenecks(filter)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  if (loading) return <Skeleton className="h-48 rounded-2xl" />;
  if (error)
    return (
      <Card padding="sm">
        <div className="flex items-center gap-2 text-sm text-critical">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {error}
        </div>
      </Card>
    );
  if (!data) return null;

  const critical = data.stages.filter((s) => s.severity === 'critico');

  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-2">
          <Waypoints className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">Gargalo de Funil</h3>
            <MetricInfo metricKey="gargalo_funil" />
          </div>
          <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-ink-2">
            Duração média de cada etapa comparada às demais — crítico a partir de{' '}
            {data.criticalMultiplier}x a duração &ldquo;normal&rdquo;, atenção a partir de{' '}
            {data.warningMultiplier}x.
          </p>
        </div>
      </div>

      {critical.length > 0 && (
        <p className="mt-3 rounded-xl border border-critical/30 bg-critical/10 p-3 text-xs font-semibold text-critical">
          {critical
            .map(
              (s) =>
                `${s.stageName} está ${s.multiplier?.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}x mais lenta que o normal`,
            )
            .join(' · ')}
        </p>
      )}

      <div
        className="mt-4 overflow-x-auto"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: região rolável horizontal precisa ser focável por teclado (axe scrollable-region-focusable, WCAG 2.1.1)
        tabIndex={0}
        role="region"
        aria-label="Tabela de gargalo de funil por etapa (rolável)"
      >
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="border-b border-line text-ink-2">
              <th className="py-1.5 text-left font-semibold">Etapa</th>
              <th className="py-1.5 text-right font-semibold">Duração média</th>
              <th className="py-1.5 text-right font-semibold">Baseline &ldquo;normal&rdquo;</th>
              <th className="py-1.5 text-right font-semibold">Multiplicador</th>
              <th className="py-1.5 text-right font-semibold">Situação</th>
              <th className="py-1.5 text-right font-semibold">Parado agora</th>
            </tr>
          </thead>
          <tbody className="[font-variant-numeric:tabular-nums]">
            {data.stages.map((stage) => (
              <tr key={stage.stageId} className="border-b border-line last:border-0">
                <td className="py-1.5 font-bold text-ink">{stage.stageName}</td>
                <td className="py-1.5 text-right text-ink-2">
                  {stage.averageDaysInStage != null ? `${stage.averageDaysInStage} dia(s)` : '—'}
                </td>
                <td className="py-1.5 text-right text-ink-2">
                  {stage.normalBaselineDays != null ? `${stage.normalBaselineDays} dia(s)` : '—'}
                </td>
                <td className="py-1.5 text-right font-semibold text-ink">
                  {stage.multiplier != null
                    ? `${stage.multiplier.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}x`
                    : '—'}
                </td>
                <td className={`py-1.5 text-right font-semibold ${SEVERITY_TONE[stage.severity]}`}>
                  {SEVERITY_LABEL[stage.severity]}
                </td>
                <td className="py-1.5 text-right text-ink-2">
                  {stage.openCount} · {formatCurrency(stage.openAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
