import React from 'react';
import {
  Terminal,
  Zap,
  Cpu,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Shield,
  Command,
  FlaskConical,
  Activity,
  GitBranch
} from 'lucide-react';
import { StorageMode } from '../types/agent';
import { AgentMode } from './CommandPalette';
import { sounds } from '../services/soundEffects';

interface StatusBarProps {
  storageMode: StorageMode;
  localFolderName: string | null;
  activeFilePath: string | null;
  fileContentLength?: number;
  isBusy: boolean;
  statusText?: string;
  hasPendingApproval: boolean;
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
  model: string;
  totalTokens: number;
  estimatedCostUsd: number;
  onOpenTokenStats: () => void;
  onOpenSettings: () => void;
  onOpenCommandPalette?: () => void;
  onOpenQuickOpen?: () => void;
  onOpenJSDoc?: () => void;
  agentMode?: AgentMode;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  eslintEnabled?: boolean;
  onOpenUnitTestGenerator?: () => void;
  onOpenCodeAnalysis?: () => void;
  activeFileComplexity?: number | null;
  onOpenAIStudio?: (tab?: 'chat' | 'music' | 'image' | 'video' | 'live' | 'grounding' | 'transcribe' | 'saved') => void;
  onOpenFirebaseAuth?: () => void;
  onOpenGit?: () => void;
  gitBranch?: string;
  uncommittedGitCount?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  storageMode,
  localFolderName,
  activeFilePath,
  fileContentLength = 0,
  isBusy,
  statusText,
  hasPendingApproval,
  isTerminalOpen,
  onToggleTerminal,
  model,
  totalTokens,
  estimatedCostUsd,
  onOpenTokenStats,
  onOpenSettings,
  onOpenCommandPalette,
  onOpenQuickOpen,
  onOpenJSDoc,
  agentMode = 'turbo',
  soundEnabled = true,
  onToggleSound,
  eslintEnabled = true,
  onOpenUnitTestGenerator,
  onOpenCodeAnalysis,
  activeFileComplexity,
  onOpenAIStudio,
  onOpenFirebaseAuth,
  onOpenGit,
  gitBranch = 'main',
  uncommittedGitCount = 0
}) => {
  const getLanguage = (path: string | null) => {
    if (!path) return 'Plain Text';
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'TypeScript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'JavaScript';
    if (path.endsWith('.json')) return 'JSON';
    if (path.endsWith('.html')) return 'HTML';
    if (path.endsWith('.css')) return 'CSS';
    if (path.endsWith('.md')) return 'Markdown';
    if (path.endsWith('.py')) return 'Python';
    return 'Text';
  };

  const formatTokens = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num);
  };

  const getModeBadge = () => {
    switch (agentMode) {
      case 'turbo':
        return (
          <span className="flex items-center gap-1 text-amber-300 font-semibold">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>TURBO</span>
          </span>
        );
      case 'architect':
        return (
          <span className="flex items-center gap-1 text-purple-300 font-semibold">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>ARCHITECT</span>
          </span>
        );
      case 'security':
        return (
          <span className="flex items-center gap-1 text-rose-300 font-semibold">
            <Shield className="w-3 h-3 text-rose-400" />
            <span>SECURITY</span>
          </span>
        );
    }
  };

  return (
    <footer className="h-6 bg-[#060911] border-t border-white/[0.08] px-3 flex items-center justify-between text-[11px] text-slate-400 select-none z-20 shrink-0 font-mono">
      {/* Left segment */}
      <div className="flex items-center gap-2.5">
        {/* Workspace mode */}
        <div className="flex items-center gap-1.5 text-slate-300">
          {storageMode === 'local' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="truncate max-w-[140px] text-slate-200">{localFolderName || 'Local'}</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span className="text-slate-300">Virtual</span>
            </>
          )}
        </div>

        {/* Git Branch & Uncommitted changes indicator */}
        {onOpenGit && (
          <>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                onOpenGit();
                sounds.playClick();
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-amber-300 transition-colors"
              title="Abrir Controle de Versão Git"
            >
              <GitBranch className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300/90 font-medium">{gitBranch}</span>
              {uncommittedGitCount > 0 && (
                <span className="text-amber-400 font-bold">*{uncommittedGitCount}</span>
              )}
            </button>
          </>
        )}

        <span className="text-slate-700">·</span>

        {/* Active file */}
        {activeFilePath ? (
          <div className="flex items-center gap-1.5 text-slate-300 truncate max-w-xs">
            <span className="truncate text-slate-200">{activeFilePath}</span>
            <span className="text-slate-500 font-sans text-[10px]">
              ({getLanguage(activeFilePath)})
            </span>
          </div>
        ) : (
          <span className="text-slate-500">Nenhum arquivo</span>
        )}

        {/* Quick Open (Ctrl+P) hint */}
        {onOpenQuickOpen && (
          <>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                onOpenQuickOpen();
                sounds.playClick();
              }}
              className="hidden lg:flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
              title="Quick Open: Localizar arquivos no workspace (Ctrl+P)"
            >
              <span>Ctrl+P</span>
            </button>
          </>
        )}

        {/* Command palette hint */}
        {onOpenCommandPalette && (
          <>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                onOpenCommandPalette();
                sounds.playClick();
              }}
              className="hidden lg:flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-300 transition-colors"
              title="Abrir Paleta de Comandos (Ctrl+K)"
            >
              <Command className="w-3 h-3" />
              <span>Ctrl+K</span>
            </button>
          </>
        )}

        {/* JSDoc IA Quick trigger */}
        {activeFilePath && onOpenJSDoc && (
          <>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                onOpenJSDoc();
                sounds.playClick();
              }}
              className="hidden md:flex items-center gap-1 text-[10px] text-pink-400 hover:text-pink-300 transition-colors"
              title="Gerar / Atualizar JSDoc com IA"
            >
              <span>JSDoc IA</span>
            </button>
          </>
        )}
      </div>

      {/* Center segment: Agent status */}
      <div className="flex items-center gap-2">
        {isBusy ? (
          <div className="flex items-center gap-1.5 text-pink-300">
            <Loader2 className="w-3 h-3 animate-spin text-pink-400" />
            <span className="truncate max-w-sm">{statusText || 'Agente executando...'}</span>
          </div>
        ) : hasPendingApproval ? (
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold animate-pulse">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>Aguardando sua aprovação</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-slate-400">Agente Pronto</span>
          </div>
        )}
      </div>

      {/* Right segment */}
      <div className="flex items-center gap-2.5">
        {/* Quad Color Palette indicator */}
        <div className="flex items-center gap-1 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 text-[10px]" title="Tema Quad: Dourado, Rosa, Vermelho e Azul">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        </div>
        {/* Agent Mode Badge */}
        <div className="hidden sm:flex items-center">{getModeBadge()}</div>

        <span className="text-slate-700 hidden sm:inline">·</span>

        {/* Sound toggle */}
        {onToggleSound && (
          <button
            onClick={() => {
              onToggleSound();
              sounds.playClick();
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-teal-300 transition-colors"
            title={soundEnabled ? 'Sons ativados' : 'Sons desativados'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <VolumeX className="w-3 h-3 text-slate-600" />
            )}
          </button>
        )}

        <span className="text-slate-700">·</span>

        {/* Terminal toggle */}
        <button
          onClick={() => {
            onToggleTerminal();
            sounds.playClick();
          }}
          className={`flex items-center gap-1 hover:text-slate-200 transition-colors ${
            isTerminalOpen ? 'text-teal-300' : 'text-slate-400'
          }`}
          title="Alternar Terminal Sandbox"
        >
          <Terminal className="w-3 h-3" />
          <span>Terminal</span>
        </button>

        <span className="text-slate-700">·</span>

        {/* Tokens and cost */}
        <button
          onClick={() => {
            onOpenTokenStats();
            sounds.playClick();
          }}
          className="flex items-center gap-1 text-slate-400 hover:text-amber-300 transition-colors"
          title="Ver estatísticas de tokens"
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>{totalTokens > 0 ? `${formatTokens(totalTokens)} tok` : '0 tok'}</span>
        </button>

        <span className="text-slate-700">·</span>

        {/* AI Engine */}
        <button
          onClick={() => {
            onOpenSettings();
            sounds.playClick();
          }}
          className="flex items-center gap-1 text-slate-400 hover:text-teal-300 transition-colors truncate max-w-[110px]"
          title="Configurações de IA"
        >
          <Cpu className="w-3 h-3 text-teal-400" />
          <span className="truncate">{model}</span>
        </button>

        {/* Unit Tests Button */}
        {activeFilePath && onOpenUnitTestGenerator && (
          <>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                onOpenUnitTestGenerator();
                sounds.playClick();
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-teal-300 transition-colors"
              title="Gerador de Testes Unitários com IA"
            >
              <FlaskConical className="w-3 h-3 text-teal-400" />
              <span>Testes</span>
            </button>
          </>
        )}

        {/* Cyclomatic Complexity Indicator */}
        {activeFilePath && onOpenCodeAnalysis && (
          <>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                onOpenCodeAnalysis();
                sounds.playClick();
              }}
              className={`flex items-center gap-1 transition-colors ${
                (activeFileComplexity ?? 1) >= 11
                  ? 'text-orange-400 hover:text-orange-300'
                  : (activeFileComplexity ?? 1) >= 6
                  ? 'text-amber-300 hover:text-amber-200'
                  : 'text-purple-300 hover:text-purple-200'
              }`}
              title="Complexidade Ciclomática e Otimização de Performance"
            >
              <Activity className="w-3 h-3" />
              <span>CC: {activeFileComplexity !== null && activeFileComplexity !== undefined ? activeFileComplexity : '—'}</span>
            </button>
          </>
        )}

        <span className="text-slate-700">·</span>

        {/* ESLint Status Indicator */}
        <button
          onClick={() => {
            onOpenSettings();
            sounds.playClick();
          }}
          className={`flex items-center gap-1 transition-colors ${
            eslintEnabled
              ? 'text-purple-300 hover:text-purple-200'
              : 'text-slate-500 hover:text-slate-400'
          }`}
          title="Regras de Linting (ESLint) - Clique para configurar"
        >
          <Shield className={`w-3 h-3 ${eslintEnabled ? 'text-purple-400' : 'text-slate-500'}`} />
          <span>ESLint: {eslintEnabled ? 'Ativo' : 'Off'}</span>
        </button>

        {/* AI Studio Launcher */}
        {onOpenAIStudio && (
          <>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                onOpenAIStudio();
                sounds.playClick();
              }}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              title="Abrir Estúdio Multimodal de IA (Lyria, Veo, Gemini)"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>AI Studio</span>
            </button>
          </>
        )}

        {/* Firebase Account Launcher */}
        {onOpenFirebaseAuth && (
          <>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => {
                onOpenFirebaseAuth();
                sounds.playClick();
              }}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
              title="Conta Google & Sincronização Firestore"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs" />
              <span>Firebase</span>
            </button>
          </>
        )}

        <span className="text-slate-700">·</span>
        <span className="text-slate-500">UTF-8</span>
      </div>
    </footer>
  );
};
