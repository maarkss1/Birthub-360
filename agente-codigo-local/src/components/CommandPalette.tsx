import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  FileCode,
  Zap,
  Terminal,
  Download,
  Github,
  Settings,
  Eye,
  History,
  Trash2,
  FolderOpen,
  Layers,
  Sparkles,
  Command,
  ArrowRight,
  Code2,
  Shield,
  FilePlus,
  Volume2,
  VolumeX,
  FlaskConical,
  Activity,
  GitBranch,
  BookOpen
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

export type AgentMode = 'turbo' | 'architect' | 'security';

interface CommandItem {
  id: string;
  category: 'Arquivos' | 'Ações do Agente' | 'Painéis & Modos' | 'Exportação & Git' | 'Templates';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  files: Record<string, string>;
  onOpenFile: (path: string) => void;
  onNewFile?: () => void;
  onToggleSidebar?: () => void;
  onToggleTerminal?: () => void;
  onToggleChat?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onOpenCheckpoints?: () => void;
  onOpenGitHub?: () => void;
  onOpenCli?: () => void;
  onOpenTokenStats?: () => void;
  onExportZip?: () => void;
  onClearHistory?: () => void;
  onSelectTemplate?: (key: string) => void;
  onOpenWebPreview?: () => void;
  hasWebEntry?: boolean;
  agentMode: AgentMode;
  onSelectAgentMode: (mode: AgentMode) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onSendPromptToAgent?: (prompt: string) => void;
  onOpenUnitTestGenerator?: () => void;
  onOpenCodeAnalysis?: () => void;
  onOpenAIStudio?: (tab?: 'chat' | 'music' | 'image' | 'video' | 'live' | 'grounding' | 'transcribe' | 'saved') => void;
  onOpenFirebaseAuth?: () => void;
  onOpenGit?: (tab?: 'changes' | 'history' | 'branches') => void;
  onOpenQuickOpen?: () => void;
  onOpenJSDoc?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  files,
  onOpenFile,
  onNewFile,
  onToggleSidebar,
  onToggleTerminal,
  onToggleChat,
  onOpenSearch,
  onOpenSettings,
  onOpenCheckpoints,
  onOpenGitHub,
  onOpenCli,
  onOpenTokenStats,
  onExportZip,
  onClearHistory,
  onSelectTemplate,
  onOpenWebPreview,
  hasWebEntry = false,
  agentMode,
  onSelectAgentMode,
  soundEnabled = true,
  onToggleSound,
  onSendPromptToAgent,
  onOpenUnitTestGenerator,
  onOpenCodeAnalysis,
  onOpenAIStudio,
  onOpenFirebaseAuth,
  onOpenGit,
  onOpenQuickOpen,
  onOpenJSDoc
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      sounds.playClick();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // Files in workspace
    Object.keys(files).forEach((path) => {
      list.push({
        id: `file-${path}`,
        category: 'Arquivos',
        title: path,
        subtitle: `${files[path].length} caracteres`,
        icon: <FileCode className="w-4 h-4 text-teal-400" />,
        action: () => {
          onOpenFile(path);
          onClose();
        }
      });
    });

    // Quick Open Global Action
    if (onOpenQuickOpen) {
      list.unshift({
        id: 'action-quick-open',
        category: 'Arquivos',
        title: 'Quick Open: Procurar Arquivo no Workspace',
        subtitle: 'Buscar instantaneamente arquivos por nome, extensão ou saltar para linha',
        icon: <Search className="w-4 h-4 text-blue-400" />,
        shortcut: 'Ctrl+P',
        action: () => {
          onClose();
          onOpenQuickOpen();
        }
      });
    }

    // JSDoc IA Generator Action
    if (onOpenJSDoc) {
      list.push({
        id: 'action-jsdoc-ai',
        category: 'Ações do Agente',
        title: 'JSDoc IA: Documentar Funções e Classes',
        subtitle: 'Analisar arquivo aberto e gerar/atualizar comentários JSDoc com IA (Gemini 3.8 Flash)',
        icon: <BookOpen className="w-4 h-4 text-pink-400" />,
        action: () => {
          onClose();
          onOpenJSDoc();
        }
      });
    }

    // Agent Modes
    list.push(
      {
        id: 'mode-turbo',
        category: 'Ações do Agente',
        title: 'Modo Turbo Coder',
        subtitle: agentMode === 'turbo' ? '✓ Modo Ativo — Respostas rápidas e edições cirúrgicas' : 'Ativar modo de velocidade máxima',
        icon: <Zap className="w-4 h-4 text-amber-400" />,
        action: () => {
          onSelectAgentMode('turbo');
          onClose();
        }
      },
      {
        id: 'mode-architect',
        category: 'Ações do Agente',
        title: 'Modo Deep Architect',
        subtitle: agentMode === 'architect' ? '✓ Modo Ativo — Análise aprofundada e modular' : 'Ativar modo de arquitetura avançada',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        action: () => {
          onSelectAgentMode('architect');
          onClose();
        }
      },
      {
        id: 'mode-security',
        category: 'Ações do Agente',
        title: 'Modo Security & Auditor',
        subtitle: agentMode === 'security' ? '✓ Modo Ativo — Auditoria estrita e validação de segurança' : 'Ativar modo de revisão segura',
        icon: <Shield className="w-4 h-4 text-rose-400" />,
        action: () => {
          onSelectAgentMode('security');
          onClose();
        }
      },
      {
        id: 'ai-generate-unit-tests',
        category: 'Ações do Agente',
        title: 'Gerar Testes Unitários com IA',
        subtitle: 'Criar suíte de testes (.test.js / .test.ts) para o arquivo atualmente aberto',
        icon: <FlaskConical className="w-4 h-4 text-teal-400" />,
        action: () => {
          onClose();
          if (onOpenUnitTestGenerator) onOpenUnitTestGenerator();
        }
      },
      {
        id: 'ai-analyze-complexity',
        category: 'Ações do Agente',
        title: 'Analisar Complexidade Ciclomática & Performance',
        subtitle: 'Métricas de McCabe e sugestões de refatoração para otimização de performance',
        icon: <Activity className="w-4 h-4 text-purple-400" />,
        action: () => {
          onClose();
          if (onOpenCodeAnalysis) onOpenCodeAnalysis();
        }
      },
      {
        id: 'ai-studio-hub',
        category: 'Ações do Agente',
        title: 'Abrir Estúdio Multimodal de IA (Gemini & Lyria & Veo)',
        subtitle: 'Painel com Chatbot, Música, Imagens, Vídeos Veo, Voz Live e Transcrição',
        icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
        action: () => {
          onClose();
          if (onOpenAIStudio) onOpenAIStudio('chat');
        }
      },
      {
        id: 'ai-music-lyria',
        category: 'Ações do Agente',
        title: 'Gerar Música com Lyria 3 (lyria-3-clip & lyria-3-pro)',
        subtitle: 'Compor faixas musicais instrumentais e vocais completas ou clips de 30s',
        icon: <Volume2 className="w-4 h-4 text-purple-400" />,
        action: () => {
          onClose();
          if (onOpenAIStudio) onOpenAIStudio('music');
        }
      },
      {
        id: 'ai-image-create-edit',
        category: 'Ações do Agente',
        title: 'Criar & Editar Imagens (gemini-3.1-flash-image-preview)',
        subtitle: 'Gerar artes conceituais, assets de UI ou editar imagens existentes',
        icon: <Eye className="w-4 h-4 text-indigo-400" />,
        action: () => {
          onClose();
          if (onOpenAIStudio) onOpenAIStudio('image');
        }
      },
      {
        id: 'ai-video-veo',
        category: 'Ações do Agente',
        title: 'Gerar & Animar Vídeos com Veo 3 (veo-3.1-fast-generate-preview)',
        subtitle: 'Vídeos cinematográficos de alta resolução a partir de texto ou fotos (16:9 / 9:16)',
        icon: <Layers className="w-4 h-4 text-rose-400" />,
        action: () => {
          onClose();
          if (onOpenAIStudio) onOpenAIStudio('video');
        }
      },
      {
        id: 'ai-live-voice',
        category: 'Ações do Agente',
        title: 'Conversa por Voz em Tempo Real (Live API gemini-3.8-live)',
        subtitle: 'Comunicação falada natural bidirecional via WebSocket em baixa latência',
        icon: <Zap className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onClose();
          if (onOpenAIStudio) onOpenAIStudio('live');
        }
      },
      {
        id: 'ai-grounding-search-maps',
        category: 'Ações do Agente',
        title: 'Grounding com Google Search & Google Maps (gemini-3.5-flash)',
        subtitle: 'Consultas ancoradas na web ao vivo ou em locais geográficos verificados',
        icon: <Search className="w-4 h-4 text-blue-400" />,
        action: () => {
          onClose();
          if (onOpenAIStudio) onOpenAIStudio('grounding');
        }
      },
      {
        id: 'ai-transcribe-audio',
        category: 'Ações do Agente',
        title: 'Transcrever Áudio com gemini-3.5-transcribe',
        subtitle: 'Gravar microfone ou carregar arquivos de áudio para transcrição instantânea',
        icon: <Volume2 className="w-4 h-4 text-teal-400" />,
        action: () => {
          onClose();
          if (onOpenAIStudio) onOpenAIStudio('transcribe');
        }
      },
      {
        id: 'firebase-auth-sync',
        category: 'Ações do Agente',
        title: 'Conta Google & Firebase Cloud Firestore',
        subtitle: 'Conectar com Google Sign-In, salvar workspaces e sincronizar criações de IA',
        icon: <Shield className="w-4 h-4 text-amber-400" />,
        action: () => {
          onClose();
          if (onOpenFirebaseAuth) onOpenFirebaseAuth();
        }
      }
    );

    // Panels & Views
    list.push(
      {
        id: 'action-new-file',
        category: 'Painéis & Modos',
        title: 'Criar Novo Arquivo',
        subtitle: 'Adicionar arquivo ao workspace',
        icon: <FilePlus className="w-4 h-4 text-teal-400" />,
        action: () => {
          if (onNewFile) onNewFile();
          onClose();
        }
      },
      {
        id: 'toggle-sidebar',
        category: 'Painéis & Modos',
        title: 'Alternar Barra Lateral',
        shortcut: 'Ctrl+B',
        icon: <Layers className="w-4 h-4 text-slate-300" />,
        action: () => {
          if (onToggleSidebar) onToggleSidebar();
          onClose();
        }
      },
      {
        id: 'toggle-terminal',
        category: 'Painéis & Modos',
        title: 'Alternar Terminal Integrado',
        shortcut: 'Ctrl+`',
        icon: <Terminal className="w-4 h-4 text-teal-300" />,
        action: () => {
          if (onToggleTerminal) onToggleTerminal();
          onClose();
        }
      },
      {
        id: 'toggle-chat',
        category: 'Painéis & Modos',
        title: 'Alternar Console do Agente',
        shortcut: 'Ctrl+J',
        icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
        action: () => {
          if (onToggleChat) onToggleChat();
          onClose();
        }
      },
      {
        id: 'find-in-files',
        category: 'Painéis & Modos',
        title: 'Buscar em Todo o Workspace',
        shortcut: 'Ctrl+Shift+F',
        icon: <Search className="w-4 h-4 text-sky-400" />,
        action: () => {
          onClose();
          if (onOpenSearch) onOpenSearch();
        }
      },
      {
        id: 'toggle-sound',
        category: 'Painéis & Modos',
        title: soundEnabled ? 'Desativar Sons da IDE' : 'Ativar Sons da IDE (Efeitos Supremium)',
        subtitle: 'Feedback sonoro sutil via Web Audio API',
        icon: soundEnabled ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />,
        action: () => {
          if (onToggleSound) onToggleSound();
          onClose();
        }
      }
    );

    if (hasWebEntry) {
      list.push({
        id: 'open-web-preview',
        category: 'Painéis & Modos',
        title: 'Abrir Visualização Web ao Vivo',
        subtitle: 'Execução instantânea de HTML/CSS/JS',
        icon: <Eye className="w-4 h-4 text-emerald-400" />,
        action: () => {
          if (onOpenWebPreview) onOpenWebPreview();
          onClose();
        }
      });
    }

    if (onOpenTokenStats) {
      list.push({
        id: 'open-token-stats',
        category: 'Exportação & Git',
        title: 'Estatísticas de Tokens & Custos',
        subtitle: 'Métricas de consumo e histórico de chamadas',
        icon: <Zap className="w-4 h-4 text-amber-400" />,
        action: () => {
          onClose();
          onOpenTokenStats();
        }
      });
    }

    // Export & History & Git
    if (onOpenGit) {
      list.push(
        {
          id: 'git-changes',
          category: 'Exportação & Git',
          title: 'Git: Realizar Commit de Alterações',
          subtitle: 'Abrir painel para commitar mudanças e gerar mensagem com IA',
          icon: <GitBranch className="w-4 h-4 text-amber-400" />,
          action: () => {
            onClose();
            onOpenGit('changes');
          }
        },
        {
          id: 'git-history',
          category: 'Exportação & Git',
          title: 'Git: Ver Histórico de Commits',
          subtitle: 'Timeline visual, diffs e restauração de versões anteriores',
          icon: <History className="w-4 h-4 text-amber-400" />,
          action: () => {
            onClose();
            onOpenGit('history');
          }
        },
        {
          id: 'git-branches',
          category: 'Exportação & Git',
          title: 'Git: Gerenciar Branches',
          subtitle: 'Criar ou alternar branches no repositório local',
          icon: <GitBranch className="w-4 h-4 text-orange-400" />,
          action: () => {
            onClose();
            onOpenGit('branches');
          }
        }
      );
    }

    if (onSendPromptToAgent) {
      list.push({
        id: 'agent-git-commit',
        category: 'Ações do Agente',
        title: 'Agente: Analisar Mudanças e Fazer Commit no Git',
        subtitle: 'O agente analisa o código modificado e realiza o commit automaticamente',
        icon: <Sparkles className="w-4 h-4 text-amber-400" />,
        action: () => {
          onClose();
          onSendPromptToAgent('Analise todas as alterações feitas no projeto e realize um commit no Git com mensagem descritiva no padrão Conventional Commits.');
        }
      });
    }

    list.push(
      {
        id: 'open-checkpoints',
        category: 'Exportação & Git',
        title: 'Histórico de Checkpoints & Rollback',
        subtitle: 'Restaurar o projeto para versões anteriores',
        icon: <History className="w-4 h-4 text-teal-300" />,
        action: () => {
          onClose();
          if (onOpenCheckpoints) onOpenCheckpoints();
        }
      },
      {
        id: 'export-zip',
        category: 'Exportação & Git',
        title: 'Baixar Projeto Completo em ZIP',
        subtitle: 'Exportar todos os arquivos como arquivo zip',
        icon: <Download className="w-4 h-4 text-sky-400" />,
        action: () => {
          onClose();
          if (onExportZip) onExportZip();
        }
      },
      {
        id: 'export-github',
        category: 'Exportação & Git',
        title: 'Publicar / Sincronizar com GitHub',
        subtitle: 'Criar repositório ou fazer commit remoto',
        icon: <Github className="w-4 h-4 text-slate-200" />,
        action: () => {
          onClose();
          if (onOpenGitHub) onOpenGitHub();
        }
      },
      {
        id: 'export-cli',
        category: 'Exportação & Git',
        title: 'Gerar Script CLI Local',
        subtitle: 'Script autônomo para rodar no terminal',
        icon: <Code2 className="w-4 h-4 text-purple-400" />,
        action: () => {
          onClose();
          if (onOpenCli) onOpenCli();
        }
      },
      {
        id: 'open-settings',
        category: 'Exportação & Git',
        title: 'Configurações de IA e Provedores',
        subtitle: 'Ajustar chaves de API, modelos e parâmetros',
        icon: <Settings className="w-4 h-4 text-slate-300" />,
        action: () => {
          onClose();
          if (onOpenSettings) onOpenSettings();
        }
      },
      {
        id: 'open-eslint-settings',
        category: 'Exportação & Git',
        title: 'Configurações de ESLint & Linting',
        subtitle: 'Definir regras de estilo, any, ponto e vírgula e exportar .eslintrc.json',
        icon: <Shield className="w-4 h-4 text-purple-400" />,
        action: () => {
          onClose();
          if (onOpenSettings) onOpenSettings();
        }
      },
      {
        id: 'clear-chat',
        category: 'Exportação & Git',
        title: 'Limpar Histórico de Mensagens do Agente',
        subtitle: 'Reiniciar a conversa preservando os arquivos',
        icon: <Trash2 className="w-4 h-4 text-rose-400" />,
        action: () => {
          onClose();
          if (onClearHistory) onClearHistory();
        }
      }
    );

    // Starter Templates
    list.push(
      {
        id: 'template-express',
        category: 'Templates',
        title: 'Carregar Template: Express.js REST API',
        subtitle: 'Servidor Node.js modular pronto para rodar',
        icon: <Layers className="w-4 h-4 text-amber-400" />,
        action: () => {
          if (onSelectTemplate) onSelectTemplate('express');
          onClose();
        }
      },
      {
        id: 'template-webapp',
        category: 'Templates',
        title: 'Carregar Template: Single Page Web App',
        subtitle: 'HTML/CSS/JS moderno para visualização instantânea',
        icon: <Layers className="w-4 h-4 text-sky-400" />,
        action: () => {
          if (onSelectTemplate) onSelectTemplate('webapp');
          onClose();
        }
      }
    );

    return list;
  }, [
    files,
    agentMode,
    soundEnabled,
    hasWebEntry,
    onOpenFile,
    onClose,
    onSelectAgentMode,
    onNewFile,
    onToggleSidebar,
    onToggleTerminal,
    onToggleChat,
    onOpenSearch,
    onToggleSound,
    onOpenWebPreview,
    onOpenCheckpoints,
    onExportZip,
    onOpenGitHub,
    onOpenCli,
    onOpenSettings,
    onClearHistory,
    onSelectTemplate
  ]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      sounds.playClick();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      sounds.playClick();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#0b0f19] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/5"
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-white/[0.08] bg-[#0e1422]">
          <Command className="w-5 h-5 text-teal-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite um comando, arquivo ou ação... (ex: terminal, express, github)"
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden font-sans"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/60 rounded">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-[380px] overflow-y-auto py-2 px-2 divide-y divide-white/[0.04]">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Nenhum comando ou arquivo encontrado para &quot;{query}&quot;
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all duration-100 ${
                    isSelected
                      ? 'bg-teal-500/15 text-white ring-1 ring-teal-500/30'
                      : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800/70 text-slate-400'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold tracking-tight">{cmd.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono">[{cmd.category}]</span>
                      </div>
                      {cmd.subtitle && (
                        <div className="text-[11px] text-slate-400 truncate">{cmd.subtitle}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {cmd.shortcut && (
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800/90 text-slate-400 border border-slate-700/50 rounded">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-teal-400 animate-pulse" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="h-9 px-4 bg-[#090d16] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 select-none">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-400 mr-1">↑↓</kbd>
              navegar
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-400 mr-1">↵</kbd>
              executar
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-teal-400 font-mono text-[10px]">
            <Sparkles className="w-3 h-3" />
            <span>Supremium Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
