import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Clock, Target, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { KpiCard } from '../../../components/ui/KpiCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { toast } from '../../../lib/toast';
import {
  mesaTratamentoApi,
  OUTCOME_LABELS,
  type DashboardPeriod,
  type MesaDashboardResponse,
  type LeadOutcome,
} from '../mesaTratamento.api';

const PERIOD_TABS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'all', label: 'Todo o histórico' },
];

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'var(--surface)',
    color: 'var(--ink)',
    borderRadius: '12px',
    border: '1px solid var(--line)',
    fontSize: '12px',
  },
  labelStyle: { color: 'var(--ink)', fontWeight: 700 },
};

const AXIS_PROPS = { fontSize: 11, tickLine: false, axisLine: false, stroke: 'var(--ink-2)' };

const OUTCOME_COLORS = [
  'var(--ok)',
  'var(--brand)',
  'var(--brand-2)',
  'color-mix(in srgb, var(--brand) 55%, var(--critical))',
  'var(--critical)',
  'var(--ink-2)',
];

function outcomeLabel(outcome: string): string {
  return OUTCOME_LABELS[outcome as LeadOutcome] ?? outcome;
}

/**
 * Dashboard de métricas da Mesa de Tratamento — portado do protótipo standalone
 * `acompanhamento-sdr` (js/dashboard-charts.js), mas lendo dados reais persistidos no Postgres
 * (`MesaTratamentoTreatment`/`PomodoroSession`) em vez do histórico em localStorage do protótipo,
 * que não sobrevivia a trocar de dispositivo nem servia pra métrica de time (ver
 * mesaTratamento.dashboard.ts). Não porta o gráfico de "funil por etapa" do protótipo — dado
 * redundante com o que o Comercial Inteligente já mostra, fora do escopo deste dashboard.
 */
export function SdrDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('7d');
  const [data, setData] = useState<MesaDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: DashboardPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mesaTratamentoApi.dashboard(p);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o dashboard.');
      toast.error('Falha ao carregar o dashboard da Mesa de Tratamento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Período do dashboard">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={period === tab.value}
            onClick={() => setPeriod(tab.value)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${
              period === tab.value
                ? 'bg-brand text-white'
                : 'border border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && !data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      )}

      {error && !data && (
        <EmptyState
          title="Não foi possível carregar o dashboard"
          description={error}
          actionLabel="Tentar novamente"
          onAction={() => load(period)}
          icon={<BarChart3 className="w-8 h-8 text-brand" />}
        />
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <KpiCard
              icon={Users}
              label="Leads tratados"
              value={data.kpis.totalTratados}
              tone="brand"
            />
            <KpiCard
              icon={TrendingUp}
              label="Conversão / reunião"
              value={`${data.kpis.taxaConversaoPercent}%`}
              tone="ok"
            />
            <KpiCard
              icon={TrendingDown}
              label="Desqualificação"
              value={`${data.kpis.taxaDesqualificacaoPercent}%`}
              tone="critical"
            />
            <KpiCard
              icon={Clock}
              label="Minutos em foco"
              value={data.kpis.totalFocusMinutes}
              tone="ink"
            />
            <KpiCard
              icon={Target}
              label="Ciclos Pomodoro"
              value={data.kpis.pomodoroCycles}
              tone="gold"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-card border border-line bg-surface p-4 shadow-card">
              <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-ink-2">
                Evolução diária de atividade
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={data.dailyActivity}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 8" />
                    <XAxis dataKey="date" {...AXIS_PROPS} />
                    <YAxis allowDecimals={false} {...AXIS_PROPS} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="tratados"
                      name="Tratados"
                      fill="var(--brand)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="reunioes"
                      name="Reuniões"
                      stroke="var(--ok)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="oportunidades"
                      name="Oportunidades"
                      stroke="var(--brand-2)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-card border border-line bg-surface p-4 shadow-card">
              <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-ink-2">
                Distribuição dos desfechos
              </h3>
              <div className="h-64 w-full">
                {data.outcomeCounts.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-ink-2">
                    Nenhum atendimento registrado ainda neste período.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.outcomeCounts}
                        dataKey="count"
                        nameKey="outcome"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {data.outcomeCounts.map((entry, index) => (
                          <Cell
                            key={entry.outcome}
                            fill={OUTCOME_COLORS[index % OUTCOME_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        {...CHART_TOOLTIP_STYLE}
                        formatter={(value, _name, entry) => [
                          value,
                          outcomeLabel(String(entry?.payload?.outcome ?? '')),
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 10 }}
                        formatter={(value) => outcomeLabel(String(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-card border border-line bg-surface p-4 shadow-card">
            <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-ink-2">
              Dedicação Pomodoro · minutos de foco por dia
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.dailyActivity}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="pomodoroGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--brand)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 8" />
                  <XAxis dataKey="date" {...AXIS_PROPS} />
                  <YAxis allowDecimals={false} {...AXIS_PROPS} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="minutosFoco"
                    name="Minutos de foco"
                    stroke="var(--brand)"
                    fill="url(#pomodoroGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
