import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import {
  grantModuleAccess,
  revokeModuleAccess,
  getModuleAccessMatrix,
  listGrantedModulesForUser,
  organizationHasLegacyAtlasGrModuleAccess,
  ModuleAccessServiceError,
} from '../../src/features/module-access/services/moduleAccess.service';
import { MODULE_KEYS } from '../../src/config/module-catalog';

const ORG_ID = 'test-org-id';

describe('Module Access Grant Integration', () => {
  beforeEach(async () => {
    await prisma.moduleAccessGrant.deleteMany();
    await prisma.user.deleteMany({ where: { organizationId: ORG_ID } });
    // PRODUCT-004/DOCBRAND-012 (Onda 4): estes testes exercitam o fluxo normal de concessão do
    // catálogo legado, então a organização de teste precisa estar habilitada por padrão — os
    // testes da restrição em si (describe abaixo) desligam o flag explicitamente.
    await prisma.organization.update({
      where: { id: ORG_ID },
      data: { hasLegacyAtlasGrModuleAccess: true },
    });
  });

  it('grants and lists a module for a user, then revokes it', async () => {
    const user = await prisma.user.create({
      data: { name: 'Ana Closer', email: 'ana.closer@module-access.test', organizationId: ORG_ID },
    });

    await grantModuleAccess({
      organizationId: ORG_ID,
      userId: user.id,
      moduleKey: 'social-selling',
      grantedByUserId: 'admin-1',
    });

    expect(await listGrantedModulesForUser(ORG_ID, user.id, user.role)).toEqual(['social-selling']);

    await revokeModuleAccess({
      organizationId: ORG_ID,
      userId: user.id,
      moduleKey: 'social-selling',
    });

    expect(await listGrantedModulesForUser(ORG_ID, user.id, user.role)).toEqual([]);
  });

  it('grant is idempotent (upsert) for the same user/module pair', async () => {
    const user = await prisma.user.create({
      data: { name: 'Beto SDR', email: 'beto.sdr@module-access.test', organizationId: ORG_ID },
    });

    await grantModuleAccess({
      organizationId: ORG_ID,
      userId: user.id,
      moduleKey: 'proposta-comercial',
      grantedByUserId: 'admin-1',
    });
    await grantModuleAccess({
      organizationId: ORG_ID,
      userId: user.id,
      moduleKey: 'proposta-comercial',
      grantedByUserId: 'admin-2',
    });

    const grants = await prisma.moduleAccessGrant.findMany({ where: { userId: user.id } });
    expect(grants).toHaveLength(1);
  });

  it('builds the matrix with granted modules per user', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Carla Gestora',
        email: 'carla.gestora@module-access.test',
        organizationId: ORG_ID,
      },
    });
    await grantModuleAccess({
      organizationId: ORG_ID,
      userId: user.id,
      moduleKey: 'treinamento-atlasgr',
      grantedByUserId: 'admin-1',
    });

    const matrix = await getModuleAccessMatrix(ORG_ID);
    const row = matrix.find((m) => m.id === user.id);
    expect(row?.grantedModules).toEqual(['treinamento-atlasgr']);
  });

  it('rejects an unknown moduleKey', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Duda Visualizadora',
        email: 'duda.viz@module-access.test',
        organizationId: ORG_ID,
      },
    });

    await expect(
      grantModuleAccess({
        organizationId: ORG_ID,
        userId: user.id,
        moduleKey: 'modulo-que-nao-existe',
        grantedByUserId: 'admin-1',
      }),
    ).rejects.toThrow(ModuleAccessServiceError);
  });

  it('ADMIN vê todos os módulos do catálogo automaticamente, sem precisar de concessão', async () => {
    const admin = await prisma.user.create({
      data: {
        name: 'Marcelo Admin',
        email: 'marcelo.admin@module-access.test',
        organizationId: ORG_ID,
        role: 'ADMIN',
      },
    });

    expect(await listGrantedModulesForUser(ORG_ID, admin.id, admin.role)).toEqual(MODULE_KEYS);

    const grants = await prisma.moduleAccessGrant.findMany({ where: { userId: admin.id } });
    expect(grants).toHaveLength(0);
  });

  it('rejects granting to a user outside the organization', async () => {
    await expect(
      grantModuleAccess({
        organizationId: ORG_ID,
        userId: 'user-inexistente',
        moduleKey: 'social-selling',
        grantedByUserId: 'admin-1',
      }),
    ).rejects.toThrow(ModuleAccessServiceError);
  });

  // PRODUCT-004/DOCBRAND-012 (Onda 4): as 4 chaves de MODULE_CATALOG são conteúdo proprietário da
  // Atlas GR — restritas a organizações com `Organization.hasLegacyAtlasGrModuleAccess = true`.
  describe('restrição de organização para o catálogo legado da Atlas GR (PRODUCT-004/DOCBRAND-012)', () => {
    beforeEach(async () => {
      await prisma.organization.update({
        where: { id: ORG_ID },
        data: { hasLegacyAtlasGrModuleAccess: false },
      });
    });

    it('rejects granting a catalog module key to a user in a non-eligible organization', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Elis Não Elegível',
          email: 'elis.naoelegivel@module-access.test',
          organizationId: ORG_ID,
        },
      });

      await expect(
        grantModuleAccess({
          organizationId: ORG_ID,
          userId: user.id,
          moduleKey: 'social-selling',
          grantedByUserId: 'admin-1',
        }),
      ).rejects.toMatchObject({ statusCode: 403 });

      const grants = await prisma.moduleAccessGrant.findMany({ where: { userId: user.id } });
      expect(grants).toHaveLength(0);
    });

    it('ADMIN of a non-eligible organization does not automatically see the catalog modules', async () => {
      const admin = await prisma.user.create({
        data: {
          name: 'Fabio Admin Não Elegível',
          email: 'fabio.admin.naoelegivel@module-access.test',
          organizationId: ORG_ID,
          role: 'ADMIN',
        },
      });

      expect(await listGrantedModulesForUser(ORG_ID, admin.id, admin.role)).toEqual([]);
    });

    it('drops a pre-existing grant (defense in depth) once the organization loses eligibility', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Gabi Grant Legado',
          email: 'gabi.grantlegado@module-access.test',
          organizationId: ORG_ID,
        },
      });
      // Grava a concessão direto no banco (contornando o service, que já rejeitaria) pra simular
      // um grant que existia de antes da restrição entrar em vigor.
      await prisma.moduleAccessGrant.create({
        data: {
          organizationId: ORG_ID,
          userId: user.id,
          moduleKey: 'proposta-comercial',
          grantedByUserId: 'admin-1',
        },
      });

      expect(await listGrantedModulesForUser(ORG_ID, user.id, user.role)).toEqual([]);
    });

    it('re-enables both the write and read paths once the organization is flagged eligible', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Helio Reelegivel',
          email: 'helio.reelegivel@module-access.test',
          organizationId: ORG_ID,
        },
      });

      await prisma.organization.update({
        where: { id: ORG_ID },
        data: { hasLegacyAtlasGrModuleAccess: true },
      });

      await grantModuleAccess({
        organizationId: ORG_ID,
        userId: user.id,
        moduleKey: 'proposta-comercial',
        grantedByUserId: 'admin-1',
      });

      expect(await listGrantedModulesForUser(ORG_ID, user.id, user.role)).toEqual([
        'proposta-comercial',
      ]);
    });

    it('organizationHasLegacyAtlasGrModuleAccess reflects the organization flag', async () => {
      expect(await organizationHasLegacyAtlasGrModuleAccess(ORG_ID)).toBe(false);

      await prisma.organization.update({
        where: { id: ORG_ID },
        data: { hasLegacyAtlasGrModuleAccess: true },
      });

      expect(await organizationHasLegacyAtlasGrModuleAccess(ORG_ID)).toBe(true);
    });
  });
});
