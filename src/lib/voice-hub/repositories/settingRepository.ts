import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function findSetting(tenantId: string | null, userId: string | null, key: string) {
  return prisma.setting.findFirst({ where: { tenantId, userId, key } });
}

export async function upsertSetting(tenantId: string | null, userId: string | null, key: string, value: unknown) {
  const existing = await prisma.setting.findFirst({ where: { tenantId, userId, key } });

  if (existing) {
    return prisma.setting.update({ where: { id: existing.id }, data: { value: value as Prisma.InputJsonValue } });
  }

  try {
    return await prisma.setting.create({
      data: {
        tenantId,
        userId,
        key,
        value: value as Prisma.InputJsonValue,
        isGlobal: !tenantId && !userId,
      },
    });
  } catch (error) {
    // If a race condition occurred and the unique constraint failed, update the existing record
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raceExisting = await prisma.setting.findFirst({ where: { tenantId, userId, key } });
      if (raceExisting) {
        return prisma.setting.update({
          where: { id: raceExisting.id },
          data: { value: value as Prisma.InputJsonValue }
        });
      }
    }
    throw error;
  }
}

export function deleteSetting(tenantId: string | null, userId: string | null, key: string) {
  return prisma.setting.deleteMany({ where: { tenantId, userId, key } });
}
