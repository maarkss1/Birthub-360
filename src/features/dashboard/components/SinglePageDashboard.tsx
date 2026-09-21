import { Radar, Sparkles, TrendingUp, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useActivePlaybook } from '../../../hooks/useActivePlaybook';
import { useAnalyticsDashboard } from '../../../hooks/useDatabase';

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
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl w-full mx-auto bg-[#F6F8FB]">
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-midnight via-[#131b38] to-[#1c1d3b] p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-sunset/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-12 w-48 h-48 bg-gold/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[11px] font-extrabold tracking-widest text-sunset uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sunset animate-pulse" />
            CENTRAL DE COMANDO C-LEVEL · Q3 FISCAL
          </span>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight mt-1 text-white">
            {greeting()},{' '}
            <span className="bg-gradient-to-r from-white via-gold to-sunset bg-clip-text text-transparent">
              {currentUser?.name?.split(' ')[0] || 'Líder'}
            </span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Previsão consolidada de fechamento em alta (+18.4%). Playbook ativo:{' '}
            <span className="font-bold text-white bg-red-violet/60 px-2 py-0.5 rounded border border-red-violet/40">
              {playbookMeta?.label || 'Enterprise Acceleration'}
            </span>
            .
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2.5 relative z-10">
          <button
            type="button"
            onClick={() => navigate('/app/prospect')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sunset hover:bg-[#E84B35] text-white text-xs font-bold transition-all shadow-md shadow-sunset/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Novo Negócio</span>
          </button>
        </div>
      </section>

      {/* KPI Stat Ribbon */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* ARR */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Pipeline Total
            </span>
            <span className="p-1.5 rounded-lg bg-gold/15 text-gold border border-gold/30">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <h3 className="text-2xl font-black text-midnight tracking-tight">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(projArr)}
              </h3>
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" /> +18.4%
              </p>
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-violet/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Taxa de Conversão
            </span>
            <span className="p-1.5 rounded-lg bg-red-violet/15 text-red-violet border border-red-violet/30">
              <Radar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <h3 className="text-2xl font-black text-midnight tracking-tight">{winRate}%</h3>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE 3: Deals Radar Table */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-midnight to-red-violet text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Target className="w-4 h-4 text-gold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-midnight tracking-tight flex items-center gap-2">
                Deals de Alto Impacto · Enterprise Radar Tier A
              </h3>
              <p className="text-xs text-slate-500">
                Contas estratégicas com fechamento estimado para o mês vigente.
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">Empresa & Solução</th>
                <th className="py-3 px-4">Estágio do Funil</th>
                <th className="py-3 px-4">Valor Previsto</th>
                <th className="py-3 px-4">Decisor</th>
                <th className="py-3 px-6 text-right">Ação Imediata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-6">
                  <div className="font-bold text-midnight flex items-center gap-1.5">
                    Banco Corporate Digital
                    <span className="text-[9px] bg-gold/15 text-gold font-extrabold px-1.5 py-0.2 rounded border border-gold/30">
                      VIP
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sunset/10 text-sunset border border-sunset/30">
                    Negociação Final
                  </span>
                </td>
                <td className="py-3.5 px-4 font-black text-midnight text-sm">R$ 650.000</td>
                <td className="py-3.5 px-4 font-semibold text-slate-700">Roberto (CIO)</td>
                <td className="py-3.5 px-6 text-right">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-midnight hover:bg-slate-800 text-white font-bold text-[11px] transition-colors shadow-xs cursor-pointer"
                  >
                    Ver Dossiê VIP
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
