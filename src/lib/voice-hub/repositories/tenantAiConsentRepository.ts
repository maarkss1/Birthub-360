// Data access for tenant-level AI provider consent (LGPD). Extracted out of settingService.ts
// (which was calling Prisma directly, bypassing the Controller → Service → Repository boundary —
// see the PR review finding this resolves) so `OrganizationAiConsent` has the same repository-layer
// isolation as every other model: no Prisma import outside src/repositories/**.
import { prisma } from '@/lib/prisma.js';
import type { OrganizationAiConsent } from '@prisma/client';

export function findByTenantId(organizationId: string): Promise<OrganizationAiConsent | null> {
  return prisma.organizationAiConsent.findUnique({ where: { organizationId } });
}

export function grant(organizationId: string, grantedAt: Date, grantedByUserId: string): Promise<OrganizationAiConsent> {
  return prisma.organizationAiConsent.upsert({
    where: { organizationId },
    create: { organizationId, granted: true, grantedAt, grantedByUserId },
    update: { granted: true, grantedAt, revokedAt: null, grantedByUserId },
  });
}

export function revoke(organizationId: string, revokedAt: Date, grantedByUserId: string): Promise<OrganizationAiConsent> {
  return prisma.organizationAiConsent.upsert({
    where: { organizationId },
    create: { organizationId, granted: false, revokedAt, grantedByUserId },
    update: { granted: false, revokedAt, grantedByUserId },
  });
}
