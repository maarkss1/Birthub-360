import type { Request, Response, NextFunction } from 'express';
import { getPermissionsForRoleName } from '../repositories/roleRepository.js';

export const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.voiceHubUser || !req.organizationId || req.voiceHubUser.organizationId !== req.organizationId) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }
    return next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = req.voiceHubUser;
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }

    if (!allowedRoles.includes(session.role)) {
      return res.status(403).json({ error: `Acesso proibido. Requer nível: ${allowedRoles.join(' ou ')}.` });
    }

    return next();
  };
};

// Permission-based gate: checks whether the caller's role (resolved live against Role/Permission,
// never trusted from a client-supplied claim) grants a named capability, instead of hardcoding a
// list of role names at every call site. See roleRepository.getPermissionsForRoleName for the
// tenant-scoped-role-wins-over-system-role resolution rule, and
// .agents/handoffs/onda-4/11-para-01-supervisor-role-rbac.md for why this replaces
// role-name allowlists such as the old `ROLES_ALLOWED_TO_INTERVENE`.
export async function hasPermission(
  user: { role: string; organizationId: string } | null | undefined,
  permission: string
): Promise<boolean> {
  if (!user?.role || !user.organizationId) return false;
  const permissions = await getPermissionsForRoleName(user.role, user.organizationId);
  return permissions.includes(permission);
}

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.voiceHubUser) {
      return res.status(401).json({ error: 'Não autorizado.' });
    }

    // Returning the promise is harmless for Express (the return value is ignored) and lets
    // callers/tests await this middleware deterministically instead of racing the async check.
    return hasPermission(req.voiceHubUser, permission)
      .then((allowed) => {
        if (!allowed) {
          return res.status(403).json({ error: `Acesso proibido. Requer a permissão: ${permission}.` });
        }
        return next();
      })
      .catch(next);
  };
};
