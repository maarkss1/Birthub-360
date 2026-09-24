import React from 'react';
import {
  Files,
  Search,
  History,
  Terminal,
  Eye,
  Settings,
  Zap,
  Github,
  FolderCode,
  Command,
  FlaskConical,
  Activity,
  GitBranch,
  BookOpen
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

export type ActivityTab = 'files' | 'search' | 'checkpoints';

interface ActivityBarProps {
  activeTab: ActivityTab | null;
  onSelectTab: (tab: ActivityTab) => void;
  onOpenSearch: () => void;
  onOpenCheckpoints: () => void;
  onToggleTerminal: () => void;
  isTerminalOpen: boolean;
  onSelectCenterTab: (tab: 'editor' | 'diff' | 'preview') => void;
  activeCenterTab: 'editor' | 'diff' | 'preview';
  hasWebEntry: boolean;
  checkpointsCount: number;
  onOpenSettings: () => void;
  onOpenTokenStats: () => void;
  onOpenGitHub: () => void;
  onOpenCli: () => void;
  onOpenCommandPalette?: () => void;
  onOpenQuickOpen?: () => void;
  onOpenJSDoc?: () => void;
  onOpenUnitTestGenerator?: () => void;
  onOpenCodeAnalysis?: () => void;
  onOpenAIStudio?: (tab?: 'chat' | 'music' | 'image' | 'video' | 'live' | 'grounding' | 'transcribe' | 'saved') => void;
  onOpenFirebaseAuth?: () => void;
  onOpenGit?: () => void;
  uncommittedGitCount?: number;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSearch,
  onOpenCheckpoints,
  onToggleTerminal,
  isTerminalOpen,
  onSelectCenterTab,
  activeCenterTab,
  hasWebEntry,
  checkpointsCount,
  onOpenSettings,
  onOpenTokenStats,
  onOpenGitHub,
  onOpenCli,
  onOpenCommandPalette,
  onOpenQuickOpen,
  onOpenJSDoc,
  onOpenUnitTestGenerator,
  onOpenCodeAnalysis,
  onOpenAIStudio,
  onOpenFirebaseAuth,
  onOpenGit,
  uncommittedGitCount = 0
}) => {
  return (
    <aside className="w-12 bg-[#060a14] border-r border-slate-800/80 flex flex-col items-center justify-between py-2 select-none shrink-0 z-10">
      {/* Top action icons */}
      <div className="flex flex-col items-center gap-1 w-full">
        {/* Quick Open (Ctrl+P) in Azul */}
        {onOpenQuickOpen && (
          <button
            onClick={() => {
              onOpenQuickOpen();
              sounds.playClick();
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-blue-400 hover:text-blue-300 hover:bg-blue-500/15 transition-colors mb-0.5 group"
            title="Quick Open: Localizar Arquivo no Workspace (Ctrl+P)"
          >
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="sr-only">Quick Open</span>
          </button>
        )}

        {/* Command Palette (Ctrl+K) in Dourado */}
        {onOpenCommandPalette && (
          <button
            onClick={() => {
              onOpenCommandPalette();
              sounds.playClick();
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/15 transition-colors mb-1 group"
            title="Paleta de Comandos (Ctrl+K)"
          >
            <Command className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="sr-only">Comandos</span>
          </button>
        )}

        {/* AI Studio Multimodal Hub in Rosa */}
        {onOpenAIStudio && (
          <button
            onClick={() => {
              onOpenAIStudio();
              sounds.playClick();
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-pink-400 hover:text-white bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 transition-all mb-1 group shadow-sm shadow-pink-500/20"
            title="Estúdio Multimodal de IA (Chat, Música Lyria, Imagem, Veo Vídeo, Live)"
          >
            <Zap className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
            <span className="sr-only">AI Studio</span>
          </button>
        )}

        {/* JSDoc IA Generator in Rosa / Gold */}
        {onOpenJSDoc && (
          <button
            onClick={() => {
              onOpenJSDoc();
              sounds.playClick();
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-pink-400 hover:text-pink-300 hover:bg-pink-500/15 transition-colors mb-1 group relative"
            title="Gerar / Atualizar Comentários JSDoc com IA para Funções e Classes"
          >
            <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="sr-only">JSDoc IA</span>
          </button>
        )}

        {/* Files Explorer in Azul */}
        <button
          onClick={() => {
            onSelectTab('files');
            sounds.playClick();
          }}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative group ${
            activeTab === 'files'
              ? 'text-blue-400 bg-blue-500/15 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
          title="Explorador de Arquivos (Ctrl+Shift+E)"
        >
          {activeTab === 'files' && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-400 rounded-r" />
          )}
          <Files className="w-5 h-5" />
          <span className="sr-only">Arquivos</span>
        </button>

        {/* Global Search in Dourado */}
        <button
          onClick={() => {
            onOpenSearch();
            sounds.playClick();
          }}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors relative group"
          title="Buscar no Projeto (Ctrl+Shift+F)"
        >
          <Search className="w-5 h-5" />
          <span className="sr-only">Buscar</span>
        </button>

        {/* Checkpoints & Rollback in Rosa */}
        <button
          onClick={() => {
            onOpenCheckpoints();
            sounds.playClick();
          }}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-pink-400 hover:bg-pink-500/10 transition-colors relative group"
          title="Histórico e Rollback de Versões"
        >
          <History className="w-5 h-5" />
          {checkpointsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-pink-500/20 text-pink-400 text-[9px] font-mono flex items-center justify-center border border-pink-500/40">
              {checkpointsCount}
            </span>
          )}
          <span className="sr-only">Versões</span>
        </button>

        {/* Git Source Control & Commit History in Vermelho */}
        {onOpenGit && (
          <button
            onClick={() => {
              onOpenGit();
              sounds.playClick();
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors relative group"
            title="Controle de Versão Git (Commits & Diffs)"
          >
            <GitBranch className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {uncommittedGitCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-mono flex items-center justify-center border border-red-500/40">
                {uncommittedGitCount}
              </span>
            )}
            <span className="sr-only">Git</span>
          </button>
        )}

        {/* Integrated Terminal in Azul */}
        <button
          onClick={() => {
            onToggleTerminal();
            sounds.playClick();
          }}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative group ${
            isTerminalOpen
              ? 'text-blue-400 bg-blue-500/15'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
          title="Terminal e Console Sandbox (Ctrl+`)"
        >
          {isTerminalOpen && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-400 rounded-r" />
          )}
          <Terminal className="w-5 h-5" />
          <span className="sr-only">Terminal</span>
        </button>

        {/* Web Preview toggle */}
        {hasWebEntry && (
          <button
            onClick={() => {
              onSelectCenterTab(activeCenterTab === 'preview' ? 'editor' : 'preview');
              sounds.playClick();
            }}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative group ${
              activeCenterTab === 'preview'
                ? 'text-blue-400 bg-blue-500/15'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
            title="Visualização Web ao Vivo (Live Preview)"
          >
            {activeCenterTab === 'preview' && (
              <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-400 rounded-r" />
            )}
            <Eye className="w-5 h-5" />
            <span className="sr-only">Preview Web</span>
          </button>
        )}

        {/* Unit Tests Generator */}
        {onOpenUnitTestGenerator && (
          <button
            onClick={() => {
              onOpenUnitTestGenerator();
              sounds.playClick();
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 transition-colors relative group"
            title="Gerador de Testes Unitários com IA"
          >
            <FlaskConical className="w-5 h-5" />
            <span className="sr-only">Testes</span>
          </button>
        )}

        {/* Code Complexity & Performance Analysis */}
        {onOpenCodeAnalysis && (
          <button
            onClick={() => {
              onOpenCodeAnalysis();
              sounds.playClick();
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors relative group"
            title="Complexidade Ciclomática & Otimização de Performance"
          >
            <Activity className="w-5 h-5" />
            <span className="sr-only">Complexidade</span>
          </button>
        )}
      </div>

      {/* Bottom utility icons */}
      <div className="flex flex-col items-center gap-1 w-full pt-2 border-t border-slate-800/60">
        {/* Firebase Auth & Cloud Sync */}
        {onOpenFirebaseAuth && (
          <button
            onClick={() => {
              onOpenFirebaseAuth();
              sounds.playClick();
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
            title="Conta & Sincronização Firebase"
          >
            <FolderCode className="w-4 h-4" />
            <span className="sr-only">Firebase</span>
          </button>
        )}

        {/* Token stats */}
        <button
          onClick={() => {
            onOpenTokenStats();
            sounds.playClick();
          }}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-300 hover:bg-slate-850 transition-colors"
          title="Consumo de Tokens e Custos"
        >
          <Zap className="w-4 h-4" />
          <span className="sr-only">Tokens</span>
        </button>

        {/* GitHub Export */}
        <button
          onClick={() => {
            onOpenGitHub();
            sounds.playClick();
          }}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition-colors"
          title="Exportar para GitHub"
        >
          <Github className="w-4 h-4" />
          <span className="sr-only">GitHub</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => {
            onOpenSettings();
            sounds.playClick();
          }}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-teal-300 hover:bg-slate-850 transition-colors"
          title="Configurações de IA e Modelos"
        >
          <Settings className="w-4 h-4" />
          <span className="sr-only">Configurações</span>
        </button>
      </div>
    </aside>
  );
};
