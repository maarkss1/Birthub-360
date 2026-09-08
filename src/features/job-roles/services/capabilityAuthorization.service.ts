import type { AgentAccessLevel, CapabilityRiskLevel } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { getToolBinding } from '../catalog/toolBindings.js';

export type CapabilityDecisionReason =
  | 'PERMITTED'
  | 'NO_JOB_ROLE'
  | 'INACTIVE_JOB_ROLE'
  | 'UNKNOWN_AGENT'
  | 'INACTIVE_AGENT'
  | 'AGENT_NOT_GRANTED_TO_ROLE'
  | 'CROSS_ROLE_REQUEST_REQUIRED'
  | 'UNKNOWN_CAPABILITY'
  | 'INACTIVE_CAPABILITY'
  | 'CAPABILITY_NOT_GRANTED_TO_AGENT'
  | 'CAPABILITY_NOT_GRANTED_TO_ROLE'
  | 'SOURCE_REQUIRED'
  | 'USER_ROLE_FORBIDDEN'
  | 'APPROVAL_REQUIRED';

export interface AuthorizeCapabilityInput {
  actor: {
    id: string;
    organizationId: string;
    role: string; // UserRole: ADMIN, GESTOR, CLOSER, SDR, VISUALIZADOR
  };
  agentId: string; // pode ser id (cuid) ou code (slug) do AgentDefinition
  capabilityCode: string;
  resource?: {
    type: string;
    id: string;
  };
}

export interface CapabilityDecision {
  allowed: boolean;
  reason: CapabilityDecisionReason;
  requiresApproval: boolean;
  riskLevel: CapabilityRiskLevel | null;
  accessLevel: AgentAccessLevel | null;
  toolCode: string | null;
  toolAvailable: boolean;
  actor: {
    id: string;
    userRole: string;
    jobRoleId: string | null;
    jobRoleCode: string | null;
  };
  agent: {
    id: string | null;
    code: string | null;
    name: string | null;
  };
  capability: {
    id: string | null;
    code: string;
    name: string | null;
    actionType: string | null;
  };
  resource?: {
    type: string;
    id: string;
  };
}

/**
 * Capability Authorization Service (PROMPT 3 — Capability & Permission Engine).
 *
 * Avalia a interseção estrita de segurança:
 *   actor autenticado
 *   + UserRole válido e compatível
 *   + JobRole principal ativo
 *   + AgentDefinition ativo
 *   + RoleAgentGrant ativo
 *   + CapabilityDefinition ativa
 *   + AgentCapabilityGrant ativo
 *   + RoleCapabilityGrant ativo
 *   + Tool Binding disponível (não SOURCE_REQUIRED)
 *   + Checagem de Risco / Aprovação
 *
 * NUNCA executa LLM, agentes ou tools nesta camada (PROMPT 4 cuidará do AgentRuntime).
 * FAIL CLOSED absoluto.
 */
export async function authorizeCapability(
  input: AuthorizeCapabilityInput,
): Promise<CapabilityDecision> {
  const baseDecision: CapabilityDecision = {
    allowed: false,
    reason: 'UNKNOWN_CAPABILITY',
    requiresApproval: false,
    riskLevel: null,
    accessLevel: null,
    toolCode: null,
    toolAvailable: false,
    actor: {
      id: input.actor.id,
      userRole: input.actor.role,
      jobRoleId: null,
      jobRoleCode: null,
    },
    agent: {
      id: null,
      code: null,
      name: null,
    },
    capability: {
      id: null,
      code: input.capabilityCode,
      name: null,
      actionType: null,
    },
    resource: input.resource,
  };

  // 1. Validação de Actor e UserRole
  if (!input.actor?.id || !input.actor?.role) {
    baseDecision.reason = 'USER_ROLE_FORBIDDEN';
    return baseDecision;
  }

  // 2. JobRole principal ativo do usuário na organização
  const userJobRole = await prisma.userJobRole.findFirst({
    where: {
      userId: input.actor.id,
      organizationId: input.actor.organizationId,
      isPrimary: true,
      isActive: true,
    },
    include: {
      jobRole: true,
    },
  });

  if (!userJobRole) {
    baseDecision.reason = 'NO_JOB_ROLE';
    return baseDecision;
  }

  if (!userJobRole.jobRole?.isActive) {
    baseDecision.reason = 'INACTIVE_JOB_ROLE';
    return baseDecision;
  }

  baseDecision.actor.jobRoleId = userJobRole.jobRole.id;
  baseDecision.actor.jobRoleCode = userJobRole.jobRole.code;

  // 3. AgentDefinition ativo
  const agent = await prisma.agentDefinition.findFirst({
    where: {
      OR: [{ id: input.agentId }, { code: input.agentId }],
    },
  });

  if (!agent) {
    baseDecision.reason = 'UNKNOWN_AGENT';
    return baseDecision;
  }

  baseDecision.agent.id = agent.id;
  baseDecision.agent.code = agent.code;
  baseDecision.agent.name = agent.name;

  if (!agent.isActive) {
    baseDecision.reason = 'INACTIVE_AGENT';
    return baseDecision;
  }

  // 4. RoleAgentGrant: este cargo tem grant para este agente?
  const roleAgentGrant = await prisma.roleAgentGrant.findUnique({
    where: {
      jobRoleId_agentDefinitionId: {
        jobRoleId: userJobRole.jobRoleId,
        agentDefinitionId: agent.id,
      },
    },
  });

  if (!roleAgentGrant?.isActive) {
    baseDecision.reason = 'AGENT_NOT_GRANTED_TO_ROLE';
    return baseDecision;
  }

  if (roleAgentGrant.accessLevel === 'REQUEST') {
    baseDecision.reason = 'CROSS_ROLE_REQUEST_REQUIRED';
    baseDecision.requiresApproval = true;
    baseDecision.accessLevel = 'REQUEST';
    return baseDecision;
  }

  // 5. CapabilityDefinition ativa
  const capability = await prisma.capabilityDefinition.findUnique({
    where: { code: input.capabilityCode },
  });

  if (!capability) {
    baseDecision.reason = 'UNKNOWN_CAPABILITY';
    return baseDecision;
  }

  baseDecision.capability.id = capability.id;
  baseDecision.capability.code = capability.code;
  baseDecision.capability.name = capability.name;
  baseDecision.capability.actionType = capability.actionType;
  baseDecision.riskLevel = capability.riskLevel;

  if (!capability.isActive) {
    baseDecision.reason = 'INACTIVE_CAPABILITY';
    return baseDecision;
  }

  // 6. UserRole como autoridade superior de segurança:
  // VISUALIZADOR nunca pode executar ações que alterem estado (WRITE ou ADMIN)
  if (input.actor.role === 'VISUALIZADOR') {
    if (capability.actionType === 'WRITE' || capability.actionType === 'ADMIN') {
      baseDecision.reason = 'USER_ROLE_FORBIDDEN';
      return baseDecision;
    }
  }

  // 7. AgentCapabilityGrant: o agente foi desenhado/autorizado para esta capability?
  const agentCapabilityGrant = await prisma.agentCapabilityGrant.findUnique({
    where: {
      agentDefinitionId_capabilityDefinitionId: {
        agentDefinitionId: agent.id,
        capabilityDefinitionId: capability.id,
      },
    },
  });

  if (!agentCapabilityGrant?.isActive) {
    baseDecision.reason = 'CAPABILITY_NOT_GRANTED_TO_AGENT';
    return baseDecision;
  }

  // 8. RoleCapabilityGrant: o cargo profissional tem grant para esta capability?
  const roleCapabilityGrant = await prisma.roleCapabilityGrant.findUnique({
    where: {
      jobRoleId_capabilityDefinitionId: {
        jobRoleId: userJobRole.jobRoleId,
        capabilityDefinitionId: capability.id,
      },
    },
  });

  if (!roleCapabilityGrant?.isActive) {
    baseDecision.reason = 'CAPABILITY_NOT_GRANTED_TO_ROLE';
    return baseDecision;
  }

  baseDecision.accessLevel = roleCapabilityGrant.accessLevel;

  if (roleCapabilityGrant.accessLevel === 'REQUEST') {
    baseDecision.reason = 'CROSS_ROLE_REQUEST_REQUIRED';
    baseDecision.requiresApproval = true;
    return baseDecision;
  }

  // 9. Tool Binding e Disponibilidade real (não dependente de nome de agente)
  const toolBinding = getToolBinding(capability.code);
  baseDecision.toolCode = toolBinding?.toolCode ?? null;
  baseDecision.toolAvailable = toolBinding?.available ?? false;

  if (!toolBinding?.available || toolBinding.reason === 'SOURCE_REQUIRED') {
    baseDecision.reason = 'SOURCE_REQUIRED';
    baseDecision.allowed = false;
    return baseDecision;
  }

  // 10. Risco e Requisito de Aprovação
  const requiresApproval =
    capability.riskLevel === 'HIGH' ||
    capability.riskLevel === 'CRITICAL' ||
    capability.requiresApprovalByDefault ||
    agent.requiresApproval ||
    agentCapabilityGrant.requiresApproval ||
    roleCapabilityGrant.requiresApproval ||
    roleAgentGrant.requiresApproval;

  if (requiresApproval) {
    baseDecision.allowed = false;
    baseDecision.requiresApproval = true;
    baseDecision.reason = 'APPROVAL_REQUIRED';
    return baseDecision;
  }

  // 11. Todas as camadas de segurança autorizadas
  baseDecision.allowed = true;
  baseDecision.reason = 'PERMITTED';
  baseDecision.requiresApproval = false;

  return baseDecision;
}
