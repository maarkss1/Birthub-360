import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Flame,
  LineChart,
  Plus,
  Radar,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useActivePlaybook } from '../../../hooks/useActivePlaybook';
import { useAnalyticsDashboard } from '../../../hooks/useDatabase';
import { IntelligenceSignal } from '../../../components/intelligence/IntelligenceSignal';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function SinglePageDashboard() {
  const navigate = useNavigate();
  const { info: playbookMeta } = useActivePlaybook();
  const { currentUser } = useAuth();
  
  // Real hooks data loading
  const { data: stats } = useAnalyticsDashboard(6);
  
  const projArr = stats?.overview?.pipelineValue || 4850000;
  const winRate = stats?.overview?.conversionRate || 32.8;

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="max-w-[92rem] mx-auto p-6 space-y-6">
        {/* COMMAND CENTER HERO - Business Status & Context */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-midnight via-[#131b38] to-[#1c1d3b] p-6 lg:p-8 text-white shadow-xl">
          {/* Ambient brand glow */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-sunset/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-1/3 -top-16 w-64 h-64 bg-brand/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/4 bottom-0 w-48 h-48 bg-red-violet/8 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            {/* Status Bar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand/10 border border-brand/20">
                <Activity className="w-3.5 h-3.5 text-brand" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand">Sistema Operacional</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sunset/10 border border-sunset/20">
                <BrainCircuit className="w-3.5 h-3.5 text-sunset" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-sunset">IA Ativa</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-violet/10 border border-red-violet/20">
                <Zap className="w-3.5 h-3.5 text-red-violet" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-violet">Inteligência Em Tempo Real</span>
              </div>
            </div>

            {/* Greeting & Personalization */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
                  {greeting()}, <span className="bg-gradient-to-r from-white via-brand-2 to-sunset bg-clip-text text-transparent">{currentUser?.name?.split(' ')[0] || 'Líder'}</span>
                </h1>
                <p className="text-sm text-ink-2/80 mt-2 max-w-2xl leading-relaxed">
                  Sua central de comando está operacional. Pipeline consolidado em alta. Playbook ativo:{' '}
                  <span className="font-semibold text-white bg-red-violet/30 px-2 py-0.5 rounded border border-red-violet/40">
                    {playbookMeta?.label || 'Enterprise Acceleration'}
                  </span>.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2.5">
                <button 
                  type="button" 
                  onClick={() => navigate('/app/prospect')} 
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sunset hover:bg-[#E84B35] text-white text-xs font-bold transition-all shadow-lg shadow-sunset/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Novo Negócio</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => navigate('/app/commercial_intelligence')} 
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand-ink border border-brand/30 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <LineChart className="w-4 h-4" />
                  <span>Inteligência Estratégica</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* BUSINESS PULSE - Hierarchical KPI Composition */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Primary KPI - Pipeline Value (Large) */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-surface border border-line p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/8 rounded-bl-full pointer-events-none" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-2/60">Pipeline Total</span>
                  <span className="p-1.5 rounded-lg bg-brand/10 text-brand-ink border border-brand/20">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </span>
                </div>
                <h2 className="text-4xl lg:text-5xl font-black text-ink tracking-tight">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(projArr)}
                </h2>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs font-bold text-ok">
                  <Flame className="w-3.5 h-3.5" />
                  <span>+18.4%</span>
                </div>
                <p className="text-[10px] text-ink-2/60 mt-1">vs período anterior</p>
              </div>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand to-sunset rounded-full" style={{ width: '72%' }} />
            </div>
            <p className="text-[10px] text-ink-2/60 mt-2">72% da meta trimestral atingida</p>
          </div>

          {/* Secondary KPI - Win Rate */}
          <div className="relative overflow-hidden rounded-2xl bg-surface border border-line p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-violet/8 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-2/60">Taxa de Conversão</span>
              <span className="p-1.5 rounded-lg bg-red-violet/10 text-red-violet border border-red-violet/20">
                <Radar className="w-3.5 h-3.5" />
              </span>
            </div>
            <h2 className="text-3xl font-black text-ink tracking-tight">{winRate}%</h2>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-ink-2/70">
              <Target className="w-3.5 h-3.5" />
              <span>Acima da média do setor</span>
            </div>
          </div>
        </section>

        {/* INTELLIGENCE SIGNALS - AI Layer */}
        <IntelligenceSignal
          insight="Pipeline qualificado cresceu 18% nos últimos 7 dias. Velocidade de fechamento aumentou em negociações Enterprise."
          context="Tendência positiva em conversão de leads qualificados para oportunidades de alto valor."
          whatChanged="Aumento de 23% em leads qualificados entrando no pipeline."
          recommendedAction="Focar esforços de follow-up em oportunidades Enterprise em estágio avançado."
          severity="info"
          onViewDetails={() => navigate('/app/commercial_intelligence')}
          onAction={() => navigate('/app/crm')}
        />

        {/* HIGH IMPACT DEALS - Strategic Focus */}
        <section className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-midnight to-red-violet text-white flex items-center justify-center shadow-sm">
                <Target className="w-4.5 h-4.5 text-brand" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink tracking-tight">Deals de Alto Impacto</h3>
                <p className="text-xs text-ink-2/60">Oportunidades estratégicas com fechamento estimado para o período</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => navigate('/app/crm')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-interactive text-ink text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ver Pipeline Completo</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 text-[10px] font-bold text-ink-2/70 uppercase tracking-wider border-b border-line">
                <tr>
                  <th className="py-3 px-6">Empresa</th>
                  <th className="py-3 px-4">Estágio</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Decisor</th>
                  <th className="py-3 px-6 text-right">Prioridade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr className="hover:bg-surface-interactive/50 transition-colors">
                  <td className="py-3.5 px-6">
                    <div className="font-semibold text-ink flex items-center gap-2">
                      Banco Corporate Digital
                      <span className="text-[9px] bg-brand/10 text-brand-ink font-bold px-1.5 py-0.2 rounded border border-brand/20">VIP</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sunset/10 text-sunset border border-sunset/20">
                      Negociação Final
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-ink text-sm">
                    R$ 650.000
                  </td>
                  <td className="py-3.5 px-4 font-medium text-ink-2/80">Roberto (CIO)</td>
                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-sunset" />
                      <span className="text-[10px] font-bold text-sunset">ALTA</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
