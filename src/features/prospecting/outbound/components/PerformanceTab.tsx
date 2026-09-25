import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import type { Lead } from '../types.js';
import { TrendingUp, Target, Activity, CheckCircle2, User } from 'lucide-react';

interface PerformanceTabProps {
  leads: Lead[];
  isDark: boolean;
}

export function PerformanceTab({ leads, isDark }: PerformanceTabProps) {
  const textColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? '#334155' : '#E2E8F0';

  // 1. Funnel Data
  const funnelData = useMemo(() => {
    const stages = { prospecto: 0, contatado: 0, negociacao: 0, ganho: 0, perdido: 0 };
    leads.forEach(l => {
      if (stages[l.stage as keyof typeof stages] !== undefined) {
        stages[l.stage as keyof typeof stages]++;
      }
    });
    
    return [
      { name: 'Prospectos', value: stages.prospecto },
      { name: 'Contatados', value: stages.contatado },
      { name: 'Em Negociação', value: stages.negociacao },
      { name: 'Ganhos', value: stages.ganho },
    ];
  }, [leads]);

  // 2. Conversion Rate
  const totalClosed = leads.filter(l => l.stage === 'ganho' || l.stage === 'perdido').length;
  const totalWon = leads.filter(l => l.stage === 'ganho').length;
  const conversionRate = totalClosed > 0 ? Math.round((totalWon / totalClosed) * 100) : 0;

  // 3. Brand Activity Data
  const brandData = useMemo(() => {
    return [
      { month: 'Jan', atlasGR: 45, totalTrac: 30 },
      { month: 'Fev', atlasGR: 52, totalTrac: 35 },
      { month: 'Mar', atlasGR: 48, totalTrac: 42 },
      { month: 'Abr', atlasGR: 70, totalTrac: 55 },
      { month: 'Mai', atlasGR: 65, totalTrac: 60 },
      { month: 'Jun', atlasGR: 85, totalTrac: 68 },
    ];
  }, []);

  const COLORS = ['var(--brand-primary)', '#008FCE', '#93DBF2', '#374898'];

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Taxa de Conversão</span>
            <Target className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{conversionRate}%</span>
            <span className="text-emerald-500 text-xs font-semibold mb-1 flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> +5%</span>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tempo Méd. de Venda</span>
            <Activity className="w-5 h-5 text-[#008FCE]" />
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>18</span>
            <span className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>dias</span>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Negócios Fechados</span>
            <CheckCircle2 className="w-5 h-5 text-[var(--brand-primary)]" />
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalWon}</span>
            <span className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>leads</span>
          </div>
        </div>
        
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>SDR Destaque</span>
            <User className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Kaue</span>
            <span className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>(12 conv.)</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Brand Comparison Line Chart */}
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Atividade Histórica por Marca</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={brandData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0', borderRadius: '12px', color: isDark ? '#F8FAFC' : '#0F172A' }}
                  itemStyle={{ color: isDark ? '#F8FAFC' : '#0F172A', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" name="AtlasGR" dataKey="atlasGR" stroke="var(--brand-primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="TotalTrac" dataKey="totalTrac" stroke="#008FCE" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel Bar Chart */}
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Velocidade do Funil de Vendas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip 
                  cursor={{ fill: isDark ? '#334155' : '#F1F5F9' }}
                  contentStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0', borderRadius: '12px', color: isDark ? '#F8FAFC' : '#0F172A' }}
                />
                <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
