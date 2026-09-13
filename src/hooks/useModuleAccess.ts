import { useCallback, useEffect, useState } from 'react';
import type { ModuleKey } from '../config/module-catalog';
import { moduleAccessApi } from '../features/module-access/moduleAccess.api';

// Mesmo padrão de cache em memória de useFeatureFlags.ts (ver comentário lá sobre não introduzir
// react-query só para isto) — evita um GET /api/module-access/me redundante por componente
// montado (Sidebar, ExecutiveHeader, cada rota de módulo executivo via RequireModuleAccess).
let cache: string[] | null = null;
let inFlight: Promise<string[]> | null = null;

async function fetchGrantedModules(): Promise<string[]> {
  if (!inFlight) {
    inFlight = moduleAccessApi
      .me()
      .then(({ grantedModules }) => {
        cache = grantedModules;
        return grantedModules;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Chamado depois de um ADMIN alterar uma concessão no painel, para que o próprio usuário afetado
 *  (se estiver logado na mesma aba) veja o efeito sem precisar de reload. */
export function invalidateModuleAccessCache(): void {
  cache = null;
}

export function useModuleAccess() {
  const [grantedModules, setGrantedModules] = useState<string[] | null>(cache);
  const [isLoading, setIsLoading] = useState(!cache);

  const load = useCallback(() => {
    setIsLoading(true);
    fetchGrantedModules()
      .then((modules) => setGrantedModules(modules))
      .catch(() => setGrantedModules((prev) => prev ?? []))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (cache) {
      setGrantedModules(cache);
      setIsLoading(false);
      return;
    }
    load();
  }, [load]);

  return { grantedModules: grantedModules ?? [], isLoading };
}

/**
 * @param fallback valor assumido enquanto a lista ainda carrega — `false` (fail-closed): diferente
 * de useFeatureFlag (flag de UI não-crítica), aqui é um gate de acesso a um módulo executivo
 * restrito, então uma falha de rede ou carregamento em curso nunca deve liberar acesso por engano.
 */
export function useHasModuleAccess(moduleKey: ModuleKey, fallback = false): boolean {
  const { grantedModules, isLoading } = useModuleAccess();
  if (isLoading) return fallback;
  return grantedModules.includes(moduleKey);
}
