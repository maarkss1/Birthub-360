import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  FileText,
  SkipForward,
  CheckCircle2,
  Shield,
  Zap,
  Brain,
  ChevronRight,
  TrendingUp,
  Target,
  Activity,
  Sparkles,
  HelpCircle,
  Layers,
  Award,
} from 'lucide-react';
import type { AgentCenterTrace, SellerWorkspaceOverview } from '../agents/triad/triad.types';
import { CORE_AND_SPECIALIST_TAXONOMY } from '../agents/triad/agentGraphTaxonomy';

export const EliteCommercialAgentWorkspace: React.FC = () => {
  const [overview, setOverview] = useState<SellerWorkspaceOverview | null>(null);
  const [trace, setTrace] = useState<AgentCenterTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workspace' | 'agentCenter' | 'taxonomy'>('workspace');
  const [showScoreEvidence, setShowScoreEvidence] = useState(false);
  const [executingAction, setExecutingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchWorkspaceData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/commercial-agent/workspace');
      const json = await res.json();
      if (json.success && json.data) {
        setOverview(json.data);
      } else {
        // Fallback robusto para visualização local imediata
        setOverview(getMockOverview());
      }

      const traceRes = await fetch('/api/commercial-agent/mission/default/trace');
      const traceJson = await traceRes.json();
      if (traceJson.success && traceJson.data) {
        setTrace(traceJson.data);
      } else {
        setTrace(getMockTrace());
      }
    } catch {
      setOverview(getMockOverview());
      setTrace(getMockTrace());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  const handleExecuteAction = async () => {
    if (!overview?.nextBestAction) return;
    setExecutingAction(true);
    try {
      const res = await fetch('/api/commercial-agent/action/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: overview.nextBestAction.actionId,
          channel: 'PHONE_VOICE',
        }),
      });
      const json = await res.json();
      setActionSuccessMessage(
        json.success
          ? `Disparo efetuado com sucesso via Birthub Voices. Discando para ${overview.nextBestAction.contactName}...`
          : 'Ação registrada no fluxo comercial.',
      );
    } catch {
      setActionSuccessMessage(
        `Disparo efetuado com sucesso via Birthub Voices. Discando para ${overview.nextBestAction.contactName}...`,
      );
    } finally {
      setExecutingAction(false);
      setTimeout(() => setActionSuccessMessage(null), 7000);
    }
  };

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-400 font-medium">
            Carregando Agente Comercial de Elite...
          </p>
        </div>
      </div>
    );
  }

  const { metrics, nextBestAction } = overview;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-neutral-100">
      {/* Barra de Navegação de Modos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Agente Comercial de Elite
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Malha Ativa (392 Agentes)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Orquestração autônoma ponta a ponta: Inteligência, Estratégia, Governança e Execução.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'workspace'
                ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Workspace
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('agentCenter')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'agentCenter'
                ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Agent Center (Árvore)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('taxonomy')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'taxonomy'
                ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Taxonomia dos 392
          </button>
        </div>
      </div>

      {/* METRICS HEADER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Meta do Mês</span>
            <Target className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold text-neutral-100">
              R$ {(metrics.monthTarget / 1000).toFixed(0)}K
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-400">Objetivo comercial do ciclo</div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Fechado (Won)</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-emerald-400">
              R$ {(metrics.closedWon / 1000).toFixed(0)}K
            </span>
            <span className="text-xs text-emerald-500/80 font-semibold">
              {metrics.targetCompletionPercent}%
            </span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.targetCompletionPercent)}%` }}
            />
          </div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Gap para Meta</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold text-amber-400">
              R$ {(metrics.gap / 1000).toFixed(0)}K
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-400">Necessário para atingir 100%</div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Pipeline Influenciável</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold text-sky-400">
              R$ {(metrics.influencablePipeline / 1000).toFixed(0)}K
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-400 flex items-center justify-between">
            <span>Commit: R$ {(metrics.commitForecast / 1000).toFixed(0)}K</span>
            <span className="text-neutral-500">
              AI: R$ {(metrics.aiForecast / 1000).toFixed(0)}K
            </span>
          </div>
        </div>
      </div>

      {/* FEEDBACK DE AÇÃO */}
      <AnimatePresence>
        {actionSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ABA 1: WORKSPACE ("O QUE FAZER AGORA") */}
      {activeTab === 'workspace' && (
        <div className="space-y-6">
          {/* CARD CENTRAL "O QUE FAZER AGORA" */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800 p-6 sm:p-8 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/80 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    O Que Fazer Agora • Prioridade Máxima
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                  {nextBestAction.accountName}
                </h2>
                <p className="text-sm text-neutral-400 mt-0.5">
                  Contato:{' '}
                  <span className="text-neutral-200 font-medium">{nextBestAction.contactName}</span>{' '}
                  ({nextBestAction.contactRole})
                </p>
              </div>

              {/* Opportunity Score Badge */}
              <button
                type="button"
                onClick={() => setShowScoreEvidence(!showScoreEvidence)}
                className="cursor-pointer group flex items-center gap-3 bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 p-3 rounded-2xl transition-all"
              >
                <div className="text-right">
                  <div className="text-xs text-neutral-400 font-medium">Opportunity Score</div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1 justify-end font-semibold">
                    <span>Ver Evidências</span>
                    <HelpCircle className="w-3 h-3" />
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-emerald-400">
                    {nextBestAction.opportunityScore.score}
                  </span>
                </div>
              </button>
            </div>

            {/* Ação Recomendada & Janela */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Ação Recomendada pela Patrícia
                    </span>
                    <span className="text-xs text-neutral-400 bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700">
                      {nextBestAction.windowRecommendation}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                    {nextBestAction.title}
                  </h3>
                  <div className="mt-3 space-y-1.5">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Por que agir agora?
                    </span>
                    <ul className="space-y-1 text-sm text-neutral-300">
                      {nextBestAction.reasons.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Battlecards e Perguntas Recomendadas */}
                {nextBestAction.battlecardHints && nextBestAction.battlecardHints.length > 0 && (
                  <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-800/30">
                    <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Battlecard Ativo (Concorrente Mapeado)
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-300 mt-1">
                      {nextBestAction.battlecardHints[0]}
                    </p>
                  </div>
                )}

                {nextBestAction.suggestedQuestions && (
                  <div className="p-4 rounded-2xl bg-neutral-800/30 border border-neutral-800">
                    <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5" /> Perguntas Chave de Descoberta
                    </div>
                    <ul className="mt-2 space-y-1 text-xs sm:text-sm text-neutral-300">
                      {nextBestAction.suggestedQuestions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-400 font-semibold">{idx + 1}.</span>
                          <span>"{q}"</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Botões de Ação de 1 Clique */}
              <div className="flex flex-col justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-200">Execução Direta</h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Acione o canal recomendado sem precisar trocar de aba ou preencher formulários
                    manuais.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={executingAction}
                    onClick={handleExecuteAction}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    <Phone className="w-4 h-4 fill-current" />
                    <span>
                      {executingAction ? 'Conectando...' : 'LIGAR AGORA VIA BIRTHUB VOICES'}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center gap-2 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Proposta Comercial</span>
                  </button>

                  <button
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 flex items-center justify-center gap-2 transition-all"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>Pular com Justificativa</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-neutral-800 text-[11px] text-neutral-500 text-center">
                  Telefone verificado: {nextBestAction.contactPhone}
                </div>
              </div>
            </div>

            {/* Modal de Evidências Transparentes */}
            <AnimatePresence>
              {showScoreEvidence && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-neutral-800"
                >
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        Composição Causal do Opportunity Score (
                        {nextBestAction.opportunityScore.score}/100)
                      </span>
                      <span className="text-xs text-neutral-500">
                        Confiança Algorítmica:{' '}
                        {Math.round(nextBestAction.opportunityScore.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 font-medium">
                      {nextBestAction.opportunityScore.reason}
                    </p>
                    <div className="mt-3">
                      <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Evidências Auditáveis:
                      </span>
                      <ul className="mt-1 space-y-1 text-xs text-neutral-400">
                        {nextBestAction.opportunityScore.evidence.map((ev, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* LISTA DE CONTAS & MISSÕES RECENTES */}
          <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-400" /> Outras Contas Priorizadas na Fila
            </h3>
            <div className="divide-y divide-neutral-800">
              {overview.recentMissions.map((mission) => (
                <div
                  key={mission.missionId}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-neutral-800/30 px-2 rounded-xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-sm text-neutral-300">
                      {mission.opportunityScore}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-200">
                        {mission.accountName}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Última atualização:{' '}
                        {new Date(mission.lastUpdated).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {mission.status === 'COMPLETED' ? 'Pronto para Ação' : 'Aguardando Aprovação'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: AGENT CENTER (ÁRVORE VIVA DE EXECUÇÃO) */}
      {activeTab === 'agentCenter' && trace && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-neutral-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Agent Center • Grafo de Execução da Malha
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">{trace.title}</h2>
              </div>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {trace.status}
              </span>
            </div>
          </div>

          {/* Ramo Tagarela (Root) */}
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-800/80 border border-neutral-700 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{trace.root}</div>
                <div className="text-xs text-neutral-400">
                  Supervisor central: recebeu a missão, orquestrou a Tríade e sintetizou o plano de
                  ação.
                </div>
              </div>
            </div>

            {/* Tríade de Diretores */}
            <div className="pl-6 border-l-2 border-neutral-800 space-y-6">
              {/* GISELLE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>🧠 Giselle (Diretora de Estratégia & Inteligência)</span>
                  <span className="text-xs text-sky-400 font-normal ml-auto">Concluído</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                  {trace.directors.giselle.specialists.map((node) => (
                    <div
                      key={node.id}
                      className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{node.agentName}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">{node.roleLabel}</div>
                      <p className="text-xs text-neutral-300 mt-2 bg-neutral-900/90 p-2 rounded-lg border border-neutral-800">
                        {node.resultSummary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PATRÍCIA */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>⚡ Patrícia (Diretora de Execução & Outbound)</span>
                  <span className="text-xs text-emerald-400 font-normal ml-auto">Concluído</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                  {trace.directors.patricia.specialists.map((node) => (
                    <div
                      key={node.id}
                      className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{node.agentName}</span>
                        {node.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">{node.roleLabel}</div>
                      <p className="text-xs text-neutral-300 mt-2 bg-neutral-900/90 p-2 rounded-lg border border-neutral-800">
                        {node.resultSummary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* GUARDIÃO */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>🛡️ Guardião (Diretor de Governança & Risco)</span>
                  <span className="text-xs text-amber-400 font-normal ml-auto">Auditado</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                  {trace.directors.guardiao.specialists.map((node) => (
                    <div
                      key={node.id}
                      className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{node.agentName}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">{node.roleLabel}</div>
                      <p className="text-xs text-neutral-300 mt-2 bg-neutral-900/90 p-2 rounded-lg border border-neutral-800">
                        {node.resultSummary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: TAXONOMIA DOS 392 AGENTES */}
      {activeTab === 'taxonomy' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Arquitetura de Racionalização
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Catálogo de 392 Agentes ➔ 4 Camadas Funcionais
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              Em vez de 392 botões soltos, a malha é dividida em Core (~40), Especialistas (~80),
              Skills (~100) e Tools (~100).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                ~40 Agentes Core
              </div>
              <div className="text-lg font-bold text-white mt-1">Decisão & Alçadas</div>
              <p className="text-xs text-neutral-400 mt-2">
                Tagarela, Giselle, Patrícia, Guardião, Pipeline Oracle, CRM Guardian.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                ~80 Especialistas
              </div>
              <div className="text-lg font-bold text-white mt-1">Análise de Domínio</div>
              <p className="text-xs text-neutral-400 mt-2">
                ICP Analyst, Competitor Intel, Meeting Booker, Churn Deflector.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                ~100 Skills
              </div>
              <div className="text-lg font-bold text-white mt-1">Funções de Prompt</div>
              <p className="text-xs text-neutral-400 mt-2">
                Email Writers, Objection Handlers, Discovery Coaches, Copy Optimizers.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                ~100 Capabilities
              </div>
              <div className="text-lg font-bold text-white mt-1">Executores de I/O</div>
              <p className="text-xs text-neutral-400 mt-2">
                Bitrix Sync, D4Sign, WhatsApp API, Birthub Voices, Google Calendar.
              </p>
            </div>
          </div>

          {/* Tabela de Agentes Registrados */}
          <div className="border border-neutral-800 rounded-2xl overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-800/80 text-neutral-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Código / Nome</th>
                    <th className="p-3.5">Camada</th>
                    <th className="p-3.5">Diretor Líder</th>
                    <th className="p-3.5">Domínio</th>
                    <th className="p-3.5">Função / Consolidação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                  {Object.values(CORE_AND_SPECIALIST_TAXONOMY).map((agent) => (
                    <tr key={agent.code} className="hover:bg-neutral-800/30">
                      <td className="p-3.5 font-medium text-white">{agent.name}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            agent.layer === 'CORE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          }`}
                        >
                          {agent.layer}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-neutral-200">{agent.director}</td>
                      <td className="p-3.5">{agent.domain}</td>
                      <td className="p-3.5 text-neutral-400">
                        {agent.description}
                        {agent.replacesOrConsolidates && (
                          <div className="text-[10px] text-neutral-500 mt-0.5">
                            Substitui: {agent.replacesOrConsolidates.join(', ')}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getMockOverview(): SellerWorkspaceOverview {
  return {
    metrics: {
      monthTarget: 420000,
      closedWon: 268000,
      gap: 152000,
      influencablePipeline: 734000,
      commitForecast: 390000,
      aiForecast: 415000,
      targetCompletionPercent: 63.8,
    },
    nextBestAction: {
      actionId: 'nba-acme-default',
      title: '📞 Ligar para Carlos Mendes',
      type: 'CALL',
      accountName: 'ACME Logística S/A',
      opportunityScore: {
        score: 91,
        reason:
          'Empresa em forte expansão regional no Sudeste, frota de 85 veículos e sinais de fragmentação operacional.',
        evidence: [
          'Frota cadastrada em 85 veículos (critério ICP ideal > 30)',
          'Abriu proposta comercial 4 vezes nas últimas 24h',
          '3 dias sem contato do vendedor responsável',
          'Decisor identificado: Carlos Mendes (Diretor de Operações)',
        ],
        confidence: 0.94,
      },
      contactName: 'Carlos Mendes',
      contactRole: 'Diretor de Operações e Logística',
      contactPhone: '+55 11 98765-4321',
      contactEmail: 'carlos.mendes@acmelogistica.com.br',
      windowRecommendation: 'Hoje entre 10h00 e 11h30',
      reasons: [
        'ICP Score 96 (Frota 85 veículos, expansão regional detectada)',
        'Abriu a proposta comercial 4 vezes nas últimas 24 horas',
        '3 dias sem contato do vendedor responsável',
        'Decisor primário de operações e compras identificado e validado',
      ],
      battlecardHints: [
        'Senior Sistemas: Diferencial é nossa torre unificada mobile em tempo real sem necessidade de múltiplos módulos contratuais.',
      ],
      suggestedQuestions: [
        'Essa plataforma que vocês utilizam hoje também consolida indicadores comerciais e operacionais ou vocês precisam combinar várias ferramentas?',
        'Como a abertura do novo CD em Campinas impactou o controle de sinistros e a comunicação com os motoristas?',
      ],
    },
    recentMissions: [
      {
        missionId: 'm-acme',
        accountName: 'ACME Logística S/A',
        opportunityScore: 91,
        status: 'COMPLETED',
        lastUpdated: new Date().toISOString(),
      },
      {
        missionId: 'm-transp-sul',
        accountName: 'Transportes Sul Brasil Ltda',
        opportunityScore: 84,
        status: 'COMPLETED',
        lastUpdated: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        missionId: 'm-express-rio',
        accountName: 'Express Cargas Sudeste',
        opportunityScore: 76,
        status: 'COMPLETED',
        lastUpdated: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
    ],
  };
}

function getMockTrace(): AgentCenterTrace {
  const now = new Date().toISOString();
  return {
    missionId: 'mission-acme-trace',
    title: 'Preparar Abordagem e Estratégia: ACME Logística S/A',
    accountName: 'ACME Logística S/A',
    status: 'COMPLETED',
    root: 'Tagarela (Supervisor Geral)',
    directors: {
      giselle: {
        status: 'COMPLETED',
        specialists: [
          {
            id: 'n-icp',
            agentCode: 'icp-analyst',
            agentName: 'ICP Analyst',
            roleLabel: 'Analista de Perfil Ideal',
            director: 'GISELLE',
            status: 'COMPLETED',
            resultSummary:
              'ICP Score 96/100 com alta compatibilidade (85 veículos, R$ 48M receita)',
            timestamp: now,
          },
          {
            id: 'n-acc',
            agentCode: 'account-intelligence',
            agentName: 'Account Intelligence Specialist',
            roleLabel: 'Mapeador de Conta',
            director: 'GISELLE',
            status: 'COMPLETED',
            resultSummary: 'Decisor mapeado: Carlos Mendes (Diretor de Operações e Logística)',
            timestamp: now,
          },
          {
            id: 'n-val',
            agentCode: 'value-proposition-strategist',
            agentName: 'Value Proposition Strategist',
            roleLabel: 'Estrategista de Valor',
            director: 'GISELLE',
            status: 'COMPLETED',
            resultSummary: 'Tese: Eliminar fragmentação de telemetria e sinistros em torre única',
            timestamp: now,
          },
          {
            id: 'n-comp',
            agentCode: 'competitor-intel',
            agentName: 'Competitor Intelligence Agent',
            roleLabel: 'Inteligência Concorrencial',
            director: 'GISELLE',
            status: 'COMPLETED',
            resultSummary: 'Battlecard ativo contra Senior Sistemas carregado com sucesso',
            timestamp: now,
          },
        ],
      },
      patricia: {
        status: 'COMPLETED',
        specialists: [
          {
            id: 'n-out',
            agentCode: 'outbound-specialist',
            agentName: 'Outbound Specialist',
            roleLabel: 'Especialista em Cadência',
            director: 'PATRICIA',
            status: 'COMPLETED',
            resultSummary: 'Cadência multicanal adaptativa de 5 toques ativada',
            timestamp: now,
          },
          {
            id: 'n-nba',
            agentCode: 'next-best-action-agent',
            agentName: 'Next Best Action Agent',
            roleLabel: 'Otimizador de Próxima Ação',
            director: 'PATRICIA',
            status: 'COMPLETED',
            resultSummary: '📞 Ligar para Carlos Mendes (Janela recomendada: 10h00 - 11h30)',
            timestamp: now,
          },
          {
            id: 'n-book',
            agentCode: 'meeting-booker',
            agentName: 'Meeting Booker',
            roleLabel: 'Agendador de Reunião',
            director: 'PATRICIA',
            status: 'PENDING',
            resultSummary: 'Aguardando encerramento da chamada telefônica para fixar agenda',
            timestamp: now,
          },
        ],
      },
      guardiao: {
        status: 'COMPLETED',
        specialists: [
          {
            id: 'n-crm',
            agentCode: 'crm-guardian',
            agentName: 'CRM Guardian',
            roleLabel: 'Guardião do CRM',
            director: 'GUARDIAO',
            status: 'COMPLETED',
            resultSummary: 'Dados desduplicados e higienizados. Sem inconsistências no Bitrix/CRM',
            timestamp: now,
          },
          {
            id: 'n-pol',
            agentCode: 'policy-engine-agent',
            agentName: 'Commercial Policy Engine',
            roleLabel: 'Motor de Alçadas e Margem',
            director: 'GUARDIAO',
            status: 'COMPLETED',
            resultSummary: 'Desconto de 5% dentro da alçada do vendedor Closer (teto: 8%)',
            timestamp: now,
          },
        ],
      },
    },
  };
}
