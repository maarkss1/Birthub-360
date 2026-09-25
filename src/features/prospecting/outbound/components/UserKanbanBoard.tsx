import React, { useState, useEffect } from 'react';
import type { Lead, User } from '../types';
import { LeadCard } from './LeadCard';
import { Loader2 } from 'lucide-react';
import { computeNextAction, urgencyWeight } from '../utils/nextAction';

interface UserKanbanBoardProps {
  user: User;
  isDark: boolean;
}

export function UserKanbanBoard({ user, isDark }: UserKanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, [user.id]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/leads`);
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSaved = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className={`p-8 text-center rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Nenhum lead atribuído a você no momento.</p>
      </div>
    );
  }

  const columns = [
    { id: 'prospecto', label: 'Novos Atribuídos', color: 'bg-[#008FCE]' },
    { id: 'contatado', label: 'Em Contato / Tratamento', color: 'bg-yellow-500' },
    { id: 'negociacao', label: 'Negociação (Reunião)', color: 'bg-purple-500' },
    { id: 'ganho', label: 'Ganho', color: 'bg-green-500' },
    { id: 'perdido', label: 'Perdido', color: 'bg-red-500' }
  ];


  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Meus Leads (CRM / Bitrix)
          </h2>
          <span className={`text-sm px-3 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
            Total: {leads.length}
          </span>
        </div>

        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 items-start">

        {columns.map(col => {
          // Fila priorizada primeiro por 'priority' explícita (ex: leads de uma cidade/
          // campanha que devem furar a fila), e dentro do mesmo nível de prioridade,
          // pela tarefa recomendada (urgência) — nunca pela ordem de chegada.
          const colLeads = leads
            .filter(l => (l.stage || 'prospecto') === col.id)
            .slice()
            .sort((a, b) => (b.priority || 0) - (a.priority || 0)
              || urgencyWeight(computeNextAction(b).urgency) - urgencyWeight(computeNextAction(a).urgency));
          
          return (
            <div key={col.id} className={`flex flex-col gap-4 w-[320px] shrink-0 rounded-xl p-3 border ${
              isDark ? 'bg-slate-900/50 border-slate-800/50' : 'bg-slate-100 border-slate-200'
            }`}>
              {/* Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {col.label}
                  </h3>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  {colLeads.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="flex flex-col gap-3 min-h-[150px]">
                {colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onUpdateStage={async (id, stage) => {
                      try {
                        const res = await fetch(`/api/leads/${id}/stage`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ stage, userId: user.id })
                        });
                        if (res.ok) {
                          setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l));
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    onUpdateTags={async (id, tags) => {
                      setLeads(prev => prev.map(l => l.id === id ? { ...l, tags } : l));
                    }}
                    theme={isDark ? 'dark' : 'light'}
                    isReadOnly={false}
                    onLeadSaved={handleLeadSaved}
                    isUserView={true}
                    startCollapsed={true}
                    user={user}
                  />
                ))}
              </div>
            </div>
          );
        })}

      </div>
      
      </div>
      {/* AI Assistant Sidebar */}
      <div className={`w-full lg:w-80 shrink-0 p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[#008FCE] flex items-center justify-center">
            <span className="text-white font-bold text-xs">AI</span>
          </div>
          <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Assistente LLaMA3</h3>
        </div>
        
        <div className="space-y-4">
          <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Template: Cold Call</h4>
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-2`}>
              "Atue como SDR da Atlas. Gere um script de 30 segundos focando em redução de risco e segurança logística para o decisor X."
            </p>
            <button className="w-full py-1.5 text-xs bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 rounded font-medium transition-colors">
              Usar Template
            </button>
          </div>
          
          <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Template: Matriz de Objeção</h4>
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-2`}>
              "Liste 3 objeções comuns sobre preço em rastreamento e como contorná-las usando os diferenciais da TotalTrac."
            </p>
            <button className="w-full py-1.5 text-xs bg-[#008FCE]/10 text-[#008FCE] hover:bg-[#008FCE]/20 rounded font-medium transition-colors">
              Usar Template
            </button>
          </div>

          <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Template: Cold Email</h4>
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-2`}>
              "Escreva um email curto (max 4 linhas) para um Diretor de Logística focado em otimização de frota."
            </p>
            <button className="w-full py-1.5 text-xs bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 rounded font-medium transition-colors">
              Usar Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );

}
