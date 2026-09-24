import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../components/design-system';
import {
  Settings, Brain, Mic, Database, Wrench, Shield, Activity,
  GitBranch, PlaySquare, ArrowLeft, Save, Rocket, Zap, MessageSquare, FlaskConical
} from 'lucide-react';

// Version Control, Playground preview and Health & Analytics below render illustrative content —
// no endpoint backs deploy history, a live playground transcript or per-agent health/CSAT/cost
// yet. AGENTS.md §14 forbids presenting a fabricated metric as real; gate it clearly instead
// (see pages/Dashboard/Analytics.tsx for the same pattern) rather than showing invented numbers
// unlabeled in production.
const SHOW_DEMO_DATA = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ANALYTICS === 'true';

function DemoDataBanner() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 mb-4">
      <FlaskConical className="h-3 w-3" /> Dados de exemplo — sem integração real ainda
    </div>
  );
}

function DemoDataEmptyState({ message }: { message: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-12">
      <Activity className="h-8 w-8 mb-3 opacity-40" />
      <p className="font-semibold text-slate-600 dark:text-slate-300">{message}</p>
    </div>
  );
}

export default function AgentOS() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('builder');
  const [builderTab, setBuilderTab] = useState('geral');

  // Placeholder for agent data
  const agentName = "Catarina Prospecção";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8"> {/* Negative margin to fill DashboardLayout padding */}
      {/* OS Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard/agents')} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-brand/10 text-brand flex items-center justify-center">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none text-slate-900 dark:text-white">{agentName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500 font-mono">{id}</span>
                <Badge variant="success">Em Produção</Badge>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm"><Save className="h-3 w-3 mr-2" /> Salvar Draft</Button>
          <Button variant="primary" size="sm"><Rocket className="h-3 w-3 mr-2" /> Publicar Versão</Button>
        </div>
      </div>

      {/* OS Main Navigation */}
      <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 shrink-0">
        <div className="flex gap-6 text-sm font-semibold">
          {[
            { id: 'builder', label: 'Agent Builder', icon: <Wrench className="h-4 w-4" /> },
            { id: 'versioning', label: 'Version Control', icon: <GitBranch className="h-4 w-4" /> },
            { id: 'playground', label: 'Playground', icon: <PlaySquare className="h-4 w-4" /> },
            { id: 'health', label: 'Health & Analytics', icon: <Activity className="h-4 w-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${activeTab === tab.id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex bg-slate-50 dark:bg-slate-900">
        
        {activeTab === 'builder' && (
          <>
            {/* Builder Sidebar */}
            <div className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 shrink-0 overflow-y-auto">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Configurações</p>
                {[
                  { id: 'geral', label: 'Geral', icon: <Settings className="h-4 w-4" /> },
                  { id: 'personalidade', label: 'Personalidade', icon: <Brain className="h-4 w-4" /> },
                  { id: 'prompt', label: 'Prompt Editor', icon: <MessageSquare className="h-4 w-4" /> },
                  { id: 'modelo', label: 'Modelo de IA', icon: <Zap className="h-4 w-4" /> },
                  { id: 'voz', label: 'Voz & Áudio', icon: <Mic className="h-4 w-4" /> },
                  { id: 'memoria', label: 'Memória', icon: <Database className="h-4 w-4" /> },
                  { id: 'conhecimento', label: 'Conhecimento (RAG)', icon: <Database className="h-4 w-4" /> },
                  { id: 'ferramentas', label: 'Ferramentas', icon: <Wrench className="h-4 w-4" /> },
                  { id: 'seguranca', label: 'Segurança & Limites', icon: <Shield className="h-4 w-4" /> }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setBuilderTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors text-left ${builderTab === item.id ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Builder Workspace */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto space-y-6">
                
                {builderTab === 'geral' && (
                  <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4">Configurações Gerais</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Nome do Agente</label>
                        <input type="text" defaultValue={agentName} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-brand" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Descrição</label>
                        <textarea rows={3} defaultValue="Prospecção e qualificação de leads." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-brand" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Departamento</label>
                          <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-brand">
                            <option>Recepção</option>
                            <option>Vendas</option>
                            <option>Suporte</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Categoria</label>
                          <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-brand">
                            <option>Vendas</option>
                            <option>Financeiro</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {builderTab === 'prompt' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editor de Prompt</h3>
                        <p className="text-sm text-slate-500">Defina as instruções de sistema do agente.</p>
                      </div>
                      <Button variant="outline" size="sm">Gerar com IA Catarina</Button>
                    </div>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
                      <div className="bg-slate-100 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
                        <span>system_prompt.txt</span>
                        <span className="text-emerald-500">Tokens estimados: 420</span>
                      </div>
                      <textarea 
                        className="flex-1 w-full bg-white dark:bg-slate-900 p-4 text-sm font-mono focus:outline-none text-slate-800 dark:text-slate-200 resize-none"
                        defaultValue={`# CONTEXTO
Você é a Catarina, especialista virtual em prospecção e qualificação de leads da ATLASGR.
Seu foco é identificar sinais de fit comercial (ex: orçamento disponível, autoridade de decisão) de forma consultiva e rápida.

# REGRAS
1. Colete dados-chave do lead.
2. Registre o nível de interesse subjetivo se descrito.
3. Nunca prometa condições comerciais que não foram aprovadas.
4. Se um lead quente for identificado, encaminhe imediatamente para o time comercial.

# TOM DE VOZ
Consultivo, profissional, calmo e seguro.`}
                      />
                    </div>
                  </div>
                )}
                
                {builderTab === 'modelo' && (
                  <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4">Modelo Generativo</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Provedor e Modelo</label>
                        <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-brand">
                          <option>Google Gemini 2.5 Pro</option>
                          <option>Google Gemini 2.5 Flash</option>
                          <option>OpenAI GPT-4o</option>
                          <option>Anthropic Claude 3.5 Sonnet</option>
                        </select>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium">Temperature</label>
                          <span className="text-sm font-mono text-brand">0.3</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.1" defaultValue="0.3" className="w-full accent-brand" />
                        <p className="text-xs text-slate-500">Controla a criatividade. Valores menores geram respostas mais precisas e determinísticas (ideal para coleta de dados estruturados).</p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Additional tabs would be implemented similarly */}
                {['personalidade', 'voz', 'memoria', 'conhecimento', 'ferramentas', 'seguranca'].includes(builderTab) && (
                  <Card className="p-6 flex flex-col items-center justify-center h-64 text-slate-500">
                    <Settings className="h-8 w-8 mb-4 opacity-50" />
                    <p>Configurações de {builderTab} em desenvolvimento para o Agent OS.</p>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'versioning' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <DemoDataBanner />
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Version Control</h3>
                  <p className="text-sm text-slate-500">Histórico de alterações e deploys.</p>
                </div>
                <Button variant="primary"><GitBranch className="h-4 w-4 mr-2" /> Criar Branch</Button>
              </div>
              <Card className="p-0 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    { version: 'v1.2.4', date: 'Hoje, 14:30', author: 'Marcelin Mark', desc: 'Ajuste de prompt: adição de regras de qualificação de orçamento.', status: 'current' },
                    { version: 'v1.2.3', date: 'Ontem, 09:15', author: 'Sistema', desc: 'Auto-rollback devido a latência alta (>800ms).', status: 'rollback' },
                    { version: 'v1.2.2', date: 'Há 3 dias', author: 'João Silva', desc: 'Atualização do modelo para Gemini 2.5 Pro.', status: 'stable' },
                  ].map((v, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="pt-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${v.status === 'current' ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : v.status === 'rollback' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{v.version}</span>
                            {v.status === 'current' && <Badge variant="success">Produção</Badge>}
                            {v.status === 'rollback' && <Badge variant="warning">Rollback</Badge>}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{v.desc}</p>
                          <p className="text-xs text-slate-400 mt-2">Por <span className="font-semibold">{v.author}</span> • {v.date}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Comparar</Button>
                        <Button variant="outline" size="sm">Rollback</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'playground' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Playground Enterprise</h3>
                  <DemoDataBanner />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Mic className="h-4 w-4 mr-2" /> Falar</Button>
                  <Button variant="outline" size="sm">Limpar</Button>
                </div>
              </div>
              <Card className="flex-1 p-4 flex flex-col bg-white dark:bg-slate-900">
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  <div className="flex items-end justify-end">
                    <div className="bg-brand text-white px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[80%]">
                      Vi o anúncio de vocês e queria entender melhor a solução. Já temos orçamento aprovado para esse trimestre.
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                      <Brain className="h-4 w-4" />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-2xl rounded-tl-sm text-sm max-w-[80%] relative group">
                      Perfeito! Isso indica um lead com alto potencial de fechamento. Posso agendar uma conversa com nosso time comercial ainda esta semana?
                      <div className="absolute -bottom-5 left-2 text-[9px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        Latência: 320ms • Tokens: 84 • Modelo: Gemini 2.5 Pro
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <input type="text" placeholder="Digite uma mensagem para testar o agente..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-brand" />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand text-white rounded-md hover:bg-brand-600 transition-colors">
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
            <div className="w-80 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 p-4 shrink-0 overflow-y-auto">
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-4">Debugger / Timeline</h4>
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono">
                  <div className="flex justify-between text-slate-400 mb-2">
                    <span>14:32:01.102</span>
                    <span>USER_INPUT</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-300 truncate">Vi o anúncio de vocês...</p>
                </div>
                <div className="p-3 bg-brand/5 border border-brand/20 rounded-lg text-xs font-mono">
                  <div className="flex justify-between text-brand mb-2">
                    <span>14:32:01.205</span>
                    <span>TOOL_CALL</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-300">check_lead_score()</p>
                  <p className="text-emerald-600 mt-1">Status: Hot Lead Detected</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono">
                  <div className="flex justify-between text-slate-400 mb-2">
                    <span>14:32:01.422</span>
                    <span>MODEL_RESPONSE</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-300">Perfeito! Isso indica...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Agent Health & Analytics</h3>

              {!SHOW_DEMO_DATA ? (
                <Card className="p-0">
                  <DemoDataEmptyState message="Health score, CSAT e custo real deste agente ainda não estão conectados a dados reais." />
                </Card>
              ) : (
              <>
              <DemoDataBanner />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-5 flex flex-col justify-center items-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Health Score</span>
                  <div className="text-4xl font-bold text-emerald-500 font-mono">98/100</div>
                  <p className="text-xs text-slate-500 mt-2">Excelente. Sem erros nas últimas 24h.</p>
                </Card>
                <Card className="p-5 flex flex-col justify-center items-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">CSAT Médio</span>
                  <div className="text-4xl font-bold text-slate-900 dark:text-white font-mono">4.8<span className="text-xl text-slate-400">/5</span></div>
                  <p className="text-xs text-slate-500 mt-2">Baseado em 120 avaliações.</p>
                </Card>
                <Card className="p-5 flex flex-col justify-center items-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Custo Total (7d)</span>
                  <div className="text-4xl font-bold text-slate-900 dark:text-white font-mono">$12.40</div>
                  <p className="text-xs text-slate-500 mt-2">1.2M Tokens Consumidos</p>
                </Card>
              </div>

              <Card className="p-6">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-brand" /> Insights da Catarina AI
                </h4>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50 rounded-lg text-sm flex gap-3 items-start">
                    <Zap className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Otimização de Custos</p>
                      <p className="mt-1">O histórico de qualificação não requer janela de contexto longa (8k tokens estão sendo usados). Reduzir max_tokens para 2k pode economizar 40% dos custos sem perda de qualidade.</p>
                      <Button variant="outline" size="sm" className="mt-3">Aplicar Recomendação</Button>
                    </div>
                  </div>
                </div>
              </Card>
              </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
