import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  X,
  Zap,
  Sparkles,
  Shield,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  Code2,
  GitBranch,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  Wand2,
  RotateCcw,
  Loader2,
  TrendingDown
} from 'lucide-react';
import { ProviderConfig, CodeSelectionContext } from '../types/agent';
import {
  CyclomaticMetrics,
  PerformanceAnalysisResult,
  RefactoringSuggestion,
  calculateCyclomaticComplexity,
  analyzePerformanceAndRefactor
} from '../services/codeAnalysis';
import { sounds } from '../services/soundEffects';

interface CodeAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string | null;
  codeToAnalyze: string;
  selectionContext: CodeSelectionContext | null;
  config: ProviderConfig;
  onApplyRefactoredCode: (newCode: string, isSnippetOnly: boolean) => void;
  onJumpToLine?: (line: number) => void;
}

export const CodeAnalysisModal: React.FC<CodeAnalysisModalProps> = ({
  isOpen,
  onClose,
  filePath,
  codeToAnalyze,
  selectionContext,
  config,
  onApplyRefactoredCode,
  onJumpToLine
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'suggestions'>('metrics');
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<PerformanceAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedSuggestionId, setAppliedSuggestionId] = useState<string | null>(null);
  const [appliedAll, setAppliedAll] = useState(false);

  // Compute deterministic metrics immediately when codeToAnalyze changes
  const metrics: CyclomaticMetrics = useMemo(() => {
    return calculateCyclomaticComplexity(codeToAnalyze, filePath || undefined);
  }, [codeToAnalyze, filePath]);

  const isSnippet = Boolean(selectionContext);

  useEffect(() => {
    if (isOpen) {
      setAiAnalysisResult(null);
      setAiError(null);
      setAppliedSuggestionId(null);
      setAppliedAll(false);
      // If code complexity is moderate or high, or if opened from refactor context, start with suggestions tab or metrics
      if (selectionContext?.code) {
        setActiveTab('metrics');
      }
    }
  }, [isOpen, selectionContext]);

  if (!isOpen) return null;

  const handleRunAiAnalysis = async () => {
    setIsAnalyzingAI(true);
    setAiError(null);
    sounds.playClick();

    try {
      const res = await analyzePerformanceAndRefactor(
        config,
        codeToAnalyze,
        filePath || 'arquivo.js',
        metrics
      );
      setAiAnalysisResult(res);
      setActiveTab('suggestions');
      sounds.playSuccessChime();
    } catch (err: any) {
      setAiError(err.message || 'Falha ao analisar otimizações com o modelo selecionado.');
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleApplySingleSuggestion = (suggestion: RefactoringSuggestion) => {
    if (!suggestion.optimizedSnippet) return;

    if (isSnippet) {
      // Apply snippet directly
      onApplyRefactoredCode(suggestion.optimizedSnippet, true);
    } else if (aiAnalysisResult?.overallOptimizedCode) {
      onApplyRefactoredCode(aiAnalysisResult.overallOptimizedCode, false);
    } else {
      // Replace originalSnippet with optimizedSnippet in full code
      if (codeToAnalyze.includes(suggestion.originalSnippet)) {
        const updated = codeToAnalyze.replace(suggestion.originalSnippet, suggestion.optimizedSnippet);
        onApplyRefactoredCode(updated, false);
      } else {
        onApplyRefactoredCode(suggestion.optimizedSnippet, false);
      }
    }

    setAppliedSuggestionId(suggestion.id);
    sounds.playSuccessChime();
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleApplyAllOptimizations = () => {
    if (!aiAnalysisResult?.overallOptimizedCode) return;
    onApplyRefactoredCode(aiAnalysisResult.overallOptimizedCode, isSnippet);
    setAppliedAll(true);
    sounds.playSuccessChime();
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      sounds.playClick();
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Complexity visual helpers
  const getRatingBadge = (rating: CyclomaticMetrics['rating']) => {
    switch (rating) {
      case 'low':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Baixa Complexidade (Excelente)
          </span>
        );
      case 'moderate':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Complexidade Moderada (Adequado)
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            Alta Complexidade (Risco de Defeitos)
          </span>
        );
      case 'critical':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            Complexidade Crítica (Refatoração Urgente)
          </span>
        );
    }
  };

  const getImpactBadge = (impact: RefactoringSuggestion['impact']) => {
    switch (impact) {
      case 'high':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
            Alto Impacto
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Médio Impacto
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
            Otimização Fina
          </span>
        );
    }
  };

  const modelDisplayName = config.model || (config.provider === 'gemini' ? 'gemini-2.5-flash' : config.provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[840px] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-800 bg-[#0a0f1d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-100">
                  Complexidade Ciclomática & Otimização de Performance
                </h2>
                {isSnippet ? (
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Trecho L{selectionContext?.startLine}-L{selectionContext?.endLine}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Arquivo Completo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md font-mono">
                {filePath || 'Código ativo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Action Header */}
        <div className="h-11 px-5 border-b border-slate-800 bg-[#0c1222] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Métricas de Complexidade ({metrics.totalComplexity})</span>
            </button>

            <button
              onClick={() => setActiveTab('suggestions')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'suggestions'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Sugestões de Refatoração & Performance</span>
              {aiAnalysisResult && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500/30 text-teal-200 font-mono">
                  {aiAnalysisResult.suggestions.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleRunAiAnalysis}
            disabled={isAnalyzingAI}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-purple-600/20"
          >
            {isAnalyzingAI ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analisando Performance com IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Analisar Otimizações com {modelDisplayName}</span>
              </>
            )}
          </button>
        </div>

        {/* Tab 1: Deterministic Cyclomatic Metrics */}
        {activeTab === 'metrics' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#0b0f17]">
            {/* Top Score Summary Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#141b2d] to-[#121927] border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-mono font-bold border ${
                    metrics.totalComplexity >= 21
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                      : metrics.totalComplexity >= 11
                      ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                      : metrics.totalComplexity >= 6
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  <span className="text-2xl leading-none">{metrics.totalComplexity}</span>
                  <span className="text-[10px] font-sans font-normal opacity-80 mt-1">CC</span>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-slate-100">Complexidade Ciclomática (McCabe)</h3>
                    {getRatingBadge(metrics.rating)}
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl">
                    {metrics.rating === 'low' &&
                      'O código possui caminhos de execução lineares e bem definidos. Fácil de compreender, testar com 100% de cobertura e manter.'}
                    {metrics.rating === 'moderate' &&
                      'O código apresenta ramificações moderadas. Mantenha os testes unitários atualizados para garantir a estabilidade das condicionais.'}
                    {metrics.rating === 'high' &&
                      'Múltiplas ramificações interdependentes aumentam a chance de bugs em casos de borda. Refatoração recomendada para isolar responsabilidades.'}
                    {metrics.rating === 'critical' &&
                      'Código com altíssima complexidade e alto acoplamento de decisões. Fortemente recomendada a extração de funções e simplificação de fluxo.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                <button
                  onClick={handleRunAiAnalysis}
                  disabled={isAnalyzingAI}
                  className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-teal-500/10"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Obter Sugestões de Refatoração</span>
                </button>
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-[#111827] border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-medium">Pontos de Decisão</span>
                  <GitBranch className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl font-bold font-mono text-purple-300">
                  {metrics.decisionPointsCount}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  if, loops, cases, operadores lógicos
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#111827] border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-medium">Índice Manutenibilidade</span>
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-300">
                  {metrics.maintainabilityIndex}
                  <span className="text-xs text-slate-500 font-sans font-normal"> / 100</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {metrics.maintainabilityIndex >= 70 ? 'Fácil manutenção' : 'Requer atenção'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#111827] border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-medium">Complexidade Cognitiva</span>
                  <Cpu className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl font-bold font-mono text-sky-300">
                  {metrics.cognitiveComplexity}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Penalidade por aninhamento</p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#111827] border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-medium">Linhas de Código Efetivas</span>
                  <Code2 className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl font-bold font-mono text-amber-300">
                  {metrics.codeLinesCount}
                  <span className="text-xs text-slate-500 font-sans font-normal">
                    {' '}(total: {metrics.lineCount})
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Exclui comentários e linhas vazias</p>
              </div>
            </div>

            {/* Functions Breakdown (if detected) */}
            {metrics.functionComplexities.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-[#0e1422] p-4">
                <h4 className="text-xs font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <span>Complexidade por Função / Método</span>
                </h4>
                <div className="space-y-2">
                  {metrics.functionComplexities.map((fn, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#121a2c] border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-teal-300 font-semibold truncate">
                          {fn.name}()
                        </span>
                        <span className="text-slate-500 text-[11px] font-mono">
                          (L{fn.startLine}-{fn.endLine})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs text-slate-300 font-medium">
                          CC: <strong className="text-purple-300">{fn.complexity}</strong>
                        </span>
                        {getRatingBadge(fn.rating)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision Points List */}
            <div className="rounded-xl border border-slate-800 bg-[#0e1422] p-4">
              <h4 className="text-xs font-semibold text-slate-200 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-purple-400" />
                  <span>Pontos de Ramificação e Decisão ({metrics.decisionPoints.length})</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Clique na linha para navegar no editor
                </span>
              </h4>

              {metrics.decisionPoints.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  Nenhum ponto de decisão encontrado neste trecho de código (execução puramente linear).
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {metrics.decisionPoints.map((dp, idx) => (
                    <div
                      key={idx}
                      onClick={() => onJumpToLine && onJumpToLine(dp.line)}
                      className="group flex items-center justify-between p-2 rounded-lg bg-[#121a2c] hover:bg-[#162138] border border-slate-800/80 text-xs font-mono cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-400 font-bold shrink-0 text-[10px]">
                          L{dp.line}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] shrink-0 font-sans">
                          {dp.type}
                        </span>
                        <span className="text-slate-300 truncate max-w-lg">
                          {dp.snippet}
                        </span>
                      </div>
                      <span className="text-slate-600 group-hover:text-teal-400 transition-colors shrink-0 text-[10px] font-sans">
                        Pular →
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: AI Refactoring Suggestions & Performance Optimization */}
        {activeTab === 'suggestions' && (
          <div className="flex-1 overflow-y-auto p-5 bg-[#0b0f17]">
            {isAnalyzingAI ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="relative mb-4">
                  <div className="w-14 h-14 rounded-full border-2 border-purple-500/20 border-t-purple-400 animate-spin flex items-center justify-center" />
                  <Sparkles className="w-6 h-6 text-purple-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">
                  Analisando padrões algorítmicos e gargalos de performance...
                </h4>
                <p className="text-xs text-slate-500 max-w-md">
                  O modelo <span className="text-purple-300 font-mono">{modelDisplayName}</span> está avaliando complexidade assintótica, alocações de memória e sintetizando refatorações otimizadas.
                </p>
              </div>
            ) : aiError ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Erro ao processar análise de performance</span>
                </div>
                <p>{aiError}</p>
                <button
                  onClick={handleRunAiAnalysis}
                  className="mt-2 self-start px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold"
                >
                  Tentar novamente
                </button>
              </div>
            ) : aiAnalysisResult ? (
              <div className="space-y-5">
                {/* Executive Summary */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#141b2d] to-[#121927] border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-semibold text-slate-100">
                        Relatório de Otimização & Performance
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                        {aiAnalysisResult.estimatedPerformanceGain}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      {aiAnalysisResult.summary}
                    </p>
                  </div>

                  {aiAnalysisResult.overallOptimizedCode && (
                    <button
                      onClick={handleApplyAllOptimizations}
                      disabled={appliedAll}
                      className="shrink-0 px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:bg-emerald-600 disabled:text-white text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/15"
                    >
                      {appliedAll ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Todas Aplicadas!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 fill-current" />
                          <span>Aplicar Todas as Otimizações</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Suggestions List */}
                <div className="space-y-4">
                  {aiAnalysisResult.suggestions.map((sug, idx) => {
                    const isApplied = appliedSuggestionId === sug.id;
                    return (
                      <div
                        key={sug.id || idx}
                        className="rounded-xl border border-slate-800 bg-[#0e1422] overflow-hidden"
                      >
                        {/* Suggestion Header */}
                        <div className="p-3.5 bg-[#121929] border-b border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {getImpactBadge(sug.impact)}
                            <h4 className="text-xs font-semibold text-slate-200 truncate">
                              {sug.title}
                            </h4>
                            {sug.timeComplexityBefore && sug.timeComplexityAfter && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 flex items-center gap-1 shrink-0">
                                <span>{sug.timeComplexityBefore}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="text-emerald-400 font-bold">{sug.timeComplexityAfter}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleCopy(sug.optimizedSnippet, sug.id)}
                              className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded text-xs flex items-center gap-1"
                              title="Copiar código otimizado"
                            >
                              {copiedId === sug.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span className="hidden sm:inline">Copiar</span>
                            </button>

                            <button
                              onClick={() => handleApplySingleSuggestion(sug)}
                              disabled={isApplied}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              {isApplied ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Aplicado</span>
                                </>
                              ) : (
                                <>
                                  <Wand2 className="w-3 h-3" />
                                  <span>Aplicar Refatoração</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Suggestion Explanation */}
                        <div className="p-3.5 text-xs text-slate-300 leading-relaxed border-b border-slate-800/60 bg-[#0d1320]">
                          {sug.explanation}
                        </div>

                        {/* Before vs After Code Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 text-xs font-mono">
                          {/* Original snippet */}
                          <div className="p-3 bg-[#0a0e17]">
                            <div className="flex items-center justify-between text-[11px] text-rose-400 font-semibold mb-1.5 select-none font-sans">
                              <span>Código Original</span>
                              {sug.timeComplexityBefore && (
                                <span className="font-mono text-slate-500 font-normal">
                                  {sug.timeComplexityBefore}
                                </span>
                              )}
                            </div>
                            <pre className="p-2 rounded bg-[#070a10] border border-rose-950/60 text-slate-300 overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap">
                              {sug.originalSnippet || '// Trecho original'}
                            </pre>
                          </div>

                          {/* Optimized snippet */}
                          <div className="p-3 bg-[#09111c]">
                            <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold mb-1.5 select-none font-sans">
                              <span>Código Refatorado & Otimizado</span>
                              {sug.timeComplexityAfter && (
                                <span className="font-mono text-emerald-400 font-bold">
                                  {sug.timeComplexityAfter}
                                </span>
                              )}
                            </div>
                            <pre className="p-2 rounded bg-[#070d16] border border-emerald-950/60 text-emerald-200 overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap">
                              {sug.optimizedSnippet}
                            </pre>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Zap className="w-12 h-12 text-slate-700 mb-3 stroke-1" />
                <h4 className="text-sm font-medium text-slate-300 mb-1">
                  Nenhuma análise de IA executada ainda
                </h4>
                <p className="text-xs text-slate-500 max-w-md mb-4">
                  Clique no botão abaixo para que o modelo{' '}
                  <span className="text-purple-300 font-mono">{modelDisplayName}</span> analise o código, encontre gargalos algorítmicos e gere refatorações de alto desempenho.
                </p>
                <button
                  onClick={handleRunAiAnalysis}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Analisar Código com IA Agora</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
