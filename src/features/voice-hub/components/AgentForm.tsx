import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Wand2, X, ChevronRight, Mic, Layout, Sparkles } from 'lucide-react';
import { AgentConfig, AgentTemplate } from '../types';

const INITIAL_CONFIG: AgentConfig = {
  name: 'Novo Agente Virtual',
  template: 'custom',
  description: 'Descreva qual o propósito deste agente.',
  language: 'Português Brasileiro',
  tone: ['Profissional'],
  speed: 1,
  systemInstruction: 'Você é um assistente virtual.',
  analysisPrompt: '',
  questions: []
};

export function AgentForm() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AgentConfig>(INITIAL_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    const payload = {
      name: config.name,
      model: 'gemini-2.5-pro', // default
      configuration: config
    };

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro desconhecido ao criar o agente.');
      }
      
      // Navigate to the OS editor
      navigate(`/dashboard/agents/${data.agent.id}`);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Erro desconhecido ao criar o agente.');
      setIsSaving(false);
    }
  };

  const handleTemplateSelection = (template: AgentTemplate, name: string, desc: string) => {
    setConfig({
      ...config,
      template,
      name,
      description: desc
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
      
      {/* Alert Error */}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl flex justify-between items-center border border-red-200 dark:border-red-800/50">
          <p className="font-medium text-sm">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Main Glassmorphism Form */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 h-64 w-64 bg-brand-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 h-64 w-64 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>

        <div className="p-8 md:p-10 relative z-10 space-y-10">
          
          {/* Section 1: Template */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Layout className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Escolha um Ponto de Partida</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TemplateCard 
                active={config.template === 'sales'}
                onClick={() => handleTemplateSelection('sales', 'SDR Virtual', 'Qualificação rápida e prospecção ativa de leads inbound/outbound.')}
                icon={<Sparkles className="h-6 w-6" />}
                title="SDR (Vendas)"
                color="from-amber-400 to-orange-500"
              />
              <TemplateCard 
                active={config.template === 'support'}
                onClick={() => handleTemplateSelection('support', 'Atendente N1', 'Suporte técnico, abertura de chamados e triage de problemas.')}
                icon={<Mic className="h-6 w-6" />}
                title="Suporte Técnico"
                color="from-blue-400 to-cyan-500"
              />
              <TemplateCard 
                active={config.template === 'custom'}
                onClick={() => handleTemplateSelection('custom', 'Novo Agente Personalizado', 'Construa seu agente do zero. Defina regras, fluxos e personalidade.')}
                icon={<Wand2 className="h-6 w-6" />}
                title="Personalizado"
                color="from-brand-400 to-indigo-500"
              />
            </div>
          </section>

          <hr className="border-slate-200 dark:border-slate-800/60" />

          {/* Section 2: Detalhes Básicos */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Bot className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Identidade do Agente</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome do Agente</label>
                <input 
                  type="text" 
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm"
                  placeholder="Ex: Catarina (Vendas)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Idioma Principal</label>
                <select 
                  value={config.language}
                  onChange={(e) => setConfig({ ...config, language: e.target.value })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm"
                >
                  <option value="Português Brasileiro">Português Brasileiro</option>
                  <option value="English (US)">English (US)</option>
                  <option value="Español">Español</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Descrição e Missão</label>
              <textarea 
                rows={3}
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm resize-none"
                placeholder="Qual o objetivo principal deste agente?"
              />
            </div>
          </section>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 p-6 md:px-10 flex justify-between items-center backdrop-blur-xl">
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            Cancelar
          </button>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transform hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Inicializando...
              </div>
            ) : (
              <>
                Criar e Configurar Agente
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  color: string;
}

function TemplateCard({ active, onClick, icon, title, color }: TemplateCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all cursor-pointer ${
        active 
          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10 shadow-md' 
          : 'border-slate-100 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 bg-white/50 dark:bg-slate-900/50 hover:shadow-lg hover:-translate-y-1'
      }`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md mb-4`}>
        {icon}
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Clique para selecionar</p>
      
      {active && (
        <div className="absolute top-4 right-4">
          <div className="h-3 w-3 bg-brand-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
        </div>
      )}
    </div>
  );
}