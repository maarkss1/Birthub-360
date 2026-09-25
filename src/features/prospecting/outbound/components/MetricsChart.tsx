import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import type { Lead } from '../types';

interface MetricsChartProps {
  leads: Lead[];
  isDark: boolean;
}

export function MetricsChart({ leads, isDark }: MetricsChartProps) {
  // Aggregate data based on leads
  const data = useMemo(() => {
    return [
      { name: 'Seg', contatados: 4, atividades: 10 },
      { name: 'Ter', contatados: 6, atividades: 15 },
      { name: 'Qua', contatados: 5, atividades: 12 },
      { name: 'Qui', contatados: 8, atividades: 20 },
      { name: 'Sex', contatados: 7, atividades: 18 },
    ];
  }, [leads]);

  const textColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? '#334155' : '#E2E8F0';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Volume de Atividades (Semanal)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorAtividades" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#008FCE" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#008FCE" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0', borderRadius: '8px', color: isDark ? '#F8FAFC' : '#0F172A' }}
                itemStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
              />
              <Area type="monotone" dataKey="atividades" stroke="#008FCE" fillOpacity={1} fill="url(#colorAtividades)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Leads Contatados</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: isDark ? '#334155' : '#F1F5F9' }}
                contentStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFF', borderColor: isDark ? '#334155' : '#E2E8F0', borderRadius: '8px', color: isDark ? '#F8FAFC' : '#0F172A' }}
              />
              <Bar dataKey="contatados" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
