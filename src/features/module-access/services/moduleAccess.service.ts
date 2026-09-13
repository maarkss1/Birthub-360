import { isModuleKey, MODULE_KEYS } from '../../../config/module-catalog.js';
import type {
  GrantModuleAccessInput,
  ModuleAccessMatrixUser,
  ModuleAccessRepository,
  RevokeModuleAccessInput,
} from '../domain/ModuleAccess.js';
import { prismaModuleAccessRepository } from '../infra/PrismaModuleAccessRepository.js';

export class ModuleAccessServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

export type { ModuleAccessMatrixUser };

/**
 * Piloto de migração para repository (ver `docs/architecture/PRISMA-REPOSITORY-MIGRATION-GUIDE.md`):
 * o acesso a dados saiu daqui e foi para `ModuleAccessRepository`/`PrismaModuleAccessRepository`.
 * O repositório é injetado por construtor (default = implementação Prisma real, mesmo padrão de
 * `SellerPerformanceAggregatorService`) para permitir teste com um repositório em memória, sem
 * precisar de banco.
 */
export class ModuleAccessService {
  constructor(private readonly repository: ModuleAccessRepository = prismaModuleAccessRepository) {}

  /**
   * Matriz usuário × módulo da organização — cada linha é um usuário real com o conjunto de
   * `moduleKey` que ele já tem concedido. A tela de admin (ModuleAccessAdmin.tsx) monta os toggles
   * a partir disto + MODULE_CATALOG (que define as colunas).
   */
  async getModuleAccessMatrix(organizationId: string): Promise<ModuleAccessMatrixUser[]> {
    const [users, grants] = await Promise.all([
      this.repository.listOrganizationUsers(organizationId),
      this.repository.listOrganizationGrants(organizationId),
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
   *  frontend para decidir o que mostrar no Hub e liberar as rotas dos módulos executivos.
   *
   *  ADMIN vê todos os módulos do catálogo automaticamente, sem precisar de `ModuleAccessGrant`
   *  (achado real: o Hub aprovado pelo usuário sempre mostrou os módulos executivos visíveis; um
   *  Administrador nunca deveria precisar que outro ADMIN conceda acesso a ele mesmo). Os demais
   *  papéis continuam exigindo concessão explícita — o sistema de concessão por usuário não foi
   *  removido, só ganhou este atalho para quem já administra a própria organização. */
  async listGrantedModulesForUser(
    organizationId: string,
    userId: string,
    role: string,
  ): Promise<string[]> {
    if (role === 'ADMIN') return [...MODULE_KEYS];
    return this.repository.listUserGrantedModuleKeys(organizationId, userId);
  }

  async grantModuleAccess(input: GrantModuleAccessInput): Promise<void> {
    if (!isModuleKey(input.moduleKey)) {
      throw new ModuleAccessServiceError(`Módulo inválido. Use um de: ${MODULE_KEYS.join(', ')}.`);
    }

    const targetId = await this.repository.findUserId(input.organizationId, input.userId);
    if (!targetId) {
      throw new ModuleAccessServiceError('Usuário não encontrado nesta organização.', 404);
    }

    await this.repository.upsertGrant(input);
  }

  async revokeModuleAccess(input: RevokeModuleAccessInput): Promise<void> {
    await this.repository.deleteGrant(input);
  }
}

/** Instância única com a implementação Prisma real — usada pelas rotas HTTP deste módulo. */
export const moduleAccessService = new ModuleAccessService();

// Wrappers de compatibilidade: `moduleAccess.routes.ts` (e qualquer outro consumidor futuro)
// continua importando funções livres — mesma assinatura e mesmo comportamento de antes da
// migração. Só a implementação por trás passou a vir de `ModuleAccessService`/repository.
export function getModuleAccessMatrix(organizationId: string): Promise<ModuleAccessMatrixUser[]> {
  return moduleAccessService.getModuleAccessMatrix(organizationId);
}

export function listGrantedModulesForUser(
  organizationId: string,
  userId: string,
  role: string,
): Promise<string[]> {
  return moduleAccessService.listGrantedModulesForUser(organizationId, userId, role);
}

export function grantModuleAccess(input: GrantModuleAccessInput): Promise<void> {
  return moduleAccessService.grantModuleAccess(input);
}

export function revokeModuleAccess(input: RevokeModuleAccessInput): Promise<void> {
  return moduleAccessService.revokeModuleAccess(input);
}
