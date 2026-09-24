import JSZip from 'jszip';
import { FileTreeNode, VirtualFile } from '../types/agent';

// Starter templates for virtual file system
export const STARTER_TEMPLATES: Record<string, { name: string; description: string; files: Record<string, string> }> = {
  express: {
    name: 'Express.js REST API',
    description: 'Servidor Node.js com rotas REST e estrutura modular',
    files: {
      'package.json': JSON.stringify(
        {
          name: 'express-api',
          version: '1.0.0',
          main: 'src/server.js',
          scripts: {
            start: 'node src/server.js',
            dev: 'node --watch src/server.js'
          },
          dependencies: {
            express: '^4.19.2'
          }
        },
        null,
        2
      ),
      'src/server.js': `const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Rota de status / saúde
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({ message: 'Bem-vindo à API Express gerenciada pelo Agente Local!' });
});

app.listen(PORT, () => {
  console.log(\`Servidor rodando em http://localhost:\${PORT}\`);
});
`,
      'README.md': `# Express REST API

Projeto criado pelo Agente Birth Hub 360.

## Como rodar
\`\`\`bash
npm install
npm run dev
\`\`\`
`
    }
  },
  webapp: {
    name: 'Single Page Web App',
    description: 'Aplicação HTML/CSS/JS moderna pronta para live preview',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meu Projeto Web</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <div class="badge">Ativo</div>
    <h1>Olá do Agente Birth Hub 360!</h1>
    <p>Este arquivo foi gerado no ambiente virtual. Peça ao agente para adicionar componentes, estilos ou lógica interativa.</p>
    <button id="counterBtn">Cliques: <span id="count">0</span></button>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      'style.css': `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #0d1117;
  color: #e6edf3;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 32px;
  max-width: 480px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}
.badge {
  display: inline-block;
  font-size: 11px;
  text-transform: uppercase;
  color: #58a6ff;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}
h1 {
  font-size: 24px;
  margin-bottom: 12px;
  color: #58a6ff;
}
p {
  color: #8b949e;
  line-height: 1.6;
  margin-bottom: 24px;
}
button {
  background: #238636;
  color: #ffffff;
  border: none;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
button:hover {
  background: #2ea043;
}`,
      'app.js': `let count = 0;
const btn = document.getElementById('counterBtn');
const countSpan = document.getElementById('count');

btn.addEventListener('click', () => {
  count++;
  countSpan.textContent = count;
});
`
    }
  },
  empty: {
    name: 'Pasta Vazia',
    description: 'Comece do zero com apenas um arquivo README.md',
    files: {
      'README.md': '# Novo Projeto\n\nPeça ao Agente para criar seus arquivos de código.\n'
    }
  }
};

export class FileSystemManager {
  private localDirHandle: any = null;
  private virtualFiles: Map<string, VirtualFile> = new Map();
  private mode: 'local' | 'virtual' = 'virtual';

  constructor() {
    this.loadVirtualFiles();
  }

  getMode(): 'local' | 'virtual' {
    return this.mode;
  }

  setMode(mode: 'local' | 'virtual') {
    this.mode = mode;
  }

  getLocalDirName(): string | null {
    return this.localDirHandle ? this.localDirHandle.name : null;
  }

  isLocalConnected(): boolean {
    return this.localDirHandle !== null;
  }

  // Load from template
  loadTemplate(templateKey: string) {
    const tmpl = STARTER_TEMPLATES[templateKey];
    if (!tmpl) return;
    this.virtualFiles.clear();
    for (const [filePath, content] of Object.entries(tmpl.files)) {
      this.virtualFiles.set(this.normalizePath(filePath), {
        path: this.normalizePath(filePath),
        content,
        lastModified: Date.now()
      });
    }
    this.persistVirtualFiles();
    this.mode = 'virtual';
  }

  private loadVirtualFiles() {
    try {
      const saved = localStorage.getItem('local_agent_virtual_fs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const item of parsed) {
            this.virtualFiles.set(this.normalizePath(item.path), item);
          }
          return;
        }
      }
    } catch {
      // Fallback
    }
    // Default to express starter
    this.loadTemplate('express');
  }

  private persistVirtualFiles() {
    try {
      const arr = Array.from(this.virtualFiles.values());
      localStorage.setItem('local_agent_virtual_fs', JSON.stringify(arr));
    } catch {
      // Storage quota or disabled
    }
  }

  // Connect local folder using Native File System Access API
  async connectLocalDirectory(): Promise<{ success: boolean; name?: string; error?: string }> {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      return {
        success: false,
        error: 'Seu navegador não suporta a API de Acesso ao Sistema de Arquivos (necessário Chrome ou Edge em contexto seguro). Você pode usar o ambiente virtual integrado normalmente!'
      };
    }

    try {
      const picker = (window as any).showDirectoryPicker;
      const handle = await picker({ mode: 'readwrite' });
      // Verify permissions
      if (handle.queryPermission) {
        const status = await handle.queryPermission({ mode: 'readwrite' });
        if (status !== 'granted') {
          const req = await handle.requestPermission({ mode: 'readwrite' });
          if (req !== 'granted') {
            return { success: false, error: 'Permissão de leitura/escrita não concedida na pasta.' };
          }
        }
      }
      this.localDirHandle = handle;
      this.mode = 'local';
      return { success: true, name: handle.name };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, error: 'Seleção de pasta cancelada.' };
      }
      return { success: false, error: err.message || 'Erro ao conectar à pasta local.' };
    }
  }

  disconnectLocal() {
    this.localDirHandle = null;
    this.mode = 'virtual';
  }

  // Path normalization and directory escape prevention
  normalizePath(rawPath: string): string {
    const clean = (rawPath || '.')
      .replace(/\\/g, '/')
      .trim()
      .replace(/^\.\//, '')
      .replace(/^\/+/, '');

    const parts = clean.split('/').filter(Boolean);
    const resolved: string[] = [];

    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (resolved.length > 0) {
          resolved.pop();
        }
      } else {
        resolved.push(part);
      }
    }

    return resolved.join('/') || '.';
  }

  private async resolveLocalDir(relPath: string, create: boolean = false): Promise<any> {
    const normalized = this.normalizePath(relPath);
    if (normalized === '.') return this.localDirHandle;
    const parts = normalized.split('/').filter(Boolean);

    let current = this.localDirHandle;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create });
    }
    return current;
  }

  // Tool 1: List Files
  async listFiles(relPath: string = '.'): Promise<string[]> {
    const norm = this.normalizePath(relPath);

    if (this.mode === 'local' && this.localDirHandle) {
      try {
        const dir = await this.resolveLocalDir(norm, false);
        const entries: string[] = [];
        for await (const [name, handle] of (dir as any).entries()) {
          if (name === 'node_modules' || name === '.git' || name === '.DS_Store') continue;
          entries.push(handle.kind === 'directory' ? `${name}/` : name);
        }
        return entries.sort();
      } catch (err: any) {
        throw new Error(`Erro ao listar pasta "${norm}": ${err.message}`);
      }
    } else {
      // Virtual mode
      const prefix = norm === '.' ? '' : `${norm}/`;
      const directChildren = new Set<string>();

      for (const filePath of this.virtualFiles.keys()) {
        if (prefix === '') {
          const slashIdx = filePath.indexOf('/');
          if (slashIdx === -1) {
            directChildren.add(filePath);
          } else {
            directChildren.add(filePath.slice(0, slashIdx) + '/');
          }
        } else if (filePath.startsWith(prefix)) {
          const remainder = filePath.slice(prefix.length);
          const slashIdx = remainder.indexOf('/');
          if (slashIdx === -1) {
            directChildren.add(remainder);
          } else {
            directChildren.add(remainder.slice(0, slashIdx) + '/');
          }
        }
      }
      return Array.from(directChildren).sort();
    }
  }

  // Tool 2: Read File
  async readFile(relPath: string): Promise<string> {
    const norm = this.normalizePath(relPath);

    if (this.mode === 'local' && this.localDirHandle) {
      try {
        const parts = norm.split('/').filter(Boolean);
        const fileName = parts.pop();
        if (!fileName) throw new Error('Nome de arquivo inválido');
        const dirPath = parts.join('/') || '.';
        const dir = await this.resolveLocalDir(dirPath, false);
        const fileHandle = await dir.getFileHandle(fileName, { create: false });
        const file = await fileHandle.getFile();
        return await file.text();
      } catch (err: any) {
        throw new Error(`Não foi possível ler "${norm}": ${err.message}`);
      }
    } else {
      // Virtual mode
      const file = this.virtualFiles.get(norm);
      if (!file) {
        throw new Error(`Arquivo não encontrado: "${norm}"`);
      }
      return file.content;
    }
  }

  // Tool 3: Write File
  async writeFile(relPath: string, content: string): Promise<{ size: number; path: string }> {
    const norm = this.normalizePath(relPath);

    if (this.mode === 'local' && this.localDirHandle) {
      try {
        const parts = norm.split('/').filter(Boolean);
        const fileName = parts.pop();
        if (!fileName) throw new Error('Nome de arquivo inválido');
        const dirPath = parts.join('/') || '.';
        const dir = await this.resolveLocalDir(dirPath, true);
        const fileHandle = await dir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content ?? '');
        await writable.close();
        return { size: (content || '').length, path: norm };
      } catch (err: any) {
        throw new Error(`Erro ao escrever no arquivo "${norm}": ${err.message}`);
      }
    } else {
      // Virtual mode
      this.virtualFiles.set(norm, {
        path: norm,
        content: content ?? '',
        lastModified: Date.now()
      });
      this.persistVirtualFiles();
      return { size: (content || '').length, path: norm };
    }
  }

  // Tool 3.5: Patch File (Replace a targeted block inside an existing file)
  async patchFile(
    relPath: string,
    search: string,
    replace: string
  ): Promise<{ size: number; path: string; oldContent: string; newContent: string }> {
    const norm = this.normalizePath(relPath);
    const oldContent = await this.readFile(norm);

    if (!search && search !== '') {
      throw new Error('Parâmetro "search" obrigatório para patch_file');
    }

    let newContent = '';

    if (oldContent.includes(search)) {
      newContent = oldContent.replace(search, replace ?? '');
    } else {
      // Try normalized line endings or trimmed match
      const normalizedSearch = search.replace(/\r\n/g, '\n').trim();
      const normalizedOld = oldContent.replace(/\r\n/g, '\n');

      if (normalizedOld.includes(normalizedSearch)) {
        newContent = normalizedOld.replace(normalizedSearch, (replace ?? '').replace(/\r\n/g, '\n'));
      } else {
        throw new Error(
          `O trecho especificado em "search" não foi encontrado no arquivo "${norm}". Certifique-se de passar o bloco exato de código.`
        );
      }
    }

    const res = await this.writeFile(norm, newContent);
    return {
      size: res.size,
      path: res.path,
      oldContent,
      newContent
    };
  }

  // Tool 4: Delete File
  async deleteFile(relPath: string): Promise<string> {
    const norm = this.normalizePath(relPath);

    if (this.mode === 'local' && this.localDirHandle) {
      try {
        const parts = norm.split('/').filter(Boolean);
        const name = parts.pop();
        if (!name) throw new Error('Nome de arquivo inválido');
        const dirPath = parts.join('/') || '.';
        const dir = await this.resolveLocalDir(dirPath, false);
        await dir.removeEntry(name, { recursive: true });
        return `Apagado com sucesso: ${norm}`;
      } catch (err: any) {
        throw new Error(`Erro ao apagar "${norm}": ${err.message}`);
      }
    } else {
      // Virtual mode
      let deletedCount = 0;
      if (this.virtualFiles.has(norm)) {
        this.virtualFiles.delete(norm);
        deletedCount++;
      }
      // Also delete directory prefix if deleting folder
      const dirPrefix = `${norm}/`;
      for (const key of Array.from(this.virtualFiles.keys())) {
        if (key.startsWith(dirPrefix)) {
          this.virtualFiles.delete(key);
          deletedCount++;
        }
      }
      this.persistVirtualFiles();
      if (deletedCount === 0) {
        throw new Error(`Arquivo ou pasta não encontrado: ${norm}`);
      }
      return `Apagado: ${norm} (${deletedCount} item(ns))`;
    }
  }

  // Get full file tree for Explorer UI
  async getFileTree(): Promise<FileTreeNode[]> {
    if (this.mode === 'local' && this.localDirHandle) {
      return this.scanLocalTree(this.localDirHandle, '');
    } else {
      return this.scanVirtualTree();
    }
  }

  private async scanLocalTree(dirHandle: any, currentPath: string): Promise<FileTreeNode[]> {
    const nodes: FileTreeNode[] = [];
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        if (name === 'node_modules' || name === '.git' || name === '.DS_Store') continue;
        const itemPath = currentPath ? `${currentPath}/${name}` : name;
        if (handle.kind === 'directory') {
          const children = await this.scanLocalTree(handle, itemPath);
          nodes.push({
            name,
            path: itemPath,
            isDirectory: true,
            children
          });
        } else {
          let size = 0;
          try {
            const file = await handle.getFile();
            size = file.size;
          } catch {
            // ignore
          }
          nodes.push({
            name,
            path: itemPath,
            isDirectory: false,
            size
          });
        }
      }
    } catch (err) {
      console.error('Erro no scan da pasta local:', err);
    }
    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  private scanVirtualTree(): FileTreeNode[] {
    const rootNodes: Record<string, any> = {};

    for (const [filePath, file] of this.virtualFiles.entries()) {
      const parts = filePath.split('/');
      let currentLevel = rootNodes;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        if (isFile) {
          currentLevel[part] = {
            name: part,
            path: currentPath,
            isDirectory: false,
            size: file.content.length
          };
        } else {
          if (!currentLevel[part]) {
            currentLevel[part] = {
              name: part,
              path: currentPath,
              isDirectory: true,
              childrenObj: {}
            };
          }
          currentLevel = currentLevel[part].childrenObj;
        }
      }
    }

    const convertToArr = (obj: Record<string, any>): FileTreeNode[] => {
      return Object.values(obj)
        .map((item) => {
          if (item.isDirectory) {
            return {
              name: item.name,
              path: item.path,
              isDirectory: true,
              children: convertToArr(item.childrenObj)
            };
          }
          return {
            name: item.name,
            path: item.path,
            isDirectory: false,
            size: item.size
          };
        })
        .sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
    };

    return convertToArr(rootNodes);
  }

  // Get all files as a flat map (useful for export or preview)
  async getAllFiles(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    if (this.mode === 'virtual') {
      for (const [p, f] of this.virtualFiles.entries()) {
        result[p] = f.content;
      }
    } else if (this.localDirHandle) {
      const tree = await this.getFileTree();
      const readRecursive = async (nodes: FileTreeNode[]) => {
        for (const node of nodes) {
          if (node.isDirectory && node.children) {
            await readRecursive(node.children);
          } else if (!node.isDirectory) {
            try {
              result[node.path] = await this.readFile(node.path);
            } catch {
              // skip unreadable
            }
          }
        }
      };
      await readRecursive(tree);
    }
    return result;
  }

  // Export current workspace as a ZIP file
  async exportAsZip(): Promise<Blob> {
    const zip = new JSZip();
    const files = await this.getAllFiles();

    for (const [filePath, content] of Object.entries(files)) {
      zip.file(filePath, content);
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  // Import a ZIP file into virtual workspace
  async importZip(fileOrBlob: Blob | File): Promise<{ count: number; paths: string[] }> {
    const zip = await JSZip.loadAsync(fileOrBlob);
    const importedPaths: string[] = [];

    // Clear virtual files or merge? If importing a project zip, let's load it cleanly
    this.virtualFiles.clear();

    const fileEntries = Object.entries(zip.files);
    for (const [relativePath, zipEntry] of fileEntries) {
      if (zipEntry.dir) continue;
      // Skip Mac metadata or dot-files in roots if unwanted, but keep dotfiles like .gitignore
      if (relativePath.includes('__MACOSX/') || relativePath.endsWith('.DS_Store')) continue;

      const norm = this.normalizePath(relativePath);
      const content = await zipEntry.async('string');
      this.virtualFiles.set(norm, {
        path: norm,
        content,
        lastModified: Date.now()
      });
      importedPaths.push(norm);
    }

    this.persistVirtualFiles();
    this.mode = 'virtual';
    this.localDirHandle = null;

    return { count: importedPaths.length, paths: importedPaths };
  }

  // Import multiple plain files (from drag and drop or folder upload)
  async importFiles(files: Array<{ path: string; content: string }>): Promise<{ count: number }> {
    for (const f of files) {
      const norm = this.normalizePath(f.path);
      this.virtualFiles.set(norm, {
        path: norm,
        content: f.content,
        lastModified: Date.now()
      });
    }
    this.persistVirtualFiles();
    this.mode = 'virtual';
    return { count: files.length };
  }

  // Restore snapshot (checkpoint rollback)
  async restoreSnapshot(files: Record<string, string>): Promise<void> {
    if (this.mode === 'virtual') {
      this.virtualFiles.clear();
      for (const [p, content] of Object.entries(files)) {
        const norm = this.normalizePath(p);
        this.virtualFiles.set(norm, {
          path: norm,
          content,
          lastModified: Date.now()
        });
      }
      this.persistVirtualFiles();
    } else if (this.localDirHandle) {
      // In local mode, write each file in snapshot
      for (const [p, content] of Object.entries(files)) {
        await this.writeFile(p, content);
      }
    }
  }

  // Check if workspace contains index.html for live preview
  async hasWebEntry(): Promise<boolean> {
    try {
      const content = await this.readFile('index.html');
      return !!content;
    } catch {
      return false;
    }
  }
}
