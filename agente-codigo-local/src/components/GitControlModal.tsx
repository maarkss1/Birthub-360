import React, { useState, useEffect, useMemo } from 'react';
import {
  GitCommit as GitCommitIcon,
  GitBranch as GitBranchIcon,
  Sparkles,
  History,
  FileCode,
  Check,
  Copy,
  Plus,
  RotateCcw,
  Search,
  X,
  ChevronRight,
  Bot,
  User,
  Clock,
  ArrowRight,
  FileDiff,
  Tag,
  AlertCircle,
  RefreshCw,
  FolderGit2,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import {
  GitCommit,
  GitFileChange,
  GitRepoState,
  GitCommitSuggestion
} from '../types/git';
import { GitService } from '../services/gitService';
import { generateAICommitMessages } from '../services/gitCommitAI';
import { sounds } from '../services/soundEffects';

interface GitControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: Record<string, string>;
  workspaceId?: string;
  onFilesUpdated: (newFiles: Record<string, string>) => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
  onOpenDiffTab?: (path: string, oldContent: string, newContent: string) => void;
  userEmail?: string;
  customGeminiKey?: string;
  initialTab?: 'changes' | 'history' | 'branches';
}

const CONVENTIONAL_TAGS = [
  { tag: 'feat', label: 'feat:', desc: 'Nova funcionalidade', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { tag: 'fix', label: 'fix:', desc: 'Correção de bug', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  { tag: 'refactor', label: 'refactor:', desc: 'Refatoração', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { tag: 'docs', label: 'docs:', desc: 'Documentação', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { tag: 'test', label: 'test:', desc: 'Testes unitários', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { tag: 'chore', label: 'chore:', desc: 'Tarefas / configs', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  { tag: 'perf', label: 'perf:', desc: 'Desempenho', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' }
];

export const GitControlModal: React.FC<GitControlModalProps> = ({
  isOpen,
  onClose,
  files,
  workspaceId = 'default',
  onFilesUpdated,
  onNotify,
  onOpenDiffTab,
  userEmail,
  customGeminiKey,
  initialTab = 'changes'
}) => {
  const [activeTab, setActiveTab] = useState<'changes' | 'history' | 'branches'>(initialTab);
  const [repoState, setRepoState] = useState<GitRepoState | null>(null);
  const [uncommittedChanges, setUncommittedChanges] = useState<GitFileChange[]>([]);
  const [uncommittedStats, setUncommittedStats] = useState({ filesChanged: 0, additions: 0, deletions: 0 });

  // Commit Form State
  const [commitMessage, setCommitMessage] = useState('');
  const [authorType, setAuthorType] = useState<'user' | 'agent'>('user');
  const [customAuthorName, setCustomAuthorName] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<GitCommitSuggestion[]>([]);

  // History & Commit Selection
  const [historySearch, setHistorySearch] = useState('');
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [inspectingDiffFile, setInspectingDiffFile] = useState<GitFileChange | null>(null);

  // Branch management
  const [newBranchName, setNewBranchName] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [confirmCheckoutHash, setConfirmCheckoutHash] = useState<string | null>(null);

  // Sync / refresh state from storage
  const refreshGitState = () => {
    const repo = GitService.getRepoState(workspaceId, files);
    const { changes, stats } = GitService.getWorkingTreeChanges(files, workspaceId);
    setRepoState(repo);
    setUncommittedChanges(changes);
    setUncommittedStats(stats);
  };

  useEffect(() => {
    if (isOpen) {
      refreshGitState();
      setActiveTab(initialTab);
    }
  }, [isOpen, files, workspaceId, initialTab]);

  // Handle generating commit messages with AI based on uncommitted changes
  const handleGenerateAiMessage = async () => {
    if (uncommittedChanges.length === 0) {
      onNotify?.('Não há alterações pendentes no workspace para analisar.', 'info');
      return;
    }

    setIsGeneratingAi(true);
    setAiSuggestions([]);
    try {
      sounds.playClick();
      const suggestions = await generateAICommitMessages({
        changes: uncommittedChanges,
        userHint: commitMessage.trim() || undefined,
        customGeminiKey,
        language: 'pt'
      });
      setAiSuggestions(suggestions);

      // Auto-apply the first suggestion (Conventional) if input is empty
      if (suggestions.length > 0 && !commitMessage.trim()) {
        setCommitMessage(suggestions[0].fullMessage);
      }
      onNotify?.('Sugestões de commit geradas com sucesso baseadas nas alterações!', 'success');
    } catch (err: any) {
      onNotify?.(`Erro ao gerar mensagem com IA: ${err.message}`, 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Perform Git Commit
  const handlePerformCommit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commitMessage.trim()) {
      onNotify?.('Informe uma mensagem de commit.', 'info');
      return;
    }
    if (uncommittedChanges.length === 0) {
      onNotify?.('Nenhuma alteração detectada para commit.', 'info');
      return;
    }

    try {
      const author = {
        name: authorType === 'agent'
          ? 'Agente IA (Gemini)'
          : customAuthorName.trim() || (userEmail ? userEmail.split('@')[0] : 'Desenvolvedor'),
        email: authorType === 'agent'
          ? 'agent@workspace.local'
          : userEmail || 'dev@workspace.local',
        isAgent: authorType === 'agent'
      };

      const { commit } = GitService.createCommit({
        message: commitMessage.trim(),
        currentFiles: files,
        author,
        workspaceId
      });

      sounds.playSuccess();
      setCommitMessage('');
      setAiSuggestions([]);
      refreshGitState();
      setSelectedCommit(commit);
      setActiveTab('history');
      onNotify?.(`Commit ${commit.shortHash} criado com sucesso no branch ${commit.branch}!`, 'success');
    } catch (err: any) {
      onNotify?.(`Erro ao commitar: ${err.message}`, 'error');
    }
  };

  // Checkout an older commit
  const handleCheckoutCommit = (commit: GitCommit) => {
    try {
      const { files: restoredFiles } = GitService.checkoutCommit(commit.hash, workspaceId);
      onFilesUpdated(restoredFiles);
      refreshGitState();
      setConfirmCheckoutHash(null);
      sounds.playSuccess();
      onNotify?.(`Workspace restaurado com sucesso para o commit ${commit.shortHash}!`, 'success');
    } catch (err: any) {
      onNotify?.(`Erro ao restaurar commit: ${err.message}`, 'error');
    }
  };

  // Create branch
  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    try {
      const updated = GitService.createBranch(newBranchName.trim(), workspaceId);
      setRepoState(updated);
      setNewBranchName('');
      sounds.playClick();
      onNotify?.(`Branch "${updated.currentBranch}" criada e ativada!`, 'success');
    } catch (err: any) {
      onNotify?.(`Erro ao criar branch: ${err.message}`, 'error');
    }
  };

  // Switch branch
  const handleSwitchBranch = (name: string) => {
    try {
      const updated = GitService.switchBranch(name, workspaceId);
      setRepoState(updated);
      sounds.playClick();
      onNotify?.(`Alternado para o branch "${name}"`, 'success');
    } catch (err: any) {
      onNotify?.(`Erro ao alternar branch: ${err.message}`, 'error');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Filtered commits
  const filteredCommits = useMemo(() => {
    if (!repoState) return [];
    const query = historySearch.toLowerCase().trim();
    const all = repoState.commitOrder.map((h) => repoState.commits[h]).filter(Boolean);
    if (!query) return all;

    return all.filter(
      (c) =>
        c.message.toLowerCase().includes(query) ||
        c.shortHash.toLowerCase().includes(query) ||
        c.author.name.toLowerCase().includes(query) ||
        c.changes.some((f) => f.path.toLowerCase().includes(query))
    );
  }, [repoState, historySearch]);

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora há pouco';
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'ontem';
    return `há ${days} dias`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-wide">
                  Controle de Versão Git
                </h2>
                {repoState?.currentBranch && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    <GitBranchIcon className="w-3 h-3" />
                    {repoState.currentBranch}
                  </span>
                )}
                {uncommittedChanges.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {uncommittedChanges.length} alterado(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Histórico de commits, geração inteligente de mensagens com IA e inspeção de diffs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refreshGitState();
                sounds.playClick();
              }}
              title="Recarregar status do repositório"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between px-5 border-b border-slate-800/80 bg-[#0c111e]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab('changes');
                sounds.playClick();
              }}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'changes'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileDiff className="w-4 h-4" />
              <span>Mudanças & Commit</span>
              {uncommittedChanges.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                  {uncommittedChanges.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('history');
                sounds.playClick();
              }}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico de Commits</span>
              {repoState && repoState.commitOrder.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                  {repoState.commitOrder.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('branches');
                sounds.playClick();
              }}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'branches'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitBranchIcon className="w-4 h-4" />
              <span>Branches</span>
              {repoState && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                  {repoState.branches.length}
                </span>
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Working Tree Ativo
            </span>
          </div>
        </div>

        {/* Tab 1: Mudanças & Commit */}
        {activeTab === 'changes' && (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
            {/* Left: Uncommitted files list & Diff preview */}
            <div className="lg:col-span-5 p-4 flex flex-col gap-3 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Alterações Pendentes ({uncommittedChanges.length})
                </span>
                {uncommittedChanges.length > 0 && (
                  <span className="text-xs font-mono text-slate-400">
                    <span className="text-emerald-400">+{uncommittedStats.additions}</span>{' '}
                    <span className="text-rose-400">-{uncommittedStats.deletions}</span>
                  </span>
                )}
              </div>

              {uncommittedChanges.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-900/30 border border-slate-800/60 rounded-xl text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2 opacity-80" />
                  <p className="text-sm font-medium text-slate-200">Working tree limpo</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Todos os arquivos estão sincronizados com o último commit. Nenhuma alteração pendente.
                  </p>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="mt-4 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    Ver Histórico de Commits
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {uncommittedChanges.map((change) => {
                    const statusConfig =
                      change.status === 'added'
                        ? { badge: 'A', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
                        : change.status === 'deleted'
                        ? { badge: 'D', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' }
                        : { badge: 'M', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };

                    return (
                      <div
                        key={change.path}
                        className="group flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/60 transition-all text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[11px] border shrink-0 ${statusConfig.bg}`}
                            title={`Status: ${change.status}`}
                          >
                            {statusConfig.badge}
                          </span>
                          <span
                            className="font-mono text-slate-300 truncate group-hover:text-white"
                            title={change.path}
                          >
                            {change.path}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] text-slate-400">
                            {change.additions > 0 && <span className="text-emerald-400">+{change.additions}</span>}{' '}
                            {change.deletions > 0 && <span className="text-rose-400">-{change.deletions}</span>}
                          </span>
                          <button
                            onClick={() => {
                              setInspectingDiffFile(change);
                              sounds.playClick();
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 transition-colors text-[11px] flex items-center gap-1"
                            title="Inspecionar Diff do arquivo"
                          >
                            <FileDiff className="w-3 h-3" />
                            Diff
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Diff Viewer Drawer inside Changes Tab */}
              {inspectingDiffFile && (
                <div className="mt-2 p-3 bg-[#070b13] border border-amber-500/30 rounded-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-mono text-xs font-semibold text-amber-300 truncate">
                      Diff: {inspectingDiffFile.path}
                    </span>
                    <button
                      onClick={() => setInspectingDiffFile(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 max-h-56 overflow-y-auto font-mono text-[11px] bg-black/40 p-2 rounded border border-slate-900 space-y-0.5 leading-relaxed">
                    {(() => {
                      const oldLines = inspectingDiffFile.oldContent ? inspectingDiffFile.oldContent.split('\n') : [];
                      const newLines = inspectingDiffFile.newContent ? inspectingDiffFile.newContent.split('\n') : [];
                      return (
                        <>
                          <div className="text-slate-500">--- {inspectingDiffFile.oldContent ? 'HEAD' : '/dev/null'}</div>
                          <div className="text-slate-500">+++ {inspectingDiffFile.newContent ? 'Working Tree' : '/dev/null'}</div>
                          {newLines.slice(0, 30).map((line, idx) => (
                            <div key={idx} className="text-emerald-400 bg-emerald-500/5 px-1 rounded">
                              + {line}
                            </div>
                          ))}
                          {newLines.length > 30 && (
                            <div className="text-slate-500 italic">
                              ... (+ {newLines.length - 30} linhas adicionais)
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Commit Message Generator & Actions */}
            <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto bg-slate-900/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Criar Commit
                </span>
                <span className="text-xs text-slate-400">
                  Branch atual:{' '}
                  <strong className="text-amber-400 font-mono">{repoState?.currentBranch || 'main'}</strong>
                </span>
              </div>

              {/* Conventional Commit Tag Helpers */}
              <div>
                <span className="text-xs text-slate-400 block mb-1.5">
                  Prefixos Conventional Commits rápidos:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CONVENTIONAL_TAGS.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setCommitMessage((prev) => {
                          const clean = prev.replace(/^[a-z]+(\([a-z0-9_-]+\))?:\s*/i, '');
                          return `${t.label} ${clean}`;
                        });
                      }}
                      className={`px-2 py-1 rounded-md text-xs font-mono border transition-all hover:scale-105 ${t.color}`}
                      title={t.desc}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Commit Message Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">
                    Mensagem de Commit:
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiMessage}
                    disabled={isGeneratingAi || uncommittedChanges.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingAi ? 'Analisando diff...' : '✨ Gerar com IA'}</span>
                  </button>
                </div>

                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="ex: feat(auth): adiciona fluxo de login com Google e sincronização Firestore"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono transition-all resize-y"
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      handlePerformCommit();
                    }
                  }}
                />
                <span className="text-[11px] text-slate-500 block">
                  Dica: Pressione <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300">Ctrl</kbd> +{' '}
                  <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300">Enter</kbd> para commitar rapidamente.
                </span>
              </div>

              {/* AI Generated Suggestions Box */}
              {aiSuggestions.length > 0 && (
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Sugestões Geradas pelo Gemini (Clique para aplicar):
                    </span>
                    <button
                      onClick={() => setAiSuggestions([])}
                      className="text-indigo-400 hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {aiSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCommitMessage(sug.fullMessage);
                          sounds.playClick();
                        }}
                        className={`text-left p-2.5 rounded-lg border transition-all hover:border-indigo-400 ${
                          commitMessage === sug.fullMessage
                            ? 'bg-indigo-600/20 border-indigo-400 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-indigo-400">
                            {sug.style === 'conventional'
                              ? 'Conventional Commit (Recomendado)'
                              : sug.style === 'concise'
                              ? 'Resumo Direto'
                              : 'Detalhado'}
                          </span>
                          {commitMessage === sug.fullMessage && (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </div>
                        <p className="font-mono text-xs text-slate-100 font-medium">
                          {sug.title}
                        </p>
                        {sug.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {sug.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Author Selector */}
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
                <span className="text-xs font-medium text-slate-300 block">Autor do Commit:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthorType('user')}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${
                      authorType === 'user'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <User className="w-4 h-4 text-amber-400" />
                    <span>Você (Desenvolvedor)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthorType('agent')}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${
                      authorType === 'agent'
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Bot className="w-4 h-4 text-indigo-400" />
                    <span>Agente IA (Gemini)</span>
                  </button>
                </div>
              </div>

              {/* Commit Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handlePerformCommit()}
                  disabled={uncommittedChanges.length === 0 || !commitMessage.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <GitCommitIcon className="w-4 h-4" />
                  <span>
                    Commitar no branch {repoState?.currentBranch || 'main'} (
                    {uncommittedChanges.length} arquivo(s))
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Histórico de Commits (Git Log & Graph) */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
            {/* Left: Commit list & timeline */}
            <div className="lg:col-span-5 p-4 flex flex-col gap-3 overflow-y-auto border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Filtrar por mensagem, hash ou autor..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Total: {filteredCommits.length} commit(s)</span>
                <span>Branch: {repoState?.currentBranch}</span>
              </div>

              {filteredCommits.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Nenhum commit encontrado para os critérios de busca.
                </div>
              ) : (
                <div className="space-y-2 relative pl-3 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {filteredCommits.map((commit, idx) => {
                    const isSelected = selectedCommit?.hash === commit.hash;
                    const isHead = repoState?.head === commit.hash;

                    return (
                      <div
                        key={commit.hash}
                        onClick={() => {
                          setSelectedCommit(commit);
                          sounds.playClick();
                        }}
                        className={`relative pl-6 cursor-pointer group transition-all`}
                      >
                        {/* Commit graph dot */}
                        <div
                          className={`absolute left-0 top-3 w-3 h-3 rounded-full border-2 transition-transform ${
                            isSelected
                              ? 'bg-amber-400 border-amber-300 scale-125 z-10'
                              : isHead
                              ? 'bg-emerald-400 border-emerald-300'
                              : commit.author.isAgent
                              ? 'bg-indigo-400 border-indigo-300'
                              : 'bg-slate-600 border-slate-500'
                          }`}
                        />

                        {/* Card */}
                        <div
                          className={`p-3 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500/40 text-slate-100 shadow-md'
                              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-mono text-xs font-semibold text-white truncate">
                              {commit.message.split('\n')[0]}
                            </span>
                            {isHead && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                                HEAD
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                            <div className="flex items-center gap-1.5">
                              {commit.author.isAgent ? (
                                <Bot className="w-3 h-3 text-indigo-400" />
                              ) : (
                                <User className="w-3 h-3 text-amber-400" />
                              )}
                              <span className="truncate max-w-[120px]">{commit.author.name}</span>
                            </div>

                            <div className="flex items-center gap-2 font-mono">
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(commit.hash, commit.shortHash);
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer flex items-center gap-1"
                                title="Copiar SHA"
                              >
                                {copiedHash === commit.shortHash ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                ) : (
                                  commit.shortHash
                                )}
                              </span>
                              <span>{formatRelativeTime(commit.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Selected Commit Inspector */}
            <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto bg-slate-900/10">
              {selectedCommit ? (
                <div className="space-y-4">
                  {/* Commit Header & Meta */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white leading-snug">
                          {selectedCommit.message.split('\n')[0]}
                        </h3>
                        {selectedCommit.message.split('\n').length > 1 && (
                          <p className="text-xs text-slate-300 mt-2 font-mono whitespace-pre-wrap bg-black/30 p-2.5 rounded-lg border border-slate-800/60">
                            {selectedCommit.message.split('\n').slice(1).join('\n').trim()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyToClipboard(selectedCommit.hash, 'full')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors"
                          title="Copiar SHA completo"
                        >
                          {copiedHash === 'full' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>{selectedCommit.shortHash}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase">Autor</span>
                        <span className="text-slate-200 font-medium truncate block">
                          {selectedCommit.author.name}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase">Data</span>
                        <span className="text-slate-200">
                          {new Date(selectedCommit.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase">Branch</span>
                        <span className="text-amber-400 font-mono">{selectedCommit.branch}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase">Arquivos</span>
                        <span className="text-slate-200 font-mono">
                          {selectedCommit.stats.filesChanged} (+{selectedCommit.stats.additions}/-{selectedCommit.stats.deletions})
                        </span>
                      </div>
                    </div>

                    {/* Actions: Checkout / Restore */}
                    <div className="pt-2 flex items-center gap-2">
                      {confirmCheckoutHash === selectedCommit.hash ? (
                        <div className="flex items-center gap-2 w-full p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="text-rose-200 flex-1">
                            Restaurar substituirá os arquivos atuais do workspace. Confirma?
                          </span>
                          <button
                            onClick={() => handleCheckoutCommit(selectedCommit)}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors"
                          >
                            Sim, Restaurar
                          </button>
                          <button
                            onClick={() => setConfirmCheckoutHash(null)}
                            className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmCheckoutHash(selectedCommit.hash)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Restaurar Workspace para este Commit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Changed Files in This Commit */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Arquivos Modificados neste Commit ({selectedCommit.changes.length})
                    </span>

                    <div className="space-y-1.5">
                      {selectedCommit.changes.map((fileChange) => (
                        <div
                          key={fileChange.path}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center ${
                                fileChange.status === 'added'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : fileChange.status === 'deleted'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {fileChange.status[0].toUpperCase()}
                            </span>
                            <span className="font-mono text-slate-200 truncate">
                              {fileChange.path}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                            {fileChange.additions > 0 && (
                              <span className="text-emerald-400">+{fileChange.additions}</span>
                            )}
                            {fileChange.deletions > 0 && (
                              <span className="text-rose-400">-{fileChange.deletions}</span>
                            )}
                            {onOpenDiffTab && (
                              <button
                                onClick={() => {
                                  onOpenDiffTab(
                                    fileChange.path,
                                    fileChange.oldContent || '',
                                    fileChange.newContent || ''
                                  );
                                  onClose();
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                Ver no Editor
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                  <GitCommitIcon className="w-12 h-12 text-slate-700 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">
                    Selecione um commit para inspecionar
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Veja metadados detalhados, arquivos alterados, diffs e opção de restaurar o projeto para o ponto selecionado.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Branches */}
        {activeTab === 'branches' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-2xl mx-auto w-full">
            {/* Create Branch */}
            <form onSubmit={handleCreateBranch} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Criar Nova Branch
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="ex: feature/autenticacao, fix/header"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
                <button
                  type="submit"
                  disabled={!newBranchName.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Branch</span>
                </button>
              </div>
            </form>

            {/* Existing branches list */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Branches no Repositório ({repoState?.branches.length || 0})
              </span>

              <div className="space-y-2">
                {repoState?.branches.map((branch) => {
                  const isCurrent = repoState.currentBranch === branch;
                  return (
                    <div
                      key={branch}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                          : 'bg-slate-900/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <GitBranchIcon className={`w-4 h-4 ${isCurrent ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span className="font-mono text-sm font-semibold">{branch}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Ativa
                          </span>
                        )}
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => handleSwitchBranch(branch)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                        >
                          Alternar para {branch}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/80 bg-slate-900/60 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <GitBranchIcon className="w-3.5 h-3.5 text-amber-400" />
              {repoState?.currentBranch || 'main'}
            </span>
            <span className="text-slate-600">|</span>
            <span>
              {repoState?.commitOrder.length || 0} commit(s) gravado(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
