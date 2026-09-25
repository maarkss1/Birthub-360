export interface GitCommitAuthor {
  name: string;
  email: string;
  isAgent?: boolean;
  avatar?: string;
}

export interface GitFileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  additions: number;
  deletions: number;
  oldContent?: string;
  newContent?: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: GitCommitAuthor;
  timestamp: number;
  parentHash: string | null;
  branch: string;
  filesSnapshot: Record<string, string>;
  changes: GitFileChange[];
  stats: {
    filesChanged: number;
    additions: number;
    deletions: number;
  };
}

export interface GitBranch {
  name: string;
  commitHash: string;
  isCurrent: boolean;
}

export interface GitRepoState {
  currentBranch: string;
  branches: string[];
  head: string | null;
  commits: Record<string, GitCommit>;
  commitOrder: string[]; // newest first
  stagedFiles: string[];
}

export interface GitCommitSuggestion {
  style: 'conventional' | 'concise' | 'detailed';
  title: string;
  description?: string;
  fullMessage: string;
  type?: string;
  scope?: string;
}
