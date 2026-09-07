import { prisma } from '../../../lib/prisma.js';
import { MODULE_KEYS, isModuleKey } from '../../../config/module-catalog.js';

export class ModuleAccessServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

export interface ModuleAccessMatrixUser {
  id: string;
  name: string;
  email: string;
  role: string;
  grantedModules: string[];
}

/**
 * Matriz usuário × módulo da organização — cada linha é um usuário real com o conjunto de
 * `moduleKey` que ele já tem concedido. A tela de admin (ModuleAccessAdmin.tsx) monta os toggles
 * a partir disto + MODULE_CATALOG (que define as colunas).
 */
export async function getModuleAccessMatrix(
  organizationId: string,
): Promise<ModuleAccessMatrixUser[]> {
  const [users, grants] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.moduleAccessGrant.findMany({
      where: { organizationId },
      select: { userId: true, moduleKey: true },
    }),
  ]);

  const grantsByUser = new Map<string, string[]>();
  for (const grant of grants) {
    const list = grantsByUser.get(grant.userId) ?? [];
    list.push(grant.moduleKey);
    grantsByUser.set(grant.userId, list);
  }

  return users.map((user) => ({
    ...user,
    grantedModules: grantsByUser.get(user.id) ?? [],
  }));
}

/** Conjunto de `moduleKey` concedido ao usuário logado — consumido por `useModuleAccess` no
 *  frontend para decidir o que mostrar no Hub e liberar as rotas dos módulos executivos. */
export async function listGrantedModulesForUser(
  organizationId: string,
  userId: string,
): Promise<string[]> {
  const grants = await prisma.moduleAccessGrant.findMany({
    where: { organizationId, userId },
    select: { moduleKey: true },
  });
  return grants.map((g) => g.moduleKey);
}

export async function grantModuleAccess(input: {
  organizationId: string;
  userId: string;
  moduleKey: string;
  grantedByUserId: string;
}): Promise<void> {
  if (!isModuleKey(input.moduleKey)) {
    throw new ModuleAccessServiceError(`Módulo inválido. Use um de: ${MODULE_KEYS.join(', ')}.`);
  }

  const target = await prisma.user.findFirst({
    where: { id: input.userId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!target) {
    throw new ModuleAccessServiceError('Usuário não encontrado nesta organização.', 404);
  }

  await prisma.moduleAccessGrant.upsert({
    where: { userId_moduleKey: { userId: input.userId, moduleKey: input.moduleKey } },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      moduleKey: input.moduleKey,
      grantedByUserId: input.grantedByUserId,
    },
    update: {},
  });
}

export async function revokeModuleAccess(input: {
  organizationId: string;
  userId: string;
  moduleKey: string;
}): Promise<void> {
  await prisma.moduleAccessGrant.deleteMany({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
      moduleKey: input.moduleKey,
    },
  });
}
