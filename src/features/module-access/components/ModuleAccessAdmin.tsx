import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, ShieldCheck } from 'lucide-react';
import { moduleAccessApi, type ModuleAccessMatrixUser } from '../moduleAccess.api';
import { invalidateModuleAccessCache } from '../../../hooks/useModuleAccess';
import { toast } from '../../../lib/toast';
import type { ModuleCatalogEntry } from '../../../config/module-catalog';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  CLOSER: 'Closer',
  SDR: 'SDR',
  VISUALIZADOR: 'Visualizador',
};

/**
 * Painel de administração dos módulos executivos (Social Selling, Treinamento AtlasGR, Proposta
 * Comercial, Hub Inteligência & Mkt) — substitui o gate único por e-mail
 * (EXECUTIVE_HUB_ALLOWED_EMAIL) por concessão real, por usuário, por módulo. Cada célula da
 * matriz é uma concessão independente em ModuleAccessGrant (ver prisma/schema.prisma); a mudança
 * é imediata (sem "salvar" em lote) porque cada toggle já é a própria chamada PUT/DELETE.
 */
export function ModuleAccessAdmin() {
  const [users, setUsers] = useState<ModuleAccessMatrixUser[]>([]);
  const [modules, setModules] = useState<ModuleCatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pendingCell, setPendingCell] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await moduleAccessApi.matrix();
      setUsers(data.users);
      setModules(data.modules);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Falha ao carregar o painel.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (user: ModuleAccessMatrixUser, moduleKey: string, granted: boolean) => {
    const cellId = `${user.id}:${moduleKey}`;
    setPendingCell(cellId);
    // Otimista: a matriz é pequena e a ação é reversível com um segundo clique — reverter só se a
    // chamada falhar evita esperar o round-trip pra ver o checkbox mudar.
    setUsers((prev) =>
      prev.map((u) =>
        u.id !== user.id
          ? u
          : {
              ...u,
              grantedModules: granted
                ? [...u.grantedModules, moduleKey]
                : u.grantedModules.filter((m) => m !== moduleKey),
            },
      ),
    );
    try {
      if (granted) {
        await moduleAccessApi.grant(user.id, moduleKey);
      } else {
        await moduleAccessApi.revoke(user.id, moduleKey);
      }
      invalidateModuleAccessCache();
    } catch (error) {
      // Reverte o otimismo em caso de falha.
      setUsers((prev) =>
        prev.map((u) =>
          u.id !== user.id
            ? u
            : {
                ...u,
                grantedModules: granted
                  ? u.grantedModules.filter((m) => m !== moduleKey)
                  : [...u.grantedModules, moduleKey],
              },
        ),
      );
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar o acesso.');
    } finally {
      setPendingCell(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-6 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center shadow-sm text-brand">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-ink">Acesso a Módulos Executivos</h1>
            <p className="text-ink-2 text-sm">
              Conceda ou revogue, por usuário, o acesso a cada módulo do Hub Executivo. Estes
              módulos não aparecem no CRM — só para quem tiver acesso concedido aqui.
            </p>
          </div>
        </div>

        <div className="bg-surface/80 rounded-2xl border border-line overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="animate-spin text-ink-2" />
            </div>
          ) : loadError ? (
            <div className="p-6 text-xs text-danger-active dark:text-danger flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {loadError}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2/60">
                    <th scope="col" className="px-6 py-3 text-left font-black text-ink text-xs">
                      Usuário
                    </th>
                    {modules.map((mod) => (
                      <th
                        key={mod.key}
                        scope="col"
                        title={mod.description}
                        className="px-4 py-3 text-center font-black text-ink text-xs whitespace-nowrap"
                      >
                        {mod.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <th scope="row" className="px-6 py-3 text-left font-normal">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-ink">{user.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-info/15 text-info-active dark:text-info font-bold">
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </div>
                        <div className="text-xs text-ink-2">{user.email}</div>
                      </th>
                      {modules.map((mod) => {
                        const granted = user.grantedModules.includes(mod.key);
                        const cellId = `${user.id}:${mod.key}`;
                        const inputId = `module-access-${cellId}`;
                        return (
                          <td key={mod.key} className="px-4 py-3 text-center">
                            <label htmlFor={inputId} className="sr-only">
                              {granted ? 'Revogar' : 'Conceder'} acesso de {user.name} a {mod.label}
                            </label>
                            <div className="flex items-center justify-center">
                              {pendingCell === cellId ? (
                                <Loader2 size={16} className="animate-spin text-ink-2" />
                              ) : (
                                <input
                                  id={inputId}
                                  type="checkbox"
                                  checked={granted}
                                  onChange={(e) => toggle(user, mod.key, e.target.checked)}
                                  className="h-4 w-4 rounded border-line text-brand-active focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="px-6 py-8 text-center text-xs text-ink-2 flex items-center justify-center gap-2">
                  <Check size={14} /> Nenhum usuário na organização.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
