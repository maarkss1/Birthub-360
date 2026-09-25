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
  domain: string | null;
  riskLevel: CapabilityRiskLevel;
  actionType: CapabilityActionType;
  isReadOnly: boolean;
  requiresApprovalByDefault: boolean;
  isSystem: boolean;
  isActive: boolean;
}

const CAPABILITY_DEFINITION_SELECT = {
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
  options: { activeOnly?: boolean } = {},
): Promise<CapabilityDefinitionDto[]> {
  const activeOnly = options.activeOnly ?? true;
  return prisma.capabilityDefinition.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    select: CAPABILITY_DEFINITION_SELECT,
    orderBy: { code: 'asc' },
  });
}

export async function getCapabilityDefinitionByCode(
  code: string,
): Promise<CapabilityDefinitionDto | null> {
  return prisma.capabilityDefinition.findUnique({
    where: { code },
    select: CAPABILITY_DEFINITION_SELECT,
  });
}

/** Upsert idempotente por `code` — usado pelo seed (`scripts/seed-capability-engine.ts`) a
 *  partir de `src/config/capability-catalog.ts`. Nunca cria uma segunda linha para o mesmo code. */
export async function upsertCapabilityDefinition(input: {
  code: string;
  name: string;
  description?: string;
  domain?: string;
  actionType: CapabilityActionType;
  riskLevel?: CapabilityRiskLevel;
  isReadOnly?: boolean;
  requiresApprovalByDefault?: boolean;
}): Promise<CapabilityDefinitionDto> {
  const riskLevel = input.riskLevel ?? 'LOW';
  const isReadOnly = input.isReadOnly ?? input.actionType === 'READ';
  const requiresApprovalByDefault =
    input.requiresApprovalByDefault ?? (riskLevel === 'HIGH' || riskLevel === 'CRITICAL');

  return prisma.capabilityDefinition.upsert({
    where: { code: input.code },
    create: {
      code: input.code,
      name: input.name,
      description: input.description,
      domain: input.domain,
      actionType: input.actionType,
      riskLevel,
      isReadOnly,
      requiresApprovalByDefault,
      isSystem: true,
      isActive: true,
    },
    update: {
      name: input.name,
      description: input.description,
      domain: input.domain,
      actionType: input.actionType,
      riskLevel,
      isReadOnly,
      requiresApprovalByDefault,
    },
    select: CAPABILITY_DEFINITION_SELECT,
  });
}

/** Concede uma capability a um AGENTE — representa o que o agente foi desenhado para fazer.
 *  Idempotente por (agentDefinitionId, capabilityDefinitionId). Nunca guarda um `accessMode` aqui
 *  (isso é papel exclusivo de `RoleCapabilityGrant.accessLevel`, avaliado depois na cadeia). */
export async function grantCapabilityToAgent(input: {
  agentDefinitionId: string;
  capabilityDefinitionId: string;
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
      isActive: true,
    },
    update: { isActive: true },
  });
}

export async function listCapabilitiesForAgent(
  agentDefinitionId: string,
): Promise<CapabilityDefinitionDto[]> {
  const grants = await prisma.agentCapabilityGrant.findMany({
    where: { agentDefinitionId, isActive: true, capabilityDefinition: { isActive: true } },
    select: { capabilityDefinition: { select: CAPABILITY_DEFINITION_SELECT } },
  });
  return grants.map((g) => g.capabilityDefinition);
}

/** Concede uma capability a um CARGO — representa o que o cargo pode permitir. Reusa
 *  `AgentAccessLevel` (DISCOVER/READ/EXECUTE/REQUEST), o mesmo enum de `RoleAgentGrant`.
 *  Idempotente por (jobRoleId, capabilityDefinitionId). Nunca faz downgrade silencioso — quem
 *  chama decide explicitamente o `accessLevel` novo (sem "floor" automático aqui; o piso comum de
 *  agentes compartilhados é responsabilidade do importador, não deste service). */
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

export interface RoleCapabilityGrantDto {
  capability: CapabilityDefinitionDto;
  accessLevel: AgentAccessLevel;
  requiresApproval: boolean;
}

export async function listCapabilitiesForJobRole(
  jobRoleId: string,
): Promise<RoleCapabilityGrantDto[]> {
  const grants = await prisma.roleCapabilityGrant.findMany({
    where: { jobRoleId, isActive: true, capabilityDefinition: { isActive: true } },
    select: {
      accessLevel: true,
      requiresApproval: true,
      capabilityDefinition: { select: CAPABILITY_DEFINITION_SELECT },
    },
  });
  return grants.map((g) => ({
    capability: g.capabilityDefinition,
    accessLevel: g.accessLevel,
    requiresApproval: g.requiresApproval,
  }));
}
