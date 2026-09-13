import { motion } from 'framer-motion';
import {
  Activity as ActivityIcon,
  AlertTriangle,
  CheckSquare,
  Clock,
  Handshake,
  KanbanSquare,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Radar,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BentoGrid, BentoMetric } from '../../../components/ui/bento';
import { ClockCalendarWidget } from '../../../components/ui/ClockCalendarWidget';
import { LiveStatsWidget } from '../../../components/ui/LiveStatsWidget';
import { MetricSkeleton } from '../../../components/ui/Skeleton';
import { useAuth } from '../../../contexts/AuthContext';
import { useExperienceMode } from '../../../contexts/ExperienceModeContext';
import { useActivePlaybook } from '../../../hooks/useActivePlaybook';
import { useActivities, useAnalytics, useAnalyticsDashboard } from '../../../hooks/useDatabase';
import { SoundFX } from '../../../lib/soundEffects';
import { GlowChart } from '../../analytics/components/GlowChart';
import { AiGatewayShowcase } from './AiGatewayShowcase';
import { DeferredRevenueSignalOrb } from './DeferredRevenueSignalOrb';
import { RealtimeFeed } from './RealtimeFeed';
import { SellerCoachingCard } from './SellerCoachingCard';
import { TeamRankingWidget } from './TeamRankingWidget';

const TYPE_ICONS: Record<string, React.JSX.Element> = {
  ligação: <Phone className="w-4 h-4" />,
  'e-mail': <Mail className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  reunião: <Users className="w-4 h-4" />,
  visita: <MapPin className="w-4 h-4" />,
  'follow-up': <RefreshCw className="w-4 h-4" />,
  tarefa: <CheckSquare className="w-4 h-4" />,
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function SinglePageDashboard() {
  const navigate = useNavigate();
  const { info: playbookMeta } = useActivePlaybook();
  const { currentUser, isAdmin } = useAuth();

  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useAnalytics();

  const {
    data: dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useAnalyticsDashboard(6);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const {
    activities: todayActivities,
    loading: agendaLoading,
    error: agendaError,
    refetch: refetchAgenda,
  } = useActivities({ from: today, to: tomorrow, limit: 20 });
  const sortedAgenda = [...todayActivities].sort((a, b) =>
    (a.time || '').localeCompare(b.time || ''),
  );

  const todayLabel = new Date()
    .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    .toUpperCase();

  const kpis = [
    {
      label: 'Leads Qualificados',
      value: stats ? stats.totalLeads.toLocaleString('pt-BR') : '—',
      icon: <Radar className="w-5 h-5" />,
      hint: 'base qualificada',
    },
    {
      label: 'Taxa de Conversão',
      value: stats ? `${stats.conversionRate.toFixed(1)}%` : '—',
      icon: <Handshake className="w-5 h-5" />,
      hint: 'eficiência do funil',
    },
    {
      label: 'Atividades Pendentes',
      value: stats ? stats.pendingActivities.toLocaleString('pt-BR') : '—',
      icon: <TrendingUp className="w-5 h-5" />,
      hint: 'pressão operacional',
    },
    {
      label: 'Fechados no Mês',
      value: stats ? stats.closedThisMonth.toLocaleString('pt-BR') : '—',
      icon: <Clock className="w-5 h-5" />,
      hint: 'resultado atual',
    },
  ];

  const { mode, setMode } = useExperienceMode();

  const cycleMode = () => {
    SoundFX.play('focus');
    if (mode === 'STANDARD') setMode('IMMERSIVE');
    else if (mode === 'IMMERSIVE') setMode('REDUCED_MOTION');
    else setMode('STANDARD');
  };

  const goTo = (path: string) => {
    SoundFX.play('navigate');
    navigate(path);
  };

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center overflow-y-auto bg-transparent p-4 font-sans md:p-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className={`absolute left-[18%] top-[-11rem] h-80 w-80 rounded-full blur-[110px] ${'bg-brand/10'}`}
        />
      </div>

      <div className="relative z-[1] w-full max-w-[92rem] space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div data-testid="dashboard-greeting">
            <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink dark:text-brand">
              {todayLabel}
            </p>
            <h1 className="text-xl font-black tracking-tight text-ink md:text-2xl">
              {greeting()}, {currentUser?.name?.split(' ')[0] || 'Usuário'}
            </h1>
            <p className="mt-0.5 text-xs text-ink-2">
              Resumo comercial de hoje · playbook ativo: {playbookMeta.label}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={cycleMode}
              title={`Modo Atual: ${mode}. Clique para alternar.`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line bg-surface text-xs font-semibold text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>
                Modo: <strong className="text-ink">{mode}</strong>
              </span>
            </button>
            <motion.button
              type="button"
              onClick={() => goTo('/app/prospect')}
              whileHover={{ y: -1 }}
              whileTap={{ y: 0, scale: 0.985 }}
              className="group flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand/25 bg-brand-active px-3 py-1.5 text-xs font-bold text-on-brand shadow-[0_10px_24px_-15px_color-mix(in_srgb,var(--brand)_70%,transparent),inset_0_1px_0_rgba(255,255,255,0.18)]"
            >
              <Radar className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-6 group-hover:scale-110" />
              Nova varredura
            </motion.button>
            <motion.button
              type="button"
              onClick={() => goTo('/app/crm')}
              whileHover={{ y: -1 }}
              whileTap={{ y: 0, scale: 0.985 }}
              className="group flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink shadow-card transition-colors hover:border-brand/30 hover:bg-surface-2"
            >
              <KanbanSquare className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
              Abrir pipeline
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,0.8fr)] xl:items-stretch">
          <GlowChart data={dashboard?.monthly ?? []} error={dashboardError} />

          {statsError ? (
            <div className="flex min-h-[16rem] flex-col justify-between rounded-[1.6rem] border border-critical/25 bg-critical/10 p-5 shadow-card">
              <div className="flex items-start gap-3 text-sm text-critical">
                <div className="rounded-xl border border-critical/20 bg-critical/10 p-2.5">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-ink">Métricas indisponíveis</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-2">
                    Não foi possível carregar o Signal Core e os indicadores de operação.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => refetchStats()}
                className="self-start text-xs font-bold text-critical hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : statsLoading || !stats ? (
            <div className="min-h-[16rem] animate-pulse rounded-[1.6rem] border border-line bg-surface-2/60 shadow-card" />
          ) : (
            <DeferredRevenueSignalOrb
              conversionRate={stats.conversionRate}
              pendingActivities={stats.pendingActivities}
              closedThisMonth={stats.closedThisMonth}
            />
          )}
        </div>

        {!statsError && (
          <BentoGrid columns={4} className="grid-cols-2 lg:grid-cols-4">
            {statsLoading || !stats
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <MetricSkeleton key={`metric-skel-${idx}`} />
                ))
              : kpis.map((kpi) => (
                  <BentoMetric
                    key={kpi.label}
                    title={kpi.label}
                    value={kpi.value}
                    icon={kpi.icon}
                    subtitle={kpi.hint}
                    tilt={true}
                  />
                ))}
          </BentoGrid>
        )}

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <RealtimeFeed />

          <div className="rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_24px_55px_-40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.055)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-ink dark:text-brand">
                  Próximos movimentos
                </p>
                <h3 className="mt-1 text-sm font-black text-ink">Agenda de hoje</h3>
              </div>
              <button
                type="button"
                onClick={() => goTo('/app/activities')}
                className="text-xs font-bold text-brand-ink hover:underline dark:text-brand"
              >
                Ver agenda completa
              </button>
            </div>

            {agendaLoading ? (
              <p className="text-sm text-ink-2">Carregando compromissos...</p>
            ) : agendaError ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-sm text-critical">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Não foi possível carregar a agenda de hoje.
                </div>
                <button
                  type="button"
                  onClick={() => refetchAgenda()}
                  className="shrink-0 text-xs font-bold text-critical hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : sortedAgenda.length === 0 ? (
              <p className="text-sm text-ink-2">Nenhum compromisso agendado para hoje.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {sortedAgenda.map((a) => (
                  <div
                    key={a.id}
                    className="group flex items-start gap-3 rounded-xl border border-line bg-surface-2/75 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-card"
                  >
                    <div className="shrink-0 rounded-lg border border-line bg-surface p-2 text-brand shadow-sm transition-transform duration-200 group-hover:scale-105">
                      {TYPE_ICONS[a.type?.toLowerCase()] ?? <ActivityIcon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-ink-2 [font-variant-numeric:tabular-nums]">
                        {a.time || '—'}
                      </p>
                      <p className="truncate text-sm font-bold text-ink">
                        {a.type}
                        {a.owner ? ` · ${a.owner}` : ''}
                      </p>
                      {a.observations && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-ink-2">{a.observations}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <TeamRankingWidget
          byOwner={dashboard?.byOwner ?? []}
          currentUserName={currentUser?.name}
          loading={dashboardLoading}
          error={dashboardError}
          onRetry={refetchDashboard}
        />

        <SellerCoachingCard />

        {isAdmin && <AiGatewayShowcase />}

        <ClockCalendarWidget />

        <LiveStatsWidget />
      </div>
    </div>
  );
}
