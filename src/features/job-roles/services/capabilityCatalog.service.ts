import type { AgentAccessLevel, CapabilityActionType, CapabilityRiskLevel } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';

export class CapabilityServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

export interface CapabilityDefinitionDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  domain: string;
  riskLevel: CapabilityRiskLevel;
  actionType: CapabilityActionType;
  isReadOnly: boolean;
  requiresApprovalByDefault: boolean;
  isSystem: boolean;
  isActive: boolean;
}

const CAPABILITY_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  domain: true,
  riskLevel: true,
  actionType: true,
  isReadOnly: true,
  requiresApprovalByDefault: true,
  isSystem: true,
  isActive: true,
} as const;

export async function listCapabilityDefinitions(
  options: { activeOnly?: boolean; domain?: string } = {},
): Promise<CapabilityDefinitionDto[]> {
  const activeOnly = options.activeOnly ?? true;
  return prisma.capabilityDefinition.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(options.domain ? { domain: options.domain } : {}),
    },
    select: CAPABILITY_SELECT,
    orderBy: [{ domain: 'asc' }, { code: 'asc' }],
  });
}

export async function getCapabilityDefinitionByCode(
  code: string,
): Promise<CapabilityDefinitionDto | null> {
  return prisma.capabilityDefinition.findUnique({
    where: { code },
    select: CAPABILITY_SELECT,
  });
}

export async function getCapabilityDefinitionById(
  id: string,
): Promise<CapabilityDefinitionDto | null> {
  return prisma.capabilityDefinition.findUnique({
    where: { id },
    select: CAPABILITY_SELECT,
  });
}

export async function upsertCapabilityDefinition(input: {
  code: string;
  name: string;
  description?: string | null;
  domain: string;
  riskLevel: CapabilityRiskLevel;
  actionType: CapabilityActionType;
  isReadOnly?: boolean;
  requiresApprovalByDefault?: boolean;
  isSystem?: boolean;
}): Promise<CapabilityDefinitionDto> {
  return prisma.capabilityDefinition.upsert({
    where: { code: input.code },
    create: {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      domain: input.domain,
      riskLevel: input.riskLevel,
      actionType: input.actionType,
      isReadOnly: input.isReadOnly ?? false,
      requiresApprovalByDefault: input.requiresApprovalByDefault ?? false,
      isSystem: input.isSystem ?? true,
      isActive: true,
    },
    update: {
      name: input.name,
      description: input.description ?? null,
      domain: input.domain,
      riskLevel: input.riskLevel,
      actionType: input.actionType,
      isReadOnly: input.isReadOnly ?? false,
      requiresApprovalByDefault: input.requiresApprovalByDefault ?? false,
    },
    select: CAPABILITY_SELECT,
  });
}

export async function listCapabilitiesForAgent(agentDefinitionId: string): Promise<
  {
    id: string;
    capability: CapabilityDefinitionDto;
    requiresApproval: boolean;
    isActive: boolean;
  }[]
> {
  const grants = await prisma.agentCapabilityGrant.findMany({
    where: { agentDefinitionId, isActive: true },
    select: {
      id: true,
      requiresApproval: true,
      isActive: true,
      capabilityDefinition: { select: CAPABILITY_SELECT },
    },
    orderBy: { capabilityDefinition: { code: 'asc' } },
  });

  return grants.map((g) => ({
    id: g.id,
    capability: g.capabilityDefinition,
    requiresApproval: g.requiresApproval,
    isActive: g.isActive,
  }));
}

export async function listCapabilitiesForJobRole(jobRoleId: string): Promise<
  {
    id: string;
    capability: CapabilityDefinitionDto;
    accessLevel: AgentAccessLevel;
    requiresApproval: boolean;
    isActive: boolean;
  }[]
> {
  const grants = await prisma.roleCapabilityGrant.findMany({
    where: { jobRoleId, isActive: true },
    select: {
      id: true,
      accessLevel: true,
      requiresApproval: true,
      isActive: true,
      capabilityDefinition: { select: CAPABILITY_SELECT },
    },
    orderBy: { capabilityDefinition: { code: 'asc' } },
  });

  return grants.map((g) => ({
    id: g.id,
    capability: g.capabilityDefinition,
    accessLevel: g.accessLevel,
    requiresApproval: g.requiresApproval,
    isActive: g.isActive,
  }));
}

export async function grantCapabilityToAgent(input: {
  agentDefinitionId: string;
  capabilityDefinitionId: string;
  requiresApproval?: boolean;
}): Promise<void> {
  await prisma.agentCapabilityGrant.upsert({
    where: {
      agentDefinitionId_capabilityDefinitionId: {
        agentDefinitionId: input.agentDefinitionId,
        capabilityDefinitionId: input.capabilityDefinitionId,
      },
    },
    create: {
      agentDefinitionId: input.agentDefinitionId,
      capabilityDefinitionId: input.capabilityDefinitionId,
      requiresApproval: input.requiresApproval ?? false,
      isActive: true,
    },
    update: {
      requiresApproval: input.requiresApproval ?? false,
      isActive: true,
    },
  });
}

export async function grantCapabilityToRole(input: {
  jobRoleId: string;
  capabilityDefinitionId: string;
  accessLevel?: AgentAccessLevel;
  requiresApproval?: boolean;
}): Promise<void> {
  await prisma.roleCapabilityGrant.upsert({
    where: {
      jobRoleId_capabilityDefinitionId: {
        jobRoleId: input.jobRoleId,
        capabilityDefinitionId: input.capabilityDefinitionId,
      },
    },
    create: {
      jobRoleId: input.jobRoleId,
      capabilityDefinitionId: input.capabilityDefinitionId,
      accessLevel: input.accessLevel ?? 'EXECUTE',
      requiresApproval: input.requiresApproval ?? false,
      isActive: true,
    },
    update: {
      accessLevel: input.accessLevel ?? 'EXECUTE',
      requiresApproval: input.requiresApproval ?? false,
      isActive: true,
    },
  });
}
