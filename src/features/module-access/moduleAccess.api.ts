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
  /** PRODUCT-004/DOCBRAND-012 (Onda 4): se `false`, nenhuma chave de
   *  `LEGACY_ATLASGR_RESTRICTED_MODULE_KEYS` (hoje, todo o catálogo) pode ser concedida nesta
   *  organização — usado por `ModuleAccessAdmin` para desabilitar os toggles com um motivo. */
  hasLegacyAtlasGrModuleAccess: boolean;
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
