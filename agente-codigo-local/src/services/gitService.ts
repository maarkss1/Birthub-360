import {
  GitCommit,
  GitFileChange,
  GitRepoState,
  GitCommitAuthor
} from '../types/git';

const GIT_STORAGE_PREFIX = 'agente_git_repo_';

/**
 * Calculates line-by-line diff stats (additions and deletions)
 */
export function calculateLineDiff(
  oldContent: string = '',
  newContent: string = ''
): { additions: number; deletions: number; unifiedDiff: string } {
  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = newContent ? newContent.split('\n') : [];

  let additions = 0;
  let deletions = 0;
  const diffLines: string[] = [];

  const maxLines = Math.max(oldLines.length, newLines.length);

  // Simple line-by-line diff computation
  let i = 0;
  let j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length) {
      if (oldLines[i] === newLines[j]) {
        diffLines.push(` ${oldLines[i]}`);
        i++;
        j++;
      } else {
        // Line replaced or modified
        diffLines.push(`-${oldLines[i]}`);
        deletions++;
        i++;
        diffLines.push(`+${newLines[j]}`);
        additions++;
        j++;
      }
    } else if (i < oldLines.length) {
      diffLines.push(`-${oldLines[i]}`);
      deletions++;
      i++;
    } else if (j < newLines.length) {
      diffLines.push(`+${newLines[j]}`);
      additions++;
      j++;
    }
  }

  // Prevent giant strings from freezing UI
  const truncatedDiff = diffLines.slice(0, 500).join('\n') +
    (diffLines.length > 500 ? `\n... (+ ${diffLines.length - 500} linhas omitidas)` : '');

  return { additions, deletions, unifiedDiff: truncatedDiff };
}

/**
 * Generates pseudo-SHA-1 git hash (40 hex chars)
 */
export function generateGitHash(contentSeed: string = ''): string {
  const hex = '0123456789abcdef';
  let hash = '';
  const now = Date.now().toString(16);
  hash += now;

  let seedNum = 0;
  for (let i = 0; i < contentSeed.length; i++) {
    seedNum = (seedNum + contentSeed.charCodeAt(i) * (i + 1)) % 1000000;
  }
  hash += seedNum.toString(16);

  while (hash.length < 40) {
    hash += hex[Math.floor(Math.random() * hex.length)];
  }
  return hash.slice(0, 40);
}

export class GitService {
  private static getStorageKey(workspaceId: string = 'default'): string {
    return `${GIT_STORAGE_PREFIX}${workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }

  /**
   * Loads repository state from localStorage or initializes a new one
   */
  public static getRepoState(
    workspaceId: string = 'default',
    initialFiles?: Record<string, string>
  ): GitRepoState {
    const key = this.getStorageKey(workspaceId);
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as GitRepoState;
        if (parsed && parsed.commits && parsed.commitOrder && parsed.currentBranch) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar estado do Git do localStorage:', e);
    }

    // Initialize fresh git repo
    const defaultBranch = 'main';
    const initialRepo: GitRepoState = {
      currentBranch: defaultBranch,
      branches: [defaultBranch],
      head: null,
      commits: {},
      commitOrder: [],
      stagedFiles: []
    };

    // If initial files provided, create the initial baseline commit
    if (initialFiles && Object.keys(initialFiles).length > 0) {
      const fileCount = Object.keys(initialFiles).length;
      let totalLines = 0;
      const changes: GitFileChange[] = Object.entries(initialFiles).map(([path, content]) => {
        const lineCount = content.split('\n').length;
        totalLines += lineCount;
        return {
          path,
          status: 'added',
          additions: lineCount,
          deletions: 0,
          newContent: content
        };
      });

      const hash = generateGitHash('init-' + Date.now());
      const initialCommit: GitCommit = {
        hash,
        shortHash: hash.slice(0, 7),
        message: 'Initial commit: configuração inicial do workspace',
        author: {
          name: 'Sistema Git',
          email: 'git@workspace.local'
        },
        timestamp: Date.now() - 60000,
        parentHash: null,
        branch: defaultBranch,
        filesSnapshot: { ...initialFiles },
        changes,
        stats: {
          filesChanged: fileCount,
          additions: totalLines,
          deletions: 0
        }
      };

      initialRepo.commits[hash] = initialCommit;
      initialRepo.commitOrder = [hash];
      initialRepo.head = hash;
    }

    this.saveRepoState(initialRepo, workspaceId);
    return initialRepo;
  }

  /**
   * Saves repository state
   */
  public static saveRepoState(state: GitRepoState, workspaceId: string = 'default'): void {
    try {
      const key = this.getStorageKey(workspaceId);
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn('Erro ao salvar estado do Git:', e);
    }
  }

  /**
   * Calculates uncommitted changes comparing current workspace files with HEAD commit
   */
  public static getWorkingTreeChanges(
    currentFiles: Record<string, string>,
    workspaceId: string = 'default'
  ): {
    changes: GitFileChange[];
    stats: { filesChanged: number; additions: number; deletions: number };
    headCommit: GitCommit | null;
  } {
    const repo = this.getRepoState(workspaceId, currentFiles);
    const headCommit = repo.head ? repo.commits[repo.head] || null : null;
    const baseFiles = headCommit ? headCommit.filesSnapshot : {};

    const changes: GitFileChange[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    // Check added and modified files
    for (const [path, newContent] of Object.entries(currentFiles)) {
      if (!(path in baseFiles)) {
        // Added file
        const lines = newContent ? newContent.split('\n').length : 0;
        changes.push({
          path,
          status: 'added',
          additions: lines,
          deletions: 0,
          oldContent: '',
          newContent
        });
        totalAdditions += lines;
      } else {
        const oldContent = baseFiles[path] || '';
        if (oldContent !== newContent) {
          // Modified file
          const { additions, deletions } = calculateLineDiff(oldContent, newContent);
          changes.push({
            path,
            status: 'modified',
            additions,
            deletions,
            oldContent,
            newContent
          });
          totalAdditions += additions;
          totalDeletions += deletions;
        }
      }
    }

    // Check deleted files
    for (const [path, oldContent] of Object.entries(baseFiles)) {
      if (!(path in currentFiles)) {
        const lines = oldContent ? oldContent.split('\n').length : 0;
        changes.push({
          path,
          status: 'deleted',
          additions: 0,
          deletions: lines,
          oldContent,
          newContent: ''
        });
        totalDeletions += lines;
      }
    }

    return {
      changes,
      stats: {
        filesChanged: changes.length,
        additions: totalAdditions,
        deletions: totalDeletions
      },
      headCommit
    };
  }

  /**
   * Creates a new Git commit
   */
  public static createCommit(options: {
    message: string;
    currentFiles: Record<string, string>;
    author?: Partial<GitCommitAuthor>;
    filesToCommit?: string[]; // if omitted, commits all changes
    workspaceId?: string;
  }): { commit: GitCommit; repo: GitRepoState } {
    const workspaceId = options.workspaceId || 'default';
    const repo = this.getRepoState(workspaceId, options.currentFiles);
    const { changes, stats, headCommit } = this.getWorkingTreeChanges(options.currentFiles, workspaceId);

    // Filter changes if specific files requested
    let targetChanges = changes;
    if (options.filesToCommit && options.filesToCommit.length > 0) {
      const allowed = new Set(options.filesToCommit);
      targetChanges = changes.filter((c) => allowed.has(c.path));
    }

    if (targetChanges.length === 0 && repo.head) {
      throw new Error('Nenhuma alteração detectada para commit no working tree.');
    }

    const message = options.message?.trim() || 'chore: snapshot de alterações';
    const hash = generateGitHash(message + Date.now());
    const shortHash = hash.slice(0, 7);

    // Determine author
    const author: GitCommitAuthor = {
      name: options.author?.name || 'Desenvolvedor',
      email: options.author?.email || 'dev@workspace.local',
      isAgent: !!options.author?.isAgent,
      avatar: options.author?.avatar
    };

    let additions = 0;
    let deletions = 0;
    targetChanges.forEach((c) => {
      additions += c.additions;
      deletions += c.deletions;
    });

    const newCommit: GitCommit = {
      hash,
      shortHash,
      message,
      author,
      timestamp: Date.now(),
      parentHash: repo.head,
      branch: repo.currentBranch,
      filesSnapshot: { ...options.currentFiles },
      changes: targetChanges,
      stats: {
        filesChanged: targetChanges.length,
        additions,
        deletions
      }
    };

    repo.commits[hash] = newCommit;
    repo.commitOrder = [hash, ...repo.commitOrder];
    repo.head = hash;
    repo.stagedFiles = [];

    this.saveRepoState(repo, workspaceId);

    return { commit: newCommit, repo };
  }

  /**
   * Retrieves full commit history in chronological order (newest first)
   */
  public static getCommitHistory(workspaceId: string = 'default'): GitCommit[] {
    const repo = this.getRepoState(workspaceId);
    return repo.commitOrder.map((hash) => repo.commits[hash]).filter(Boolean);
  }

  /**
   * Checkout/Restore a commit's files
   */
  public static checkoutCommit(
    hash: string,
    workspaceId: string = 'default'
  ): { commit: GitCommit; files: Record<string, string> } {
    const repo = this.getRepoState(workspaceId);
    const commit = repo.commits[hash];
    if (!commit) {
      throw new Error(`Commit com hash ${hash} não encontrado.`);
    }

    repo.head = hash;
    this.saveRepoState(repo, workspaceId);

    return {
      commit,
      files: { ...commit.filesSnapshot }
    };
  }

  /**
   * Create a new branch
   */
  public static createBranch(branchName: string, workspaceId: string = 'default'): GitRepoState {
    const cleanName = branchName.trim().replace(/[^a-zA-Z0-9_\-\/]/g, '-');
    if (!cleanName) throw new Error('Nome de branch inválido.');

    const repo = this.getRepoState(workspaceId);
    if (!repo.branches.includes(cleanName)) {
      repo.branches.push(cleanName);
    }
    repo.currentBranch = cleanName;
    this.saveRepoState(repo, workspaceId);
    return repo;
  }

  /**
   * Switch branch
   */
  public static switchBranch(branchName: string, workspaceId: string = 'default'): GitRepoState {
    const repo = this.getRepoState(workspaceId);
    if (!repo.branches.includes(branchName)) {
      throw new Error(`Branch "${branchName}" não existe.`);
    }
    repo.currentBranch = branchName;
    this.saveRepoState(repo, workspaceId);
    return repo;
  }

  /**
   * Formats git status output for terminal or UI
   */
  public static formatStatusText(
    currentFiles: Record<string, string>,
    workspaceId: string = 'default'
  ): string {
    const repo = this.getRepoState(workspaceId, currentFiles);
    const { changes, stats, headCommit } = this.getWorkingTreeChanges(currentFiles, workspaceId);

    let output = `No branch ${repo.currentBranch}\n`;
    if (headCommit) {
      output += `Último commit: ${headCommit.shortHash} - ${headCommit.message.split('\n')[0]}\n`;
    } else {
      output += 'Ainda não há commits no repositório.\n';
    }

    if (changes.length === 0) {
      output += '\nnada a commitar, working tree limpo\n';
      return output;
    }

    output += `\nAlterações não preparadas para commit (${changes.length} arquivos, +${stats.additions} -${stats.deletions}):\n`;
    output += '  (use "git add <arquivo>..." para atualizar o que será commitado)\n';
    output += '  (use "git commit -m <msg>" para commitar diretamente)\n\n';

    changes.forEach((c) => {
      const prefix = c.status === 'modified' ? 'modificado: ' : c.status === 'added' ? 'novo arquivo: ' : 'excluído:     ';
      output += `\t${prefix} ${c.path} (+${c.additions} -${c.deletions})\n`;
    });

    return output;
  }
}
