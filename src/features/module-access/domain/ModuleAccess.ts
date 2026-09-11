/**
 * Linha de usuário como o service precisa dela — subconjunto de `User` (não o model inteiro, só
 * os campos que a matriz de acesso realmente usa).
 */
export interface ModuleAccessUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** Uma concessão (`ModuleAccessGrant`) reduzida aos dois campos que a matriz precisa cruzar. */
export interface ModuleAccessGrantRow {
  userId: string;
  moduleKey: string;
}

export interface ModuleAccessMatrixUser {
  id: string;
  name: string;
  email: string;
  role: string;
  grantedModules: string[];
}

export interface GrantModuleAccessInput {
  organizationId: string;
  userId: string;
  moduleKey: string;
  grantedByUserId: string;
}

export interface RevokeModuleAccessInput {
  organizationId: string;
  userId: string;
  moduleKey: string;
}

/**
 * Porta de acesso a dados do controle de acesso por módulo (`ModuleAccessGrant` + os campos de
 * `User` que este domínio consulta). Extraída de `moduleAccess.service.ts` no piloto de migração
 * para repository (ver `docs/architecture/PRISMA-REPOSITORY-MIGRATION-GUIDE.md`) — mesmas
 * queries, mesmo shape de retorno; só o acesso direto a `prisma.*` saiu do service.
 */
export interface ModuleAccessRepository {
  listOrganizationUsers(organizationId: string): Promise<ModuleAccessUserRow[]>;
  listOrganizationGrants(organizationId: string): Promise<ModuleAccessGrantRow[]>;
  listUserGrantedModuleKeys(organizationId: string, userId: string): Promise<string[]>;
  /** Devolve o `id` do usuário quando ele existe NESTA organização, ou `null`. */
  findUserId(organizationId: string, userId: string): Promise<string | null>;
  upsertGrant(input: GrantModuleAccessInput): Promise<void>;
  deleteGrant(input: RevokeModuleAccessInput): Promise<void>;
}
