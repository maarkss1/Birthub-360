import { motion } from 'framer-motion';
import { AlertTriangle, BarChart3, Download, Flame, Loader2, RefreshCw, Table2, TrendingUp, TrendingDown } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BarChart, LineChart } from '../../../components/charts';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import {
  type AnalyticsDashboard,
  analyticsApi,
  formatMonthLabel,
  PERIOD_OPTIONS,
} from '../analytics.api';
import { CohortAnalysis } from './CohortAnalysis';
import {
  AgentPerformanceWidget,
  HeatmapWidget,
  LostReasonsWidget,
  TmqTile,
} from './DashboardExtensions';

function DecisionInstrument({
  label,
  value,
  previousValue,
  hint,
  tone,
  target,
}: {
  label: string;
  value: string;
  previousValue?: string;
  hint?: string;
  tone?: 'good' | 'critical' | 'neutral';
  target?: string;
}) {
  const toneClass =
    tone === 'good'
      ? 'text-success-active dark:text-success'
      : tone === 'critical'
        ? 'text-critical'
        : 'text-ink';
  
  const trend = previousValue && (
    <div className="flex items-center gap-1 text-[10px] font-semibold">
      {tone === 'good' ? (
        <>
          <TrendingUp className="w-3 h-3" />
          <span className="text-success-active">Tendência positiva</span>
        </>
      ) : tone === 'critical' ? (
        <>
          <TrendingDown className="w-3 h-3" />
          <span className="text-critical">Atenção necessária</span>
        </>
      ) : (
        <span className="text-ink-2/60">Estável</span>
      )}
    </div>
  );

  return (
    <Card variant="stat" padding="sm" className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-brand/5 rounded-bl-full pointer-events-none" />
      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-2/70">{label}</p>
        <p className={`text-2xl lg:text-3xl font-black mt-1 ${toneClass}`}>{value}</p>
        {target && (
          <p className="text-[10px] text-ink-2/60 mt-0.5">Meta: {target}</p>
        )}
        {trend && <div className="mt-1">{trend}</div>}
        {hint && <p className="text-[10px] text-ink-2/60 mt-1">{hint}</p>}
      </div>
    </Card>
  );
}

/** Tabela-gêmea de um gráfico: garante que nenhum valor dependa só de cor ou de tooltip. */
function TableTwin({
  open,
  rows,
  headers,
}: {
  open: boolean;
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  if (!open) return null;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-ink-2 border-b border-line">
            {headers.map((h) => (
              <th key={h} className="text-left font-semibold py-1.5 pr-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-ink-2 [font-variant-numeric:tabular-nums]">
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line">
              {row.map((cell, j) => (
                <td key={j} className="py-1.5 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DecisionInstrumentCard({
  title,
  subtitle,
  insight,
  children,
  tableHeaders,
  tableRows,
  className,
}: {
  title: string;
  subtitle?: string;
  insight?: string;
  children: React.ReactNode;
  tableHeaders: string[];
  tableRows: Array<Array<string | number>>;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Card padding="sm" className={className}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-2/70">{subtitle}</p>}
          {insight && (
            <div className="mt-2 p-2 rounded-lg bg-red-violet/5 border border-red-violet/10">
              <p className="text-[10px] text-red-violet font-medium flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {insight}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          title="Ver como tabela"
          className="p-1.5 rounded-lg text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors shrink-0"
        >
          <Table2 className="w-4 h-4" />
        </button>
      </div>
      {children}
      <TableTwin open={showTable} headers={tableHeaders} rows={tableRows} />
    </Card>
  );
}

export function Analytics() {
  const [months, setMonths] = useState<number>(6);
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (period: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await analyticsApi.dashboard(period));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(months);
  }, [load, months]);

  const monthlyData = (data?.monthly ?? []).map((p) => ({
    ...p,
    label: formatMonthLabel(p.month),
  }));

  return (
    <div className="flex-1 overflow-y-auto bg-transparent">
      <div className="bh-page bh-page-stack max-w-7xl">
        {/* Cabeçalho + filtro único acima de tudo que ele afeta */}
        <PageHeader
          title="Analytics Avançado"
          subtitle="Instrumentos de decisão para operação comercial"
          icon={<BarChart3 className="h-5 w-5" />}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => window.print()}
                title="Exportar para PDF"
                className="hidden md:flex gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Exportar PDF</span>
              </Button>
              {/* Toolbar de botões toggle (não campos de formulário) — <fieldset> não traria ganho
                real de acessibilidade aqui, só estilo. */}
              {/* biome-ignore lint/a11y/useSemanticElements: ver comentário acima */}
              <div
                className="flex items-center rounded-xl border border-line overflow-hidden"
                role="group"
                aria-label="Período"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() => setMonths(option)}
                    aria-pressed={months === option}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      months === option
                        ? 'bg-brand-active text-on-brand'
                        : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                    }`}
                  >
                    {option}m
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => void load(months)}
                disabled={loading}
                aria-label="Atualizar métricas"
                title="Atualizar métricas"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </>
          }
        />

        {error && (
          <Card padding="lg" className="text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-400" />
            <p className="text-sm text-ink-2 mb-4">{error}</p>
            <Button variant="outline" onClick={() => void load(months)}>
              Tentar novamente
            </Button>
          </Card>
        )}

        {!data && loading && !error && (
          <Card padding="lg" className="text-center text-ink-2 text-sm">
            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" /> Carregando métricas…
          </Card>
        )}

        {data?.isEmpty && !loading && !error && (
          <Card padding="lg" className="text-center border-dashed">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-ink-2" />
            <h3 className="text-lg font-semibold text-ink mb-1">
              Ainda não há dados para analisar
            </h3>
            <p className="text-sm text-ink-2 max-w-md mx-auto">
              Assim que a operação registrar empresas, leads e atividades, os indicadores aparecem
              aqui.
            </p>
          </Card>
        )}

        {data && !data.isEmpty && (
          /* Mantém o render anterior a 60% durante o refetch em vez de piscar esqueleto. */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: loading ? 0.6 : 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Decision Instruments - Top Level KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <DecisionInstrument 
                label="Leads em aberto" 
                value={String(data.overview.totalLeads)}
                hint="Volume atual do pipeline"
              />
              <DecisionInstrument
                label="Taxa de Conversão"
                value={`${data.overview.conversionRate.toFixed(1)}%`}
                hint="Ganhos sobre total criado"
                tone={data.overview.conversionRate >= 20 ? 'good' : data.overview.conversionRate < 10 ? 'critical' : 'neutral'}
                target="≥20%"
              />
              <DecisionInstrument
                label="Ganhos no mês"
                value={String(data.overview.closedThisMonth)}
                tone="good"
                hint="Negócios fechados"
              />
              <DecisionInstrument
                label="Perdidos no mês"
                value={String(data.overview.lostThisMonth)}
                tone={data.overview.lostThisMonth > 0 ? 'critical' : 'neutral'}
                hint="Oportunidades perdidas"
              />
              <DecisionInstrument
                label="Atividades atrasadas"
                value={String(data.overview.overdueActivities)}
                hint={`${data.overview.pendingActivities} pendentes no total`}
                tone={data.overview.overdueActivities > 0 ? 'critical' : 'good'}
              />
              <DecisionInstrument
                label="TMQ (dias)"
                value={data.tmqMetric != null ? data.tmqMetric.toFixed(1) : '—'}
                hint="Tempo médio para qualificar"
                tone={
                  data.tmqMetric != null && data.tmqMetric <= 3
                    ? 'good'
                    : data.tmqMetric != null && data.tmqMetric > 7
                      ? 'critical'
                      : 'neutral'
                }
                target="≤3 dias"
              />
            </div>

            {/* Funil Comercial - Decision Instrument */}
            <DecisionInstrumentCard
              title="Funil Comercial"
              subtitle="Análise de conversão por etapa"
              insight="Identificar gargalos de conversão em cada etapa do processo"
              tableHeaders={['Etapa', 'Leads', 'Conversão da etapa anterior']}
              tableRows={data.funnel.map((s) => [
                s.label,
                s.count,
                s.conversionFromPrevious == null ? '—' : `${s.conversionFromPrevious.toFixed(1)}%`,
              ])}
            >
              <BarChart
                horizontal={true}
                height={260}
                data={{
                  categories: data.funnel.map((s) => s.label),
                  series: [
                    {
                      name: 'Leads',
                      data: data.funnel.map((s) => s.count),
                    },
                  ],
                }}
              />
            </DecisionInstrumentCard>

            {/* Evolução Mensal - Decision Instrument */}
            <DecisionInstrumentCard
              title="Evolução Mensal"
              subtitle="Tendência de criação, fechamento e perda"
              insight="Monitorar consistência de performance ao longo do tempo"
              tableHeaders={['Mês', 'Criados', 'Ganhos', 'Perdidos']}
              tableRows={monthlyData.map((p) => [p.label, p.created, p.won, p.lost])}
            >
              <LineChart
                height={260}
                data={{
                  categories: monthlyData.map((d) => d.label),
                  series: [
                    { name: 'Criados', data: monthlyData.map((d) => d.created) },
                    { name: 'Ganhos', data: monthlyData.map((d) => d.won) },
                    { name: 'Perdidos', data: monthlyData.map((d) => d.lost) },
                  ],
                }}
              />
            </DecisionInstrumentCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Decision Instruments - Activity Analysis */}
              <DecisionInstrumentCard
                title="Atividades por Tipo"
                insight="Identificar tipos de atividades mais produtivos"
                tableHeaders={['Tipo', 'Quantidade']}
                tableRows={data.activitiesByType.map((s) => [s.label, s.count])}
              >
                <BarChart
                  height={220}
                  data={{
                    categories: data.activitiesByType.map((s) => s.label),
                    series: [
                      {
                        name: 'Atividades',
                        data: data.activitiesByType.map((s) => s.count),
                      },
                    ],
                  }}
                />
              </DecisionInstrumentCard>

              <DecisionInstrumentCard
                title="Atividades por Status"
                insight="Monitorar eficiência de execução de atividades"
                tableHeaders={['Status', 'Quantidade']}
                tableRows={data.activitiesByStatus.map((s) => [s.label, s.count])}
              >
                <BarChart
                  height={220}
                  data={{
                    categories: data.activitiesByStatus.map((s) => s.label),
                    series: [
                      {
                        name: 'Atividades',
                        data: data.activitiesByStatus.map((s) => s.count),
                      },
                    ],
                  }}
                />
              </DecisionInstrumentCard>

              <DecisionInstrumentCard
                title="Ranking por Responsável"
                subtitle="Top 10 por volume de leads"
                insight="Identificar performers e oportunidades de coaching"
                tableHeaders={['Responsável', 'Leads', 'Ganhos']}
                tableRows={data.byOwner.map((o) => [o.label, o.count, o.won])}
              >
                <BarChart
                  horizontal={true}
                  height={220}
                  data={{
                    categories: data.byOwner.map((s) => s.label),
                    series: [
                      {
                        name: 'Leads',
                        data: data.byOwner.map((s) => s.count),
                      },
                    ],
                  }}
                />
              </DecisionInstrumentCard>

              <DecisionInstrumentCard
                title="Temperatura dos Leads"
                insight="Qualificar leads quentes vs frios para priorização"
                tableHeaders={['Temperatura', 'Leads']}
                tableRows={data.byTemperature.map((s) => [s.label, s.count])}
              >
                <BarChart
                  height={200}
                  data={{
                    categories: data.byTemperature.map((s) => s.label),
                    series: [
                      {
                        name: 'Leads',
                        data: data.byTemperature.map((s) => s.count),
                      },
                    ],
                  }}
                />
              </DecisionInstrumentCard>

              <DecisionInstrumentCard
                title="Origem dos Leads"
                insight="Avaliar qualidade de canais de aquisição"
                tableHeaders={['Origem', 'Leads']}
                tableRows={data.bySource.map((s) => [s.label, s.count])}
              >
                <BarChart
                  horizontal={true}
                  height={200}
                  data={{
                    categories: data.bySource.map((s) => s.label),
                    series: [
                      {
                        name: 'Leads',
                        data: data.bySource.map((s) => s.count),
                      },
                    ],
                  }}
                />
              </DecisionInstrumentCard>
            </div>

            {/* ── Decision Instruments de Segunda Camada ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Heatmap de Ligações — Decision Instrument */}
              <DecisionInstrumentCard
                title="🔥 Mapa de Calor — Melhor Horário para Ligar"
                insight="Otimizar horários de contato para máxima resposta"
                className="lg:col-span-2"
                tableHeaders={['Dia', 'Hora', 'Ligações']}
                tableRows={data.callHeatmap
                  .filter((c) => c.count > 0)
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.hour - b.hour)
                  .map((c) => [
                    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][c.dayOfWeek] ?? '—',
                    `${c.hour}h`,
                    c.count,
                  ])}
              >
                <HeatmapWidget data={data.callHeatmap} />
              </DecisionInstrumentCard>

              {/* TMQ - Decision Instrument */}
              <Card padding="sm" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-brand/5 rounded-bl-full pointer-events-none" />
                <h3 className="text-sm font-bold text-ink mb-1">⏱ Tempo Médio de Qualificação</h3>
                <p className="text-[10px] text-ink-2/70 mb-3">
                  Do lead recebido até a primeira qualificação
                </p>
                <TmqTile value={data.tmqMetric} />
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance IA vs Humanos - Decision Instrument */}
              <Card padding="sm" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-red-violet/5 rounded-bl-full pointer-events-none" />
                <h3 className="text-sm font-bold text-ink mb-1">🤖 Performance: IA vs Humanos</h3>
                <p className="text-[10px] text-ink-2/70 mb-3">
                  Leads qualificados por responsável no período
                </p>
                <AgentPerformanceWidget data={data.performanceReport} />
              </Card>

              {/* Motivos de Perda - Decision Instrument */}
              <Card padding="sm" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-critical/5 rounded-bl-full pointer-events-none" />
                <h3 className="text-sm font-bold text-ink mb-1">📉 Principais Motivos de Perda</h3>
                <p className="text-[10px] text-ink-2/70 mb-3">
                  Leads desqualificados/perdidos por motivo
                </p>
                <LostReasonsWidget data={data.lostReasons} />
              </Card>
            </div>

            <CohortAnalysis />
          </motion.div>
        )}
      </div>
    </div>
  );
}
