import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import {
  grantModuleAccess,
  revokeModuleAccess,
  getModuleAccessMatrix,
  listGrantedModulesForUser,
  ModuleAccessServiceError,
} from '../../src/features/module-access/services/moduleAccess.service';

const ORG_ID = 'test-org-id';

describe('Module Access Grant Integration', () => {
  beforeEach(async () => {
    await prisma.moduleAccessGrant.deleteMany();
    await prisma.user.deleteMany({ where: { organizationId: ORG_ID } });
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

    expect(await listGrantedModulesForUser(ORG_ID, user.id)).toEqual(['social-selling']);

    await revokeModuleAccess({ organizationId: ORG_ID, userId: user.id, moduleKey: 'social-selling' });

    expect(await listGrantedModulesForUser(ORG_ID, user.id)).toEqual([]);
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
      data: { name: 'Carla Gestora', email: 'carla.gestora@module-access.test', organizationId: ORG_ID },
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
      data: { name: 'Duda Visualizadora', email: 'duda.viz@module-access.test', organizationId: ORG_ID },
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
});
