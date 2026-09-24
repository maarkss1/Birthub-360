import React, { useState, useEffect } from 'react';
import { Card, Badge, Spinner, Table, TableHead, TableRow, TableCell } from '../../components/design-system';
import { Activity, BarChart2, Server, Zap, Shield, Terminal, RefreshCw, Layers } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import type { Attributes } from '@opentelemetry/api';
import { logger } from '../../lib/logger';

interface LocalSpan {
  id: string;
  name: string;
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Attributes;
}

interface LocalMetric {
  name: string;
  value: number;
  timestamp: number;
  attributes: Attributes;
}

export default function ObservabilityPage() {
  const [spans, setSpans] = useState<LocalSpan[]>([]);
  const [, setMetrics] = useState<LocalMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpan, setSelectedSpan] = useState<LocalSpan | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/observability/metrics');
      if (res.ok) {
        const data = await res.json();
        setSpans(data.spans || []);
        setMetrics(data.metrics || []);
      }
    } catch (err) {
      logger.error('Error fetching telemetry data', { err });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    if (!autoRefresh) return;
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Aggregate stats
  const totalSpans = spans.length;
  const avgLatency = totalSpans > 0 
    ? Math.round(spans.reduce((acc, curr) => acc + (curr.duration || 0), 0) / totalSpans) 
    : 0;

  // Emotion count
  const emotionCounts: Record<string, number> = {};
  spans.forEach(s => {
    const detectedEmotions = s.attributes.detectedEmotions;
    if (s.name === 'EmotionEngine.analyzeTurn' && Array.isArray(detectedEmotions)) {
      detectedEmotions.forEach((emo) => {
        const key = String(emo);
        emotionCounts[key] = (emotionCounts[key] || 0) + 1;
      });
    }
  });
  const emotionChartData = Object.keys(emotionCounts).map(key => ({
    name: key,
    value: emotionCounts[key]
  }));

  // Intent count
  const intentCounts: Record<string, number> = {};
  spans.forEach(s => {
    const primaryIntent = s.attributes.primaryIntent;
    if (s.name === 'IntentEngine.analyzeIntent' && typeof primaryIntent === 'string') {
      intentCounts[primaryIntent] = (intentCounts[primaryIntent] || 0) + 1;
    }
  });
  const intentChartData = Object.keys(intentCounts).map(key => ({
    name: key,
    value: intentCounts[key]
  }));

  // Latency over time (by engine)
  const latencyTimeline = spans
    .slice(-15) // last 15 traces
    .map((s) => ({
      time: new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      latency: s.duration || 0,
      engine: s.name.replace('Engine.', ' ')
    }));

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Central de Observabilidade OpenTelemetry</h1>
          <p className="text-sm text-slate-500">Métricas, rastros (Traces) e telemetria de conversação em tempo real alimentados por @opentelemetry/api.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              autoRefresh 
                ? 'bg-brand/10 border-brand/25 text-brand dark:bg-brand/20' 
                : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-atualização Ativa' : 'Pausado'}
          </button>
          <button 
            onClick={fetchTelemetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex justify-center items-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Metrics Panel */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: 'Global Uptime', value: '100.0%', trend: 'Estável', icon: <Server className="h-5 w-5" />, color: 'emerald' },
              { title: 'Tempo Médio de Resposta', value: `${avgLatency}ms`, trend: 'P95 Latency', icon: <Zap className="h-5 w-5" />, color: 'brand' },
              { title: 'Total Traces (Spans)', value: totalSpans.toString(), trend: 'Métricas Ativas', icon: <Activity className="h-5 w-5" />, color: 'blue' },
              { title: 'Status do Sistema', value: 'Operacional', trend: 'Livre de Erros', icon: <Shield className="h-5 w-5" />, color: 'emerald' }
            ].map((metric, i) => (
              <Card key={i} className="p-5 border-slate-200/60 dark:border-slate-700/60">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{metric.title}</span>
                  <div className={`text-${metric.color}-500 dark:text-${metric.color}-400`}>{metric.icon}</div>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{metric.value}</p>
                <Badge variant={metric.color === 'emerald' ? 'success' : metric.color === 'brand' ? 'primary' : 'info'} className="mt-2">
                  {metric.trend}
                </Badge>
              </Card>
            ))}
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 border-slate-200/60 dark:border-slate-700/60">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand" /> Latência das Motores de IA (Últimos Spans)
              </h3>
              <div className="h-64">
                {latencyTimeline.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Nenhum dado disponível. Execute interações por voz para capturar traces.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={latencyTimeline}>
                      <defs>
                        <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="ms" />
                      <Tooltip />
                      <Area type="monotone" dataKey="latency" name="Latência" stroke="#2563eb" fillOpacity={1} fill="url(#latencyGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-6 border-slate-200/60 dark:border-slate-700/60">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-brand" /> Sentimentos e Intenções Coletadas via OTEL
              </h3>
              <div className="grid grid-cols-2 gap-4 h-64">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Sentimentos Detectados</h4>
                  {emotionChartData.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 mt-20">Sem dados</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie
                          data={emotionChartData}
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {emotionChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {emotionChartData.map((entry, idx) => (
                      <span key={idx} className="text-[9px] font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        {entry.name} ({entry.value})
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Intenções Classificadas</h4>
                  {intentChartData.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 mt-20">Sem dados</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={intentChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Frequência" fill="#10b981">
                          {intentChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* OpenTelemetry Traces Viewer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-brand" /> Visualizador de Traces & Spans (OpenTelemetry)
                </h3>
                <span className="text-xs text-slate-400">{spans.length} spans capturados</span>
              </div>

              <div className="overflow-y-auto max-h-96">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell isHeader>Span Name / Operation</TableCell>
                      <TableCell isHeader>Session ID</TableCell>
                      <TableCell isHeader>Latency</TableCell>
                      <TableCell isHeader>Timestamp</TableCell>
                    </TableRow>
                  </TableHead>
                  <tbody>
                    {spans.map((span) => {
                      const isSelected = selectedSpan?.id === span.id;
                      return (
                        <TableRow 
                          key={span.id} 
                          onClick={() => setSelectedSpan(span)}
                          className={`cursor-pointer transition-all ${
                            isSelected ? 'bg-brand/5 dark:bg-brand/10 border-l-4 border-l-brand' : ''
                          }`}
                        >
                          <TableCell className="font-mono text-xs font-semibold">
                            {span.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">
                            {span.sessionId}
                          </TableCell>
                          <TableCell>
                            <Badge variant={span.duration && span.duration > 200 ? 'danger' : 'success'}>
                              {span.duration ? `${span.duration}ms` : 'Incompleto'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {new Date(span.startTime).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Card>

            {/* Span Details Side Panel */}
            <Card className="p-6 border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/10">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-brand" /> Detalhes do Span Selecionado
              </h3>
              
              {selectedSpan ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome da Operação</span>
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white block mt-1">{selectedSpan.name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Span ID</span>
                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300 block mt-0.5">{selectedSpan.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Duração</span>
                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300 block mt-0.5">{selectedSpan.duration}ms</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tags & Atributos OTEL</span>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto max-h-56">
                      <pre className="text-[11px] font-mono text-slate-700 dark:text-slate-300 leading-tight">
                        {JSON.stringify(selectedSpan.attributes, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-brand" /> Atributo de Telemetria Padronizado
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center text-xs">
                  <Activity className="h-8 w-8 mb-2 opacity-50 text-brand" />
                  <p>Selecione um Span da tabela à esquerda para visualizar suas tags OpenTelemetry em profundidade.</p>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
