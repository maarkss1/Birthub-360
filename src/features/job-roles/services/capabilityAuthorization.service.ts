import type { AgentAccessLevel, CapabilityActionType, CapabilityRiskLevel } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { hasRequiredRole } from '../../../lib/auth/authorization.js';
import { getToolBinding } from '../config/tool-bindings.js';

/** Canonicaliza um `resource` (ordena chaves recursivamente) para comparar por igualdade
 *  estrutural exata contra o `resource` aprovado de um `TemporaryCapabilityGrant` (PROMPT 7) —
 *  nunca um match parcial que alargaria o escopo além do que foi aprovado. `{}`/`null`/`undefined`
 *  canonicalizam para a mesma chave (nenhum resource informado). */
function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalizeJson(obj[key]);
        return acc;
      }, {});
  }
  return value;
}
function resourceKey(resource: Record<string, unknown> | null | undefined): string {
  return JSON.stringify(canonicalizeJson(resource ?? {}));
}

/**
 * Cross-Role Authorization (PROMPT 7) — um `TemporaryCapabilityGrant` ativo (não expirado, não
 * revogado) para este `organizationId`/`granteeId`/`capabilityDefinitionId`, com o MESMO
 * `resource` (comparação estrutural exata via `resourceKey`), é a ÚNICA coisa que
 * `authorizeCapability` aceita como substituto de um gate de "REQUEST"/"aprovação necessária" —
 * nunca de um grant estrutural ausente. Chamado nos 3 pontos exatos onde o motor já sinalizava
 * `CROSS_ROLE_REQUEST_REQUIRED`/`APPROVAL_REQUIRED` antes desta onda (ver comentários inline nas
 * etapas 6, 10 e 12 abaixo) — em nenhum outro ponto.
 */
async function findActiveTemporaryGrant(
  organizationId: string,
  granteeId: string,
  capabilityDefinitionId: string,
  resource: Record<string, unknown> | null | undefined,
): Promise<{ id: string } | null> {
  const candidates = await prisma.temporaryCapabilityGrant.findMany({
    where: {
      organizationId,
      granteeId,
      capabilityDefinitionId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, resource: true },
  });
  const key = resourceKey(resource);
  const match = candidates.find((c) => resourceKey(c.resource as Record<string, unknown>) === key);
  return match ? { id: match.id } : null;
}

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
  /** Preenchido quando um `TemporaryCapabilityGrant` (PROMPT 7) foi o que permitiu passar por um
   *  gate que de outra forma teria negado (`CROSS_ROLE_REQUEST_REQUIRED`/`APPROVAL_REQUIRED`) —
   *  `null` quando a decisão não dependeu de nenhum grant temporário, mesmo quando `allowed`. */
  temporaryGrantId: string | null;
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
    temporaryGrantId: null,
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

  // Cross-Role Authorization (PROMPT 7) — memoiza a única consulta de `TemporaryCapabilityGrant`
  // desta chamada (reusada pelas etapas 6, 10 e 12 abaixo; nenhuma delas dispara uma segunda
  // consulta se a primeira já resolveu). Só considerado nos gates "REQUEST"/"aprovação
  // necessária" — nunca substitui `AGENT_NOT_GRANTED_TO_ROLE`/`CAPABILITY_NOT_GRANTED_TO_*`
  // (grant estrutural ausente continua fail-closed sem exceção nesta função).
  const capabilityId = capability.id;
  let temporaryGrantId: string | null = null;
  let temporaryGrantChecked = false;
  async function resolveTemporaryGrant(): Promise<string | null> {
    if (!temporaryGrantChecked) {
      temporaryGrantChecked = true;
      const grant = await findActiveTemporaryGrant(
        actor.organizationId,
        actor.userId,
        capabilityId,
        resource,
      );
      temporaryGrantId = grant?.id ?? null;
    }
    return temporaryGrantId;
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
  if (roleAgentGrant.accessLevel === 'REQUEST' && !(await resolveTemporaryGrant())) {
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
  if (roleCapabilityGrant.accessLevel === 'REQUEST' && !(await resolveTemporaryGrant())) {
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
  if (requiresApproval && !(await resolveTemporaryGrant())) {
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

  // 13. Decisão final — PERMIT (via grant temporário quando alguma etapa 6/10/12 acima só passou
  // por causa de `resolveTemporaryGrant()` — `temporaryGrantId` reflete isso; `null` quando a
  // permissão veio inteiramente dos grants permanentes de sempre).
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
    temporaryGrantId,
    actor,
    agent: agentRef,
    capability: capabilityRef,
    resource,
  };
}
