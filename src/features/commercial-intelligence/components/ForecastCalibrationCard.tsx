import { AlertTriangle, Gauge } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import {
  type CommercialFilter,
  commercialIntelligenceApi,
  type ForecastCalibrationResult,
  formatCurrency,
} from '../commercialIntelligence.api.js';
import { MetricInfo } from './MetricInfo.js';

const BIAS_LABEL: Record<NonNullable<ForecastCalibrationResult['biasDirection']>, string> = {
  superestimando: 'Historicamente superestimando',
  subestimando: 'Historicamente subestimando',
  neutro: 'Sem viés relevante detectado',
};

/**
 * Forecast auto-calibrado — fecha o loop que `ForecastAccuracyCard` deixa aberto: usa o mesmo erro
 * histórico (previsto vs. realizado) para corrigir o Forecast bruto ATUAL, em vez de só reportar
 * o erro passado. Sem amostra mínima de meses encerrados, mostra o forecast bruto sem esconder
 * nada e explica por que a correção ainda não está disponível — nunca um fator fabricado.
 */
export function ForecastCalibrationCard({ filter }: { filter: CommercialFilter }) {
  const [data, setData] = useState<ForecastCalibrationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    commercialIntelligenceApi
      .forecastCalibration(filter)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filter]);

  if (loading) return <Skeleton className="h-40 rounded-2xl" />;
  if (error)
    return (
      <Card padding="sm">
        <div className="flex items-center gap-2 text-sm text-critical">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {error}
        </div>
      </Card>
    );
  if (!data) return null;

  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-2">
          <Gauge className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">Forecast Auto-calibrado</h3>
            <MetricInfo metricKey="forecast_calibrado" />
          </div>
          <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-ink-2">
            Usa o erro histórico real (Forecast Accuracy) para corrigir o forecast bruto do mês —
            nunca um segundo modelo estatístico, só o viés medido dos meses já encerrados.
          </p>
        </div>
      </div>

      {!data.available ? (
        <p className="mt-4 rounded-xl border border-dashed border-line bg-surface-2/40 p-3 text-xs text-ink-2">
          Histórico insuficiente para calibrar ({data.sampleSize}/{data.minSampleSize} mês(es)
          encerrado(s) com erro conhecido) — exibindo o Forecast bruto (
          {formatCurrency(data.rawForecastAmount, data.currency)}) sem correção.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
              Forecast bruto
            </p>
            <p className="mt-1 text-lg font-black tracking-tight text-ink [font-variant-numeric:tabular-nums]">
              {formatCurrency(data.rawForecastAmount, data.currency)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
              Fator de calibração
            </p>
            <p className="mt-1 text-lg font-black tracking-tight text-ink [font-variant-numeric:tabular-nums]">
              {data.calibrationFactor?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}x
            </p>
            <p className="text-[11px] text-ink-2">
              {data.biasDirection ? BIAS_LABEL[data.biasDirection] : ''}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
              Forecast calibrado
            </p>
            <p className="mt-1 text-lg font-black tracking-tight text-brand-ink [font-variant-numeric:tabular-nums] dark:text-brand">
              {formatCurrency(data.calibratedForecastAmount, data.currency)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-2">
              Gap calibrado até a meta
            </p>
            <p className="mt-1 text-lg font-black tracking-tight text-ink [font-variant-numeric:tabular-nums]">
              {data.goalAmount != null
                ? formatCurrency(data.calibratedGapToGoal, data.currency)
                : 'Sem meta cadastrada'}
            </p>
          </div>
        </div>
      )}
      {data.available && (
        <p className="mt-3 text-[11px] text-ink-2">
          Fator calculado sobre {data.sampleSize} mês(es) encerrado(s), limitado a [{data.minFactor}
          x–{data.maxFactor}x] para não deixar amostra pequena distorcer o forecast.
        </p>
      )}
    </Card>
  );
}
