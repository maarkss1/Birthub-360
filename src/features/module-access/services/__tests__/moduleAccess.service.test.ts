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
  // Default `true` para não quebrar os testes pré-existentes desta suíte, que não são sobre a
  // restrição PRODUCT-004/DOCBRAND-012 — os testes dessa restrição abaixo sobrescrevem
  // explicitamente para `false`.
  legacyAtlasGrEligible = true;

  async hasLegacyAtlasGrModuleAccess(_organizationId: string): Promise<boolean> {
    return this.legacyAtlasGrEligible;
  }

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

  // PRODUCT-004/DOCBRAND-012 (Onda 4): as 4 chaves de MODULE_CATALOG são conteúdo proprietário da
  // Atlas GR — só uma organização com `hasLegacyAtlasGrModuleAccess = true` pode concedê-las ou
  // enxergá-las (inclusive via o atalho automático de ADMIN).
  describe('restrição de organização para o catálogo legado da Atlas GR (PRODUCT-004/DOCBRAND-012)', () => {
    it('grantModuleAccess rejeita conceder um módulo restrito a organização não habilitada', async () => {
      const { repo, service } = buildService();
      repo.legacyAtlasGrEligible = false;

      await expect(
        service.grantModuleAccess({
          organizationId: ORG,
          userId: 'u1',
          moduleKey: 'social-selling',
          grantedByUserId: 'admin-1',
        }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(repo.grants).toEqual([]);
    });

    it('grantModuleAccess permite conceder um módulo restrito a organização habilitada', async () => {
      const { repo, service } = buildService();
      repo.legacyAtlasGrEligible = true;

      await service.grantModuleAccess({
        organizationId: ORG,
        userId: 'u1',
        moduleKey: 'social-selling',
        grantedByUserId: 'admin-1',
      });

      expect(repo.grants).toEqual([{ userId: 'u1', moduleKey: 'social-selling' }]);
    });

    it('listGrantedModulesForUser não devolve MODULE_KEYS pro ADMIN de organização não habilitada', async () => {
      const { repo, service } = buildService();
      repo.legacyAtlasGrEligible = false;

      const granted = await service.listGrantedModulesForUser(ORG, 'u1', 'ADMIN');

      expect(granted).toEqual([]);
    });

    it('listGrantedModulesForUser continua devolvendo MODULE_KEYS pro ADMIN de organização habilitada', async () => {
      const { service } = buildService();

      const granted = await service.listGrantedModulesForUser(ORG, 'u1', 'ADMIN');

      expect(granted.length).toBeGreaterThan(0);
    });

    it('listGrantedModulesForUser descarta, por defesa em profundidade, um grant pré-existente numa organização que perdeu a elegibilidade', async () => {
      const { repo, service } = buildService();
      repo.grants = [{ userId: 'u2', moduleKey: 'social-selling' }];
      repo.legacyAtlasGrEligible = false;

      const granted = await service.listGrantedModulesForUser(ORG, 'u2', 'SDR');

      expect(granted).toEqual([]);
    });

    it('organizationHasLegacyAtlasGrModuleAccess repassa o valor do repositório', async () => {
      const { repo, service } = buildService();
      repo.legacyAtlasGrEligible = false;

      expect(await service.organizationHasLegacyAtlasGrModuleAccess(ORG)).toBe(false);
    });
  });
});
