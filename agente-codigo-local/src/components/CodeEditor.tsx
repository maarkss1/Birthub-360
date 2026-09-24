import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Copy,
  Check,
  RotateCcw,
  FileCode,
  FileText,
  FileJson,
  Sparkles,
  Columns,
  X,
  Play,
  MessageSquare,
  Wand2,
  Bug,
  Download,
  AlignLeft,
  ChevronRight,
  Folder,
  FileCheck,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  FlaskConical,
  Activity,
  Zap,
  BookOpen
} from 'lucide-react';
import { CodeSelectionContext, ESLintConfig } from '../types/agent';
import { sounds } from '../services/soundEffects';
import { lintCode, autoFixCode, isLintableFile, LintDiagnostic } from '../services/eslintHelper';

interface CodeEditorProps {
  filePath: string | null;
  content: string;
  openTabs?: string[];
  onSelectTab?: (path: string) => void;
  onCloseTab?: (path: string) => void;
  onSaveContent: (newContent: string) => void;
  onOpenDiff?: () => void;
  hasDiff?: boolean;
  onRunInTerminal?: () => void;
  onAskAboutSelection?: (context: CodeSelectionContext) => void;
  eslintConfig?: ESLintConfig;
  onAskAgentToFixLint?: (prompt: string) => void;
  onOpenTestGenerator?: () => void;
  onOpenCodeAnalysis?: (selection?: CodeSelectionContext) => void;
  onOpenJSDoc?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  filePath,
  content,
  openTabs = [],
  onSelectTab,
  onCloseTab,
  onSaveContent,
  onOpenDiff,
  hasDiff = false,
  onRunInTerminal,
  onAskAboutSelection,
  eslintConfig,
  onAskAgentToFixLint,
  onOpenTestGenerator,
  onOpenCodeAnalysis,
  onOpenJSDoc
}) => {
  const [currentValue, setCurrentValue] = useState(content);
  const [copied, setCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectionContext, setSelectionContext] = useState<CodeSelectionContext | null>(null);
  const [showLintPanel, setShowLintPanel] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Real-time lint evaluation
  const lintDiagnostics: LintDiagnostic[] = React.useMemo(() => {
    if (!filePath || !eslintConfig || !eslintConfig.enabled) return [];
    return lintCode(filePath, currentValue, eslintConfig);
  }, [filePath, currentValue, eslintConfig]);

  const errorCount = lintDiagnostics.filter((d) => d.severity === 'error').length;
  const warnCount = lintDiagnostics.filter((d) => d.severity === 'warn').length;

  const handleAutoFixLint = () => {
    if (!filePath) return;
    const fixed = autoFixCode(filePath, currentValue, eslintConfig);
    if (fixed !== currentValue) {
      setCurrentValue(fixed);
      setIsDirty(fixed !== content);
      sounds.playSuccessChime();
    }
  };

  const handleJumpToLine = (lineNum: number) => {
    if (!textareaRef.current) return;
    const lines = currentValue.split('\n');
    let charIndex = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
      charIndex += lines[i].length + 1; // +1 for \n
    }
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charIndex, charIndex + (lines[lineNum - 1]?.length || 0));
  };

  useEffect(() => {
    setCurrentValue(content);
    setIsDirty(false);
    setSelectionContext(null);
  }, [content, filePath]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentValue(e.target.value);
    setIsDirty(e.target.value !== content);
  };

  const handleSave = () => {
    onSaveContent(currentValue);
    setIsDirty(false);
    sounds.playSuccessChime();
  };

  const handleReset = () => {
    setCurrentValue(content);
    setIsDirty(false);
    sounds.playClick();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentValue);
      setCopied(true);
      sounds.playClick();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleFormatCode = () => {
    if (!currentValue) return;
    try {
      sounds.playClick();
      if (filePath?.endsWith('.json')) {
        const parsed = JSON.parse(currentValue);
        const formatted = JSON.stringify(parsed, null, 2);
        setCurrentValue(formatted);
        setIsDirty(formatted !== content);
        return;
      }
      // For generic code, trim trailing spaces per line and ensure single final newline
      const formatted = currentValue
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n');
      setCurrentValue(formatted);
      setIsDirty(formatted !== content);
    } catch (err: any) {
      alert(`Não foi possível formatar: ${err.message}`);
    }
  };

  const handleDownloadFile = () => {
    if (!filePath) return;
    const fileName = filePath.split('/').pop() || 'arquivo.txt';
    const blob = new Blob([currentValue], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcut Ctrl+S / Cmd+S
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  // Handle text selection for AI contextual questions
  const handleSelectText = () => {
    const el = textareaRef.current;
    if (!el || !filePath) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start === end || Math.abs(end - start) < 3) {
      setSelectionContext(null);
      return;
    }

    const selectedCode = el.value.slice(start, end);
    const beforeText = el.value.slice(0, start);
    const startLine = beforeText.split('\n').length;
    const endLine = startLine + selectedCode.split('\n').length - 1;

    setSelectionContext({
      filePath,
      startLine,
      endLine,
      code: selectedCode
    });
  };

  const handleTriggerAsk = (actionType: 'explain' | 'refactor' | 'custom') => {
    if (!selectionContext || !onAskAboutSelection) return;

    let promptSuggestion = '';
    if (actionType === 'explain') {
      promptSuggestion = `Explique em detalhes o que o trecho de código selecionado nas linhas ${selectionContext.startLine}-${selectionContext.endLine} de "${selectionContext.filePath}" faz e aponte possíveis melhorias.`;
    } else if (actionType === 'refactor') {
      promptSuggestion = `Refatore o seguinte trecho de código selecionado nas linhas ${selectionContext.startLine}-${selectionContext.endLine} de "${selectionContext.filePath}" para torná-lo mais performático, limpo e seguro:`;
    } else {
      promptSuggestion = `Sobre o trecho selecionado em "${selectionContext.filePath}" (linhas ${selectionContext.startLine}-${selectionContext.endLine}):`;
    }

    onAskAboutSelection({
      ...selectionContext,
      promptSuggestion
    });
    setSelectionContext(null);
  };

  const getTabIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'mjs':
        return <span className="text-amber-400 font-mono text-[10px] font-bold">JS</span>;
      case 'ts':
        return <span className="text-sky-400 font-mono text-[10px] font-bold">TS</span>;
      case 'json':
        return <FileJson className="w-3 h-3 text-amber-300" />;
      case 'html':
        return <span className="text-orange-400 font-mono text-[10px] font-bold">HTML</span>;
      case 'css':
        return <span className="text-blue-400 font-mono text-[10px] font-bold">CSS</span>;
      case 'md':
        return <FileText className="w-3 h-3 text-purple-400" />;
      default:
        return <FileCode className="w-3 h-3 text-slate-400" />;
    }
  };

  if (!filePath && openTabs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-[#0b0f17]">
        <FileCode className="w-12 h-12 text-slate-700 mb-3 stroke-1" />
        <h3 className="text-sm font-semibold text-slate-300 mb-1">Nenhum arquivo aberto</h3>
        <p className="text-xs max-w-sm text-slate-500">
          Selecione um arquivo no explorador à esquerda para inspecionar, editar ou ver as modificações feitas pelo agente.
        </p>
      </div>
    );
  }

  const lines = currentValue.split('\n');
  const lineCount = lines.length;
  const charCount = currentValue.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f17] overflow-hidden relative">
      {/* Multi-Tab Bar */}
      <div className="h-9 border-b border-slate-800 bg-[#090d16] px-2 flex items-center justify-between overflow-x-auto select-none">
        {/* Tabs scroll container */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-2">
          {openTabs.map((tabPath) => {
            const isActive = tabPath === filePath;
            const tabName = tabPath.split('/').pop() || tabPath;
            return (
              <div
                key={tabPath}
                onClick={() => onSelectTab && onSelectTab(tabPath)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-t-md text-xs font-mono cursor-pointer transition-colors border-t-2 shrink-0 ${
                  isActive
                    ? 'bg-[#080c16] text-blue-300 border-blue-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-transparent'
                }`}
                title={tabPath}
              >
                {getTabIcon(tabPath)}
                <span className="truncate max-w-[140px]">{tabName}</span>
                {isActive && isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Não salvo" />
                )}
                {onCloseTab && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tabPath);
                    }}
                    className="p-0.5 text-slate-500 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors ml-0.5 opacity-60 group-hover:opacity-100"
                    title="Fechar aba"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* AI JSDoc Documentation Generator */}
          {filePath && onOpenJSDoc && (
            <button
              onClick={onOpenJSDoc}
              className="flex items-center gap-1 text-xs text-pink-300 hover:text-pink-100 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/35 px-2 py-1 rounded transition-colors shadow-xs shadow-pink-500/10"
              title="Analisar e gerar/atualizar comentários JSDoc com IA para funções e classes exportadas"
            >
              <BookOpen className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline font-medium">JSDoc IA</span>
            </button>
          )}

          {onRunInTerminal && (
            <button
              onClick={onRunInTerminal}
              className="flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-2 py-1 rounded transition-colors"
              title="Executar este arquivo no sandbox do Terminal"
            >
              <Play className="w-3 h-3 fill-current" />
              <span className="hidden sm:inline">Executar</span>
            </button>
          )}

          {hasDiff && onOpenDiff && (
            <button
              onClick={onOpenDiff}
              className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200 bg-red-950/30 hover:bg-red-950/60 border border-red-800/50 px-2 py-1 rounded transition-colors"
              title="Comparar com a versão anterior"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Diff</span>
            </button>
          )}

          {/* Unit Test Generator */}
          {filePath && onOpenTestGenerator && (
            <button
              onClick={onOpenTestGenerator}
              className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded transition-colors"
              title="Gerar testes unitários (.test.js / .test.ts) com o modelo de IA selecionado"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gerar Testes</span>
            </button>
          )}

          {/* Cyclomatic Complexity & Performance Optimization */}
          {filePath && onOpenCodeAnalysis && (
            <button
              onClick={() => onOpenCodeAnalysis(selectionContext || undefined)}
              className="flex items-center gap-1 text-xs text-pink-300 hover:text-pink-200 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 px-2 py-1 rounded transition-colors"
              title={
                selectionContext
                  ? "Analisar complexidade ciclomática e otimizar performance da seleção atual"
                  : "Analisar complexidade ciclomática e otimizar performance do arquivo atual"
              }
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Complexidade & Perf</span>
            </button>
          )}

          {/* ESLint Real-Time Status & Auto-fix */}
          {isLintableFile(filePath) && eslintConfig?.enabled && (
            <>
              <button
                onClick={() => setShowLintPanel(!showLintPanel)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors border ${
                  lintDiagnostics.length > 0
                    ? 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
                    : 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30'
                }`}
                title="Alternar painel de problemas do ESLint"
              >
                <Shield className={`w-3.5 h-3.5 ${lintDiagnostics.length > 0 ? 'text-amber-400' : 'text-blue-400'}`} />
                <span className="font-mono font-medium">
                  {lintDiagnostics.length > 0 ? `${lintDiagnostics.length} ESLint` : 'ESLint ✓'}
                </span>
              </button>

              {lintDiagnostics.length > 0 && (
                <button
                  onClick={handleAutoFixLint}
                  className="flex items-center gap-1 text-xs text-pink-300 hover:text-pink-200 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 px-2 py-1 rounded transition-colors"
                  title="Corrigir problemas automaticamente (ponto e vírgula, aspas, espaços e tipos any)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span className="hidden lg:inline">Fix ESLint</span>
                </button>
              )}
            </>
          )}

          {isDirty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
              title="Reverter alterações manuais"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded font-bold transition-colors ${
              isDirty
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-xs'
                : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
            }`}
            title="Salvar arquivo (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            title="Copiar todo o código"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>

          <button
            onClick={handleFormatCode}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            title="Formatar código (JSON e indentação)"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Formatar</span>
          </button>

          <button
            onClick={handleDownloadFile}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            title="Baixar este arquivo individualmente"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Supremium Breadcrumbs Bar */}
      {filePath && (
        <div className="h-7 border-b border-slate-800/80 bg-[#0a0e17] px-3 flex items-center justify-between text-[11px] font-mono select-none shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400 overflow-x-auto scrollbar-none min-w-0">
            <Folder className="w-3 h-3 text-slate-500 shrink-0" />
            {filePath.split('/').map((segment, idx, arr) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                <span
                  className={
                    idx === arr.length - 1
                      ? 'text-teal-300 font-semibold truncate'
                      : 'text-slate-400 hover:text-slate-300 transition-colors'
                  }
                >
                  {segment}
                </span>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0 ml-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(filePath);
                sounds.playClick();
              }}
              className="hover:text-teal-300 transition-colors flex items-center gap-1"
              title="Copiar caminho relativo do arquivo"
            >
              <Copy className="w-2.5 h-2.5" />
              <span>Caminho</span>
            </button>
            <span>·</span>
            <span>{lineCount}L</span>
            <span>·</span>
            <span>{charCount}C</span>
          </div>
        </div>
      )}

      {/* Floating Selection Tooltip ("Ask AI about selection") */}
      {selectionContext && (
        <div className="absolute top-12 right-6 z-20 flex items-center gap-1.5 p-1.5 bg-[#131b2c] border border-teal-500/40 rounded-lg shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <span className="text-[11px] font-mono text-teal-400 px-1.5">
            L{selectionContext.startLine}-{selectionContext.endLine}
          </span>
          {onOpenCodeAnalysis && (
            <button
              onClick={() => onOpenCodeAnalysis(selectionContext)}
              className="flex items-center gap-1 px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-semibold text-xs rounded transition-colors"
              title="Analisar complexidade ciclomática e sugestões de refatoração para otimização de performance deste trecho"
            >
              <Activity className="w-3 h-3 text-purple-300" />
              <span>Complexidade & Otimização</span>
            </button>
          )}
          <button
            onClick={() => handleTriggerAsk('custom')}
            className="flex items-center gap-1 px-2 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded transition-colors"
            title="Enviar seleção para o Chat do Agente"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Perguntar à IA</span>
          </button>
          <button
            onClick={() => handleTriggerAsk('refactor')}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors"
            title="Pedir para refatorar esta seleção"
          >
            <Wand2 className="w-3 h-3 text-purple-400" />
            <span>Refatorar</span>
          </button>
          <button
            onClick={() => handleTriggerAsk('explain')}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors"
            title="Explicar o código selecionado"
          >
            <Bug className="w-3 h-3 text-amber-400" />
            <span>Explicar</span>
          </button>
          <button
            onClick={() => setSelectionContext(null)}
            className="p-1 text-slate-500 hover:text-slate-300 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Editor Main Canvas with Line Numbers */}
      <div className="flex-1 flex overflow-hidden relative font-mono text-[13px] leading-relaxed">
        {/* Line Numbers Gutter */}
        <div
          aria-hidden="true"
          className="select-none py-3 px-3 text-right bg-[#090d14] text-slate-600 border-r border-slate-800/80 font-mono text-xs w-12 shrink-0 overflow-hidden"
        >
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
            <div key={i} className="leading-relaxed">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Input / Viewer */}
        <textarea
          ref={textareaRef}
          value={currentValue}
          onChange={handleChange}
          onSelect={handleSelectText}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="flex-1 h-full py-3 px-4 bg-transparent text-slate-100 resize-none focus:outline-none font-mono text-[13px] leading-relaxed overflow-auto whitespace-pre tab-4"
          placeholder="Arquivo vazio..."
        />
      </div>

      {/* Collapsible ESLint Problems Panel */}
      {showLintPanel && isLintableFile(filePath) && eslintConfig?.enabled && (
        <div className="border-t border-slate-800 bg-[#0d131f] flex flex-col max-h-56 shrink-0 font-mono text-xs animate-in slide-in-from-bottom-2 duration-150">
          {/* Header */}
          <div className="h-8 px-3 bg-[#0a0f1a] border-b border-slate-800 flex items-center justify-between text-slate-300 select-none">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold text-slate-200">Problemas de Linting</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {lintDiagnostics.length} {lintDiagnostics.length === 1 ? 'problema' : 'problemas'}
              </span>
              {errorCount > 0 && (
                <span className="text-[10px] text-rose-400 font-medium">
                  {errorCount} {errorCount === 1 ? 'erro' : 'erros'}
                </span>
              )}
              {warnCount > 0 && (
                <span className="text-[10px] text-amber-400 font-medium">
                  {warnCount} {warnCount === 1 ? 'aviso' : 'avisos'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {lintDiagnostics.length > 0 && (
                <>
                  <button
                    onClick={handleAutoFixLint}
                    className="flex items-center gap-1 text-[11px] text-teal-300 hover:text-teal-200 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 rounded transition-colors"
                    title="Aplicar correções automáticas"
                  >
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>Auto-fix</span>
                  </button>

                  {onAskAgentToFixLint && (
                    <button
                      onClick={() => {
                        const prompt = `Por favor, corrija os seguintes problemas de ESLint detectados no arquivo "${filePath}" mantendo a conformidade com as diretrizes do projeto:\n` +
                          lintDiagnostics.map((d) => `- Linha ${d.line}:${d.column}: [${d.ruleId}] ${d.message}`).join('\n');
                        onAskAgentToFixLint(prompt);
                      }}
                      className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded transition-colors"
                      title="Pedir para o agente de IA corrigir os problemas de linting"
                    >
                      <Wand2 className="w-3 h-3 text-purple-400" />
                      <span>Pedir ao Agente</span>
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => setShowLintPanel(false)}
                className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 transition-colors"
                title="Fechar painel de problemas"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List of diagnostics */}
          <div className="overflow-y-auto divide-y divide-slate-800/60 p-1 max-h-48">
            {lintDiagnostics.length === 0 ? (
              <div className="py-4 px-3 flex items-center justify-center gap-2 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Nenhum problema encontrado. O arquivo cumpre 100% das regras de ESLint!</span>
              </div>
            ) : (
              lintDiagnostics.map((diag) => (
                <div
                  key={diag.id}
                  onClick={() => handleJumpToLine(diag.line)}
                  className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/40 rounded cursor-pointer transition-colors group"
                  title="Clique para pular para esta linha"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {diag.severity === 'error' ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    )}

                    <span className="text-slate-500 text-[11px] shrink-0 font-mono">
                      L{diag.line}:{diag.column}
                    </span>

                    <span className="text-slate-300 truncate text-[12px]">
                      {diag.message}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] text-purple-400/80 bg-purple-500/10 px-1.5 py-0.5 rounded font-mono">
                      {diag.ruleId}
                    </span>
                    {diag.fixable && (
                      <span className="text-[9px] text-teal-400/80 border border-teal-500/30 px-1 rounded">
                        fix
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Editor Status Bar */}
      <div className="h-6 bg-[#090d14] border-t border-slate-800/80 px-3 flex items-center justify-between text-[11px] text-slate-500 font-mono select-none">
        <div className="flex items-center gap-3">
          <span>{lineCount} linhas</span>
          <span>·</span>
          <span>{charCount} caracteres</span>
          {filePath && (
            <>
              <span>·</span>
              <span className="text-slate-400 truncate max-w-xs">{filePath}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isLintableFile(filePath) && eslintConfig?.enabled && (
            <button
              onClick={() => setShowLintPanel(!showLintPanel)}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Shield className={`w-3 h-3 ${lintDiagnostics.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span>
                ESLint: {lintDiagnostics.length > 0 ? `${lintDiagnostics.length} avisos` : 'Limpo'}
              </span>
            </button>
          )}
          <span>UTF-8</span>
          <span>·</span>
          <span>Espaços: 2</span>
        </div>
      </div>
    </div>
  );
};
