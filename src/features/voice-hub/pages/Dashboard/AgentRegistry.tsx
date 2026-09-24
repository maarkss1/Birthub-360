import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Trash2, User, Bot, Clock, ChevronRight } from 'lucide-react';
import { AgentConfig } from '../../types';

interface AgentRecord {
  id: string;
  name: string;
  model: string;
  configuration: Partial<AgentConfig>;
  phoneNumber?: string;
  updatedAt: string;
}

export default function AgentRegistry() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => {
        if (data.agents) {
          setAgents(data.agents);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este agente?')) {
      await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      setAgents(prev => prev.filter(a => a.id !== id));
    }
  };
  
  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-10">
      {/* Header Premium */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 right-32 h-24 w-24 rounded-full bg-brand-400/20 blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium mb-4">
              <Bot className="h-4 w-4" /> Inteligência Artificial
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Agentes de Voz</h1>
            <p className="text-brand-100 mt-2 max-w-xl text-sm md:text-base">
              Crie e gerencie assistentes autônomos. Configure a persona, o fluxo de conversa e as ferramentas de cada agente de forma individual.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium hover:bg-white/20 transition-all flex items-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <Filter className="h-4 w-4 mr-2" /> Filtrar
            </button>
            <button 
              onClick={() => navigate('/dashboard/agents/new')}
              className="px-5 py-2.5 rounded-xl bg-white text-brand-900 font-bold hover:bg-brand-50 transition-all flex items-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transform hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5 mr-2" /> Novo Agente
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar Glassmorphism */}
      <div className="relative max-w-2xl mx-auto -mt-14 z-20">
        <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 dark:border-slate-700/50"></div>
        <div className="relative p-2 flex items-center">
          <Search className="h-5 w-5 text-slate-400 ml-3" />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou modelo do agente..." 
            className="w-full bg-transparent border-none px-4 py-3 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List / Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-slate-800">
          <Bot className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Nenhum agente encontrado</h3>
          <p className="text-slate-500 mb-6">Você ainda não criou nenhum agente de voz.</p>
          <button 
            onClick={() => navigate('/dashboard/agents/new')}
            className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-colors inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" /> Criar Meu Primeiro Agente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.model.toLowerCase().includes(searchTerm.toLowerCase())).map((agent, i) => {
            const config = agent.configuration || {};
            const template = config.template || 'Custom';
            
            return (
              <div 
                key={agent.id} 
                onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Efeito de brilho de fundo no hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 dark:from-brand-900/20"></div>
                
                <div className="relative z-10 flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-100 to-indigo-100 dark:from-brand-900 dark:to-indigo-900 flex items-center justify-center text-brand-600 dark:text-brand-300 shadow-inner">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{agent.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">{template}</span>
                        <span>•</span>
                        <span>{agent.model}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleDelete(e, agent.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="relative z-10 space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[40px]">
                    {config.description || 'Nenhuma descrição fornecida para este agente.'}
                  </p>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      Atualizado em {new Date(agent.updatedAt).toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center text-brand-600 dark:text-brand-400 text-sm font-bold group-hover:translate-x-1 transition-transform">
                      Editar <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
