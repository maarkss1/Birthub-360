import { useCallback, useEffect, useState } from 'react';
import { workspaceApi, type Workspace } from '../features/workspace/workspace.api';

// Mesmo padrão de cache em memória de useModuleAccess.ts/useFeatureFlags.ts — evita um
// GET /api/workspace/me redundante por componente montado (Sidebar, WorkspaceHome).
let cache: Workspace | null = null;
let inFlight: Promise<Workspace> | null = null;

async function fetchWorkspace(): Promise<Workspace> {
  if (!inFlight) {
    inFlight = workspaceApi
      .me()
      .then(({ workspace }) => {
        cache = workspace;
        return workspace;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Chamado depois de uma mudança que pode ter alterado o cargo do próprio usuário (ex.: um ADMIN
 *  reatribuiu o JobRole dele mesmo), para o efeito aparecer sem precisar de reload completo. */
export function invalidateWorkspaceCache(): void {
  cache = null;
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(cache);
  const [isLoading, setIsLoading] = useState(!cache);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchWorkspace()
      .then((ws) => setWorkspace(ws))
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (cache) {
      setWorkspace(cache);
      setIsLoading(false);
      return;
    }
    load();
  }, [load]);

  return { workspace, isLoading, error, reload: load };
}
