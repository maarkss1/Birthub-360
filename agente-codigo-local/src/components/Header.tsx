import React, { useState, useEffect } from 'react';
import {
  FolderCode,
  FolderOpen,
  Download,
  Terminal,
  Settings,
  HardDrive,
  Cpu,
  Layers,
  ChevronDown,
  History,
  Zap,
  Github,
  Search,
  PanelLeft,
  PanelRight,
  Sparkles,
  ExternalLink,
  User as UserIcon,
  Cloud,
  GitBranch
} from 'lucide-react';
import { BackendProvider, StorageMode, TokenUsageStats } from '../types/agent';
import { STARTER_TEMPLATES } from '../services/fileSystem';
import { auth, type User } from '../firebase/config';

interface HeaderProps {
  storageMode: StorageMode;
  localFolderName: string | null;
  onConnectLocal: () => void;
  onDisconnectLocal: () => void;
  onSelectTemplate: (key: string) => void;
  onExportZip: () => void;
  onOpenSettings: () => void;
  onOpenCliModal: () => void;
  provider: BackendProvider;
  model: string;
  hasEnvGemini: boolean;
  isBusy: boolean;
  onOpenCheckpoints: () => void;
  checkpointsCount: number;
  onOpenGitHubExport: () => void;
  onOpenTokenStats: () => void;
  tokenStats: TokenUsageStats;
  onToggleTerminal: () => void;
  isTerminalOpen: boolean;
  onOpenSearch?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenQuickOpen?: () => void;
  onOpenJSDoc?: () => void;
  // Layout toggles
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isChatOpen?: boolean;
  onToggleChat?: () => void;
  onOpenAIStudio?: () => void;
  onOpenFirebaseAuth?: () => void;
  onOpenGit?: () => void;
  uncommittedGitCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  storageMode,
  localFolderName,
  onConnectLocal,
  onDisconnectLocal,
  onSelectTemplate,
  onExportZip,
  onOpenSettings,
  onOpenCliModal,
  provider,
  model,
  hasEnvGemini,
  isBusy,
  onOpenCheckpoints,
  checkpointsCount,
  onOpenGitHubExport,
  onOpenTokenStats,
  tokenStats,
  onToggleTerminal,
  isTerminalOpen,
  onOpenSearch,
  onOpenCommandPalette,
  onOpenQuickOpen,
  onOpenJSDoc,
  isSidebarOpen = true,
  onToggleSidebar,
  isChatOpen = true,
  onToggleChat,
  onOpenAIStudio,
  onOpenFirebaseAuth,
  onOpenGit,
  uncommittedGitCount = 0
}) => {
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  const formatTokens = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num);
  };

  return (
    <header className="h-12 border-b border-slate-800/80 bg-[#070b14] px-3 flex items-center justify-between select-none z-20 shrink-0 relative">
      {/* Quad-color top ribbon: Dourado, Rosa, Vermelho, Azul */}
      <div className="h-[2px] w-full bg-gradient-to-r from-amber-400 via-pink-500 via-red-500 to-blue-500 absolute top-0 left-0 right-0 z-30" />

      {/* Left: Brand & Workspace info */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-md transition-colors ${
              isSidebarOpen
                ? 'text-blue-400 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={isSidebarOpen ? 'Ocultar barra lateral (Ctrl+B)' : 'Mostrar barra lateral (Ctrl+B)'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2">
          {/* Brand Logo with Gold & Multi-color glow */}
          <div className="w-7 h-7 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-xs shadow-amber-500/20">
            <FolderCode className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-300 to-blue-300 text-xs tracking-tight">
                Agente Birth Hub 360
              </span>
              {/* Quad Theme Badge */}
              <div className="hidden xl:flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-slate-900 border border-slate-750 text-[9px] font-mono text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Dourado" />
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" title="Rosa" />
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Vermelho" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Azul" />
              </div>
            </div>

            {/* Storage status & switcher */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-600">/</span>
              {storageMode === 'local' && localFolderName ? (
                <div className="flex items-center gap-1 text-slate-300 font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="max-w-[140px] truncate text-slate-200">{localFolderName}</span>
                  <button
                    onClick={onDisconnectLocal}
                    disabled={isBusy}
                    className="ml-1 text-[10px] text-slate-400 hover:text-red-400 underline transition-colors"
                    title="Desconectar pasta local"
                  >
                    desconectar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-blue-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Virtual
                  </span>

                  <button
                    onClick={onConnectLocal}
                    disabled={isBusy}
                    className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-amber-300 bg-slate-850 hover:bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded transition-colors"
                    title="Conectar pasta real do computador (Chrome/Edge)"
                  >
                    <FolderOpen className="w-3 h-3 text-amber-400" />
                    <span>Conectar Pasta</span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
                      disabled={isBusy}
                      className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-slate-100 bg-slate-850/60 hover:bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded transition-colors"
                    >
                      <Layers className="w-3 h-3 text-pink-400" />
                      <span>Template</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {templateMenuOpen && (
                      <div
                        className="absolute left-0 top-full mt-1.5 w-64 bg-[#101524] border border-slate-700/80 rounded-lg shadow-2xl py-1 z-50 text-xs"
                        onClick={() => setTemplateMenuOpen(false)}
                      >
                        <div className="px-3 py-1.5 text-[10px] text-amber-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                          Carregar Template
                        </div>
                        {Object.entries(STARTER_TEMPLATES).map(([key, item]) => (
                          <button
                            key={key}
                            onClick={() => onSelectTemplate(key)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-800/80 text-slate-200 hover:text-amber-300 flex flex-col gap-0.5 transition-colors"
                          >
                            <span className="font-medium text-xs">{item.name}</span>
                            <span className="text-[11px] text-slate-400 truncate">{item.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Center: Quick Open & Command Search Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onOpenQuickOpen || onOpenCommandPalette || onOpenSearch}
          className="w-full h-7 px-3 bg-slate-900/90 hover:bg-slate-850 border border-blue-500/20 hover:border-blue-500/40 rounded-md text-xs text-slate-400 flex items-center justify-between transition-colors shadow-xs group"
          title="Quick Open: Buscar arquivos no workspace (Ctrl+P)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-blue-400 group-hover:text-amber-400 transition-colors" />
            <span className="text-[11px] text-slate-400 group-hover:text-slate-200 truncate">
              Ir para arquivo ou comando...
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] font-mono text-blue-300 group-hover:text-blue-200">
              Ctrl+P
            </kbd>
            <kbd className="hidden lg:inline-block px-1.5 py-0.2 bg-slate-800/80 border border-slate-700/60 rounded text-[10px] font-mono text-slate-400">
              Ctrl+K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right: Engine, Stats, JSDoc, AI Studio, Export & Panel Controls */}
      <div className="flex items-center gap-1.5">
        {/* Token Monitor in Dourado (Gold) */}
        <button
          onClick={onOpenTokenStats}
          className="flex items-center gap-1 text-[11px] text-amber-300/90 hover:text-amber-200 px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-colors"
          title="Ver consumo de tokens e custos estimados"
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="font-mono">
            {tokenStats.totalTokens > 0 ? `${formatTokens(tokenStats.totalTokens)} tok` : '0 tok'}
          </span>
          <span className="text-amber-500/60">·</span>
          <span className="font-mono text-amber-300">
            {tokenStats.estimatedCostUsd > 0
              ? `$${tokenStats.estimatedCostUsd < 0.001 ? '<0.001' : tokenStats.estimatedCostUsd.toFixed(3)}`
              : '$0'}
          </span>
        </button>

        {/* Engine Quick Badge */}
        <button
          onClick={onOpenSettings}
          className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 hover:text-blue-300 px-2 py-1 rounded hover:bg-slate-800/60 border border-transparent hover:border-slate-800 transition-colors"
          title="Configurações do modelo de IA"
        >
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-[11px] max-w-[100px] truncate">{model}</span>
        </button>

        {/* AI Studio Launcher Header Button in Rosa (Pink) */}
        {onOpenAIStudio && (
          <button
            onClick={onOpenAIStudio}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/40 text-pink-300 hover:text-pink-100 text-xs font-semibold shadow-xs transition-all"
            title="Abrir Estúdio Multimodal de IA (Chatbot, Lyria, Veo, Imagem, Voz Live)"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>AI Studio</span>
          </button>
        )}

        {/* Firebase Account & Auth Button */}
        {onOpenFirebaseAuth && (
          <button
            onClick={onOpenFirebaseAuth}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-xs transition-all"
            title="Conta Google & Sincronização Firestore"
          >
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                className="w-4 h-4 rounded-full border border-blue-400"
              />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="max-w-[80px] truncate text-[11px]">
              {currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Conta'}
            </span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Git Source Control Button in Vermelho (Red) */}
        {onOpenGit && (
          <button
            onClick={onOpenGit}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 hover:text-red-200 text-xs font-mono transition-all"
            title="Controle de Versão Git (Commits & Diffs)"
          >
            <GitBranch className="w-3.5 h-3.5 text-red-400" />
            <span>Git</span>
            {uncommittedGitCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            )}
          </button>
        )}

        {/* Checkpoints Button in Azul (Blue) */}
        <button
          onClick={onOpenCheckpoints}
          className="flex items-center gap-1 p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
          title="Histórico de versões e restauração (Rollback)"
        >
          <History className="w-4 h-4" />
          {checkpointsCount > 0 && (
            <span className="text-[10px] font-mono font-bold text-blue-400">
              {checkpointsCount}
            </span>
          )}
        </button>

        {/* Terminal Toggle in Dourado (Gold) */}
        <button
          onClick={onToggleTerminal}
          className={`p-1.5 rounded transition-colors ${
            isTerminalOpen
              ? 'text-amber-300 bg-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Terminal e console interativo (Ctrl+`)"
        >
          <Terminal className="w-4 h-4" />
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="flex items-center gap-1 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Exportar projeto (ZIP, GitHub, CLI)"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {exportMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-48 bg-[#101524] border border-slate-700/80 rounded-lg shadow-2xl py-1 z-50 text-xs"
              onClick={() => setExportMenuOpen(false)}
            >
              <button
                onClick={onExportZip}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-slate-200 hover:text-blue-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Baixar Projeto (.ZIP)</span>
              </button>
              <button
                onClick={onOpenGitHubExport}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-slate-200 hover:text-amber-300 transition-colors"
              >
                <Github className="w-3.5 h-3.5 text-slate-300" />
                <span>Exportar para GitHub</span>
              </button>
              <button
                onClick={onOpenCliModal}
                className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-slate-200 hover:text-pink-300 transition-colors"
              >
                <FolderCode className="w-3.5 h-3.5 text-pink-400" />
                <span>Script CLI Standalone</span>
              </button>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Configurações de IA e Provedores"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Toggle Right Chat Panel */}
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className={`p-1.5 rounded transition-colors ${
              isChatOpen
                ? 'text-blue-400 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={isChatOpen ? 'Recolher painel do agente' : 'Expandir painel do agente'}
          >
            <PanelRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
