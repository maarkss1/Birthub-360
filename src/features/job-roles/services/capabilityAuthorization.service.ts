import type { AgentAccessLevel, CapabilityActionType, CapabilityRiskLevel } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { getVerifiedToolBinding } from '../catalog/verifiedToolBindings.js';
import { canUserRolePerformCapabilityAction } from './capabilityUserRolePolicy.js';

export type CapabilityDecisionReason =
  | 'PERMITTED'
  | 'NO_JOB_ROLE'
  | 'INACTIVE_JOB_ROLE'
  | 'UNKNOWN_AGENT'
  | 'INACTIVE_AGENT'
  | 'AGENT_NOT_GRANTED_TO_ROLE'
  | 'CROSS_ROLE_REQUEST_REQUIRED'
  | 'DISCOVER_ONLY'
  | 'READ_ONLY_ACCESS'
  | 'UNKNOWN_CAPABILITY'
  | 'INACTIVE_CAPABILITY'
  | 'CAPABILITY_NOT_GRANTED_TO_AGENT'
  | 'CAPABILITY_NOT_GRANTED_TO_ROLE'
  | 'SOURCE_REQUIRED'
  | 'FUTURE_TOOL'
  | 'TOOL_UNAVAILABLE'
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
  bindingVerification: 'VERIFIED' | 'UNVERIFIED' | null;
  bindingEvidencePath: string | null;
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

const ACCESS_RANK: Record<Exclude<AgentAccessLevel, 'REQUEST'>, number> = {
  DISCOVER: 0,
  READ: 1,
  EXECUTE: 2,
};

function validateAccessLevelForAction(
  accessLevel: AgentAccessLevel,
  actionType: CapabilityActionType,
): CapabilityDecisionReason | null {
  if (accessLevel === 'REQUEST') return 'CROSS_ROLE_REQUEST_REQUIRED';
  if (accessLevel === 'DISCOVER') return 'DISCOVER_ONLY';
  if (accessLevel === 'READ' && actionType !== 'READ') return 'READ_ONLY_ACCESS';
  return null;
}

function effectiveAccessLevel(
  roleAgentAccess: AgentAccessLevel,
  roleCapabilityAccess: AgentAccessLevel,
): AgentAccessLevel {
  if (roleAgentAccess === 'REQUEST' || roleCapabilityAccess === 'REQUEST') return 'REQUEST';
  return ACCESS_RANK[roleAgentAccess] <= ACCESS_RANK[roleCapabilityAccess]
    ? roleAgentAccess
    : roleCapabilityAccess;
}

/**
 * Capability Authorization Service (PROMPT 3 — Capability & Permission Engine).
 *
 * Avalia a interseção estrita de segurança:
 *   actor autenticado
 *   + UserRole válido e compatível
 *   + JobRole principal ativo
 *   + AgentDefinition ativo
 *   + RoleAgentGrant ativo e compatível com o tipo de ação
 *   + CapabilityDefinition ativa
 *   + AgentCapabilityGrant ativo
 *   + RoleCapabilityGrant ativo e compatível com o tipo de ação
 *   + Tool Binding comprovado por evidência real no repositório
 *   + Checagem de Risco / Aprovação
 *
 * NUNCA executa LLM, agentes ou tools nesta camada (PROMPT 4 cuidará do AgentRuntime).
 * Resource ownership também não é resolvido aqui: `resource` é carregado na decisão para o
 * runtime/policy de domínio combinar capability + ownership sem misturar responsabilidades.
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
    bindingVerification: null,
    bindingEvidencePath: null,
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

  // 1. Validação básica do actor. A compatibilidade do UserRole com o tipo de ação
  // é avaliada assim que a CapabilityDefinition for conhecida.
  if (!input.actor?.id || !input.actor?.role || !input.actor?.organizationId) {
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

  // 4. RoleAgentGrant: este cargo pode sequer usar este agente?
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

  if (roleAgentGrant.accessLevel === 'DISCOVER') {
    baseDecision.reason = 'DISCOVER_ONLY';
    baseDecision.accessLevel = 'DISCOVER';
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

  // 6. Semântica completa do access level do agente para o tipo de ação solicitado.
  const roleAgentAccessFailure = validateAccessLevelForAction(
    roleAgentGrant.accessLevel,
    capability.actionType,
  );
  if (roleAgentAccessFailure) {
    baseDecision.reason = roleAgentAccessFailure;
    baseDecision.accessLevel = roleAgentGrant.accessLevel;
    baseDecision.requiresApproval = roleAgentAccessFailure === 'CROSS_ROLE_REQUEST_REQUIRED';
    return baseDecision;
  }

  // 7. UserRole permanece a autoridade técnica superior. Esta policy reaproveita
  // `hasRequiredRole`/`ROLE_HIERARCHY`; não introduz um terceiro RBAC.
  if (!canUserRolePerformCapabilityAction(input.actor.role, capability.actionType)) {
    baseDecision.reason = 'USER_ROLE_FORBIDDEN';
    return baseDecision;
  }

  // 8. AgentCapabilityGrant: o agente foi desenhado/autorizado para esta capability?
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

  // 9. RoleCapabilityGrant: o cargo profissional pode permitir esta capability?
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

  const roleCapabilityAccessFailure = validateAccessLevelForAction(
    roleCapabilityGrant.accessLevel,
    capability.actionType,
  );
  baseDecision.accessLevel = effectiveAccessLevel(
    roleAgentGrant.accessLevel,
    roleCapabilityGrant.accessLevel,
  );

  if (roleCapabilityAccessFailure) {
    baseDecision.reason = roleCapabilityAccessFailure;
    baseDecision.requiresApproval = roleCapabilityAccessFailure === 'CROSS_ROLE_REQUEST_REQUIRED';
    return baseDecision;
  }

  // 10. Tool Binding: somente bindings explicitamente comprovados no repositório
  // saem como disponíveis. Nome conceitual não é evidência executável.
  const toolBinding = getVerifiedToolBinding(capability.code);
  baseDecision.toolCode = toolBinding?.toolCode ?? null;
  baseDecision.toolAvailable = toolBinding?.available ?? false;
  baseDecision.bindingVerification = toolBinding?.verification ?? null;
  baseDecision.bindingEvidencePath = toolBinding?.evidencePath ?? null;

  if (!toolBinding) {
    baseDecision.reason = 'TOOL_UNAVAILABLE';
    return baseDecision;
  }

  if (!toolBinding.available) {
    if (toolBinding.reason === 'SOURCE_REQUIRED') {
      baseDecision.reason = 'SOURCE_REQUIRED';
    } else if (toolBinding.reason === 'FUTURE_TOOL') {
      baseDecision.reason = 'FUTURE_TOOL';
    } else {
      baseDecision.reason = 'TOOL_UNAVAILABLE';
    }
    return baseDecision;
  }

  // 11. Risco e Requisito de Aprovação
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

  // 12. Todas as camadas de segurança autorizaram.
  baseDecision.allowed = true;
  baseDecision.reason = 'PERMITTED';
  baseDecision.requiresApproval = false;

  return baseDecision;
}
