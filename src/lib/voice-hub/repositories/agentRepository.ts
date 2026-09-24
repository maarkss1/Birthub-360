import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function listAgentsForTenant(tenantId: string) {
  return prisma.agent.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
}

export function getAgent(id: string, tenantId: string) {
  return prisma.agent.findFirst({ where: { id, tenantId, deletedAt: null } });
}

export function createAgent(tenantId: string, userId: string, data: { name: string; model: string; configuration?: unknown }) {
  return prisma.agent.create({
    data: {
      tenantId,
      userId,
      name: data.name,
      model: data.model,
      configuration: (data.configuration ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export function updateAgent(id: string, tenantId: string, data: { name?: string; model?: string; configuration?: unknown }) {
  const updateData: Prisma.AgentUpdateManyMutationInput = {};
  if (data.name) updateData.name = data.name;
  if (data.model) updateData.model = data.model;
  if (data.configuration) updateData.configuration = data.configuration as Prisma.InputJsonValue;

  return prisma.agent.updateMany({
    where: { id, tenantId, deletedAt: null },
    data: updateData
  });
}

export function deleteAgentForTenant(id: string, tenantId: string) {
  return prisma.agent.updateMany({ where: { id, tenantId }, data: { deletedAt: new Date() } });
}

export function findAgentByPhoneNumber(phoneNumber: string) {
  return prisma.agent.findFirst({ where: { phoneNumber, deletedAt: null } });
}

export function findAgentById(id: string) {
  return prisma.agent.findFirst({ where: { id, deletedAt: null } });
}
