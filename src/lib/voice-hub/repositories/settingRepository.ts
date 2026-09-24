import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function findSetting(organizationId: string | null, userId: string | null, key: string) {
  return prisma.setting.findFirst({ where: { organizationId, userId, key } });
}

export async function upsertSetting(organizationId: string | null, userId: string | null, key: string, value: unknown) {
  const existing = await prisma.setting.findFirst({ where: { organizationId, userId, key } });

  if (existing) {
    return prisma.setting.update({ where: { id: existing.id }, data: { value: value as Prisma.InputJsonValue } });
  }

  try {
    return await prisma.setting.create({
      data: {
        organizationId,
        userId,
        key,
        value: value as Prisma.InputJsonValue,
        isGlobal: !organizationId && !userId,
      },
    });
  } catch (error) {
    // If a race condition occurred and the unique constraint failed, update the existing record
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raceExisting = await prisma.setting.findFirst({ where: { organizationId, userId, key } });
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

export function deleteSetting(organizationId: string | null, userId: string | null, key: string) {
  return prisma.setting.deleteMany({ where: { organizationId, userId, key } });
}
