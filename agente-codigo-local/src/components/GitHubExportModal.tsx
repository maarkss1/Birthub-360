import React, { useState, useEffect } from 'react';
import {
  Github,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Globe,
  Key
} from 'lucide-react';

interface GitHubExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: Record<string, string>;
  defaultRepoName?: string;
}

export const GitHubExportModal: React.FC<GitHubExportModalProps> = ({
  isOpen,
  onClose,
  files,
  defaultRepoName = 'meu-projeto-agente'
}) => {
  const [token, setToken] = useState('');
  const [repoName, setRepoName] = useState(defaultRepoName);
  const [description, setDescription] = useState('Projeto desenvolvido com o Agente Birth Hub 360');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('local_agent_github_token');
    if (saved) setToken(saved);
  }, []);

  if (!isOpen) return null;

  const toBase64 = (str: string) => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      return btoa(str);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = token.trim();
    const cleanRepo = repoName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');

    if (!cleanToken) {
      setErrorMsg('Informe o Personal Access Token do GitHub.');
      return;
    }
    if (!cleanRepo) {
      setErrorMsg('Informe um nome válido para o repositório.');
      return;
    }

    setErrorMsg('');
    setCreatedUrl(null);
    setIsExporting(true);
    setProgressMsg('Verificando credenciais do GitHub...');

    // Save token
    try {
      localStorage.setItem('local_agent_github_token', cleanToken);
    } catch {
      // ignore
    }

    try {
      // 1. Verify user
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      if (!userRes.ok) {
        throw new Error('Token do GitHub inválido ou sem permissão de acesso.');
      }

      const userData = await userRes.json();
      const username = userData.login;

      // 2. Create Repository
      setProgressMsg(`Criando repositório "${username}/${cleanRepo}"...`);
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: cleanRepo,
          description,
          private: isPrivate,
          auto_init: true
        })
      });

      if (!createRes.ok && createRes.status !== 422) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.message || `Erro ao criar repositório (${createRes.status})`);
      }

      const fileEntries = Object.entries(files);
      const totalFiles = fileEntries.length;

      // Small pause to allow GitHub to initialize main branch
      await new Promise((r) => setTimeout(r, 1200));

      // 3. Commit each file to the repository
      for (let i = 0; i < totalFiles; i++) {
        const [filePath, content] = fileEntries[i];
        setProgressMsg(`Enviando arquivo ${i + 1} de ${totalFiles}: ${filePath}...`);

        // Check if file already exists (to provide sha for updates if auto_init created README)
        let existingSha: string | undefined = undefined;
        try {
          const checkRes = await fetch(
            `https://api.github.com/repos/${username}/${cleanRepo}/contents/${filePath}`,
            {
              headers: {
                Authorization: `Bearer ${cleanToken}`,
                Accept: 'application/vnd.github.v3+json'
              }
            }
          );
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            existingSha = checkData.sha;
          }
        } catch {
          // ignore
        }

        const putRes = await fetch(
          `https://api.github.com/repos/${username}/${cleanRepo}/contents/${filePath}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${cleanToken}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `feat: add ${filePath} via Agente Birth Hub 360`,
              content: toBase64(content),
              sha: existingSha
            })
          }
        );

        if (!putRes.ok) {
          const putErr = await putRes.json().catch(() => ({}));
          console.warn(`Falha ao subir ${filePath}:`, putErr);
        }
      }

      const finalUrl = `https://github.com/${username}/${cleanRepo}`;
      setCreatedUrl(finalUrl);
      setProgressMsg('Repositório publicado com sucesso!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro durante a exportação para o GitHub.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0f141f] border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#131a29]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg text-slate-100">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Exportar para o GitHub</h2>
              <p className="text-xs text-slate-400">
                Criar repositório e enviar todos os arquivos do workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleExport} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {createdUrl && (
            <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-200 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 text-teal-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Repositório publicado com sucesso!</span>
              </div>
              <p className="text-slate-300">
                Seus arquivos foram enviados para o GitHub. Clique abaixo para abrir:
              </p>
              <a
                href={createdUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors w-fit mt-1"
              >
                <span>Acessar no GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* GitHub Token */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                <span>GitHub Personal Access Token (PAT)</span>
              </span>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-teal-400 hover:underline flex items-center gap-1"
              >
                Criar token com escopo &quot;repo&quot;
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
            />
            <p className="text-[10px] text-slate-500">
              O token é salvo apenas localmente no seu navegador para exportações futuras.
            </p>
          </div>

          {/* Repo Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Nome do Repositório</label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="ex: meu-projeto-agente"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do projeto..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                !isPrivate
                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Público</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                isPrivate
                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Privado</span>
            </button>
          </div>

          {/* Progress status */}
          {isExporting && (
            <div className="flex items-center gap-2 p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-teal-300 font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400 shrink-0" />
              <span>{progressMsg}</span>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>{isExporting ? 'Enviando…' : `Publicar ${Object.keys(files).length} arquivos`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
