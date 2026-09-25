import { AlertTriangle, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import {
  type CommercialFilter,
  commercialIntelligenceApi,
  formatCurrency,
  formatPercent,
  type HiringScenarioResult,
} from '../commercialIntelligence.api.js';
import { MetricInfo } from './MetricInfo.js';

const REASON_LABEL: Record<NonNullable<HiringScenarioResult['reason']>, string> = {
  numero_de_reps_invalido: 'Informe um número de vendedores maior que zero.',
  sem_dados_de_pipeline_por_vendedor:
    'Nenhum vendedor criou pipeline no período de referência — sem taxa real para extrapolar.',
};

/**
 * Simulação de cenário — "se eu contratar +N vendedores, qual o impacto em 90 dias?". Extrapola o
 * throughput (Pipeline Criado por vendedor) e a conversão (Win Rate/Sales Cycle) que o TIME JÁ
 * demonstra no período filtrado — nunca um benchmark de mercado genérico. Sem taxa real de
 * referência, explica por que a simulação ainda não está disponível.
 */
export function HiringScenarioCard({ filter }: { filter: CommercialFilter }) {
  const [additionalReps, setAdditionalReps] = useState(2);
  const [data, setData] = useState<HiringScenarioResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    commercialIntelligenceApi
      .hiringScenario(filter, additionalReps)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filter, additionalReps]);

  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-2">
          <UserPlus className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">Simulação de Contratação</h3>
            <MetricInfo metricKey="simulacao_contratacao" />
          </div>
          <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-ink-2">
            Impacto em pipeline e receita em 90 dias, extrapolando o throughput e a conversão que
            este time já demonstra no período selecionado — não um benchmark de mercado.
          </p>
        </div>
        <div className="shrink-0">
          <label
            htmlFor="hiring-scenario-reps"
            className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-2"
          >
            Vendedores adicionais
          </label>
          <input
            id="hiring-scenario-reps"
            type="number"
            min={1}
            max={50}
            value={additionalReps}
            onChange={(e) => setAdditionalReps(Number(e.target.value))}
            className="mt-1 w-20 rounded-xl border border-line bg-surface-2/75 px-3 py-1.5 text-sm font-bold text-ink [font-variant-numeric:tabular-nums] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-20 rounded-xl" />
      ) : error ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-critical">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {error}
        </div>
      ) : !data ? null : !data.available ? (
        <p className="mt-4 rounded-xl border border-dashed border-line bg-surface-2/40 p-3 text-xs text-ink-2">
          {REASON_LABEL[data.reason ?? 'sem_dados_de_pipeline_por_vendedor']}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
                Taxa atual/vendedor
              </p>
              <p className="mt-1 text-lg font-black tracking-tight text-ink [font-variant-numeric:tabular-nums]">
                {formatCurrency(data.avgPipelineAmountPerRepPerMonth)}/mês
              </p>
              <p className="text-[11px] text-ink-2">
                {data.activeRepsInPeriod} vendedor(es) ativo(s)
              </p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
                Pipeline adicional (90d)
              </p>
              <p className="mt-1 text-lg font-black tracking-tight text-ink [font-variant-numeric:tabular-nums]">
                {formatCurrency(data.incrementalPipelineAmount)}
              </p>
              <p className="text-[11px] text-ink-2">
                Descontados {data.rampUpDays} dia(s) de onboarding
              </p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
                Win Rate usado
              </p>
              <p className="mt-1 text-lg font-black tracking-tight text-ink [font-variant-numeric:tabular-nums]">
                {formatPercent(data.winRatePct)}
              </p>
              <p className="text-[11px] text-ink-2">
                Ciclo mediano:{' '}
                {data.salesCycleMedianDays != null
                  ? `${data.salesCycleMedianDays} dia(s)`
                  : 'não disponível'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
                Receita estimada (90d)
              </p>
              <p className="mt-1 text-lg font-black tracking-tight text-brand-ink [font-variant-numeric:tabular-nums] dark:text-brand">
                {formatCurrency(data.estimatedIncrementalRevenue)}
              </p>
            </div>
          </div>
          {data.cycleExceedsWindow && (
            <p className="mt-3 rounded-xl border border-warn/30 bg-warn/10 p-3 text-xs font-semibold text-warn">
              O Ciclo de Venda mediano ({data.salesCycleMedianDays} dia(s)) é maior que os dias
              produtivos restantes na janela de 90 dias — parte dessa receita estimada só deve
              materializar depois do 90º dia.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
