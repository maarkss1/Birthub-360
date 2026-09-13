import { Loader2, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { type ModuleKey, moduleLabel } from '../../config/module-catalog';
import { useModuleAccess } from '../../hooks/useModuleAccess';

interface RequireModuleAccessProps {
  moduleKey: ModuleKey;
  children: ReactNode;
}

/**
 * Guarda de autorização por concessão individual de módulo (substitui RequireUserAllowed +
 * EXECUTIVE_HUB_ALLOWED_EMAIL). A lista real de módulos concedidos ao usuário logado vem de
 * `GET /api/module-access/me` (useModuleAccess) — nunca do e-mail nem de um papel fixo. A
 * concessão é gerenciada por um ADMIN no painel (`ModuleAccessAdmin.tsx`, `/app/module-access`).
 * Bloqueia acesso direto por URL, não só o item de navegação — mesma razão de RequireRole.
 */
export function RequireModuleAccess({ moduleKey, children }: RequireModuleAccessProps) {
  const { grantedModules, isLoading } = useModuleAccess();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-ink-2" />
      </div>
    );
  }

  if (grantedModules.includes(moduleKey)) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-8">
      <div className="max-w-md text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-ink">Acesso Restrito</h2>
        <p className="text-sm text-ink-2">
          Você não tem acesso ao módulo &quot;{moduleLabel(moduleKey)}&quot;. Peça a um
          administrador da sua organização para liberar este acesso no painel de administração.
        </p>
      </div>
    </div>
  );
}
