import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Flame,
  LayoutTemplate,
  LineChart,
  Radar,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useAuth } from '../../../contexts/AuthContext';
import { useAnalyticsDashboard } from '../../../hooks/useDatabase';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function SinglePageDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { data: stats, loading } = useAnalyticsDashboard(6);

  const overview = stats?.overview;
  const pipelineValue = overview?.pipelineValue ?? 0;
  const totalLeads = overview?.totalLeads ?? 0;
  const winRate =
    overview?.conversionRate != null ? Number(overview.conversionRate).toFixed(1) : '0.0';
  const firstName = currentUser?.name?.trim().split(/\s+/)[0] || 'Gestor';
  const pendingActivities = overview?.pendingActivities ?? 0;
  const closedThisMonth = overview?.closedThisMonth ?? 0;
  const totalCompanies = overview?.totalCompanies ?? 0;

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-bg">
        <div className="max-w-[92rem] mx-auto p-6 sm:p-8 lg:p-12 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-6 w-48 rounded-full" />
            <Skeleton className="h-10 w-96 rounded-xl" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="lg:col-span-2 h-[320px] rounded-3xl" />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-[152px] rounded-3xl" />
              <Skeleton className="h-[152px] rounded-3xl" />
            </div>
            <Skeleton className="lg:col-span-3 h-48 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      {/* Container principal com respiro generoso (padding 48px / gap 16px) */}
      <div className="max-w-[92rem] mx-auto p-6 sm:p-8 lg:p-12 space-y-6">
        {/* HEADER ÂNCORA EXECUTIVO — Tipografia Serifada, Sem Gradiente em Texto */}
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand/10 text-brand-ink dark:text-brand border border-brand/20">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              Strategic Command Center
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-surface-2 text-ink-2 border border-line">
              <Activity className="w-3 h-3 text-ok" />
              Operação em Tempo Real
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-ink">
                {greeting()}, {firstName}.
              </h1>
              <p className="text-sm sm:text-base text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
                Visão executiva consolidada da sua operação comercial. Pipeline em alta e
                inteligência ativa para fechamento.
              </p>
            </div>

            {/* Ações Rápidas de Topo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/app/prospect')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-interactive text-ink border border-line text-xs font-semibold transition-all hover:shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <Search className="w-4 h-4 text-ink-2" />
                <span>Prospecção</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/app/crm')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-2 text-on-brand text-xs font-bold transition-all shadow-sm shadow-brand/15 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Novo Negócio</span>
              </button>
            </div>
          </div>
        </header>

        {/* BENTO GRID (GAP 16px / 1rem) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* TILE 1: HERO DO PIPELINE (DESTAQUE / 2 COLUNAS) — Gradiente Diagonal Ink→Íris no Fundo */}
          <section
            aria-label="Pipeline de Vendas em Destaque"
            className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B132B] via-[#121B38] to-[#2E1065] text-white p-7 sm:p-9 border border-white/10 flex flex-col justify-between shadow-xl min-h-[320px]"
          >
            {/* Halos e profundidade de marca em marca d'água */}
            <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-red-violet/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 -top-12 w-64 h-64 bg-brand/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-sunset/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                  <LayoutTemplate className="w-3.5 h-3.5 text-gold" />
                  Pipeline de Vendas · Total Consolidado
                </span>
                {totalLeads > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    <Flame className="w-3.5 h-3.5" />
                    Operação Ativa
                  </span>
                )}
              </div>

              <div>
                <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight [font-variant-numeric:tabular-nums]">
                  {pipelineValue > 0
                    ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        maximumFractionDigits: 0,
                      }).format(pipelineValue)
                    : 'R$ 0'}
                </p>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">
                  {totalLeads > 0
                    ? `${totalLeads} oportunidades ativas no funil comercial.`
                    : 'Nenhum negócio ativo registrado no momento.'}
                </p>
              </div>
            </div>

            <div className="relative z-10 pt-6 mt-6 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold">Status Operacional</span>
                <span className="font-bold text-gold">
                  {totalLeads > 0
                    ? `${totalLeads} oportunidades sob gestão`
                    : 'Aguardando novos leads'}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {pendingActivities > 0
                    ? `${pendingActivities} atividades com follow-up programado.`
                    : 'Mantenha o funil aquecido para maximizar conversões.'}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(totalLeads > 0 ? '/app/crm' : '/app/prospect')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-gold transition-colors cursor-pointer group"
                >
                  <span>{totalLeads > 0 ? 'Ver Pipeline Completo' : 'Iniciar Prospecção'}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </section>

          {/* COLUNA LATERAL COM 2 TILES EMPILHADOS (GAP 16px) */}
          <div className="flex flex-col gap-4">
            {/* TILE EMPILHADO 1: LEADS QUALIFICADOS */}
            <section
              aria-label="Volume de Leads"
              className="flex-1 rounded-3xl bg-surface border border-line p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand/8 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-2">
                    Leads Ativos no Funil
                  </span>
                  <span className="p-2 rounded-xl bg-brand/10 text-brand-ink dark:text-brand border border-brand/20">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-ink tracking-tight [font-variant-numeric:tabular-nums]">
                  {totalLeads}
                </p>
                <p className="text-xs font-semibold text-ok mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{totalLeads > 0 ? 'Leads monitorados no funil' : 'Sem leads ativos'}</span>
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-line flex items-center justify-between">
                <span className="text-[11px] text-ink-2 font-medium">
                  {pendingActivities > 0
                    ? `${pendingActivities} atividades pendentes`
                    : 'Sem pendências'}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/app/prospect')}
                  className="text-xs font-bold text-brand-ink dark:text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Prospecção</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </section>

            {/* TILE EMPILHADO 2: TAXA DE CONVERSÃO / WIN RATE */}
            <section
              aria-label="Taxa de Conversão"
              className="flex-1 rounded-3xl bg-surface border border-line p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-violet/8 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-2">
                    Taxa de Conversão (Win Rate)
                  </span>
                  <span className="p-2 rounded-xl bg-red-violet/10 text-red-violet border border-red-violet/20">
                    <Radar className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-ink tracking-tight [font-variant-numeric:tabular-nums]">
                  {winRate}%
                </p>
                <p className="text-xs font-semibold text-ink-2 mt-2 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-brand" />
                  <span>
                    {closedThisMonth > 0
                      ? `${closedThisMonth} fechamento(s) no período`
                      : 'Métrica calculada'}
                  </span>
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-line flex items-center justify-between">
                <span className="text-[11px] text-ink-2 font-medium">
                  {totalCompanies > 0 ? `${totalCompanies} empresas na base` : 'Base inicial'}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/app/analytics')}
                  className="text-xs font-bold text-red-violet-active hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Analytics</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </section>
          </div>

          {/* TILE 4: COPILOTO IA — Gradiente Suave Dourado→Violeta na Superfície */}
          <section
            aria-label="Copiloto de IA e Inteligência Ativa"
            className="lg:col-span-3 rounded-3xl bg-gradient-to-br from-brand/8 via-surface to-red-violet/8 border border-brand/20 dark:border-brand/30 p-7 sm:p-8 shadow-sm relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 w-72 h-72 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-brand/15 text-brand-ink dark:text-brand border border-brand/25">
                    <BrainCircuit className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-ink dark:text-brand">
                    Copiloto IA · Inteligência Estratégica
                  </span>
                </div>

                <h3 className="font-serif text-xl sm:text-2xl font-medium text-ink tracking-tight">
                  {totalLeads > 0
                    ? `Operação ativa com ${totalLeads} oportunidades sob monitoramento.`
                    : 'Command Center preparado para operar.'}
                </h3>

                <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                  {totalLeads > 0
                    ? `Inteligência estratégica conectada ao CRM. ${
                        pendingActivities > 0
                          ? `Há ${pendingActivities} atividades operacionais que requerem follow-up.`
                          : 'Mantenha cadências ativas para acelerar o fechamento de propostas.'
                      }`
                    : 'Inicie a prospecção de novos clientes ou cadastre negócios no CRM para receber diagnósticos, objeções mapeadas e sugestões de abordagem automáticas.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/app/commercial_intelligence')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-interactive text-ink border border-line text-xs font-semibold transition-all hover:shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <LineChart className="w-4 h-4 text-brand" />
                  <span>Ver Dossiê Completo</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(totalLeads > 0 ? '/app/crm' : '/app/prospect')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-2 text-on-brand text-xs font-bold transition-all shadow-sm shadow-brand/15 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>{totalLeads > 0 ? 'Agir nos Deals' : 'Prospectar Agora'}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
