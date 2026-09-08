import type { AgentAccessLevel, CapabilityActionType, CapabilityRiskLevel } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { hasRequiredRole } from '../../../lib/auth/authorization.js';
import { getToolBinding } from '../config/tool-bindings.js';

/**
 * Motor de autorização canônico do Capability & Permission Engine (PROMPT 3). Responde:
 * "Este usuário pode usar este agente para executar esta capability, com qual risco, e precisa
 * de aprovação?" — equação completa (ver comentário em prisma/schema.prisma):
 *
 *   UserRole ∩ JobRole ∩ RoleAgentGrant ∩ AgentCapabilityGrant ∩ RoleCapabilityGrant ∩
 *   ToolBinding VERIFIED ∩ policy/approval = PERMIT
 *
 * FAIL CLOSED em cada etapa: qualquer coisa desconhecida/ausente/inativa nega — nunca um "default
 * permitido". `ADMIN` (UserRole) não pula nenhuma etapa funcional (JobRole/RoleAgentGrant/
 * AgentCapabilityGrant/RoleCapabilityGrant/tool availability/approval) — ele só afeta a etapa 7
 * (patamar mínimo de UserRole por tipo de ação), estruturalmente, nunca por um `if (role ===
 * 'ADMIN') return allow` que pularia as demais etapas.
 *
 * Esta função nunca executa nada — só decide. Executar é responsabilidade do AgentRuntime
 * (PROMPT 4, ainda não implementado); esta onda termina em "pode executar? por quê?", nunca em
 * "executou".
 */

/** Razões estáveis — nunca renomeadas livremente (consumidas por testes e, no futuro, por UI). */
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

export interface CapabilityAuthorizationActor {
  userId: string;
  organizationId: string;
  /** `UserRole` como string — sempre vindo da sessão autenticada, nunca do body da requisição. */
  userRole: string;
}

export interface AuthorizeCapabilityInput {
  actor: CapabilityAuthorizationActor;
  agentCode: string;
  capabilityCode: string;
  /** Aceito pela assinatura (ver contrato do prompt da onda) mas não usado para decisão nesta
   *  onda — escopo de recurso real (ex.: "só o lead X") é Cross-Role/Temporary Grant (PROMPT 7).
   *  Nunca usado para sobrescrever `actor` — resource é dado de negócio, nunca identidade. */
  resource?: Record<string, unknown>;
}

export interface CapabilityDecisionRef {
  id: string;
  code: string;
  name: string;
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
  actor: CapabilityAuthorizationActor;
  agent: CapabilityDecisionRef | null;
  capability: CapabilityDecisionRef | null;
  resource: Record<string, unknown> | null;
}

/** Patamar mínimo de `UserRole` por tipo de ação (seção "USERROLE POLICY" do prompt da onda) —
 *  reusa `hasRequiredRole`/`ROLE_HIERARCHY` de `authorization.ts` (fonte única de RBAC), nunca um
 *  terceiro sistema de permissão paralelo. */
const MIN_ROLE_BY_ACTION_TYPE: Record<CapabilityActionType, readonly string[]> = {
  READ: ['VISUALIZADOR'],
  EXECUTE: ['SDR'],
  WRITE: ['SDR'],
  ADMIN: ['GESTOR'],
};

function deny(
  reason: CapabilityDecisionReason,
  actor: CapabilityAuthorizationActor,
  overrides: Partial<CapabilityDecision> = {},
): CapabilityDecision {
  return {
    allowed: false,
    reason,
    requiresApproval: false,
    riskLevel: null,
    accessLevel: null,
    toolCode: null,
    toolAvailable: false,
    bindingVerification: null,
    bindingEvidencePath: null,
    actor,
    agent: null,
    capability: null,
    resource: null,
    ...overrides,
  };
}

export async function authorizeCapability(
  input: AuthorizeCapabilityInput,
): Promise<CapabilityDecision> {
  const { actor } = input;
  const resource = input.resource ?? null;

  // 1. Actor autenticado — defensivo (a rota já garante isto via `authenticateToken`/`requireTenant`;
  // esta função nunca confia em dado vindo do body para identidade, só no `actor` já resolvido).
  if (!actor.userId || !actor.organizationId || !actor.userRole) {
    return deny('NO_JOB_ROLE', actor, { resource });
  }

  // 2. JobRole principal ativo.
  const primaryUserJobRole = await prisma.userJobRole.findFirst({
    where: {
      organizationId: actor.organizationId,
      userId: actor.userId,
      isPrimary: true,
      isActive: true,
    },
    select: { jobRole: { select: { id: true, code: true, isActive: true } } },
  });
  if (!primaryUserJobRole) {
    return deny('NO_JOB_ROLE', actor, { resource });
  }
  const jobRole = primaryUserJobRole.jobRole;
  if (!jobRole.isActive) {
    return deny('INACTIVE_JOB_ROLE', actor, { resource });
  }

  // 3. AgentDefinition ativo.
  const agent = await prisma.agentDefinition.findUnique({
    where: { code: input.agentCode },
    select: { id: true, code: true, name: true, isActive: true },
  });
  if (!agent) {
    return deny('UNKNOWN_AGENT', actor, { resource });
  }
  const agentRef: CapabilityDecisionRef = { id: agent.id, code: agent.code, name: agent.name };
  if (!agent.isActive) {
    return deny('INACTIVE_AGENT', actor, { agent: agentRef, resource });
  }

  // 4. RoleAgentGrant.
  const roleAgentGrant = await prisma.roleAgentGrant.findUnique({
    where: { jobRoleId_agentDefinitionId: { jobRoleId: jobRole.id, agentDefinitionId: agent.id } },
  });
  if (!roleAgentGrant?.isActive) {
    return deny('AGENT_NOT_GRANTED_TO_ROLE', actor, { agent: agentRef, resource });
  }

  // 5. CapabilityDefinition ativa.
  const capability = await prisma.capabilityDefinition.findUnique({
    where: { code: input.capabilityCode },
  });
  if (!capability) {
    return deny('UNKNOWN_CAPABILITY', actor, { agent: agentRef, resource });
  }
  const capabilityRef: CapabilityDecisionRef = {
    id: capability.id,
    code: capability.code,
    name: capability.name,
  };
  if (!capability.isActive) {
    return deny('INACTIVE_CAPABILITY', actor, {
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      resource,
    });
  }

  // 6. Access level do AGENTE (RoleAgentGrant.accessLevel — nível concedido ao cargo para usar
  // este agente, distinto do nível concedido para esta capability especificamente, etapa 10).
  if (roleAgentGrant.accessLevel === 'DISCOVER') {
    return deny('DISCOVER_ONLY', actor, {
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      resource,
    });
  }
  if (roleAgentGrant.accessLevel === 'REQUEST') {
    return deny('CROSS_ROLE_REQUEST_REQUIRED', actor, {
      requiresApproval: true,
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      resource,
    });
  }
  if (roleAgentGrant.accessLevel === 'READ' && capability.actionType !== 'READ') {
    return deny('READ_ONLY_ACCESS', actor, {
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      resource,
    });
  }

  // 7. UserRole policy — patamar mínimo por tipo de ação. ADMIN passa aqui pelo mesmo cálculo de
  // qualquer outro papel (`hasRequiredRole`), nunca por um atalho — as etapas 8-12 continuam
  // avaliadas normalmente mesmo para ADMIN.
  if (!hasRequiredRole(actor.userRole, MIN_ROLE_BY_ACTION_TYPE[capability.actionType])) {
    return deny('USER_ROLE_FORBIDDEN', actor, {
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      resource,
    });
  }

  // 8. AgentCapabilityGrant — o agente foi desenhado para esta capability?
  const agentCapabilityGrant = await prisma.agentCapabilityGrant.findUnique({
    where: {
      agentDefinitionId_capabilityDefinitionId: {
        agentDefinitionId: agent.id,
        capabilityDefinitionId: capability.id,
      },
    },
  });
  if (!agentCapabilityGrant?.isActive) {
    return deny('CAPABILITY_NOT_GRANTED_TO_AGENT', actor, {
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      resource,
    });
  }

  // 9. RoleCapabilityGrant — o cargo pode permitir esta capability?
  const roleCapabilityGrant = await prisma.roleCapabilityGrant.findUnique({
    where: {
      jobRoleId_capabilityDefinitionId: {
        jobRoleId: jobRole.id,
        capabilityDefinitionId: capability.id,
      },
    },
  });
  if (!roleCapabilityGrant?.isActive) {
    return deny('CAPABILITY_NOT_GRANTED_TO_ROLE', actor, {
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      resource,
    });
  }

  // 10. Access level do CARGO para esta capability (distinto da etapa 6 — aqui é o grant
  // específico de capability, não o grant do agente como um todo).
  if (roleCapabilityGrant.accessLevel === 'DISCOVER') {
    return deny('DISCOVER_ONLY', actor, {
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      accessLevel: roleCapabilityGrant.accessLevel,
      resource,
    });
  }
  if (roleCapabilityGrant.accessLevel === 'REQUEST') {
    return deny('CROSS_ROLE_REQUEST_REQUIRED', actor, {
      requiresApproval: true,
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      accessLevel: roleCapabilityGrant.accessLevel,
      resource,
    });
  }
  if (roleCapabilityGrant.accessLevel === 'READ' && capability.actionType !== 'READ') {
    return deny('READ_ONLY_ACCESS', actor, {
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      accessLevel: roleCapabilityGrant.accessLevel,
      resource,
    });
  }

  // 11. ToolBinding VERIFIED — nome conceitual não é evidência (ver tool-bindings.ts). Só binding
  // VERIFIED + available pode seguir para execução real.
  const binding = getToolBinding(capability.code);
  if (binding?.verification !== 'VERIFIED' || !binding.available) {
    const bindingReason: CapabilityDecisionReason =
      binding?.reason === 'SOURCE_REQUIRED'
        ? 'SOURCE_REQUIRED'
        : binding?.reason === 'FUTURE_TOOL'
          ? 'FUTURE_TOOL'
          : 'TOOL_UNAVAILABLE';
    return deny(bindingReason, actor, {
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      accessLevel: roleCapabilityGrant.accessLevel,
      toolCode: binding?.toolCode ?? null,
      toolAvailable: false,
      bindingVerification: binding?.verification ?? null,
      bindingEvidencePath: binding?.evidencePath ?? null,
      resource,
    });
  }

  // 12. Risco/aprovação — HIGH/CRITICAL sempre exigem aprovação humana; nunca executam
  // automaticamente nesta onda (não existe ainda fluxo de aprovação real — isso é o PROMPT 7).
  const requiresApproval =
    roleCapabilityGrant.requiresApproval ||
    capability.requiresApprovalByDefault ||
    capability.riskLevel === 'HIGH' ||
    capability.riskLevel === 'CRITICAL';
  if (requiresApproval) {
    return deny('APPROVAL_REQUIRED', actor, {
      requiresApproval: true,
      agent: agentRef,
      capability: capabilityRef,
      riskLevel: capability.riskLevel,
      accessLevel: roleCapabilityGrant.accessLevel,
      toolCode: binding.toolCode,
      toolAvailable: true,
      bindingVerification: binding.verification,
      bindingEvidencePath: binding.evidencePath,
      resource,
    });
  }

  // 13. Decisão final — PERMIT.
  return {
    allowed: true,
    reason: 'PERMITTED',
    requiresApproval: false,
    riskLevel: capability.riskLevel,
    accessLevel: roleCapabilityGrant.accessLevel,
    toolCode: binding.toolCode,
    toolAvailable: true,
    bindingVerification: binding.verification,
    bindingEvidencePath: binding.evidencePath,
    actor,
    agent: agentRef,
    capability: capabilityRef,
    resource,
  };
}
