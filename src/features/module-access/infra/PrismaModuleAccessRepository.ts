import { prisma } from '../../../lib/prisma.js';
import type {
  GrantModuleAccessInput,
  ModuleAccessGrantRow,
  ModuleAccessRepository,
  ModuleAccessUserRow,
  RevokeModuleAccessInput,
} from '../domain/ModuleAccess.js';

/** Adaptador Prisma real de `ModuleAccessRepository` — mesmas queries que viviam antes direto em `moduleAccess.service.ts`. */
export class PrismaModuleAccessRepository implements ModuleAccessRepository {
  async listOrganizationUsers(organizationId: string): Promise<ModuleAccessUserRow[]> {
    return prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async listOrganizationGrants(organizationId: string): Promise<ModuleAccessGrantRow[]> {
    return prisma.moduleAccessGrant.findMany({
      where: { organizationId },
      select: { userId: true, moduleKey: true },
    });
  }

  async listUserGrantedModuleKeys(organizationId: string, userId: string): Promise<string[]> {
    const grants = await prisma.moduleAccessGrant.findMany({
      where: { organizationId, userId },
      select: { moduleKey: true },
    });
    return grants.map((g) => g.moduleKey);
  }

  async findUserId(organizationId: string, userId: string): Promise<string | null> {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  async upsertGrant(input: GrantModuleAccessInput): Promise<void> {
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

  async deleteGrant(input: RevokeModuleAccessInput): Promise<void> {
    await prisma.moduleAccessGrant.deleteMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        moduleKey: input.moduleKey,
      },
    });
  }
}

/** Instância única, sem estado próprio além da conexão Prisma já compartilhada pelo app — mesmo padrão de `prismaOptOutRepository`. */
export const prismaModuleAccessRepository = new PrismaModuleAccessRepository();
