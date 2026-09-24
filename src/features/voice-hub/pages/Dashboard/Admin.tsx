import React, { useEffect, useState } from 'react';
import { Activity, Server, Users, RefreshCw } from 'lucide-react';
import { logger } from '../../lib/logger';

type Session = {
  id: string;
  summary: string;
  agent: string;
  status: string;
};

interface CallLogEntry {
  id?: string;
  contactName?: string;
  duration?: string;
  agent?: string;
  status?: string;
}

interface AgentSummary {
  id: string;
}

export default function AdminPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [agentCountError, setAgentCountError] = useState(false);

  const loadSessions = () => {
    setLoading(true);
    fetch('/api/call-logs')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch');
      })
      .then(data => {
        const logs: CallLogEntry[] = Array.isArray(data.callLogs) ? data.callLogs : [];
        const mapped: Session[] = logs.map((log, i) => ({
          id: log.id || `sess_${100 + i}`,
          summary: `Chamada realizada com ${log.contactName || 'contato não identificado'}. Duração: ${log.duration || '00:00'}.`,
          agent: log.agent || 'Agente não identificado',
          status: log.status === 'Concluído' ? 'completed' : 'qualified'
        }));
        setSessions(mapped);
        setError(false);
        setLoading(false);
      })
      .catch((err) => {
        logger.error('Failed to load call logs for admin dashboard', { err });
        setError(true);
        setSessions([]);
        setLoading(false);
      });
  };

  const loadAgentCount = () => {
    fetch('/api/agents')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch');
      })
      .then(data => {
        const agents: AgentSummary[] = Array.isArray(data.agents) ? data.agents : [];
        setAgentCount(agents.length);
        setAgentCountError(false);
      })
      .catch((err) => {
        logger.error('Failed to load agent count for admin dashboard', { err });
        setAgentCountError(true);
      });
  };

  useEffect(() => {
    loadSessions();
    loadAgentCount();
  }, []);

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard Administrativo</h1>
                <p className="text-slate-500">Monitoramento de sessões e infraestrutura desta organização</p>
            </div>
            {error && (
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium border border-yellow-200">
                    Não foi possível carregar dados do servidor
                </div>
            )}
        </div>

        {/* Stats Row — real counts, not fixed placeholders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard icon={Activity} label="Sessões Registradas" value={loading ? '…' : error ? '—' : String(sessions.length)} color="blue" />
            <StatCard icon={Server} label="Status da API" value={error ? 'Offline' : 'Online'} color={error ? 'red' : 'green'} />
            <StatCard icon={Users} label="Total de Agentes" value={agentCount === null ? (agentCountError ? '—' : '…') : String(agentCount)} color="purple" />
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Sessões Recentes</h2>
                <button onClick={loadSessions} className="text-sm text-brand hover:text-brand-700 font-medium flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Atualizar
                </button>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-500">Carregando...</div>
            ) : error ? (
                <div className="p-8 text-center text-slate-500">
                    Não foi possível carregar as sessões.{' '}
                    <button onClick={loadSessions} className="text-brand font-semibold hover:underline">Tentar novamente</button>
                </div>
            ) : sessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Nenhuma sessão registrada ainda.</div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {sessions.map((s) => (
                        <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{s.id}</span>
                                    <span className="text-sm font-bold text-slate-700">{s.agent}</span>
                                    <StatusBadge status={s.status} />
                                </div>
                                <p className="text-sm text-slate-600">{s.summary}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}

interface StatCardProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        red: 'bg-red-50 text-red-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
                <div className="text-xl font-bold text-slate-900">{value}</div>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'completed') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Concluído</span>;
    if (status === 'qualified') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Qualificado</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
}
