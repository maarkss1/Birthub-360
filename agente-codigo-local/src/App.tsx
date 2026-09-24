import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Code,
  Columns,
  Eye,
  Terminal,
  FolderOpen,
  FileCode,
  Layers,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { auth } from './firebase/config';
import {
  ProviderConfig,
  BackendProvider,
  ChatMessage,
  StepLog,
  FileTreeNode,
  FileDiffInfo,
  StorageMode,
  AgentAction,
  WorkspaceCheckpoint,
  TokenUsageStats,
  CodeSelectionContext
} from './types/agent';
import { FileSystemManager } from './services/fileSystem';
import { buildSystemPrompt, extractJsonAction, callAIModel } from './services/aiProviders';
import { Header } from './components/Header';
import { FileExplorer } from './components/FileExplorer';
import { CodeEditor } from './components/CodeEditor';
import { DiffViewer } from './components/DiffViewer';
import { WebPreview } from './components/WebPreview';
import { AgentChat, PendingApprovalData } from './components/AgentChat';
import { SettingsModal } from './components/SettingsModal';
import { CliExportModal } from './components/CliExportModal';
import { TerminalDrawer } from './components/TerminalDrawer';
import { CheckpointsModal } from './components/CheckpointsModal';
import { GitHubExportModal } from './components/GitHubExportModal';
import { TokenStatsModal } from './components/TokenStatsModal';
import { SearchModal } from './components/SearchModal';
import { ActivityBar, ActivityTab } from './components/ActivityBar';
import { StatusBar } from './components/StatusBar';
import { CommandPalette, AgentMode } from './components/CommandPalette';
import { ExecutionBeam } from './components/ExecutionBeam';
import { UnitTestGeneratorModal } from './components/UnitTestGeneratorModal';
import { CodeAnalysisModal } from './components/CodeAnalysisModal';
import { AIStudioModal } from './components/AIStudioModal';
import { FirebaseAuthModal } from './components/FirebaseAuthModal';
import { GitControlModal } from './components/GitControlModal';
import { GitService } from './services/gitService';
import { generateAICommitMessages } from './services/gitCommitAI';
import { calculateCyclomaticComplexity } from './services/codeAnalysis';
import { sounds } from './services/soundEffects';
import { formatESLintDirectives, DEFAULT_ESLINT_CONFIG } from './services/eslintHelper';

export default function App() {
  const fsManager = useMemo(() => new FileSystemManager(), []);

  // UI state
  const [storageMode, setStorageMode] = useState<StorageMode>('virtual');
  const [localFolderName, setLocalFolderName] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeCenterTab, setActiveCenterTab] = useState<'editor' | 'diff' | 'preview'>('editor');
  const [diffInfo, setDiffInfo] = useState<FileDiffInfo | null>(null);
  const [allFiles, setAllFiles] = useState<Record<string, string>>({});
  const [hasWebEntry, setHasWebEntry] = useState<boolean>(false);

  // Modern IDE Panels layout state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>('files');
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Modals & Panels
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cliModalOpen, setCliModalOpen] = useState(false);
  const [checkpointsOpen, setCheckpointsOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [tokenStatsOpen, setTokenStatsOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [unitTestModalOpen, setUnitTestModalOpen] = useState(false);
  const [codeAnalysisModalOpen, setCodeAnalysisModalOpen] = useState(false);
  const [aiStudioOpen, setAiStudioOpen] = useState(false);
  const [aiStudioDefaultTab, setAiStudioDefaultTab] = useState<
    'chat' | 'music' | 'image' | 'video' | 'live' | 'grounding' | 'transcribe' | 'saved'
  >('chat');
  const [firebaseAuthOpen, setFirebaseAuthOpen] = useState(false);
  const [appToast, setAppToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedCodeContext, setSelectedCodeContext] = useState<CodeSelectionContext | null>(null);
  const [terminalExternalCmd, setTerminalExternalCmd] = useState<{ cmd: string; timestamp: number } | null>(null);
  const [agentMode, setAgentMode] = useState<AgentMode>(() => {
    try {
      const saved = localStorage.getItem('local_agent_mode');
      if (saved === 'turbo' || saved === 'architect' || saved === 'security') return saved;
    } catch {}
    return 'turbo';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => sounds.isEnabled());

  // Git Version Control state
  const [gitModalOpen, setGitModalOpen] = useState(false);
  const [gitDefaultTab, setGitDefaultTab] = useState<'changes' | 'history' | 'branches'>('changes');
  const [uncommittedGitCount, setUncommittedGitCount] = useState<number>(0);
  const [currentGitBranch, setCurrentGitBranch] = useState<string>('main');

  // Human-in-the-loop approval state
  const [approvalMode, setApprovalMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('local_agent_approval_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [pendingApproval, setPendingApproval] = useState<PendingApprovalData | null>(null);
  const pendingApprovalResolverRef = useRef<((approved: boolean, reason?: string) => void) | null>(null);

  // Checkpoints
  const [checkpoints, setCheckpoints] = useState<WorkspaceCheckpoint[]>(() => {
    try {
      const saved = localStorage.getItem('local_agent_checkpoints');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Token usage
  const [tokenStats, setTokenStats] = useState<TokenUsageStats>(() => {
    try {
      const saved = localStorage.getItem('local_agent_token_stats');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      callCount: 0
    };
  });

  // Chat external input (e.g. from code selection)
  const [chatInputExternal, setChatInputExternal] = useState<string>('');

  // Provider configuration
  const [hasEnvGemini, setHasEnvGemini] = useState(false);
  const [config, setConfig] = useState<ProviderConfig>(() => {
    try {
      const saved = localStorage.getItem('local_agent_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.eslintConfig) {
          parsed.eslintConfig = { ...DEFAULT_ESLINT_CONFIG };
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return {
      provider: 'gemini',
      geminiKey: '',
      groqKey: '',
      julesKey: '',
      julesSource: '',
      openRouterKey: '',
      ollamaHost: 'http://localhost:11434',
      customBaseUrl: 'http://localhost:1234/v1',
      customApiKey: '',
      model: 'gemini-2.5-flash',
      maxSteps: 20,
      temperature: 0.2,
      eslintConfig: { ...DEFAULT_ESLINT_CONFIG }
    };
  });

  // Chat & Execution state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSteps, setCurrentSteps] = useState<StepLog[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const abortControllerRef = useRef<boolean>(false);

  // Check backend health & Gemini env key availability
  useEffect(() => {
    fetch('/api/has-gemini-key')
      .then((res) => res.json())
      .then((data) => {
        if (data.available) {
          setHasEnvGemini(true);
        } else {
          setHasEnvGemini(false);
        }
      })
      .catch(() => {
        setHasEnvGemini(false);
      });
  }, []);

  // Global keyboard shortcuts for modern IDE navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      // Find in files: Ctrl+Shift+F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
      // Toggle sidebar: Ctrl+B
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
      // Toggle terminal: Ctrl+`
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setTerminalOpen((prev) => !prev);
      }
      // Toggle agent chat: Ctrl+J
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save config changes to localStorage
  const handleSaveConfig = (newConfig: ProviderConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem('local_agent_config', JSON.stringify(newConfig));
    } catch {
      // ignore
    }
  };

  // Toggle approval mode
  const handleToggleApprovalMode = () => {
    setApprovalMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('local_agent_approval_mode', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Refresh tree and files
  const refreshWorkspace = async () => {
    try {
      const tree = await fsManager.getFileTree();
      setFileTree(tree);
      const files = await fsManager.getAllFiles();
      setAllFiles(files);
      const hasWeb = await fsManager.hasWebEntry();
      setHasWebEntry(hasWeb);

      // If a file is currently open, refresh its content
      if (selectedPath) {
        try {
          const fresh = await fsManager.readFile(selectedPath);
          setFileContent(fresh);
        } catch {
          // File was deleted
          setSelectedPath(null);
          setFileContent('');
          setOpenTabs((prev) => prev.filter((t) => t !== selectedPath));
        }
      } else {
        // Auto-select first file if nothing open
        const keys = Object.keys(files);
        if (keys.length > 0) {
          const defaultKey = keys.includes('src/server.js')
            ? 'src/server.js'
            : keys.includes('index.html')
            ? 'index.html'
            : keys[0];
          setSelectedPath(defaultKey);
          setFileContent(files[defaultKey] || '');
          setOpenTabs([defaultKey]);
        }
      }
    } catch (err: any) {
      console.error('Erro ao atualizar workspace:', err);
    }
  };

  // Initial load
  useEffect(() => {
    refreshWorkspace();
  }, []);

  // Open file in editor and add to tabs
  const handleSelectFile = async (path: string) => {
    try {
      const content = await fsManager.readFile(path);
      setSelectedPath(path);
      setFileContent(content);
      setActiveCenterTab('editor');

      // Add to open tabs if not already present
      setOpenTabs((prev) => {
        if (prev.includes(path)) return prev;
        return [...prev, path];
      });
    } catch (err: any) {
      alert(`Não foi possível abrir o arquivo "${path}": ${err.message}`);
    }
  };

  // Close tab
  const handleCloseTab = (tabPath: string) => {
    const nextTabs = openTabs.filter((t) => t !== tabPath);
    setOpenTabs(nextTabs);

    if (selectedPath === tabPath) {
      if (nextTabs.length > 0) {
        handleSelectFile(nextTabs[nextTabs.length - 1]);
      } else {
        setSelectedPath(null);
        setFileContent('');
      }
    }
  };

  // Create new file
  const handleCreateFile = async (path: string) => {
    try {
      await fsManager.writeFile(path, '');
      await refreshWorkspace();
      handleSelectFile(path);
    } catch (err: any) {
      alert(`Erro ao criar arquivo: ${err.message}`);
    }
  };

  // Delete file
  const handleDeleteFile = async (path: string) => {
    try {
      await fsManager.deleteFile(path);
      if (selectedPath === path) {
        setSelectedPath(null);
        setFileContent('');
      }
      setOpenTabs((prev) => prev.filter((t) => t !== path));
      await refreshWorkspace();
    } catch (err: any) {
      alert(`Erro ao excluir arquivo: ${err.message}`);
    }
  };

  // Save changes from editor
  const handleSaveEditorContent = async (newContent: string) => {
    if (!selectedPath) return;
    try {
      await fsManager.writeFile(selectedPath, newContent);
      setFileContent(newContent);
      await refreshWorkspace();
    } catch (err: any) {
      alert(`Erro ao salvar arquivo: ${err.message}`);
    }
  };

  // Active file deterministic cyclomatic complexity
  const activeFileComplexity = useMemo(() => {
    if (!selectedPath || !fileContent) return null;
    return calculateCyclomaticComplexity(fileContent, selectedPath).totalComplexity;
  }, [selectedPath, fileContent]);

  // Open unit test generator
  const handleOpenUnitTestGenerator = () => {
    if (!selectedPath) {
      alert('Abra ou selecione um arquivo no editor antes de gerar testes unitários.');
      return;
    }
    setUnitTestModalOpen(true);
  };

  // Open code analysis (cyclomatic complexity & performance refactoring)
  const handleOpenCodeAnalysis = (selection?: CodeSelectionContext) => {
    if (!selectedPath) {
      alert('Abra ou selecione um arquivo no editor para analisar a complexidade ciclomática.');
      return;
    }
    setSelectedCodeContext(selection || null);
    setCodeAnalysisModalOpen(true);
  };

  // Create generated test file in workspace
  const handleCreateTestFile = async (targetPath: string, testCode: string) => {
    await fsManager.writeFile(targetPath, testCode);
    await refreshWorkspace();
    if (!openTabs.includes(targetPath)) {
      setOpenTabs((prev) => [...prev, targetPath]);
    }
    setSelectedPath(targetPath);
    setFileContent(testCode);
    setActiveCenterTab('editor');
    sounds.playSuccessChime();
  };

  // Apply refactored code (either full file or snippet)
  const handleApplyRefactoredCode = async (newCode: string, isSnippetOnly: boolean) => {
    if (!selectedPath) return;
    let finalContent = newCode;
    if (isSnippetOnly && selectedCodeContext?.code) {
      if (fileContent.includes(selectedCodeContext.code)) {
        finalContent = fileContent.replace(selectedCodeContext.code, newCode);
      }
    }
    setFileContent(finalContent);
    await fsManager.writeFile(selectedPath, finalContent);
    await refreshWorkspace();
    sounds.playSuccessChime();
  };

  // Connect local folder via File System Access API
  const handleConnectLocal = async () => {
    try {
      const res = await fsManager.connectLocalDirectory();
      if (!res.success) {
        if (res.error && !res.error.includes('cancelada')) {
          alert(res.error);
        }
        return;
      }
      setStorageMode('local');
      setLocalFolderName(res.name || 'pasta-local');
      setSelectedPath(null);
      setFileContent('');
      setOpenTabs([]);
      await refreshWorkspace();
    } catch (err: any) {
      if (err.message && !err.message.includes('abort')) {
        alert(err.message);
      }
    }
  };

  // Disconnect local folder
  const handleDisconnectLocal = async () => {
    fsManager.disconnectLocal();
    setStorageMode('virtual');
    setLocalFolderName(null);
    setSelectedPath(null);
    setFileContent('');
    setOpenTabs([]);
    await refreshWorkspace();
  };

  // Starter template
  const handleSelectTemplate = (templateKey: string) => {
    if (confirm('Carregar este template irá substituir os arquivos do workspace virtual atual. Continuar?')) {
      fsManager.loadTemplate(templateKey);
      setSelectedPath(null);
      setFileContent('');
      setOpenTabs([]);
      refreshWorkspace();
    }
  };

  // Export ZIP
  const handleExportZip = async () => {
    try {
      const blob = await fsManager.exportAsZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Erro ao gerar ZIP: ${err.message}`);
    }
  };

  // Import ZIP (Item 8)
  const handleImportZip = async (file: File) => {
    try {
      setStatusText('Importando arquivo ZIP para o workspace...');
      const res = await fsManager.importZip(file);
      setStorageMode('virtual');
      setLocalFolderName(null);
      setSelectedPath(null);
      setOpenTabs([]);
      await refreshWorkspace();

      // Create automatic checkpoint
      handleCreateSnapshot(`Importação do projeto ZIP (${file.name})`);

      alert(`Sucesso! ${res.count} arquivos foram importados com sucesso para o workspace.`);
    } catch (err: any) {
      alert(`Erro ao importar arquivo ZIP: ${err.message}`);
    } finally {
      setStatusText('');
    }
  };

  // Import individual or dropped files (Item 8)
  const handleImportFiles = async (files: File[]) => {
    try {
      const items: Array<{ path: string; content: string }> = [];
      for (const f of files) {
        const text = await f.text();
        const p = (f as any).webkitRelativePath || f.name;
        items.push({ path: p, content: text });
      }
      await fsManager.importFiles(items);
      setStorageMode('virtual');
      await refreshWorkspace();
      alert(`${items.length} arquivo(s) importado(s) com sucesso.`);
    } catch (err: any) {
      alert(`Erro ao importar arquivos: ${err.message}`);
    }
  };

  // Revert file to previous diff version
  const handleRevertFile = async (path: string, contentToRestore: string) => {
    try {
      await fsManager.writeFile(path, contentToRestore);
      setFileContent(contentToRestore);
      setDiffInfo(null);
      setActiveCenterTab('editor');
      await refreshWorkspace();
    } catch (err: any) {
      alert(`Erro ao reverter arquivo: ${err.message}`);
    }
  };

  // Checkpoints logic (Item 3)
  const handleCreateSnapshot = async (promptDescription?: string) => {
    try {
      const files = await fsManager.getAllFiles();
      const count = Object.keys(files).length;
      if (count === 0) return;

      const newCp: WorkspaceCheckpoint = {
        id: 'cp-' + Date.now(),
        timestamp: Date.now(),
        prompt: promptDescription || `Ponto de restauração manual`,
        files,
        fileCount: count
      };

      setCheckpoints((prev) => {
        const updated = [newCp, ...prev.slice(0, 19)]; // keep up to 20 checkpoints
        try {
          localStorage.setItem('local_agent_checkpoints', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    } catch (err) {
      console.warn('Falha ao salvar checkpoint:', err);
    }
  };

  const handleRestoreCheckpoint = async (cp: WorkspaceCheckpoint) => {
    try {
      await fsManager.restoreSnapshot(cp.files);
      await refreshWorkspace();
      alert(`Workspace restaurado com sucesso para o ponto de ${new Date(cp.timestamp).toLocaleTimeString()}!`);
    } catch (err: any) {
      alert(`Erro ao restaurar checkpoint: ${err.message}`);
    }
  };

  const handleDeleteCheckpoint = (id: string) => {
    setCheckpoints((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      try {
        localStorage.setItem('local_agent_checkpoints', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Git status synchronizer
  const updateGitStatus = useCallback(() => {
    try {
      const workspaceId = storageMode === 'local' ? (localFolderName || 'local') : 'virtual';
      const repo = GitService.getRepoState(workspaceId, allFiles);
      const { changes } = GitService.getWorkingTreeChanges(allFiles, workspaceId);
      setUncommittedGitCount(changes.length);
      setCurrentGitBranch(repo.currentBranch || 'main');
    } catch (e) {
      console.warn('Erro ao atualizar status do Git:', e);
    }
  }, [allFiles, storageMode, localFolderName]);

  useEffect(() => {
    updateGitStatus();
  }, [allFiles, updateGitStatus]);

  const handleUpdateAllFilesFromGit = async (updatedFiles: Record<string, string>) => {
    try {
      await fsManager.restoreSnapshot(updatedFiles);
      await refreshWorkspace();
      sounds.playSuccess();
      setAppToast({
        message: 'Workspace restaurado com sucesso a partir do Git!',
        type: 'success'
      });
      setTimeout(() => setAppToast(null), 3500);
    } catch (err: any) {
      setAppToast({
        message: `Erro ao restaurar arquivos: ${err.message}`,
        type: 'error'
      });
      setTimeout(() => setAppToast(null), 4000);
    }
  };

  // Token usage calculation & accumulation (Item 9)
  const trackTokenUsage = (usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) => {
    if (!usage) return;

    const { promptTokens, completionTokens, totalTokens } = usage;
    let costUsd = 0;

    // Pricing calculation
    if (config.provider === 'gemini') {
      costUsd = (promptTokens / 1_000_000) * 0.075 + (completionTokens / 1_000_000) * 0.3;
    } else if (config.provider === 'groq') {
      costUsd = (promptTokens / 1_000_000) * 0.59 + (completionTokens / 1_000_000) * 0.79;
    } else if (config.provider === 'ollama') {
      costUsd = 0; // Local free
    } else {
      costUsd = (totalTokens / 1_000_000) * 0.2;
    }

    setTokenStats((prev) => {
      const updated: TokenUsageStats = {
        promptTokens: prev.promptTokens + promptTokens,
        completionTokens: prev.completionTokens + completionTokens,
        totalTokens: prev.totalTokens + totalTokens,
        estimatedCostUsd: prev.estimatedCostUsd + costUsd,
        callCount: prev.callCount + 1
      };
      try {
        localStorage.setItem('local_agent_token_stats', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleResetTokenStats = () => {
    const resetVal: TokenUsageStats = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      callCount: 0
    };
    setTokenStats(resetVal);
    try {
      localStorage.setItem('local_agent_token_stats', JSON.stringify(resetVal));
    } catch {
      // ignore
    }
  };

  // Code selection context to Chat (Item 10)
  const handleAskAboutSelection = (context: CodeSelectionContext) => {
    const formatted = `No arquivo \`${context.filePath}\` (linhas ${context.startLine} a ${context.endLine}):
\`\`\`
${context.code}
\`\`\`
${context.promptSuggestion || 'Explique o funcionamento deste trecho de código e aponte sugestões de melhoria.'}`;

    setChatInputExternal(formatted);
  };

  // Human-in-the-loop approval actions (Item 2)
  const handleApproveStep = () => {
    if (pendingApprovalResolverRef.current) {
      pendingApprovalResolverRef.current(true);
      pendingApprovalResolverRef.current = null;
    }
    setPendingApproval(null);
  };

  const handleRejectStep = (reason?: string) => {
    if (pendingApprovalResolverRef.current) {
      pendingApprovalResolverRef.current(false, reason || 'Ação rejeitada pelo usuário.');
      pendingApprovalResolverRef.current = null;
    }
    setPendingApproval(null);
  };

  const handleOpenDiffForApproval = (action: AgentAction, oldContent?: string) => {
    if (action.path) {
      setDiffInfo({
        path: action.path,
        oldContent: oldContent || '',
        newContent: action.content || '',
        timestamp: Date.now()
      });
      setActiveCenterTab('diff');
    }
  };

  // Main autonomous agent task loop
  const handleSendMessage = async (userTask: string) => {
    if (isBusy) return;

    // Save checkpoint snapshot before making changes (Item 3)
    await handleCreateSnapshot(userTask);

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: userTask,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsBusy(true);
    setCurrentSteps([]);
    abortControllerRef.current = false;

    const workspaceName = storageMode === 'local' ? (localFolderName || 'projeto-local') : 'workspace-virtual';

    // Incorporate custom instructions from settings or .agentrules / AGENT.md
    let projectRules = config.customInstructions || '';
    if (allFiles['.agentrules']) {
      projectRules = projectRules ? `${projectRules}\n\n[Regras de .agentrules]:\n${allFiles['.agentrules']}` : allFiles['.agentrules'];
    } else if (allFiles['AGENT.md']) {
      projectRules = projectRules ? `${projectRules}\n\n[Regras de AGENT.md]:\n${allFiles['AGENT.md']}` : allFiles['AGENT.md'];
    }

    // Supremium Agent Mode Injection
    if (agentMode === 'turbo') {
      projectRules += '\n\n[MODO TURBO CODER ATIVO]: Seja extremamente direto e conciso. Execute as alterações nas ferramentas com velocidade máxima e edições cirúrgicas no código.';
    } else if (agentMode === 'architect') {
      projectRules += '\n\n[MODO DEEP ARCHITECT ATIVO]: Raciocine profundamente passo a passo. Garanta modularidade, interfaces limpas, manutenibilidade, tipos rigorosos e documentação clara.';
    } else if (agentMode === 'security') {
      projectRules += '\n\n[MODO SECURITY & AUDITOR ATIVO]: Priorize segurança defensiva, sanitização de entradas, tratamento de erros robusto, zero vulnerabilidades e verificação minuciosa.';
    }

    // ESLint Rules Injection (Agent must strictly obey configured linting rules)
    if (config.eslintConfig && config.eslintConfig.enabled) {
      const eslintDirectives = formatESLintDirectives(config.eslintConfig);
      if (eslintDirectives) {
        projectRules = projectRules ? `${projectRules}\n\n${eslintDirectives}` : eslintDirectives;
      }
    }

    const systemPrompt = buildSystemPrompt(workspaceName, storageMode, projectRules);

    // Build dialogue history
    const historyForAI: Array<{ role: string; content: string }> = [];

    // Include recent relevant messages
    messages.slice(-4).forEach((m) => {
      if (m.role === 'user') {
        historyForAI.push({ role: 'user', content: m.content });
      } else if (m.role === 'assistant' && m.content) {
        historyForAI.push({ role: 'assistant', content: m.content });
      }
    });

    historyForAI.push({ role: 'user', content: userTask });

    const maxSteps = config.maxSteps || 20;
    const executedSteps: StepLog[] = [];
    let completedNormally = false;

    try {
      for (let step = 1; step <= maxSteps; step++) {
        if (abortControllerRef.current) {
          setStatusText('Interrompido pelo usuário.');
          executedSteps.push({
            id: 'step-abort-' + Date.now(),
            stepNumber: step,
            action: { action: 'say', message: 'Execução interrompida a pedido do usuário.' },
            status: 'error',
            timestamp: Date.now(),
            result: 'Cancelado pelo usuário.'
          });
          break;
        }

        setStatusText(`Passo ${step}/${maxSteps}: analisando tarefa…`);

        let reply = '';
        try {
          const aiRes = await callAIModel(config, historyForAI, systemPrompt);
          reply = aiRes.content;
          trackTokenUsage(aiRes.usage);
        } catch (callErr: any) {
          const errStep: StepLog = {
            id: 'step-err-' + Date.now(),
            stepNumber: step,
            action: { action: 'say', message: 'Falha na comunicação com o modelo de IA.' },
            status: 'error',
            timestamp: Date.now(),
            result: callErr.message || 'Erro de rede ou API'
          };
          executedSteps.push(errStep);
          setCurrentSteps([...executedSteps]);
          break;
        }

        historyForAI.push({ role: 'assistant', content: reply });

        let action: AgentAction;
        try {
          action = extractJsonAction(reply);
        } catch (jsonErr: any) {
          const formatErrStep: StepLog = {
            id: 'step-fmt-' + Date.now(),
            stepNumber: step,
            action: { action: 'say', message: 'O modelo não retornou JSON válido. Solicitando correção…' },
            status: 'error',
            timestamp: Date.now(),
            result: jsonErr.message
          };
          executedSteps.push(formatErrStep);
          setCurrentSteps([...executedSteps]);

          historyForAI.push({
            role: 'user',
            content: `[erro de formato] ${jsonErr.message}. Responda APENAS com o objeto JSON da ação.`
          });
          continue;
        }

        // Handle tool actions
        if (action.action === 'done') {
          const doneStep: StepLog = {
            id: 'step-' + Date.now() + '-' + step,
            stepNumber: step,
            action,
            status: 'success',
            timestamp: Date.now(),
            result: action.message || 'Tarefa concluída com sucesso!'
          };
          executedSteps.push(doneStep);
          setCurrentSteps([...executedSteps]);
          completedNormally = true;
          break;
        }

        // Human-in-the-Loop Approval Check (Item 2)
        if (
          approvalMode &&
          (action.action === 'write_file' ||
            action.action === 'patch_file' ||
            action.action === 'delete_file')
        ) {
          setStatusText(`Aguardando aprovação do usuário para ${action.action} em ${action.path}…`);

          let existingContent = '';
          if (action.path) {
            try {
              existingContent = await fsManager.readFile(action.path);
            } catch {
              existingContent = '';
            }
          }

          const approvalPromise = new Promise<{ approved: boolean; reason?: string }>((resolve) => {
            pendingApprovalResolverRef.current = (approved, reason) => resolve({ approved, reason });
            setPendingApproval({
              stepNumber: step,
              action,
              oldContent: existingContent
            });
          });

          const approvalDecision = await approvalPromise;

          if (!approvalDecision.approved) {
            const rejectedStep: StepLog = {
              id: 'step-' + Date.now() + '-' + step,
              stepNumber: step,
              action,
              status: 'error',
              timestamp: Date.now(),
              result: `[Rejeitado pelo usuário]: ${approvalDecision.reason}`
            };
            executedSteps.push(rejectedStep);
            setCurrentSteps([...executedSteps]);

            historyForAI.push({
              role: 'user',
              content: `[ação rejeitada] O usuário recusou a execução de ${action.action} no arquivo "${action.path}". Motivo: ${approvalDecision.reason}. Ajuste sua abordagem.`
            });
            continue;
          }
        }

        setStatusText(`Passo ${step}/${maxSteps}: executando ${action.action} ${action.path || ''}…`);

        let actionResult = '';
        let stepStatus: 'success' | 'error' = 'success';
        let previousContent: string | undefined = undefined;

        try {
          switch (action.action) {
            case 'list_files': {
              const list = await fsManager.listFiles(action.path || '.');
              actionResult = JSON.stringify(list);
              break;
            }

            case 'read_file': {
              if (!action.path) throw new Error('Caminho não especificado para read_file');
              const readContent = await fsManager.readFile(action.path);
              actionResult = readContent;
              break;
            }

            case 'write_file': {
              if (!action.path) throw new Error('Caminho não especificado para write_file');
              try {
                previousContent = await fsManager.readFile(action.path);
              } catch {
                previousContent = '';
              }

              const res = await fsManager.writeFile(action.path, action.content || '');
              actionResult = `[ok] escrito: ${res.path} (${res.size} caracteres)`;

              // Record diff info
              setDiffInfo({
                path: res.path,
                oldContent: previousContent,
                newContent: action.content || '',
                timestamp: Date.now()
              });

              // Select the file in editor & tabs
              setSelectedPath(res.path);
              setFileContent(action.content || '');
              setOpenTabs((prev) => (prev.includes(res.path) ? prev : [...prev, res.path]));
              break;
            }

            case 'patch_file': {
              // Item 5: Targeted Partial Patching
              if (!action.path) throw new Error('Caminho não especificado para patch_file');
              const patchRes = await fsManager.patchFile(
                action.path,
                action.search || '',
                action.replace || ''
              );
              actionResult = `[ok] Trecho substituído com sucesso em: ${patchRes.path} (${patchRes.size} caracteres)`;
              previousContent = patchRes.oldContent;

              setDiffInfo({
                path: patchRes.path,
                oldContent: patchRes.oldContent,
                newContent: patchRes.newContent,
                timestamp: Date.now()
              });

              setSelectedPath(patchRes.path);
              setFileContent(patchRes.newContent);
              setOpenTabs((prev) => (prev.includes(patchRes.path) ? prev : [...prev, patchRes.path]));
              break;
            }

            case 'delete_file': {
              if (!action.path) throw new Error('Caminho não especificado para delete_file');
              const delRes = await fsManager.deleteFile(action.path);
              actionResult = delRes;
              if (selectedPath === action.path) {
                setSelectedPath(null);
                setFileContent('');
              }
              setOpenTabs((prev) => prev.filter((t) => t !== action.path));
              break;
            }

            case 'git_commit': {
              const workspaceId = storageMode === 'local' ? (localFolderName || 'local') : 'virtual';
              const currentFiles = await fsManager.getAllFiles();
              const { changes } = GitService.getWorkingTreeChanges(currentFiles, workspaceId);

              let commitMsg = action.message?.trim();
              if (!commitMsg) {
                const suggestions = await generateAICommitMessages({
                  changes,
                  language: 'pt',
                  customGeminiKey: config.geminiKey
                });
                commitMsg = suggestions[0]?.fullMessage || 'chore: atualiza arquivos do workspace';
              }

              const { commit } = GitService.createCommit({
                message: commitMsg,
                currentFiles,
                author: {
                  name: action.author || 'Agente IA (Gemini)',
                  email: 'agent@workspace.local',
                  isAgent: true
                },
                filesToCommit: action.files,
                workspaceId
              });

              updateGitStatus();
              sounds.playSuccess();
              setAppToast({
                message: `Git Commit [${commit.shortHash}]: ${commit.message.split('\n')[0]}`,
                type: 'success'
              });
              setTimeout(() => setAppToast(null), 4000);

              actionResult = `[ok] Commit Git realizado com sucesso no branch ${commit.branch}!\nHash: ${commit.shortHash} (${commit.hash})\nMensagem: "${commit.message.split('\n')[0]}"\nArquivos alterados: ${commit.stats.filesChanged} (+${commit.stats.additions}/-${commit.stats.deletions})`;
              break;
            }

            case 'say': {
              actionResult = '[ok] Mensagem recebida pelo usuário';
              break;
            }

            default: {
              throw new Error(`Ação desconhecida: ${(action as any).action}`);
            }
          }
        } catch (toolErr: any) {
          stepStatus = 'error';
          actionResult = `[erro] ${toolErr.message}`;
        }

        const stepLog: StepLog = {
          id: 'step-' + Date.now() + '-' + step,
          stepNumber: step,
          action,
          status: stepStatus,
          timestamp: Date.now(),
          result: actionResult,
          previousContent
        };

        executedSteps.push(stepLog);
        setCurrentSteps([...executedSteps]);

        // Feedback to AI
        historyForAI.push({
          role: 'user',
          content: `[resultado da ferramenta ${action.action}] ${actionResult}`
        });

        // Refresh workspace after modifications
        if (
          action.action === 'write_file' ||
          action.action === 'patch_file' ||
          action.action === 'delete_file'
        ) {
          await refreshWorkspace();
        }
      }
    } finally {
      setIsBusy(false);
      setStatusText('');
      setPendingApproval(null);
      await refreshWorkspace();

      if (completedNormally) {
        sounds.playSuccessChime();
      } else if (abortControllerRef.current) {
        sounds.playAlertTone();
      }

      // Commit steps to assistant chat message
      const assistantMsg: ChatMessage = {
        id: 'msg-assist-' + Date.now(),
        role: 'assistant',
        content: completedNormally
          ? 'Tarefa finalizada com sucesso.'
          : 'Ciclo de execução finalizado.',
        steps: executedSteps,
        timestamp: Date.now(),
        completed: completedNormally
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentSteps([]);
    }
  };

  const handleCancelTask = () => {
    abortControllerRef.current = true;
    setStatusText('Interrompendo agente…');
    if (pendingApprovalResolverRef.current) {
      pendingApprovalResolverRef.current(false, 'Execução cancelada pelo usuário.');
      pendingApprovalResolverRef.current = null;
    }
    setPendingApproval(null);
  };

  const handleClearHistory = () => {
    setMessages([]);
    setCurrentSteps([]);
  };

  const handleOpenDiffForStep = (step: StepLog) => {
    if (step.action.path && step.previousContent !== undefined) {
      setDiffInfo({
        path: step.action.path,
        oldContent: step.previousContent,
        newContent: step.action.content || (step.action as any).replace || '',
        timestamp: step.timestamp
      });
      setActiveCenterTab('diff');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0b0f17] text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Header
        storageMode={storageMode}
        localFolderName={localFolderName}
        onConnectLocal={handleConnectLocal}
        onDisconnectLocal={handleDisconnectLocal}
        onSelectTemplate={handleSelectTemplate}
        onExportZip={handleExportZip}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenCliModal={() => setCliModalOpen(true)}
        provider={config.provider}
        model={config.model}
        hasEnvGemini={hasEnvGemini}
        isBusy={isBusy}
        onOpenCheckpoints={() => setCheckpointsOpen(true)}
        checkpointsCount={checkpoints.length}
        onOpenGitHubExport={() => setGithubModalOpen(true)}
        onOpenTokenStats={() => setTokenStatsOpen(true)}
        tokenStats={tokenStats}
        onToggleTerminal={() => setTerminalOpen(!terminalOpen)}
        isTerminalOpen={terminalOpen}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onOpenAIStudio={() => {
          setAiStudioDefaultTab('chat');
          setAiStudioOpen(true);
        }}
        onOpenFirebaseAuth={() => setFirebaseAuthOpen(true)}
        onOpenGit={() => {
          setGitDefaultTab('changes');
          setGitModalOpen(true);
        }}
        uncommittedGitCount={uncommittedGitCount}
      />

      {/* Main Workbench Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Supremium Top Execution Beam */}
        <ExecutionBeam
          isBusy={isBusy}
          statusText={statusText}
          onCancel={handleCancelTask}
          model={config.model}
        />

        {/* Leftmost Activity Bar (VS Code / Cursor Icon Rail) */}
        <ActivityBar
          activeTab={isSidebarOpen ? activeActivityTab : null}
          onSelectTab={(tab) => {
            if (activeActivityTab === tab && isSidebarOpen) {
              setIsSidebarOpen(false);
            } else {
              setActiveActivityTab(tab);
              setIsSidebarOpen(true);
            }
          }}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenCheckpoints={() => setCheckpointsOpen(true)}
          onToggleTerminal={() => setTerminalOpen(!terminalOpen)}
          isTerminalOpen={terminalOpen}
          onSelectCenterTab={setActiveCenterTab}
          activeCenterTab={activeCenterTab}
          hasWebEntry={hasWebEntry}
          checkpointsCount={checkpoints.length}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenTokenStats={() => setTokenStatsOpen(true)}
          onOpenGitHub={() => setGithubModalOpen(true)}
          onOpenCli={() => setCliModalOpen(true)}
          onOpenUnitTestGenerator={handleOpenUnitTestGenerator}
          onOpenCodeAnalysis={handleOpenCodeAnalysis}
          onOpenAIStudio={(tab) => {
            setAiStudioDefaultTab(tab || 'chat');
            setAiStudioOpen(true);
          }}
          onOpenFirebaseAuth={() => setFirebaseAuthOpen(true)}
          onOpenGit={() => {
            setGitDefaultTab('changes');
            setGitModalOpen(true);
          }}
          uncommittedGitCount={uncommittedGitCount}
        />

        {/* Collapsible Left Sidebar: File Explorer / Workspace (260px) */}
        {isSidebarOpen && (
          <aside className="w-64 shrink-0 flex flex-col border-r border-slate-800/80 bg-[#0d121d] z-10 select-none">
            <FileExplorer
              tree={fileTree}
              selectedPath={selectedPath}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onRefresh={refreshWorkspace}
              isBusy={isBusy}
              onImportZip={handleImportZip}
              onImportFiles={handleImportFiles}
              onOpenSearch={() => setSearchModalOpen(true)}
            />
          </aside>
        )}

        {/* Center Workbench: Editor / Diff / Live Preview + Docked Terminal */}
        <main className="flex-1 flex flex-col border-r border-slate-800/80 bg-[#0b0f17] min-w-0 relative overflow-hidden">
          {/* Center Tabs Navigation */}
          <div className="h-10 border-b border-slate-800/80 bg-[#0d121d] px-3 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveCenterTab('editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeCenterTab === 'editor'
                    ? 'bg-slate-800 text-teal-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Editor</span>
                {openTabs.length > 0 && (
                  <span className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                    {openTabs.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveCenterTab('diff')}
                disabled={!diffInfo}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeCenterTab === 'diff'
                    ? 'bg-slate-800 text-teal-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                title={diffInfo ? 'Ver comparação de alterações' : 'Nenhuma alteração recente para diff'}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Diff Visual</span>
                {diffInfo && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
              </button>

              {hasWebEntry && (
                <button
                  onClick={() => setActiveCenterTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeCenterTab === 'preview'
                      ? 'bg-slate-800 text-teal-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                  title="Visualizar aplicação web em tempo real"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Preview</span>
                  <span className="text-[9px] text-teal-400 font-mono uppercase bg-teal-500/10 px-1 py-0.2 rounded">
                    HTML
                  </span>
                </button>
              )}
            </div>

            {/* Quick action button when right chat is closed */}
            {!isChatOpen && (
              <button
                onClick={() => setIsChatOpen(true)}
                className="flex items-center gap-1.5 text-xs text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2.5 py-1 rounded transition-colors"
                title="Abrir console do agente de IA (Ctrl+J)"
              >
                <Sparkles className="w-3 h-3" />
                <span>Abrir Agente</span>
              </button>
            )}
          </div>

          {/* Center Tab Body */}
          <div className="flex-1 flex overflow-hidden">
            {activeCenterTab === 'editor' && (
              <CodeEditor
                filePath={selectedPath}
                content={fileContent}
                openTabs={openTabs}
                onSelectTab={handleSelectFile}
                onCloseTab={handleCloseTab}
                onSaveContent={handleSaveEditorContent}
                onOpenDiff={() => setActiveCenterTab('diff')}
                hasDiff={!!diffInfo && diffInfo.path === selectedPath}
                onRunInTerminal={() => setTerminalOpen(true)}
                onAskAboutSelection={handleAskAboutSelection}
                eslintConfig={config.eslintConfig}
                onAskAgentToFixLint={(prompt) => handleSendMessage(prompt)}
                onOpenTestGenerator={handleOpenUnitTestGenerator}
                onOpenCodeAnalysis={handleOpenCodeAnalysis}
              />
            )}

            {activeCenterTab === 'diff' && (
              <DiffViewer
                diff={diffInfo}
                onClose={() => setActiveCenterTab('editor')}
                onRevert={handleRevertFile}
              />
            )}

            {activeCenterTab === 'preview' && (
              <WebPreview files={allFiles} onRefresh={refreshWorkspace} />
            )}
          </div>

          {/* Integrated Docked Terminal Panel (VS Code style) */}
          {terminalOpen && (
            <TerminalDrawer
              isOpen={terminalOpen}
              onToggle={() => setTerminalOpen(!terminalOpen)}
              activeFilePath={selectedPath}
              files={allFiles}
              onOpenFile={handleSelectFile}
              embedded={true}
              eslintConfig={config.eslintConfig}
              externalCommand={terminalExternalCmd}
              onAutoFixAllFiles={async (fixedFiles) => {
                for (const [p, c] of Object.entries(fixedFiles)) {
                  await fsManager.writeFile(p, c);
                }
                await refreshWorkspace();
              }}
              onOpenGitModal={() => {
                setGitDefaultTab('changes');
                setGitModalOpen(true);
              }}
              onFilesUpdated={handleUpdateAllFilesFromGit}
              workspaceId={storageMode === 'local' ? (localFolderName || 'local') : 'virtual'}
            />
          )}
        </main>

        {/* Collapsible Right Column: Agent Execution Console & Chat (380px) */}
        {isChatOpen && (
          <aside className="w-96 shrink-0 flex flex-col bg-[#0b0f17] z-10 border-l border-slate-800/80">
            <AgentChat
              messages={messages}
              currentSteps={currentSteps}
              isBusy={isBusy}
              statusText={statusText}
              onSendMessage={handleSendMessage}
              onCancel={handleCancelTask}
              onClearHistory={handleClearHistory}
              onOpenFile={(path) => {
                handleSelectFile(path);
                setActiveCenterTab('editor');
              }}
              onOpenDiffForStep={(step) => {
                handleOpenDiffForStep(step);
                setActiveCenterTab('diff');
              }}
              approvalMode={approvalMode}
              onToggleApprovalMode={handleToggleApprovalMode}
              pendingApproval={pendingApproval}
              onApproveStep={handleApproveStep}
              onRejectStep={handleRejectStep}
              onOpenDiffForApproval={handleOpenDiffForApproval}
              inputExternal={chatInputExternal}
              onClearInputExternal={() => setChatInputExternal('')}
              onClose={() => setIsChatOpen(false)}
              agentMode={agentMode}
              onSelectAgentMode={(mode) => {
                setAgentMode(mode);
                try {
                  localStorage.setItem('local_agent_mode', mode);
                } catch {}
              }}
            />
          </aside>
        )}
      </div>

      {/* Modern Bottom IDE Status Bar */}
      <StatusBar
        storageMode={storageMode}
        localFolderName={localFolderName}
        activeFilePath={selectedPath}
        fileContentLength={fileContent.length}
        isBusy={isBusy}
        statusText={statusText}
        hasPendingApproval={!!pendingApproval}
        isTerminalOpen={terminalOpen}
        onToggleTerminal={() => setTerminalOpen(!terminalOpen)}
        model={config.model}
        totalTokens={tokenStats.totalTokens}
        estimatedCostUsd={tokenStats.estimatedCostUsd}
        onOpenTokenStats={() => setTokenStatsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        agentMode={agentMode}
        eslintEnabled={config.eslintConfig ? config.eslintConfig.enabled : true}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          sounds.setEnabled(next);
          if (next) sounds.playClick();
        }}
        onOpenUnitTestGenerator={handleOpenUnitTestGenerator}
        onOpenCodeAnalysis={handleOpenCodeAnalysis}
        activeFileComplexity={activeFileComplexity}
        onOpenAIStudio={(tab) => {
          setAiStudioDefaultTab(tab || 'chat');
          setAiStudioOpen(true);
        }}
        onOpenFirebaseAuth={() => setFirebaseAuthOpen(true)}
        onOpenGit={() => {
          setGitDefaultTab('changes');
          setGitModalOpen(true);
        }}
        gitBranch={currentGitBranch}
        uncommittedGitCount={uncommittedGitCount}
      />

      {/* Supremium Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        files={allFiles}
        onOpenFile={(path) => {
          handleSelectFile(path);
          setActiveCenterTab('editor');
        }}
        agentMode={agentMode}
        onSelectAgentMode={(mode) => {
          setAgentMode(mode);
          try {
            localStorage.setItem('local_agent_mode', mode);
          } catch {}
        }}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onToggleTerminal={() => setTerminalOpen((prev) => !prev)}
        onToggleChat={() => setIsChatOpen((prev) => !prev)}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenCheckpoints={() => setCheckpointsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenTokenStats={() => setTokenStatsOpen(true)}
        onOpenGitHub={() => setGithubModalOpen(true)}
        onExportZip={handleExportZip}
        onSelectTemplate={handleSelectTemplate}
        onSendPromptToAgent={(prompt: string) => {
          setIsChatOpen(true);
          handleSendMessage(prompt);
        }}
        onOpenUnitTestGenerator={handleOpenUnitTestGenerator}
        onOpenCodeAnalysis={handleOpenCodeAnalysis}
        onOpenAIStudio={(tab) => {
          setAiStudioDefaultTab(tab || 'chat');
          setAiStudioOpen(true);
        }}
        onOpenFirebaseAuth={() => setFirebaseAuthOpen(true)}
        onOpenGit={(tab) => {
          setGitDefaultTab(tab || 'changes');
          setGitModalOpen(true);
        }}
      />

      {/* Checkpoints & Rollback Modal (Item 3) */}
      <CheckpointsModal
        isOpen={checkpointsOpen}
        onClose={() => setCheckpointsOpen(false)}
        checkpoints={checkpoints}
        onRestoreCheckpoint={handleRestoreCheckpoint}
        onCreateCheckpoint={handleCreateSnapshot}
        onDeleteCheckpoint={handleDeleteCheckpoint}
      />

      {/* GitHub Direct Export Modal (Item 7) */}
      <GitHubExportModal
        isOpen={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        files={allFiles}
        defaultRepoName={
          localFolderName ? localFolderName.toLowerCase().replace(/[^a-z0-9_-]/g, '-') : 'meu-projeto-agente'
        }
      />

      {/* Token Usage & Cost Analytics Modal (Item 9) */}
      <TokenStatsModal
        isOpen={tokenStatsOpen}
        onClose={() => setTokenStatsOpen(false)}
        stats={tokenStats}
        onResetStats={handleResetTokenStats}
        currentProvider={config.provider}
        currentModel={config.model}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        hasEnvGemini={hasEnvGemini}
        onSaveEslintToWorkspace={async (eslintrcContent: string) => {
          await fsManager.writeFile('.eslintrc.json', eslintrcContent);
          await refreshWorkspace();
        }}
      />

      {/* Standalone CLI Script Modal */}
      <CliExportModal
        isOpen={cliModalOpen}
        onClose={() => setCliModalOpen(false)}
      />

      {/* Global Workspace Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        files={allFiles}
        onOpenFile={(path) => {
          handleSelectFile(path);
          setActiveCenterTab('editor');
        }}
      />

      {/* Unit Test Generator Modal */}
      <UnitTestGeneratorModal
        isOpen={unitTestModalOpen}
        onClose={() => setUnitTestModalOpen(false)}
        filePath={selectedPath}
        fileContent={fileContent}
        config={config}
        onCreateTestFile={handleCreateTestFile}
        onRunInTerminal={(cmd) => {
          setTerminalOpen(true);
          setTerminalExternalCmd({ cmd, timestamp: Date.now() });
        }}
      />

      {/* Cyclomatic Complexity & Performance Optimization Modal */}
      <CodeAnalysisModal
        isOpen={codeAnalysisModalOpen}
        onClose={() => setCodeAnalysisModalOpen(false)}
        filePath={selectedPath}
        codeToAnalyze={selectedCodeContext?.code || fileContent}
        selectionContext={selectedCodeContext}
        config={config}
        onApplyRefactoredCode={handleApplyRefactoredCode}
        onJumpToLine={() => {
          setCodeAnalysisModalOpen(false);
        }}
      />

      {/* Multimodal AI Studio Modal */}
      <AIStudioModal
        isOpen={aiStudioOpen}
        onClose={() => setAiStudioOpen(false)}
        defaultTab={aiStudioDefaultTab}
        onInsertCode={(code) => {
          if (selectedPath) {
            handleSaveEditorContent(fileContent + '\n\n' + code);
          }
        }}
        onNotify={(msg, type) => {
          setAppToast({ message: msg, type });
          setTimeout(() => setAppToast(null), 4000);
        }}
      />

      {/* Firebase Auth & Firestore Modal */}
      <FirebaseAuthModal
        isOpen={firebaseAuthOpen}
        onClose={() => setFirebaseAuthOpen(false)}
        files={allFiles}
        onNotify={(msg, type) => {
          setAppToast({ message: msg, type });
          setTimeout(() => setAppToast(null), 4000);
        }}
      />

      {/* Git Source Control & Commit History Modal */}
      <GitControlModal
        isOpen={gitModalOpen}
        onClose={() => {
          setGitModalOpen(false);
          updateGitStatus();
        }}
        files={allFiles}
        workspaceId={storageMode === 'local' ? (localFolderName || 'local') : 'virtual'}
        initialTab={gitDefaultTab}
        onFilesUpdated={handleUpdateAllFilesFromGit}
        onNotify={(msg, type) => {
          setAppToast({ message: msg, type });
          setTimeout(() => setAppToast(null), 4000);
          updateGitStatus();
        }}
        onOpenDiffTab={(path, oldContent, newContent) => {
          setDiffInfo({
            path,
            oldContent,
            newContent,
            timestamp: Date.now()
          });
          setActiveCenterTab('diff');
        }}
        userEmail={auth.currentUser?.email || undefined}
        customGeminiKey={config.geminiKey}
      />

      {/* Toast notifications */}
      {appToast && (
        <div className="fixed bottom-10 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-2xl flex items-center gap-2 ${
              appToast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : appToast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
            }`}
          >
            <span>{appToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
