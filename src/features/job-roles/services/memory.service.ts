// PROMPT 9 — Memória + Aprendizado Contínuo Governado.
//
// Fluxo (texto do prompt da onda): execution -> outcome real -> reflection -> candidate ->
// validação -> memória aprovada -> uso futuro.
//
// Este service NUNCA decide negócio de produção nem se auto-modifica — ele só lê `AgentExecution`
// (para nunca criar um `LearningCandidate` especulativo, sempre ancorado numa execução real e
// terminal) e escreve nas 4 tabelas de PROMPT 9. Invariante estrutural: este arquivo NUNCA importa
// nenhuma função de escrita de `agentCatalog.service.ts`/`capability.service.ts`/
// `jobRole.service.ts` (upsert de AgentVersion/CapabilityDefinition/RoleAgentGrant) — só leitura de
// `AgentExecution`, nunca escrita em prompt de produção, capability, versão de agente, ou deploy
// ("NÃO: autoalterar prompt de produção; autoalterar capability; auto-publicar versão; auto-deploy"
// — regra explícita do prompt da onda).
import type { MemoryCategory, MemoryScope, MemoryStatus } from '@prisma/client';
import { AuditService } from '../../../lib/audit/audit.service.js';
import { prisma } from '../../../lib/prisma.js';
import { redactResidualPii } from '../../../shared/security/piiRedaction.js';
import {
  isEligibleDecider,
  requiresHumanDecision,
  resolveMemoryAutoApproval,
} from '../config/memory-policy.js';
import type { EvidenceItem } from './agentBus.service.js';

export class MemoryServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

export interface MemoryActor {
  userId: string;
  organizationId: string;
  userRole: string;
}

/** Estados terminais de `AgentExecution` — "outcome real" (regra explícita do prompt da onda):
 *  nunca cria um `LearningCandidate` a partir de uma execução ainda em andamento. */
const TERMINAL_EXECUTION_STATUSES = ['SUCCEEDED', 'FAILED', 'DENIED', 'CANCELLED'];

export interface CreateLearningCandidateInput {
  actor: MemoryActor;
  sourceExecutionId: string;
  targetScope: MemoryScope;
  topic: string;
  category: MemoryCategory;
  /** Precisa conter `summary: string` não vazio — é o campo passado pela camada de sanitização de
   *  PII antes de qualquer persistência. */
  proposedContent: Record<string, unknown> & { summary: string };
  /** Precisa conter `rationale: string` não vazio — por que este fato vale a pena lembrar. */
  reflection: Record<string, unknown> & { rationale: string };
  evidence?: EvidenceItem[];
}

export interface LearningCandidateDto {
  id: string;
  sourceExecutionId: string;
  agentCode: string;
  jobRoleCode: string | null;
  targetScope: MemoryScope;
  topic: string;
  category: MemoryCategory;
  proposedContent: Record<string, unknown>;
  reflection: Record<string, unknown>;
  evidence: EvidenceItem[];
  sanitization: { detectedTypes: string[]; requiresManualReview: boolean } | null;
  status: MemoryStatus;
  deciderId: string | null;
  deciderRole: string | null;
  decisionNotes: string | null;
  decidedAt: string | null;
  resultingMemoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

const CANDIDATE_SELECT = {
  id: true,
  organizationId: true,
  sourceExecutionId: true,
  agentCode: true,
  jobRoleCode: true,
  targetScope: true,
  topic: true,
  category: true,
  proposedContent: true,
  reflection: true,
  evidence: true,
  sanitization: true,
  status: true,
  deciderId: true,
  deciderRole: true,
  decisionNotes: true,
  decidedAt: true,
  resultingMemoryId: true,
  createdAt: true,
  updatedAt: true,
} as const;

type CandidateRow = NonNullable<
  Awaited<
    ReturnType<typeof prisma.learningCandidate.findFirst<{ select: typeof CANDIDATE_SELECT }>>
  >
>;

function candidateToDto(row: CandidateRow): LearningCandidateDto {
  return {
    id: row.id,
    sourceExecutionId: row.sourceExecutionId,
    agentCode: row.agentCode,
    jobRoleCode: row.jobRoleCode,
    targetScope: row.targetScope,
    topic: row.topic,
    category: row.category,
    proposedContent: row.proposedContent as Record<string, unknown>,
    reflection: row.reflection as Record<string, unknown>,
    evidence: row.evidence as unknown as EvidenceItem[],
    sanitization: row.sanitization as LearningCandidateDto['sanitization'],
    status: row.status,
    deciderId: row.deciderId,
    deciderRole: row.deciderRole,
    decisionNotes: row.decisionNotes,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    resultingMemoryId: row.resultingMemoryId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadCandidateOrThrow(organizationId: string, id: string): Promise<CandidateRow> {
  const row = await prisma.learningCandidate.findFirst({
    where: { id, organizationId },
    select: CANDIDATE_SELECT,
  });
  if (!row) {
    throw new MemoryServiceError('LearningCandidate não encontrado.', 'NOT_FOUND', 404);
  }
  return row;
}

function jsonEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Snapshot normalizado de "qual é a memória ativa hoje" — independe de qual das 3 tabelas foi
 *  consultada (usado pelo detector de conflito, o único ponto que precisa tratar os 3 escopos de
 *  forma uniforme). */
interface ActiveMemorySnapshot {
  id: string;
  content: unknown;
  version: number;
}

async function findActiveMemory(
  organizationId: string,
  scope: MemoryScope,
  agentCode: string,
  jobRoleCode: string | null,
  topic: string,
): Promise<ActiveMemorySnapshot | null> {
  if (scope === 'AGENT') {
    return prisma.agentMemoryRecord.findFirst({
      where: { organizationId, agentCode, topic, status: 'APPROVED' },
      select: { id: true, content: true, version: true },
    });
  }
  if (scope === 'ROLE') {
    if (!jobRoleCode) return null;
    return prisma.roleMemoryRecord.findFirst({
      where: { organizationId, jobRoleCode, topic, status: 'APPROVED' },
      select: { id: true, content: true, version: true },
    });
  }
  return prisma.organizationMemoryRecord.findFirst({
    where: { organizationId, topic, status: 'APPROVED' },
    select: { id: true, content: true, version: true },
  });
}

async function createMemoryRow(params: {
  organizationId: string;
  scope: MemoryScope;
  agentCode: string;
  jobRoleCode: string | null;
  topic: string;
  category: MemoryCategory;
  content: unknown;
  evidence: unknown;
  version: number;
  sourceCandidateId: string;
  supersedesId: string | null;
}): Promise<string> {
  const data = {
    organizationId: params.organizationId,
    topic: params.topic,
    category: params.category,
    content: params.content as object,
    evidence: params.evidence as object,
    version: params.version,
    status: 'APPROVED' as const,
    sourceCandidateId: params.sourceCandidateId,
    supersedesId: params.supersedesId,
  };
  if (params.scope === 'AGENT') {
    const created = await prisma.agentMemoryRecord.create({
      data: { ...data, agentCode: params.agentCode },
      select: { id: true },
    });
    return created.id;
  }
  if (params.scope === 'ROLE') {
    if (!params.jobRoleCode) {
      throw new MemoryServiceError(
        'Escopo ROLE exige um jobRoleCode (a execução de origem não tinha cargo associado).',
        'MISSING_JOB_ROLE',
        409,
      );
    }
    const created = await prisma.roleMemoryRecord.create({
      data: { ...data, jobRoleCode: params.jobRoleCode },
      select: { id: true },
    });
    return created.id;
  }
  const created = await prisma.organizationMemoryRecord.create({ data, select: { id: true } });
  return created.id;
}

async function markMemorySuperseded(
  scope: MemoryScope,
  id: string,
  supersededById: string,
): Promise<void> {
  const data = { status: 'SUPERSEDED' as const, supersededById };
  if (scope === 'AGENT') {
    await prisma.agentMemoryRecord.update({ where: { id }, data });
    return;
  }
  if (scope === 'ROLE') {
    await prisma.roleMemoryRecord.update({ where: { id }, data });
    return;
  }
  await prisma.organizationMemoryRecord.update({ where: { id }, data });
}

/**
 * Cria um `LearningCandidate` a partir de UMA `AgentExecution` real e terminal — nunca
 * especulativa. `proposedContent.summary`/`reflection.rationale` passam pela camada determinística
 * de PII (`redactResidualPii`, mesmo detector real de `LgpdSanitizerService`, sem depender de IA:
 * memória é fato curto e estruturado, não transcrição livre) antes de qualquer persistência —
 * `sanitization.requiresManualReview` nunca permite aprovação automática (ver `memory-policy.ts`).
 * Quando `evidence` não é informado, deriva um item com PROVENANCE a partir da própria execução
 * (nunca fica sem nenhuma evidência rastreável).
 */
export async function createLearningCandidateFromExecution(
  input: CreateLearningCandidateInput,
): Promise<LearningCandidateDto> {
  const { actor } = input;
  const execution = await prisma.agentExecution.findFirst({
    where: { id: input.sourceExecutionId, organizationId: actor.organizationId },
    select: {
      id: true,
      agentCode: true,
      jobRoleCode: true,
      capabilityCode: true,
      summary: true,
      completedAt: true,
      status: true,
    },
  });
  if (!execution) {
    throw new MemoryServiceError(
      'AgentExecution de origem não encontrada.',
      'EXECUTION_NOT_FOUND',
      404,
    );
  }
  if (!TERMINAL_EXECUTION_STATUSES.includes(execution.status)) {
    throw new MemoryServiceError(
      `Só é possível refletir sobre uma execução com outcome real (status atual: ${execution.status}).`,
      'EXECUTION_NOT_TERMINAL',
      409,
    );
  }
  if (input.targetScope === 'ROLE' && !execution.jobRoleCode) {
    throw new MemoryServiceError(
      'A execução de origem não tem um JobRole associado — não é possível criar memória de escopo ROLE.',
      'MISSING_JOB_ROLE',
      409,
    );
  }
  if (!input.topic.trim()) {
    throw new MemoryServiceError('topic é obrigatório.', 'TOPIC_REQUIRED', 400);
  }
  if (!input.proposedContent.summary?.trim()) {
    throw new MemoryServiceError('proposedContent.summary é obrigatório.', 'SUMMARY_REQUIRED', 400);
  }
  if (!input.reflection.rationale?.trim()) {
    throw new MemoryServiceError('reflection.rationale é obrigatório.', 'RATIONALE_REQUIRED', 400);
  }

  const summaryCheck = redactResidualPii(input.proposedContent.summary);
  const rationaleCheck = redactResidualPii(input.reflection.rationale);
  const detectedTypes = [
    ...new Set([...summaryCheck.detectedTypes, ...rationaleCheck.detectedTypes]),
  ];
  const sanitization = { detectedTypes, requiresManualReview: detectedTypes.length > 0 };
  const sanitizedContent = { ...input.proposedContent, summary: summaryCheck.redactedText };
  const sanitizedReflection = { ...input.reflection, rationale: rationaleCheck.redactedText };

  const evidence: EvidenceItem[] =
    input.evidence && input.evidence.length > 0
      ? input.evidence
      : [
          {
            sourceAgent: execution.agentCode,
            sourceExecutionId: execution.id,
            capabilityCode: execution.capabilityCode,
            summary: execution.summary ?? `Execução ${execution.status.toLowerCase()}.`,
            recordedAt: (execution.completedAt ?? new Date()).toISOString(),
          },
        ];

  const created = await prisma.learningCandidate.create({
    data: {
      organizationId: actor.organizationId,
      sourceExecutionId: execution.id,
      agentCode: execution.agentCode,
      jobRoleCode: execution.jobRoleCode,
      targetScope: input.targetScope,
      topic: input.topic.trim(),
      category: input.category,
      proposedContent: sanitizedContent as object,
      reflection: sanitizedReflection as object,
      evidence: evidence as unknown as object,
      sanitization: sanitization as object,
      status: 'PROPOSED',
    },
    select: { id: true },
  });

  await AuditService.log({
    action: 'AGENT_EXECUTED',
    entity: 'LearningCandidate',
    entityId: created.id,
    actorId: actor.userId,
    tenantId: actor.organizationId,
    afterState: { status: 'PROPOSED', category: input.category, targetScope: input.targetScope },
  });

  // Aprovação automática — só OPERATIONAL, só sem PII residual, e só quando não há conflito real
  // (nenhuma memória ativa com conteúdo diferente para o mesmo tópico). Reconfirmação idêntica
  // (mesmo conteúdo já ativo) também nunca cria uma versão nova por engano — ver `decideLearningCandidate`.
  if (resolveMemoryAutoApproval(input.category, sanitization.requiresManualReview)) {
    const active = await findActiveMemory(
      actor.organizationId,
      input.targetScope,
      execution.agentCode,
      execution.jobRoleCode,
      input.topic.trim(),
    );
    const hasConflict = active !== null && !jsonEquals(active.content, sanitizedContent);
    if (!hasConflict) {
      return decideLearningCandidate({
        actor: { ...actor, userId: 'SYSTEM', userRole: 'SYSTEM' },
        candidateId: created.id,
        outcome: 'APPROVED',
        notes: 'AUTO_APPROVED_OPERATIONAL',
        supersedesMemoryId: active?.id,
      });
    }
  }

  return candidateToDto(await loadCandidateOrThrow(actor.organizationId, created.id));
}

export interface DecideLearningCandidateInput {
  actor: MemoryActor;
  candidateId: string;
  outcome: 'APPROVED' | 'REJECTED';
  notes?: string;
  /** Obrigatório quando já existe uma memória ATIVA (status APPROVED) com conteúdo DIFERENTE para
   *  o mesmo escopo+tópico — decisão explícita de qual das duas prevalece (nunca um supersede
   *  implícito). */
  supersedesMemoryId?: string;
}

export async function decideLearningCandidate(
  input: DecideLearningCandidateInput,
): Promise<LearningCandidateDto> {
  const { actor } = input;
  const row = await loadCandidateOrThrow(actor.organizationId, input.candidateId);
  if (row.status !== 'PROPOSED' && row.status !== 'UNDER_REVIEW') {
    throw new MemoryServiceError(
      `Este candidato já foi decidido (status atual: ${row.status}).`,
      'INVALID_STATE',
      409,
    );
  }
  if (actor.userRole !== 'SYSTEM' && !isEligibleDecider(row.category, actor.userRole)) {
    throw new MemoryServiceError(
      'Você não atende ao piso de UserRole exigido para decidir esta categoria de memória.',
      'FORBIDDEN',
      403,
    );
  }

  if (input.outcome === 'REJECTED') {
    await prisma.learningCandidate.update({
      where: { id: row.id },
      data: {
        status: 'REJECTED',
        deciderId: actor.userId,
        deciderRole: actor.userRole,
        decisionNotes: input.notes,
        decidedAt: new Date(),
      },
    });
    await AuditService.log({
      action: 'AGENT_EXECUTED',
      entity: 'LearningCandidate',
      entityId: row.id,
      actorId: actor.userId,
      tenantId: actor.organizationId,
      afterState: { status: 'REJECTED' },
    });
    return candidateToDto(await loadCandidateOrThrow(actor.organizationId, row.id));
  }

  const active = await findActiveMemory(
    actor.organizationId,
    row.targetScope,
    row.agentCode,
    row.jobRoleCode,
    row.topic,
  );

  if (active && jsonEquals(active.content, row.proposedContent)) {
    // Reconfirmação idêntica — nunca cria uma versão nova, só aponta o candidato para a memória
    // já ativa.
    await prisma.learningCandidate.update({
      where: { id: row.id },
      data: {
        status: 'APPROVED',
        deciderId: actor.userId,
        deciderRole: actor.userRole,
        decisionNotes: input.notes,
        decidedAt: new Date(),
        resultingMemoryId: active.id,
      },
    });
    return candidateToDto(await loadCandidateOrThrow(actor.organizationId, row.id));
  }

  if (active && (!input.supersedesMemoryId || input.supersedesMemoryId !== active.id)) {
    throw new MemoryServiceError(
      `Já existe uma memória ativa (${active.id}) com conteúdo diferente para este tópico — decida explicitamente supersedesMemoryId para resolver o conflito.`,
      'MEMORY_CONFLICT',
      409,
    );
  }

  const newVersion = active ? active.version + 1 : 1;
  const newMemoryId = await createMemoryRow({
    organizationId: actor.organizationId,
    scope: row.targetScope,
    agentCode: row.agentCode,
    jobRoleCode: row.jobRoleCode,
    topic: row.topic,
    category: row.category,
    content: row.proposedContent,
    evidence: row.evidence,
    version: newVersion,
    sourceCandidateId: row.id,
    supersedesId: active?.id ?? null,
  });
  if (active) {
    await markMemorySuperseded(row.targetScope, active.id, newMemoryId);
  }

  await prisma.learningCandidate.update({
    where: { id: row.id },
    data: {
      status: 'APPROVED',
      deciderId: actor.userId,
      deciderRole: actor.userRole,
      decisionNotes: input.notes,
      decidedAt: new Date(),
      resultingMemoryId: newMemoryId,
    },
  });
  await AuditService.log({
    action: 'AGENT_EXECUTED',
    entity: 'LearningCandidate',
    entityId: row.id,
    actorId: actor.userId,
    tenantId: actor.organizationId,
    afterState: {
      status: 'APPROVED',
      resultingMemoryId: newMemoryId,
      supersedesId: active?.id ?? null,
    },
  });

  return candidateToDto(await loadCandidateOrThrow(actor.organizationId, row.id));
}

export async function rollbackMemory(params: {
  actor: MemoryActor;
  scope: MemoryScope;
  memoryId: string;
  reason: string;
}): Promise<void> {
  const { actor } = params;
  if (actor.userRole !== 'ADMIN' && actor.userRole !== 'GESTOR') {
    throw new MemoryServiceError(
      'Só ADMIN ou GESTOR podem revogar (rollback) uma memória aprovada.',
      'FORBIDDEN',
      403,
    );
  }
  const select = { id: true, status: true } as const;
  const row =
    params.scope === 'AGENT'
      ? await prisma.agentMemoryRecord.findFirst({
          where: { id: params.memoryId, organizationId: actor.organizationId },
          select,
        })
      : params.scope === 'ROLE'
        ? await prisma.roleMemoryRecord.findFirst({
            where: { id: params.memoryId, organizationId: actor.organizationId },
            select,
          })
        : await prisma.organizationMemoryRecord.findFirst({
            where: { id: params.memoryId, organizationId: actor.organizationId },
            select,
          });
  if (!row) {
    throw new MemoryServiceError('Memória não encontrada.', 'NOT_FOUND', 404);
  }
  if (row.status !== 'APPROVED') {
    throw new MemoryServiceError(
      `Só é possível revogar uma memória ativa (status atual: ${row.status}).`,
      'INVALID_STATE',
      409,
    );
  }
  const data = {
    status: 'ROLLED_BACK' as const,
    rolledBackBy: actor.userId,
    rolledBackAt: new Date(),
    rolledBackReason: params.reason,
  };
  if (params.scope === 'AGENT') {
    await prisma.agentMemoryRecord.update({ where: { id: row.id }, data });
  } else if (params.scope === 'ROLE') {
    await prisma.roleMemoryRecord.update({ where: { id: row.id }, data });
  } else {
    await prisma.organizationMemoryRecord.update({ where: { id: row.id }, data });
  }
  await AuditService.log({
    action: 'AGENT_EXECUTED',
    entity: `${params.scope}MemoryRecord`,
    entityId: row.id,
    actorId: actor.userId,
    tenantId: actor.organizationId,
    afterState: { status: 'ROLLED_BACK', reason: params.reason },
  });
}

export async function listCandidates(
  organizationId: string,
  status?: MemoryStatus,
): Promise<LearningCandidateDto[]> {
  const rows = await prisma.learningCandidate.findMany({
    where: { organizationId, ...(status ? { status } : {}) },
    select: CANDIDATE_SELECT,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(candidateToDto);
}

export async function getCandidate(
  organizationId: string,
  candidateId: string,
): Promise<LearningCandidateDto> {
  return candidateToDto(await loadCandidateOrThrow(organizationId, candidateId));
}

/** "Uso futuro" — SEMPRE só memória `APPROVED` (nunca `PROPOSED`/`UNDER_REVIEW`/`REJECTED`/
 *  `SUPERSEDED`/`ROLLED_BACK`; o filtro é feito na própria query, não em pós-processamento, para
 *  nunca vazar uma memória não-ativa por engano). */
export async function getActiveAgentMemory(organizationId: string, agentCode: string) {
  return prisma.agentMemoryRecord.findMany({
    where: { organizationId, agentCode, status: 'APPROVED' },
    orderBy: { topic: 'asc' },
  });
}

export async function getActiveRoleMemory(organizationId: string, jobRoleCode: string) {
  return prisma.roleMemoryRecord.findMany({
    where: { organizationId, jobRoleCode, status: 'APPROVED' },
    orderBy: { topic: 'asc' },
  });
}

export async function getActiveOrganizationMemory(organizationId: string) {
  return prisma.organizationMemoryRecord.findMany({
    where: { organizationId, status: 'APPROVED' },
    orderBy: { topic: 'asc' },
  });
}

export { requiresHumanDecision };
