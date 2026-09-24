import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function listAgentsForTenant(organizationId: string) {
  return prisma.agent.findMany({ where: { organizationId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
}

export function getAgent(id: string, organizationId: string) {
  return prisma.agent.findFirst({ where: { id, organizationId, deletedAt: null } });
}

export function createAgent(organizationId: string, userId: string, data: { name: string; model: string; configuration?: unknown }) {
  return prisma.agent.create({
    data: {
      organizationId,
      userId,
      name: data.name,
      model: data.model,
      configuration: (data.configuration ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export function updateAgent(id: string, organizationId: string, data: { name?: string; model?: string; configuration?: unknown }) {
  const updateData: Prisma.AgentUpdateManyMutationInput = {};
  if (data.name) updateData.name = data.name;
  if (data.model) updateData.model = data.model;
  if (data.configuration) updateData.configuration = data.configuration as Prisma.InputJsonValue;

  return prisma.agent.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: updateData
  });
}

export function deleteAgentForTenant(id: string, organizationId: string) {
  return prisma.agent.updateMany({ where: { id, organizationId }, data: { deletedAt: new Date() } });
}

export function findAgentByPhoneNumber(phoneNumber: string) {
  return prisma.agent.findFirst({ where: { phoneNumber, deletedAt: null } });
}

export function findAgentById(id: string) {
  return prisma.agent.findFirst({ where: { id, deletedAt: null } });
}
