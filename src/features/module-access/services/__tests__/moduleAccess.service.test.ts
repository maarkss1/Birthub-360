import { describe, expect, it } from 'vitest';
import type {
  GrantModuleAccessInput,
  ModuleAccessGrantRow,
  ModuleAccessRepository,
  ModuleAccessUserRow,
  RevokeModuleAccessInput,
} from '../../domain/ModuleAccess';
import { ModuleAccessService, ModuleAccessServiceError } from '../moduleAccess.service';

const ORG = 'org-1';

/**
 * Repositório em memória — mesmo padrão de `InMemoryOptOutRepository` (cadence). Existir só
 * porque `ModuleAccessRepository` agora é injetável (piloto de migração para repository, ver
 * `docs/architecture/PRISMA-REPOSITORY-MIGRATION-GUIDE.md`) é o que permite testar as regras de
 * `ModuleAccessService` sem banco.
 */
class InMemoryModuleAccessRepository implements ModuleAccessRepository {
  users: ModuleAccessUserRow[] = [];
  grants: ModuleAccessGrantRow[] = [];

  async listOrganizationUsers(_organizationId: string): Promise<ModuleAccessUserRow[]> {
    return this.users;
  }

  async listOrganizationGrants(_organizationId: string): Promise<ModuleAccessGrantRow[]> {
    return this.grants;
  }

  async listUserGrantedModuleKeys(_organizationId: string, userId: string): Promise<string[]> {
    return this.grants.filter((g) => g.userId === userId).map((g) => g.moduleKey);
  }

  async findUserId(_organizationId: string, userId: string): Promise<string | null> {
    return this.users.some((u) => u.id === userId) ? userId : null;
  }

  async upsertGrant(input: GrantModuleAccessInput): Promise<void> {
    const exists = this.grants.some(
      (g) => g.userId === input.userId && g.moduleKey === input.moduleKey,
    );
    if (!exists) this.grants.push({ userId: input.userId, moduleKey: input.moduleKey });
  }

  async deleteGrant(input: RevokeModuleAccessInput): Promise<void> {
    this.grants = this.grants.filter(
      (g) => !(g.userId === input.userId && g.moduleKey === input.moduleKey),
    );
  }
}

function buildService() {
  const repo = new InMemoryModuleAccessRepository();
  repo.users = [
    { id: 'u1', name: 'Ana', email: 'ana@empresa.com', role: 'CLOSER' },
    { id: 'u2', name: 'Bruno', email: 'bruno@empresa.com', role: 'SDR' },
  ];
  const service = new ModuleAccessService(repo);
  return { repo, service };
}

describe('ModuleAccessService', () => {
  it('getModuleAccessMatrix cruza usuários e concessões, devolvendo grantedModules vazio quando não há grant', async () => {
    const { repo, service } = buildService();
    repo.grants = [{ userId: 'u1', moduleKey: 'social-selling' }];

    const matrix = await service.getModuleAccessMatrix(ORG);

    expect(matrix).toEqual([
      {
        id: 'u1',
        name: 'Ana',
        email: 'ana@empresa.com',
        role: 'CLOSER',
        grantedModules: ['social-selling'],
      },
      { id: 'u2', name: 'Bruno', email: 'bruno@empresa.com', role: 'SDR', grantedModules: [] },
    ]);
  });

  it('listGrantedModulesForUser devolve todos os MODULE_KEYS para ADMIN, sem consultar grants', async () => {
    const { service } = buildService();

    const granted = await service.listGrantedModulesForUser(ORG, 'u1', 'ADMIN');

    expect(granted.length).toBeGreaterThan(0);
  });

  it('listGrantedModulesForUser consulta o repositório para papéis não-ADMIN', async () => {
    const { repo, service } = buildService();
    repo.grants = [{ userId: 'u2', moduleKey: 'social-selling' }];

    const granted = await service.listGrantedModulesForUser(ORG, 'u2', 'SDR');

    expect(granted).toEqual(['social-selling']);
  });

  it('grantModuleAccess rejeita moduleKey inválido antes de tocar o repositório', async () => {
    const { repo, service } = buildService();

    await expect(
      service.grantModuleAccess({
        organizationId: ORG,
        userId: 'u1',
        moduleKey: 'modulo-que-nao-existe',
        grantedByUserId: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(ModuleAccessServiceError);
    expect(repo.grants).toEqual([]);
  });

  it('grantModuleAccess rejeita usuário fora da organização (404)', async () => {
    const { service } = buildService();

    await expect(
      service.grantModuleAccess({
        organizationId: ORG,
        userId: 'usuario-inexistente',
        moduleKey: 'social-selling',
        grantedByUserId: 'admin-1',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('revokeModuleAccess remove só o par usuário+módulo pedido', async () => {
    const { repo, service } = buildService();
    repo.grants = [
      { userId: 'u1', moduleKey: 'social-selling' },
      { userId: 'u1', moduleKey: 'proposta-comercial' },
    ];

    await service.revokeModuleAccess({
      organizationId: ORG,
      userId: 'u1',
      moduleKey: 'social-selling',
    });

    expect(repo.grants).toEqual([{ userId: 'u1', moduleKey: 'proposta-comercial' }]);
  });
});
