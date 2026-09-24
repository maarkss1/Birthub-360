import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

export function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } });
}

export function findUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export function createUser(data: { email: string; passwordHash: string; companyName: string; tenantId: string }) {
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      companyName: data.companyName,
      tenantId: data.tenantId,
    },
  });
}

export function findMembershipWithRole(userId: string, tenantId: string) {
  return prisma.membership.findFirst({
    where: { userId, tenantId },
    include: { role: true },
  });
}

export function createMembership(userId: string, tenantId: string, roleId: string) {
  return prisma.membership.create({ data: { userId, tenantId, roleId } });
}

export function listUsersForTenant(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId, deletedAt: null },
    include: { memberships: { include: { role: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export function updateUser(id: string, data: { companyName?: string; passwordHash?: string }) {
  return prisma.user.update({ where: { id }, data });
}

export function softDeleteUser(id: string) {
  return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
}

// LGPD (Lei 13.709/2018) technical erasure mechanism for a data subject request. Unlike
// softDeleteUser (which only hides the row from application queries and is used for ordinary
// account removal), this irreversibly scrubs the personal data itself — email, company name and
// credential — while keeping the row so foreign keys from AuditLog/Session/Membership don't
// dangle. The overwritten email is deterministic-but-unguessable and unique per user so it never
// collides with another anonymized account under the @@unique(email) constraint. The password
// hash is replaced with random bytes that will never match any real login attempt; even if it
// were somehow compared, verifyPassword()'s bcrypt.compareSync is already wrapped in a try/catch
// that returns false on a malformed hash (src/lib/auth-tokens.ts), so this can't throw at login.
export function anonymizeUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: {
      email: `anon-${id}-${crypto.randomBytes(8).toString('hex')}@anonymized.invalid`,
      companyName: '[Dados removidos a pedido do titular - LGPD]',
      passwordHash: crypto.randomBytes(32).toString('hex'),
      deletedAt: new Date(),
    },
  });
}

export function updateMembershipRole(userId: string, tenantId: string, roleId: string) {
  return prisma.membership.updateMany({ where: { userId, tenantId }, data: { roleId } });
}
