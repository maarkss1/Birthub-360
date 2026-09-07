import { api } from '../../lib/api';
import type { ModuleCatalogEntry } from '../../config/module-catalog';

export interface ModuleAccessMatrixUser {
  id: string;
  name: string;
  email: string;
  role: string;
  grantedModules: string[];
}

export interface ModuleAccessMatrixResponse {
  users: ModuleAccessMatrixUser[];
  modules: ModuleCatalogEntry[];
}

export const moduleAccessApi = {
  /** Módulos concedidos ao usuário logado — consumido por useModuleAccess. */
  me: () => api.get<{ grantedModules: string[] }>('/api/module-access/me'),
  /** Matriz completa usuário × módulo da organização — só ADMIN. */
  matrix: () => api.get<ModuleAccessMatrixResponse>('/api/module-access'),
  grant: (userId: string, moduleKey: string) =>
    api.put<void>(
      `/api/module-access/${encodeURIComponent(userId)}/${encodeURIComponent(moduleKey)}`,
    ),
  revoke: (userId: string, moduleKey: string) =>
    api.delete<void>(
      `/api/module-access/${encodeURIComponent(userId)}/${encodeURIComponent(moduleKey)}`,
    ),
};
