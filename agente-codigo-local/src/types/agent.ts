export type BackendProvider = 'gemini' | 'groq' | 'ollama' | 'openrouter' | 'jules' | 'custom';

export interface ESLintConfig {
  enabled: boolean;
  semi: 'always' | 'never';
  quotes: 'single' | 'double';
  indent: 2 | 4 | 'tab';
  trailingComma: 'always-multiline' | 'none' | 'all';
  noExplicitAny: 'error' | 'warn' | 'off';
  noUnusedVars: 'error' | 'warn' | 'off';
  preferConst: boolean;
  noConsole: 'warn' | 'error' | 'off';
  reactHooks: boolean;
  arrowParens: 'always' | 'avoid';
  maxLen: number;
  customRulesJson?: string;
}

export interface ProviderConfig {
  provider: BackendProvider;
  geminiKey: string;
  groqKey: string;
  julesKey: string;
  julesSource?: string;
  openRouterKey: string;
  ollamaHost: string;
  customBaseUrl: string;
  customApiKey: string;
  model: string;
  maxSteps: number;
  temperature: number;
  customInstructions?: string;
  eslintConfig?: ESLintConfig;
}

export type AgentActionType =
  | 'list_files'
  | 'read_file'
  | 'write_file'
  | 'patch_file'
  | 'delete_file'
  | 'git_commit'
  | 'say'
  | 'done';

export interface AgentAction {
  action: AgentActionType;
  path?: string;
  content?: string;
  search?: string;
  replace?: string;
  message?: string;
  files?: string[];
  author?: string;
}

export interface StepLog {
  id: string;
  stepNumber: number;
  action: AgentAction;
  result?: string;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
  previousContent?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  steps?: StepLog[];
  completed?: boolean;
}

export interface VirtualFile {
  path: string; // e.g. "src/index.js"
  content: string;
  lastModified: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  children?: FileTreeNode[];
}

export type StorageMode = 'local' | 'virtual';

export interface FileDiffInfo {
  path: string;
  oldContent: string;
  newContent: string;
  timestamp: number;
}

export interface WorkspaceCheckpoint {
  id: string;
  timestamp: number;
  prompt: string;
  files: Record<string, string>;
  fileCount: number;
}

export interface TokenUsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  callCount: number;
}

export interface CodeSelectionContext {
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  promptSuggestion?: string;
}
