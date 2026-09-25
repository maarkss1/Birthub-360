// PROMPT 8 — Agent Bus + Handoffs.
//
// Comunicação agente<->agente e cargo<->cargo com contrato estruturado (`AgentHandoffMessage`).
//
// O Bus NUNCA decide negócio — ele só transporta, valida estrutura, autoriza e audita:
//   - autoriza reusando 100% o Capability Engine (`authorizeCapability`, PROMPT 3) e os
//     `TemporaryCapabilityGrant` do Cross-Role Authorization (PROMPT 7) — nunca um segundo motor
//     de autorização paralelo, nunca uma segunda tabela de grant;
//   - entrega ao AgentRuntime já existente (`runAgentExecution`, PROMPT 4) — nunca duplica o motor
//     de execução; `correlationId: handoffId` reusa a idempotência JÁ implementada lá (nenhuma
//     segunda execução real, mesmo que `acceptHandoff` seja chamado mais de uma vez).
import type { HandoffPriority, HandoffStatus } from '@prisma/client';
import { AuditService } from '../../../lib/audit/audit.service.js';
import { prisma } from '../../../lib/prisma.js';
import {
  DEFAULT_HANDOFF_TTL_MINUTES,
  isHandoffLoop,
  MAX_HANDOFF_DEPTH,
  MAX_HANDOFF_STEPS_PER_MISSION,
} from '../config/agent-bus-policy.js';
import { runAgentExecution } from './agentRuntime.service.js';
import { getCapabilityDefinitionByCode } from './capability.service.js';
import { authorizeCapability } from './capabilityAuthorization.service.js';
import { getJobRoleByCode, getPrimaryActiveJobRoleForUser } from './jobRole.service.js';

export class AgentBusServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

export interface AgentBusActor {
  userId: string;
  organizationId: string;
  userRole: string;
}

/** Evidência com PROVENANCE obrigatória (regra do prompt da onda) — nunca um texto solto sem
 *  origem rastreável. */
export interface EvidenceItem {
  sourceAgent: string;
  sourceExecutionId?: string;
  capabilityCode?: string;
  summary: string;
  recordedAt: string;
}

export interface PublishHandoffInput {
  actor: AgentBusActor;
  missionId: string;
  conversationId: string;
  fromAgent: string;
  fromRole: string;
  toAgent: string;
  toRole: string;
  requestType: string;
  requestedCapability: string;
  resourceScope?: Record<string, unknown>;
  knownFacts?: Record<string, unknown>[];
  evidence?: EvidenceItem[];
  risks?: Record<string, unknown>[];
  priority?: HandoffPriority;
  idempotencyKey?: string;
  parentHandoffId?: string;
}

const HANDOFF_SELECT = {
  id: true,
  organizationId: true,
  missionId: true,
  conversationId: true,
  fromAgent: true,
  fromRole: true,
  toAgent: true,
  toRole: true,
  requestType: true,
  requestedCapability: true,
  resourceScope: true,
  knownFacts: true,
  evidence: true,
  risks: true,
  authorizationContext: true,
  priority: true,
  status: true,
  response: true,
  confidence: true,
  errorMessage: true,
  idempotencyKey: true,
  parentHandoffId: true,
  depth: true,
  executionId: true,
  createdAt: true,
  updatedAt: true,
  acceptedAt: true,
  completedAt: true,
  expiresAt: true,
} as const;

type HandoffRow = NonNullable<
  Awaited<
    ReturnType<typeof prisma.agentHandoffMessage.findFirst<{ select: typeof HANDOFF_SELECT }>>
  >
>;

export interface AgentHandoffDto {
  id: string;
  missionId: string;
  conversationId: string;
  fromAgent: string;
  fromRole: string;
  toAgent: string;
  toRole: string;
  requestType: string;
  requestedCapability: string;
  resourceScope: Record<string, unknown> | null;
  knownFacts: Record<string, unknown>[];
  evidence: EvidenceItem[];
  risks: Record<string, unknown>[];
  authorizationContext: Record<string, unknown> | null;
  priority: HandoffPriority;
  status: HandoffStatus;
  /** Estado computado no momento da leitura — nunca gravado de volta em `status` só por ter sido
   *  lido (mesmo espírito de `AccessRequestDto.effectiveStatus`; um job de expiração separado nunca
   *  existiu neste produto). */
  effectiveStatus: HandoffStatus;
  response: Record<string, unknown> | null;
  confidence: number | null;
  errorMessage: string | null;
  parentHandoffId: string | null;
  depth: number;
  executionId: string | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
}

const PENDING_STATUSES: readonly HandoffStatus[] = ['CREATED', 'AUTHORIZING', 'QUEUED'];
const TERMINAL_STATUSES: readonly HandoffStatus[] = [
  'COMPLETED',
  'DENIED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
];

function computeEffectiveStatus(row: Pick<HandoffRow, 'status' | 'expiresAt'>): HandoffStatus {
  if (!PENDING_STATUSES.includes(row.status)) return row.status;
  if (!row.expiresAt) return row.status;
  if (row.expiresAt.getTime() <= Date.now()) return 'EXPIRED';
  return row.status;
}

function sanitizeErrorMessage(message: string): string {
  return message.slice(0, 500);
}

function toDto(row: HandoffRow): AgentHandoffDto {
  return {
    id: row.id,
    missionId: row.missionId,
    conversationId: row.conversationId,
    fromAgent: row.fromAgent,
    fromRole: row.fromRole,
    toAgent: row.toAgent,
    toRole: row.toRole,
    requestType: row.requestType,
    requestedCapability: row.requestedCapability,
    resourceScope: row.resourceScope as Record<string, unknown> | null,
    knownFacts: row.knownFacts as Record<string, unknown>[],
    evidence: row.evidence as unknown as EvidenceItem[],
    risks: row.risks as Record<string, unknown>[],
    authorizationContext: row.authorizationContext as Record<string, unknown> | null,
    priority: row.priority,
    status: row.status,
    effectiveStatus: computeEffectiveStatus(row),
    response: row.response as Record<string, unknown> | null,
    confidence: row.confidence,
    errorMessage: row.errorMessage,
    parentHandoffId: row.parentHandoffId,
    depth: row.depth,
    executionId: row.executionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

async function loadHandoffOrThrow(organizationId: string, handoffId: string): Promise<HandoffRow> {
  const row = await prisma.agentHandoffMessage.findFirst({
    where: { id: handoffId, organizationId },
    select: HANDOFF_SELECT,
  });
  if (!row) {
    throw new AgentBusServiceError('Handoff não encontrado.', 'NOT_FOUND', 404);
  }
  return row;
}

function publisherUserId(row: Pick<HandoffRow, 'authorizationContext'>): string | null {
  const ctx = row.authorizationContext as { actor?: { userId?: string } } | null;
  return ctx?.actor?.userId ?? null;
}

/** Quem pode operar o lado de RECEBIMENTO de um handoff (`accept`/`complete`/`fail`): ADMIN, ou um
 *  usuário cujo `JobRole` principal ativo é exatamente o `toRole` do handoff — nunca qualquer
 *  usuário autenticado (o handoff é escopado ao cargo de destino, mesmo espírito de
 *  `isEligibleApprover` do PROMPT 7). */
async function assertCanReceive(
  row: Pick<HandoffRow, 'toRole'>,
  actor: AgentBusActor,
): Promise<void> {
  if (actor.userRole === 'ADMIN') return;
  const jobRole = await getPrimaryActiveJobRoleForUser(actor.organizationId, actor.userId);
  if (jobRole?.code !== row.toRole) {
    throw new AgentBusServiceError(
      'Você não pode operar este handoff — seu cargo não é o cargo de destino.',
      'FORBIDDEN',
      403,
    );
  }
}

/** Quem pode cancelar um handoff ainda pendente: ADMIN, quem publicou, ou um usuário cujo `JobRole`
 *  principal ativo é o `fromRole` (mesmo cargo de origem, ainda que outra pessoa). */
async function assertCanCancel(row: HandoffRow, actor: AgentBusActor): Promise<void> {
  if (actor.userRole === 'ADMIN') return;
  if (publisherUserId(row) === actor.userId) return;
  const jobRole = await getPrimaryActiveJobRoleForUser(actor.organizationId, actor.userId);
  if (jobRole?.code !== row.fromRole) {
    throw new AgentBusServiceError('Você não pode cancelar este handoff.', 'FORBIDDEN', 403);
  }
}

/** Loop guard (regra do prompt da onda) percorre a cadeia de ancestrais via `parentHandoffId`
 *  coletando `fromAgent`/`toAgent` de cada elo — um ciclo pode fechar em qualquer um dos dois
 *  papéis. Cota de iteração (`MAX_HANDOFF_DEPTH + 2`) é defesa em profundidade: nenhuma cadeia
 *  válida (sempre checada contra `MAX_HANDOFF_DEPTH` ANTES de cada inserção) deveria chegar perto
 *  desse tamanho, mas a função nunca deve rodar sem limite mesmo diante de dado inesperado. */
async function collectAncestorAgentCodes(
  organizationId: string,
  startNode: Pick<HandoffRow, 'fromAgent' | 'toAgent' | 'parentHandoffId'>,
): Promise<string[]> {
  const codes = new Set<string>([startNode.fromAgent, startNode.toAgent]);
  let cursor = startNode.parentHandoffId;
  let guard = 0;
  while (cursor && guard < MAX_HANDOFF_DEPTH + 2) {
    guard += 1;
    const node = await prisma.agentHandoffMessage.findFirst({
      where: { id: cursor, organizationId },
      select: { fromAgent: true, toAgent: true, parentHandoffId: true },
    });
    if (!node) break;
    codes.add(node.fromAgent);
    codes.add(node.toAgent);
    cursor = node.parentHandoffId;
  }
  return [...codes];
}

export async function publishHandoff(input: PublishHandoffInput): Promise<AgentHandoffDto> {
  const { actor } = input;

  // Idempotência: republicar com a mesma chave (retry de rede, duplo clique) nunca cria uma
  // segunda linha nem reavalia guards — devolve exatamente o que já existe.
  if (input.idempotencyKey) {
    const existing = await prisma.agentHandoffMessage.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: actor.organizationId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: HANDOFF_SELECT,
    });
    if (existing) return toDto(existing);
  }

  const [fromAgentDef, toAgentDef] = await Promise.all([
    prisma.agentDefinition.findUnique({
      where: { code: input.fromAgent },
      select: { isActive: true },
    }),
    prisma.agentDefinition.findUnique({
      where: { code: input.toAgent },
      select: { isActive: true },
    }),
  ]);
  if (!fromAgentDef?.isActive) {
    throw new AgentBusServiceError(
      'Agente de origem desconhecido ou inativo.',
      'UNKNOWN_FROM_AGENT',
      404,
    );
  }
  if (!toAgentDef?.isActive) {
    throw new AgentBusServiceError(
      'Agente de destino desconhecido ou inativo.',
      'UNKNOWN_TO_AGENT',
      404,
    );
  }

  const [fromRole, toRole] = await Promise.all([
    getJobRoleByCode(input.fromRole),
    getJobRoleByCode(input.toRole),
  ]);
  if (!fromRole?.isActive) {
    throw new AgentBusServiceError(
      'Cargo de origem desconhecido ou inativo.',
      'UNKNOWN_FROM_ROLE',
      404,
    );
  }
  if (!toRole?.isActive) {
    throw new AgentBusServiceError(
      'Cargo de destino desconhecido ou inativo.',
      'UNKNOWN_TO_ROLE',
      404,
    );
  }

  const capability = await getCapabilityDefinitionByCode(input.requestedCapability);
  if (!capability?.isActive) {
    throw new AgentBusServiceError(
      'Capability desconhecida ou inativa.',
      'UNKNOWN_CAPABILITY',
      404,
    );
  }

  let depth = 0;
  let ancestorAgentCodes: string[] = [];
  if (input.parentHandoffId) {
    const parent = await prisma.agentHandoffMessage.findFirst({
      where: { id: input.parentHandoffId, organizationId: actor.organizationId },
      select: {
        id: true,
        depth: true,
        fromAgent: true,
        toAgent: true,
        parentHandoffId: true,
        missionId: true,
      },
    });
    if (!parent) {
      throw new AgentBusServiceError('Handoff pai não encontrado.', 'PARENT_NOT_FOUND', 404);
    }
    if (parent.missionId !== input.missionId) {
      throw new AgentBusServiceError(
        'Handoff pai pertence a outra missão.',
        'MISSION_MISMATCH',
        400,
      );
    }
    depth = parent.depth + 1;
    ancestorAgentCodes = await collectAncestorAgentCodes(actor.organizationId, parent);
  }
  if (isHandoffLoop(input.toAgent, input.fromAgent, ancestorAgentCodes)) {
    throw new AgentBusServiceError(
      'Handoff formaria um ciclo entre agentes já presentes na cadeia.',
      'LOOP_DETECTED',
      409,
    );
  }
  if (depth > MAX_HANDOFF_DEPTH) {
    throw new AgentBusServiceError(
      `Profundidade máxima de handoffs excedida (${MAX_HANDOFF_DEPTH}).`,
      'MAX_DEPTH_EXCEEDED',
      409,
    );
  }

  const stepsSoFar = await prisma.agentHandoffMessage.count({
    where: { organizationId: actor.organizationId, missionId: input.missionId },
  });
  if (stepsSoFar >= MAX_HANDOFF_STEPS_PER_MISSION) {
    throw new AgentBusServiceError(
      `Orçamento máximo de handoffs desta missão excedido (${MAX_HANDOFF_STEPS_PER_MISSION}).`,
      'MAX_STEPS_EXCEEDED',
      409,
    );
  }

  const created = await prisma.agentHandoffMessage.create({
    data: {
      organizationId: actor.organizationId,
      missionId: input.missionId,
      conversationId: input.conversationId,
      fromAgent: input.fromAgent,
      fromRole: input.fromRole,
      toAgent: input.toAgent,
      toRole: input.toRole,
      requestType: input.requestType,
      requestedCapability: input.requestedCapability,
      resourceScope: (input.resourceScope ?? undefined) as object | undefined,
      knownFacts: (input.knownFacts ?? []) as object,
      evidence: (input.evidence ?? []) as object,
      risks: (input.risks ?? []) as object,
      priority: input.priority ?? 'NORMAL',
      idempotencyKey: input.idempotencyKey,
      parentHandoffId: input.parentHandoffId,
      depth,
      expiresAt: new Date(Date.now() + DEFAULT_HANDOFF_TTL_MINUTES * 60 * 1000),
      status: 'CREATED',
    },
    select: { id: true },
  });

  await AuditService.log({
    action: 'AGENT_EXECUTED',
    entity: 'AgentHandoffMessage',
    entityId: created.id,
    actorId: actor.userId,
    tenantId: actor.organizationId,
    afterState: {
      status: 'CREATED',
      fromAgent: input.fromAgent,
      toAgent: input.toAgent,
      requestedCapability: input.requestedCapability,
    },
  });

  // Autoriza (AUTHORIZING) — a MESMA checagem que o AgentRuntime faria ao executar de verdade,
  // reusando `TemporaryCapabilityGrant` do PROMPT 7 quando aplicável. Nunca decide negócio: só
  // pergunta "o cargo/agente de DESTINO pode executar esta capability?".
  const decision = await authorizeCapability({
    actor,
    agentCode: input.toAgent,
    capabilityCode: input.requestedCapability,
    resource: input.resourceScope,
  });
  const authorizationContext = {
    actor: { userId: actor.userId, userRole: actor.userRole },
    decision,
  };

  if (!decision.allowed) {
    await prisma.agentHandoffMessage.update({
      where: { id: created.id },
      data: {
        status: 'DENIED',
        authorizationContext: authorizationContext as unknown as object,
        errorMessage: `Handoff negado: ${decision.reason}.`,
        completedAt: new Date(),
      },
    });
    await AuditService.log({
      action: 'AGENT_EXECUTED',
      entity: 'AgentHandoffMessage',
      entityId: created.id,
      actorId: actor.userId,
      tenantId: actor.organizationId,
      afterState: { status: 'DENIED', reason: decision.reason },
    });
    return toDto(await loadHandoffOrThrow(actor.organizationId, created.id));
  }

  await prisma.agentHandoffMessage.update({
    where: { id: created.id },
    data: { status: 'QUEUED', authorizationContext: authorizationContext as unknown as object },
  });

  return toDto(await loadHandoffOrThrow(actor.organizationId, created.id));
}

export interface AcceptHandoffInput {
  actor: AgentBusActor;
  handoffId: string;
}

/**
 * Reivindica (`QUEUED` -> `ACCEPTED`) e entrega imediatamente ao AgentRuntime (`RUNNING` ->
 * `COMPLETED`/`FAILED`/`DENIED`). O claim é atômico (`updateMany` condicionado a `status: 'QUEUED'`)
 * — duas chamadas concorrentes para o mesmo handoff nunca disparam duas execuções reais; a segunda
 * sempre encontra `claim.count === 0` e recai no caminho de "retry seguro".
 */
export async function acceptHandoff(input: AcceptHandoffInput): Promise<AgentHandoffDto> {
  const { actor } = input;
  const row = await loadHandoffOrThrow(actor.organizationId, input.handoffId);
  await assertCanReceive(row, actor);

  if (computeEffectiveStatus(row) === 'EXPIRED') {
    throw new AgentBusServiceError('Este handoff expirou antes de ser aceito.', 'EXPIRED', 409);
  }
  if (row.status !== 'QUEUED') {
    if (row.status === 'ACCEPTED' || row.status === 'RUNNING' || row.status === 'COMPLETED') {
      return toDto(row);
    }
    throw new AgentBusServiceError(
      `Não é possível aceitar um handoff em status ${row.status}.`,
      'INVALID_STATE',
      409,
    );
  }

  const claim = await prisma.agentHandoffMessage.updateMany({
    where: { id: row.id, organizationId: actor.organizationId, status: 'QUEUED' },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
  });
  if (claim.count === 0) {
    return toDto(await loadHandoffOrThrow(actor.organizationId, row.id));
  }

  await AuditService.log({
    action: 'AGENT_EXECUTED',
    entity: 'AgentHandoffMessage',
    entityId: row.id,
    actorId: actor.userId,
    tenantId: actor.organizationId,
    afterState: { status: 'ACCEPTED' },
  });

  await prisma.agentHandoffMessage.update({ where: { id: row.id }, data: { status: 'RUNNING' } });

  const execution = await runAgentExecution({
    actorId: actor.userId,
    organizationId: actor.organizationId,
    actorRole: actor.userRole,
    agentCode: row.toAgent,
    requestedCapability: row.requestedCapability,
    mission: row.requestType,
    resource: (row.resourceScope as Record<string, unknown> | null) ?? undefined,
    correlationId: row.id,
  });

  if (execution.status === 'SUCCEEDED') {
    return completeHandoff({
      actor,
      handoffId: row.id,
      response: {
        facts: execution.facts,
        metrics: execution.metrics,
        evidence: execution.evidence,
      },
      confidence: execution.confidence,
      executionId: execution.executionId,
    });
  }
  return failHandoff({
    actor,
    handoffId: row.id,
    outcome: execution.status === 'DENIED' ? 'DENIED' : 'FAILED',
    errorMessage: execution.summary ?? `Execução terminou em ${execution.status}.`,
    executionId: execution.executionId,
  });
}

export interface CompleteHandoffInput {
  actor: AgentBusActor;
  handoffId: string;
  response?: Record<string, unknown>;
  confidence?: number | null;
  executionId?: string | null;
}

export async function completeHandoff(input: CompleteHandoffInput): Promise<AgentHandoffDto> {
  const { actor } = input;
  const row = await loadHandoffOrThrow(actor.organizationId, input.handoffId);
  await assertCanReceive(row, actor);

  if (row.status === 'COMPLETED') return toDto(row);
  if (row.status !== 'RUNNING' && row.status !== 'ACCEPTED') {
    throw new AgentBusServiceError(
      `Não é possível concluir um handoff em status ${row.status}.`,
      'INVALID_STATE',
      409,
    );
  }

  const updated = await prisma.agentHandoffMessage.updateMany({
    where: { id: row.id, organizationId: actor.organizationId, status: row.status },
    data: {
      status: 'COMPLETED',
      response: (input.response ?? {}) as object,
      confidence: input.confidence ?? null,
      executionId: input.executionId ?? row.executionId,
      completedAt: new Date(),
    },
  });
  if (updated.count === 0) {
    return toDto(await loadHandoffOrThrow(actor.organizationId, row.id));
  }

  await AuditService.log({
    action: 'AGENT_EXECUTED',
    entity: 'AgentHandoffMessage',
    entityId: row.id,
    actorId: actor.userId,
    tenantId: actor.organizationId,
    afterState: { status: 'COMPLETED' },
  });

  return toDto(await loadHandoffOrThrow(actor.organizationId, row.id));
}

export interface FailHandoffInput {
  actor: AgentBusActor;
  handoffId: string;
  errorMessage: string;
  outcome?: 'FAILED' | 'DENIED';
  executionId?: string | null;
}

export async function failHandoff(input: FailHandoffInput): Promise<AgentHandoffDto> {
  const { actor } = input;
  const row = await loadHandoffOrThrow(actor.organizationId, input.handoffId);
  await assertCanReceive(row, actor);

  const outcome = input.outcome ?? 'FAILED';
  if (row.status === outcome) return toDto(row);
  if (TERMINAL_STATUSES.includes(row.status)) {
    throw new AgentBusServiceError(
      `Não é possível marcar como ${outcome} um handoff já ${row.status}.`,
      'INVALID_STATE',
      409,
    );
  }

  const updated = await prisma.agentHandoffMessage.updateMany({
    where: { id: row.id, organizationId: actor.organizationId, status: row.status },
    data: {
      status: outcome,
      errorMessage: sanitizeErrorMessage(input.errorMessage),
      executionId: input.executionId ?? row.executionId,
      completedAt: new Date(),
    },
  });
  if (updated.count === 0) {
    return toDto(await loadHandoffOrThrow(actor.organizationId, row.id));
  }

  await AuditService.log({
    action: 'AGENT_EXECUTED',
    entity: 'AgentHandoffMessage',
    entityId: row.id,
    actorId: actor.userId,
    tenantId: actor.organizationId,
    afterState: { status: outcome, errorMessage: input.errorMessage },
  });

  return toDto(await loadHandoffOrThrow(actor.organizationId, row.id));
}

export async function cancelHandoff(input: {
  actor: AgentBusActor;
  handoffId: string;
}): Promise<AgentHandoffDto> {
  const { actor } = input;
  const row = await loadHandoffOrThrow(actor.organizationId, input.handoffId);
  await assertCanCancel(row, actor);

  if (row.status === 'CANCELLED') return toDto(row);
  if (!PENDING_STATUSES.includes(row.status)) {
    throw new AgentBusServiceError(
      `Só é possível cancelar um handoff ainda não aceito (status atual: ${row.status}).`,
      'INVALID_STATE',
      409,
    );
  }

  const updated = await prisma.agentHandoffMessage.updateMany({
    where: { id: row.id, organizationId: actor.organizationId, status: row.status },
    data: { status: 'CANCELLED', completedAt: new Date() },
  });
  if (updated.count === 0) {
    return toDto(await loadHandoffOrThrow(actor.organizationId, row.id));
  }

  await AuditService.log({
    action: 'AGENT_EXECUTED',
    entity: 'AgentHandoffMessage',
    entityId: row.id,
    actorId: actor.userId,
    tenantId: actor.organizationId,
    afterState: { status: 'CANCELLED' },
  });

  return toDto(await loadHandoffOrThrow(actor.organizationId, row.id));
}

export async function getHandoff(
  organizationId: string,
  handoffId: string,
): Promise<AgentHandoffDto> {
  return toDto(await loadHandoffOrThrow(organizationId, handoffId));
}

export async function listHandoffsForMission(
  organizationId: string,
  missionId: string,
): Promise<AgentHandoffDto[]> {
  const rows = await prisma.agentHandoffMessage.findMany({
    where: { organizationId, missionId },
    select: HANDOFF_SELECT,
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toDto);
}

/** Fila de handoffs `QUEUED` cujo `toRole` é o cargo principal ativo do ator (ou todos, para
 *  ADMIN) — ordenada por prioridade (o enum `HandoffPriority` é declarado em ordem crescente de
 *  severidade, então `desc` já traz `URGENT` primeiro) e, dentro da mesma prioridade, FIFO. */
export async function listPendingHandoffsForRole(
  organizationId: string,
  actorId: string,
  actorRole: string,
): Promise<AgentHandoffDto[]> {
  const jobRole =
    actorRole === 'ADMIN' ? null : await getPrimaryActiveJobRoleForUser(organizationId, actorId);
  if (actorRole !== 'ADMIN' && !jobRole) return [];
  const rows = await prisma.agentHandoffMessage.findMany({
    where: {
      organizationId,
      status: 'QUEUED',
      ...(jobRole ? { toRole: jobRole.code } : {}),
    },
    select: HANDOFF_SELECT,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });
  return rows.filter((row) => computeEffectiveStatus(row) === 'QUEUED').map(toDto);
}
