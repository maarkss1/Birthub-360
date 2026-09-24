import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Sparkles,
  Bot,
  User,
  Trash2,
  FolderSearch,
  BookOpen,
  FileEdit,
  Trash,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  Columns,
  Wand2,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Check,
  X,
  PanelRightClose,
  Zap,
  Shield,
  Layers,
  GitBranch
} from 'lucide-react';
import { ChatMessage, StepLog, AgentActionType, AgentAction } from '../types/agent';
import { sounds } from '../services/soundEffects';
import { AgentMode } from './CommandPalette';

export interface PendingApprovalData {
  stepNumber: number;
  action: AgentAction;
  oldContent?: string;
}

interface AgentChatProps {
  messages: ChatMessage[];
  currentSteps: StepLog[];
  isBusy: boolean;
  statusText: string;
  onSendMessage: (task: string) => void;
  onCancel: () => void;
  onClearHistory: () => void;
  onOpenFile: (path: string) => void;
  onOpenDiffForStep: (step: StepLog) => void;
  // Human-in-the-loop approval
  approvalMode: boolean;
  onToggleApprovalMode: () => void;
  pendingApproval: PendingApprovalData | null;
  onApproveStep: () => void;
  onRejectStep: (reason?: string) => void;
  onOpenDiffForApproval?: (action: AgentAction, oldContent?: string) => void;
  inputExternal?: string;
  onClearInputExternal?: () => void;
  onClose?: () => void;
  agentMode?: AgentMode;
  onSelectAgentMode?: (mode: AgentMode) => void;
}

const QUICK_COMMANDS = [
  {
    icon: '🧪',
    label: 'Testes',
    prompt: 'Escreva uma suite de testes completa com validações e cenários de erro para o projeto.'
  },
  {
    icon: '🛡️',
    label: 'Erros & Validação',
    prompt: 'Adicione tratamento de erros robusto, validação de schema e logs estruturados.'
  },
  {
    icon: '📝',
    label: 'Documentar',
    prompt: 'Adicione documentação JSDoc detalhada e atualize o README.md com instruções completas.'
  },
  {
    icon: '⚡',
    label: 'Otimizar',
    prompt: 'Otimize a performance do código, elimine duplicações e remova console.logs desnecessários.'
  },
  {
    icon: '📦',
    label: 'Commit Git',
    prompt: 'Analise todas as alterações feitas no projeto e realize um commit no Git com mensagem descritiva no padrão Conventional Commits.'
  },
  {
    icon: '🔍',
    label: 'Auditoria Bugs',
    prompt: 'Analise detalhadamente todos os arquivos procurando possíveis falhas de segurança e bugs.'
  }
];

export const AgentChat: React.FC<AgentChatProps> = ({
  messages,
  currentSteps,
  isBusy,
  statusText,
  onSendMessage,
  onCancel,
  onClearHistory,
  onOpenFile,
  onOpenDiffForStep,
  approvalMode,
  onToggleApprovalMode,
  pendingApproval,
  onApproveStep,
  onRejectStep,
  onOpenDiffForApproval,
  inputExternal,
  onClearInputExternal,
  onClose,
  agentMode = 'turbo',
  onSelectAgentMode
}) => {
  const [input, setInput] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external input (e.g. from code selection in editor)
  useEffect(() => {
    if (inputExternal) {
      setInput(inputExternal);
      textareaRef.current?.focus();
      if (onClearInputExternal) onClearInputExternal();
    }
  }, [inputExternal, onClearInputExternal]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentSteps, statusText, pendingApproval]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    sounds.playClick();
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleStepExpanded = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const getActionBadge = (type: AgentActionType) => {
    switch (type) {
      case 'list_files':
        return (
          <span className="flex items-center gap-1 text-[11px] text-sky-400 bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 rounded font-mono">
            <FolderSearch className="w-3 h-3" /> list_files
          </span>
        );
      case 'read_file':
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded font-mono">
            <BookOpen className="w-3 h-3" /> read_file
          </span>
        );
      case 'write_file':
        return (
          <span className="flex items-center gap-1 text-[11px] text-teal-400 bg-teal-950/40 border border-teal-800/40 px-2 py-0.5 rounded font-mono">
            <FileEdit className="w-3 h-3" /> write_file
          </span>
        );
      case 'patch_file':
        return (
          <span className="flex items-center gap-1 text-[11px] text-purple-400 bg-purple-950/40 border border-purple-800/40 px-2 py-0.5 rounded font-mono font-semibold">
            <Wand2 className="w-3 h-3" /> patch_file
          </span>
        );
      case 'delete_file':
        return (
          <span className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded font-mono">
            <Trash className="w-3 h-3" /> delete_file
          </span>
        );
      case 'git_commit':
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded font-mono font-semibold">
            <GitBranch className="w-3 h-3 text-amber-400" /> git_commit
          </span>
        );
      case 'say':
        return (
          <span className="flex items-center gap-1 text-[11px] text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-2 py-0.5 rounded font-mono">
            <MessageSquare className="w-3 h-3" /> say
          </span>
        );
      case 'done':
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded font-mono font-semibold">
            <CheckCircle2 className="w-3 h-3" /> done
          </span>
        );
    }
  };

  const renderStepCard = (step: StepLog) => {
    const isExpanded = expandedSteps.has(step.id);
    const { action } = step;

    return (
      <div
        key={step.id}
        className="border border-slate-800 bg-[#0d121d] rounded-lg overflow-hidden text-xs my-1.5 transition-all"
      >
        <div
          onClick={() => toggleStepExpanded(step.id)}
          className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 select-none"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="text-slate-500 font-mono text-[10px]">#{step.stepNumber}</span>
            {getActionBadge(action.action)}
            {action.path && (
              <span className="font-mono text-slate-200 text-[11px] truncate max-w-[200px]">
                {action.path}
              </span>
            )}
            {action.message && (
              <span className="text-slate-300 text-[11px] truncate max-w-[280px]">
                {action.message}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step.status === 'success' && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            {step.status === 'error' && (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            {step.status === 'pending' && (
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
            )}
          </div>
        </div>

        {/* Step Details when Expanded */}
        {isExpanded && (
          <div className="p-3 border-t border-slate-800/70 bg-[#090d15] space-y-2 font-mono text-[11px]">
            {action.path && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Arquivo:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenFile(action.path!)}
                    className="text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Abrir</span>
                  </button>
                  {((action.action === 'write_file' && step.previousContent !== undefined) ||
                    action.action === 'patch_file') && (
                    <button
                      onClick={() => onOpenDiffForStep(step)}
                      className="text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <Columns className="w-3 h-3" />
                      <span>Ver Diff</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {action.search && (
              <div>
                <span className="text-slate-500 block mb-1">Localizado para substituição:</span>
                <pre className="p-2 rounded bg-rose-950/20 border border-rose-900/30 text-rose-300 overflow-x-auto max-h-32 text-[10px]">
                  {action.search}
                </pre>
              </div>
            )}

            {action.replace !== undefined && (
              <div>
                <span className="text-slate-500 block mb-1">Novo trecho inserido:</span>
                <pre className="p-2 rounded bg-teal-950/20 border border-teal-900/30 text-teal-300 overflow-x-auto max-h-32 text-[10px]">
                  {action.replace}
                </pre>
              </div>
            )}

            {step.result && (
              <div>
                <span className="text-slate-500 block mb-1">Resultado:</span>
                <pre className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {step.result}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0f17] border-l border-slate-800">
      {/* Chat Header */}
      <div className="h-10 px-3 border-b border-slate-800 bg-[#0d121d] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold text-slate-200">Console do Agente</span>
          {isBusy && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Executando
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Human-in-the-loop toggle */}
          <button
            onClick={onToggleApprovalMode}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border font-sans transition-all ${
              approvalMode
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-medium'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={
              approvalMode
                ? 'Modo com aprovação manual ativado: você autoriza modificações em arquivos'
                : 'Modo autônomo ativado: agente executa sem pausar'
            }
          >
            {approvalMode ? (
              <>
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                <span>Aprovação Manual</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3 text-slate-400" />
                <span>Autônomo</span>
              </>
            )}
          </button>

          {messages.length > 0 && (
            <button
              onClick={onClearHistory}
              disabled={isBusy}
              className="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors disabled:opacity-40"
              title="Limpar histórico do chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors"
              title="Recolher painel do agente"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Supremium Agent Mode Selector */}
      {onSelectAgentMode && (
        <div className="h-8 bg-[#090d15] border-b border-slate-800/80 px-3 flex items-center justify-between text-[11px] shrink-0 select-none">
          <span className="text-slate-500 font-mono text-[10px] tracking-wider uppercase">Modo IA:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onSelectAgentMode('turbo');
                sounds.playClick();
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                agentMode === 'turbo'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold ring-1 ring-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              title="Turbo Coder: velocidade e iterações ágeis"
            >
              <Zap className="w-2.5 h-2.5" />
              <span>Turbo</span>
            </button>

            <button
              onClick={() => {
                onSelectAgentMode('architect');
                sounds.playClick();
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                agentMode === 'architect'
                  ? 'bg-purple-500/20 text-purple-300 font-semibold ring-1 ring-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              title="Deep Architect: arquitetura modular e raciocínio profundo"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>Architect</span>
            </button>

            <button
              onClick={() => {
                onSelectAgentMode('security');
                sounds.playClick();
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                agentMode === 'security'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold ring-1 ring-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              title="Security: auditoria defensiva e caça a bugs"
            >
              <Shield className="w-2.5 h-2.5" />
              <span>Security</span>
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col justify-center text-center p-4 text-slate-500 space-y-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-2">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Pronto para programar</h3>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
                Selecione uma tarefa rápida ou digite abaixo para o agente criar código e resolver problemas.
              </p>
            </div>

            {/* Quick Starter Cards */}
            <div className="grid grid-cols-1 gap-2 text-left pt-2">
              {QUICK_COMMANDS.slice(0, 3).map((cmd) => (
                <button
                  key={cmd.label}
                  type="button"
                  onClick={() => {
                    setInput(cmd.prompt);
                    sounds.playClick();
                    textareaRef.current?.focus();
                  }}
                  className="p-2.5 bg-slate-900/80 hover:bg-slate-850 border border-slate-800/80 hover:border-teal-500/30 rounded-xl transition-all group flex items-start gap-2.5 text-xs text-slate-300"
                >
                  <span className="text-sm shrink-0">{cmd.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-200 group-hover:text-teal-300 transition-colors">
                      {cmd.label}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {cmd.prompt}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing Messages */}
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex gap-2.5 items-start max-w-3xl">
                <div className="w-6 h-6 rounded-md bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-lg p-3 shadow-sm">
                  <div className="text-[10px] text-teal-400 font-semibold mb-1 uppercase tracking-wider">
                    Sua Tarefa
                  </div>
                  <p className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          }

          // Assistant / Steps output
          return (
            <div key={msg.id} className="flex gap-2.5 items-start max-w-3xl">
              <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 space-y-2">
                {msg.steps && msg.steps.length > 0 && (
                  <div className="space-y-1">
                    {msg.steps.map((step) => renderStepCard(step))}
                  </div>
                )}
                {msg.content && (
                  <div className="bg-[#0e1422] border border-slate-800/80 rounded-lg p-3 text-xs text-slate-200 leading-relaxed">
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Ongoing Steps for current turn */}
        {currentSteps.length > 0 && (
          <div className="flex gap-2.5 items-start max-w-3xl">
            <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="flex-1 space-y-1">
              {currentSteps.map((step) => renderStepCard(step))}
            </div>
          </div>
        )}

        {/* Real-time Status indicator */}
        {statusText && (
          <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg font-mono animate-pulse">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{statusText}</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Human-in-the-Loop Approval Banner */}
      {pendingApproval && (
        <div className="m-3 p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-amber-300">
                Aprovação Necessária (Passo #{pendingApproval.stepNumber})
              </span>
            </div>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
              {pendingApproval.action.action}
            </span>
          </div>

          <div className="text-xs text-slate-300">
            O agente deseja alterar o arquivo:{' '}
            <span className="font-mono text-amber-300 font-semibold">
              {pendingApproval.action.path}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {onOpenDiffForApproval && (
              <button
                type="button"
                onClick={() =>
                  onOpenDiffForApproval(pendingApproval.action, pendingApproval.oldContent)
                }
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Ver Diff</span>
              </button>
            )}

            <button
              type="button"
              onClick={onApproveStep}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aprovar & Executar</span>
            </button>

            <button
              type="button"
              onClick={() => onRejectStep('Ação rejeitada pelo usuário.')}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Rejeitar</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Commands Carousel / Pills */}
      <div className="px-3 pt-2 pb-1 border-t border-slate-800/80 bg-[#0d121d] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-teal-400" />
          Ações:
        </span>
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd.label}
            type="button"
            disabled={isBusy}
            onClick={() => {
              setInput(cmd.prompt);
              textareaRef.current?.focus();
            }}
            className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 text-[11px] text-slate-300 hover:text-teal-200 rounded-md transition-colors shrink-0 disabled:opacity-40"
          >
            <span>{cmd.icon}</span>
            <span>{cmd.label}</span>
          </button>
        ))}
      </div>

      {/* Input Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-[#0d121d] relative z-10"
      >
        <div className="flex gap-2 items-end bg-[#0b0f17] border border-slate-800 rounded-xl p-2 focus-within:border-teal-500/60 focus-within:ring-1 focus-within:ring-teal-500/20 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
            rows={2}
            placeholder={
              isBusy
                ? 'Agente trabalhando na tarefa...'
                : 'Descreva a tarefa (ex: crie rota POST /items com validação, ou selecione uma ação acima)...'
            }
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs resize-none focus:outline-none leading-relaxed"
          />

          {isBusy ? (
            <button
              type="button"
              onClick={onCancel}
              className="p-2.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
              title="Interromper agente"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Parar</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center shrink-0 shadow-sm"
              title="Executar tarefa (Enter)"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
