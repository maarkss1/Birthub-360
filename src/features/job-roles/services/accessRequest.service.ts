// PROMPT 7 — Cross-Role Authorization + Aprovações.
//
// Fluxo (texto do prompt da onda): requester -> policy -> aprovação automática permitida OU
// humano -> grant temporário -> AgentRuntime -> expiração/revogação -> auditoria.
//
// Este service NUNCA troca `JobRole`/`UserRole` do requester — só cria uma autoridade adicional,
// temporária e escopada (`TemporaryCapabilityGrant`), consultada por
// `capabilityAuthorization.service.ts` nos pontos onde o motor já sinalizava
// `CROSS_ROLE_REQUEST_REQUIRED`/`APPROVAL_REQUIRED`. Nunca decide autorização de execução aqui —
// isso continua 100% em `authorizeCapability`.
import type { AccessRequestCategory, AccessRequestStatus } from '@prisma/client';
import { AuditService } from '../../../lib/audit/audit.service.js';
import { prisma } from '../../../lib/prisma.js';
import {
  getAccessRequestCategory,
  getApprovalPolicy,
  isEligibleApprover,
  resolveAutoApproval,
} from '../config/access-request-policy.js';
import { getCapabilityDefinitionByCode } from './capability.service.js';
import { authorizeCapability } from './capabilityAuthorization.service.js';
import { getPrimaryActiveJobRoleForUser } from './jobRole.service.js';
import { selectAgentForCapability } from './roleSupervisor.service.js';

export class AccessRequestServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

/** Capability canônica usada para autorizar o próprio ATO de abrir um `AccessRequest` — ver
 *  `agent.request_cross_role` em `capability-catalog.ts`, `FUTURE_TOOL` até esta onda. Um usuário
 *  cujo `JobRole` não recebeu esta capability (via `RoleCapabilityGrant`, mesmo motor de sempre)
 *  não pode pedir acesso cruzado a NADA — fail closed também aqui, nunca uma segunda porta sem
 *  passar pelo Capability Engine. */
const REQUEST_CAPABILITY_CODE = 'agent.request_cross_role';

/** Janela padrão de validade de um grant temporário — a MATRIZ do prompt da onda não define um
 *  número explícito; 24h é o padrão (renovável só abrindo um novo `AccessRequest`, nunca estendido
 *  in-place), com teto de 7 dias mesmo que o aprovador peça mais (nunca um grant "quase
 *  permanente" por engano de input). */
const DEFAULT_GRANT_HOURS = 24;
const MAX_GRANT_HOURS = 24 * 7;

export interface AccessRequestActor {
  userId: string;
  organizationId: string;
  userRole: string;
}

function isPlainResourceScope(resource: unknown): resource is Record<string, unknown> {
  return (
    typeof resource === 'object' &&
    resource !== null &&
    !Array.isArray(resource) &&
    Object.keys(resource).length > 0
  );
}

async function requireCapabilityToRequest(actor: AccessRequestActor, jobRoleId: string) {
  const agent = await selectAgentForCapability({
    jobRoleId,
    capabilityCode: REQUEST_CAPABILITY_CODE,
    allowedAgentCategories: [],
  });
  if (!agent) {
    throw new AccessRequestServiceError(
      'Nenhum agente do seu cargo pode solicitar acesso cruzado.',
      'CANNOT_REQUEST_CROSS_ROLE',
      403,
    );
  }
  const decision = await authorizeCapability({
    actor,
    agentCode: agent.code,
    capabilityCode: REQUEST_CAPABILITY_CODE,
  });
  if (!decision.allowed) {
    throw new AccessRequestServiceError(
      `Seu cargo não pode solicitar acesso cruzado (${decision.reason}).`,
      'CANNOT_REQUEST_CROSS_ROLE',
      403,
    );
  }
}

export interface CreateAccessRequestInput {
  actor: AccessRequestActor;
  capabilityCode: string;
  resource: Record<string, unknown>;
  reason: string;
}

const ACCESS_REQUEST_SELECT = {
  id: true,
  organizationId: true,
  requesterId: true,
  requesterRole: true,
  requesterJobRoleCode: true,
  capabilityDefinitionId: true,
  category: true,
  resource: true,
  reason: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  capabilityDefinition: { select: { id: true, code: true, name: true, riskLevel: true } },
  grant: {
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      revokedBy: true,
      revokedReason: true,
      createdAt: true,
    },
  },
  decisions: {
    select: {
      id: true,
      approverId: true,
      approverRole: true,
      outcome: true,
      reasonCode: true,
      notes: true,
      decidedAt: true,
    },
    orderBy: { decidedAt: 'asc' as const },
  },
} as const;

type AccessRequestRow = NonNullable<
  Awaited<
    ReturnType<typeof prisma.accessRequest.findFirst<{ select: typeof ACCESS_REQUEST_SELECT }>>
  >
>;

export interface AccessRequestDto {
  id: string;
  requesterId: string;
  requesterRole: string;
  requesterJobRoleCode: string | null;
  capability: { id: string; code: string; name: string; riskLevel: string };
  category: AccessRequestCategory;
  resource: Record<string, unknown>;
  reason: string;
  status: AccessRequestStatus;
  /** Estado computado no momento da leitura — nunca gravado de volta em `status` (só o `grant`
   *  real, via `expiresAt`/`revokedAt`, decide se um `APPROVED` ainda está ativo agora). Evita um
   *  job de expiração: "está ativo?" é sempre calculado, nunca armazenado como verdade separada. */
  effectiveStatus: AccessRequestStatus;
  approvalPolicy: {
    label: string;
    minApproverUserRole: string;
    eligibleApproverJobRoles: string[];
  };
  grant: {
    id: string;
    expiresAt: string;
    revokedAt: string | null;
    revokedBy: string | null;
    revokedReason: string | null;
  } | null;
  decisions: Array<{
    id: string;
    approverId: string;
    approverRole: string;
    outcome: string;
    reasonCode: string;
    notes: string | null;
    decidedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

function computeEffectiveStatus(row: AccessRequestRow): AccessRequestStatus {
  if (row.status !== 'APPROVED') return row.status;
  const grant = row.grant;
  if (!grant) return row.status;
  if (grant.revokedAt) return 'REVOKED';
  if (grant.expiresAt.getTime() <= Date.now()) return 'EXPIRED';
  return 'APPROVED';
}

function toDto(row: AccessRequestRow): AccessRequestDto {
  const policy = getApprovalPolicy(row.category);
  return {
    id: row.id,
    requesterId: row.requesterId,
    requesterRole: row.requesterRole,
    requesterJobRoleCode: row.requesterJobRoleCode,
    capability: row.capabilityDefinition,
    category: row.category,
    resource: row.resource as Record<string, unknown>,
    reason: row.reason,
    status: row.status,
    effectiveStatus: computeEffectiveStatus(row),
    approvalPolicy: {
      label: policy.label,
      minApproverUserRole: policy.minApproverUserRole,
      eligibleApproverJobRoles: [...(policy.eligibleApproverJobRoles ?? [])],
    },
    grant: row.grant
      ? {
          id: row.grant.id,
          expiresAt: row.grant.expiresAt.toISOString(),
          revokedAt: row.grant.revokedAt?.toISOString() ?? null,
          revokedBy: row.grant.revokedBy,
          revokedReason: row.grant.revokedReason,
        }
      : null,
    decisions: row.decisions.map((d) => ({
      id: d.id,
      approverId: d.approverId,
      approverRole: d.approverRole,
      outcome: d.outcome,
      reasonCode: d.reasonCode,
      notes: d.notes,
      decidedAt: d.decidedAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadAccessRequestOrThrow(
  organizationId: string,
  accessRequestId: string,
): Promise<AccessRequestRow> {
  const row = await prisma.accessRequest.findFirst({
    where: { id: accessRequestId, organizationId },
    select: ACCESS_REQUEST_SELECT,
  });
  if (!row) {
    throw new AccessRequestServiceError('Pedido de acesso não encontrado.', 'NOT_FOUND', 404);
  }
  return row;
}

function grantExpiresAt(requestedHours?: number): Date {
  const hours = Math.min(Math.max(requestedHours ?? DEFAULT_GRANT_HOURS, 1), MAX_GRANT_HOURS);
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function grantTemporaryCapability(params: {
  organizationId: string;
  accessRequestId: string;
  granteeId: string;
  capabilityDefinitionId: string;
  resource: Record<string, unknown>;
  expiresInHours?: number;
}) {
  await prisma.temporaryCapabilityGrant.create({
    data: {
      organizationId: params.organizationId,
      accessRequestId: params.accessRequestId,
      granteeId: params.granteeId,
      capabilityDefinitionId: params.capabilityDefinitionId,
      resource: params.resource as unknown as object,
      expiresAt: grantExpiresAt(params.expiresInHours),
    },
  });
}

export async function createAccessRequest(
  input: CreateAccessRequestInput,
): Promise<AccessRequestDto> {
  const { actor } = input;
  const capability = await getCapabilityDefinitionByCode(input.capabilityCode);
  if (!capability?.isActive) {
    throw new AccessRequestServiceError(
      'Capability desconhecida ou inativa.',
      'UNKNOWN_CAPABILITY',
      404,
    );
  }
  const category = getAccessRequestCategory(capability.code);
  if (!category) {
    // Defensivo: `access-request-policy.ts` falha em import-time se algum código do catálogo
    // ficar sem categoria — nunca deveria acontecer em runtime.
    throw new AccessRequestServiceError(
      'Capability sem categoria de aprovação mapeada.',
      'NO_APPROVAL_CATEGORY',
      500,
    );
  }
  if (!isPlainResourceScope(input.resource)) {
    throw new AccessRequestServiceError(
      'Todo AccessRequest precisa de um resource escopado (ex.: { type, id }) — nunca um pedido sem limite.',
      'RESOURCE_REQUIRED',
      400,
    );
  }
  if (!input.reason.trim()) {
    throw new AccessRequestServiceError('Informe o motivo do pedido.', 'REASON_REQUIRED', 400);
  }

  const primaryJobRole = await getPrimaryActiveJobRoleForUser(actor.organizationId, actor.userId);
  if (!primaryJobRole) {
    throw new AccessRequestServiceError('Usuário sem cargo (JobRole) ativo.', 'NO_JOB_ROLE', 409);
  }

  await requireCapabilityToRequest(actor, primaryJobRole.id);

  const created = await prisma.accessRequest.create({
    data: {
      organizationId: actor.organizationId,
      requesterId: actor.userId,
      requesterRole: actor.userRole,
      requesterJobRoleCode: primaryJobRole.code,
      capabilityDefinitionId: capability.id,
      category,
      resource: input.resource as unknown as object,
      reason: input.reason.trim(),
      status: 'PENDING',
    },
    select: { id: true },
  });

  await AuditService.log({
    action: 'PERMISSION_CHANGE',
    entity: 'AccessRequest',
    entityId: created.id,
    actorId: actor.userId,
    tenantId: actor.organizationId,
    afterState: { status: 'PENDING', category, capabilityCode: capability.code },
  });

  if (resolveAutoApproval(category, capability.riskLevel)) {
    await prisma.approvalDecision.create({
      data: {
        organizationId: actor.organizationId,
        accessRequestId: created.id,
        approverId: 'SYSTEM',
        approverRole: 'SYSTEM',
        outcome: 'APPROVED',
        reasonCode: 'AUTO_APPROVED_READ_ONLY',
      },
    });
    await grantTemporaryCapability({
      organizationId: actor.organizationId,
      accessRequestId: created.id,
      granteeId: actor.userId,
      capabilityDefinitionId: capability.id,
      resource: input.resource,
    });
    await prisma.accessRequest.update({ where: { id: created.id }, data: { status: 'APPROVED' } });
    await AuditService.log({
      action: 'PERMISSION_CHANGE',
      entity: 'AccessRequest',
      entityId: created.id,
      actorId: 'SYSTEM',
      tenantId: actor.organizationId,
      afterState: { status: 'APPROVED', reasonCode: 'AUTO_APPROVED_READ_ONLY' },
    });
  }

  return toDto(await loadAccessRequestOrThrow(actor.organizationId, created.id));
}

export interface DecideAccessRequestInput {
  organizationId: string;
  accessRequestId: string;
  approverId: string;
  approverRole: string;
  outcome: 'APPROVED' | 'DENIED';
  notes?: string;
  expiresInHours?: number;
}

export async function decideAccessRequest(
  input: DecideAccessRequestInput,
): Promise<AccessRequestDto> {
  const row = await loadAccessRequestOrThrow(input.organizationId, input.accessRequestId);
  if (row.status !== 'PENDING') {
    throw new AccessRequestServiceError(
      `Este pedido já foi decidido (status atual: ${row.status}).`,
      'INVALID_STATE',
      409,
    );
  }

  // Sem autoaprovação — regra explícita do prompt da onda. Rejeita a TENTATIVA sem mutar o
  // pedido: continua PENDING para um aprovador de verdade decidir depois.
  if (input.approverId === row.requesterId) {
    await AuditService.log({
      action: 'PERMISSION_CHANGE',
      entity: 'AccessRequest',
      entityId: row.id,
      actorId: input.approverId,
      tenantId: input.organizationId,
      afterState: { rejectedAttempt: 'SELF_APPROVAL_DENIED' },
    });
    throw new AccessRequestServiceError(
      'Autoaprovação não é permitida — o requester nunca pode decidir o próprio pedido.',
      'SELF_APPROVAL_DENIED',
      403,
    );
  }

  const approverJobRole = await getPrimaryActiveJobRoleForUser(
    input.organizationId,
    input.approverId,
  );
  const eligible = isEligibleApprover(
    row.category,
    input.approverRole,
    approverJobRole?.code ?? null,
  );
  if (!eligible) {
    await AuditService.log({
      action: 'PERMISSION_CHANGE',
      entity: 'AccessRequest',
      entityId: row.id,
      actorId: input.approverId,
      tenantId: input.organizationId,
      afterState: {
        rejectedAttempt: 'APPROVER_NOT_ELIGIBLE',
        approverRole: input.approverRole,
        approverJobRoleCode: approverJobRole?.code ?? null,
      },
    });
    throw new AccessRequestServiceError(
      'Você não atende a política de aprovação desta categoria.',
      'APPROVER_NOT_ELIGIBLE',
      403,
    );
  }

  await prisma.approvalDecision.create({
    data: {
      organizationId: input.organizationId,
      accessRequestId: row.id,
      approverId: input.approverId,
      approverRole: input.approverRole,
      outcome: input.outcome,
      reasonCode:
        input.outcome === 'APPROVED' ? 'APPROVED_ELIGIBLE_APPROVER' : 'DENIED_BY_APPROVER',
      notes: input.notes,
    },
  });
  await prisma.accessRequest.update({ where: { id: row.id }, data: { status: input.outcome } });

  if (input.outcome === 'APPROVED') {
    await grantTemporaryCapability({
      organizationId: input.organizationId,
      accessRequestId: row.id,
      granteeId: row.requesterId,
      capabilityDefinitionId: row.capabilityDefinitionId,
      resource: row.resource as Record<string, unknown>,
      expiresInHours: input.expiresInHours,
    });
  }

  await AuditService.log({
    action: 'PERMISSION_CHANGE',
    entity: 'AccessRequest',
    entityId: row.id,
    actorId: input.approverId,
    tenantId: input.organizationId,
    afterState: { status: input.outcome },
  });

  return toDto(await loadAccessRequestOrThrow(input.organizationId, row.id));
}

export async function cancelAccessRequest(params: {
  organizationId: string;
  requesterId: string;
  requesterRole: string;
  accessRequestId: string;
}): Promise<AccessRequestDto> {
  const row = await loadAccessRequestOrThrow(params.organizationId, params.accessRequestId);
  if (row.status !== 'PENDING') {
    throw new AccessRequestServiceError(
      `Só é possível cancelar um pedido pendente (status atual: ${row.status}).`,
      'INVALID_STATE',
      409,
    );
  }
  const isOwner = row.requesterId === params.requesterId;
  const isAdmin = params.requesterRole === 'ADMIN';
  if (!isOwner && !isAdmin) {
    throw new AccessRequestServiceError(
      'Só o próprio requester (ou um ADMIN) pode cancelar este pedido.',
      'FORBIDDEN',
      403,
    );
  }
  await prisma.accessRequest.update({ where: { id: row.id }, data: { status: 'CANCELLED' } });
  await AuditService.log({
    action: 'PERMISSION_CHANGE',
    entity: 'AccessRequest',
    entityId: row.id,
    actorId: params.requesterId,
    tenantId: params.organizationId,
    afterState: { status: 'CANCELLED' },
  });
  return toDto(await loadAccessRequestOrThrow(params.organizationId, row.id));
}

export async function revokeTemporaryCapabilityGrant(params: {
  organizationId: string;
  revokerId: string;
  revokerRole: string;
  grantId: string;
  reason: string;
}): Promise<void> {
  const grant = await prisma.temporaryCapabilityGrant.findFirst({
    where: { id: params.grantId, organizationId: params.organizationId },
    select: {
      id: true,
      revokedAt: true,
      expiresAt: true,
      accessRequest: { select: { category: true } },
    },
  });
  if (!grant) {
    throw new AccessRequestServiceError('Grant temporário não encontrado.', 'NOT_FOUND', 404);
  }
  if (grant.revokedAt) {
    throw new AccessRequestServiceError('Este grant já foi revogado.', 'ALREADY_REVOKED', 409);
  }
  if (grant.expiresAt.getTime() <= Date.now()) {
    throw new AccessRequestServiceError('Este grant já expirou.', 'ALREADY_EXPIRED', 409);
  }
  const eligible =
    params.revokerRole === 'ADMIN' ||
    isEligibleApprover(
      grant.accessRequest.category,
      params.revokerRole,
      (await getPrimaryActiveJobRoleForUser(params.organizationId, params.revokerId))?.code ?? null,
    );
  if (!eligible) {
    throw new AccessRequestServiceError(
      'Você não pode revogar este grant — não atende a política de aprovação da categoria.',
      'FORBIDDEN',
      403,
    );
  }
  await prisma.temporaryCapabilityGrant.update({
    where: { id: grant.id },
    data: { revokedAt: new Date(), revokedBy: params.revokerId, revokedReason: params.reason },
  });
  await AuditService.log({
    action: 'PERMISSION_CHANGE',
    entity: 'TemporaryCapabilityGrant',
    entityId: grant.id,
    actorId: params.revokerId,
    tenantId: params.organizationId,
    afterState: { revoked: true, reason: params.reason },
  });
}

export async function listMyAccessRequests(
  organizationId: string,
  requesterId: string,
): Promise<AccessRequestDto[]> {
  const rows = await prisma.accessRequest.findMany({
    where: { organizationId, requesterId },
    select: ACCESS_REQUEST_SELECT,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDto);
}

/** Fila de aprovação: pedidos `PENDING` de OUTRAS pessoas cuja categoria este aprovador atende —
 *  nunca inclui os próprios pedidos do aprovador (autoaprovação já é impossível em
 *  `decideAccessRequest`, mas nem faz sentido aparecer na fila dele). */
export async function listPendingApprovalsForApprover(
  organizationId: string,
  approverId: string,
  approverRole: string,
): Promise<AccessRequestDto[]> {
  const approverJobRole = await getPrimaryActiveJobRoleForUser(organizationId, approverId);
  const rows = await prisma.accessRequest.findMany({
    where: { organizationId, status: 'PENDING', requesterId: { not: approverId } },
    select: ACCESS_REQUEST_SELECT,
    orderBy: { createdAt: 'asc' },
  });
  return rows
    .filter((row) => isEligibleApprover(row.category, approverRole, approverJobRole?.code ?? null))
    .map(toDto);
}
