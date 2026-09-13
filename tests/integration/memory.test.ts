import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CAPABILITY_CODES } from '../../src/config/capability-catalog';
import { requestContext } from '../../src/lib/async-context';
import { prisma } from '../../src/lib/prisma';
import normalizedBirthHubCatalog from '../../src/features/job-roles/catalog/agents.normalized.json';
import { setupDI } from '../../src/shared/di/setup';
import { runAgentCatalogImport } from '../../scripts/import-agent-catalog';
import { runCapabilityEngineSeed } from '../../scripts/seed-capability-engine';
import { runMultiCargoSeed } from '../../scripts/seed-multi-cargo';
import {
  assignJobRole,
  getJobRoleByCode,
} from '../../src/features/job-roles/services/jobRole.service';
import { runAgentExecution } from '../../src/features/job-roles/services/agentRuntime.service';
import {
  MemoryServiceError,
  createLearningCandidateFromExecution,
  decideLearningCandidate,
  getActiveAgentMemory,
  getActiveOrganizationMemory,
  getActiveRoleMemory,
  getCandidate,
  rollbackMemory,
} from '../../src/features/job-roles/services/memory.service';

const ORG_ID = 'test-org-id';
const OTHER_ORG_ID = 'test-org-id-2';

let userCounter = 0;
async function makeUserWithJobRole(
  jobRoleCode: string | null,
  userRole = 'SDR',
  organizationId = ORG_ID,
) {
  userCounter++;
  const user = await prisma.user.create({
    data: {
      name: `Memory Test User ${userCounter}`,
      email: `memory.test.${Date.now()}.${userCounter}@test.com`,
      organizationId,
      role: userRole,
    },
  });
  if (jobRoleCode) {
    const jobRole = await getJobRoleByCode(jobRoleCode);
    await assignJobRole({
      organizationId,
      userId: user.id,
      jobRoleId: jobRole!.id,
      assignedBy: 'admin-memory-test',
    });
  }
  return { user };
}

async function makeLead(overrides: Record<string, unknown> = {}) {
  return prisma.lead.create({
    data: {
      organizationId: ORG_ID,
      title: 'Lead de teste da Memória Governada',
      status: 'Lead_Recebido',
      ...overrides,
    },
  });
}

/** Execução real e terminal (SUCCEEDED) — LDR/ldr-intelligence/lead.read, mesma combinação
 *  ALLOWED conhecida já usada em agent-bus.test.ts/role-supervisor.test.ts. */
async function makeTerminalExecution(userId: string) {
  const lead = await makeLead();
  const execution = await runAgentExecution({
    actorId: userId,
    organizationId: ORG_ID,
    actorRole: 'SDR',
    agentCode: 'ldr-intelligence',
    requestedCapability: 'lead.read',
    resource: { leadId: lead.id },
  });
  return execution;
}

let topicCounter = 0;
function nextTopic(label: string): string {
  topicCounter++;
  return `topic-${label}-${topicCounter}`;
}

describe('Memória + Aprendizado Contínuo Governado (PROMPT 9)', () => {
  const sourceAgentCodes = (normalizedBirthHubCatalog.agents as { code: string }[]).map(
    (a) => a.code,
  );

  beforeAll(async () => {
    setupDI();
    await runMultiCargoSeed();
    await runAgentCatalogImport();
    await runCapabilityEngineSeed();
  });

  afterAll(async () => {
    // LearningCandidate/AgentMemoryRecord/RoleMemoryRecord/OrganizationMemoryRecord têm RLS
    // ESTRITO (sem bypass_rls — ver migration 20260909050000_governed_agent_memory e o mesmo
    // padrão já documentado em access-request.test.ts/agent-bus.test.ts). Escopo do wrap
    // deliberadamente limitado só a estas 4 tabelas.
    await requestContext.run({ tenantId: ORG_ID }, async () => {
      await prisma.learningCandidate.deleteMany({ where: { organizationId: ORG_ID } });
      await prisma.agentMemoryRecord.deleteMany({ where: { organizationId: ORG_ID } });
      await prisma.roleMemoryRecord.deleteMany({ where: { organizationId: ORG_ID } });
      await prisma.organizationMemoryRecord.deleteMany({ where: { organizationId: ORG_ID } });
    });
    await prisma.agentExecution.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.auditLog.deleteMany({ where: { entity: 'LearningCandidate' } });
    await prisma.auditLog.deleteMany({ where: { entity: { contains: 'MemoryRecord' } } });
    await prisma.userJobRole.deleteMany({
      where: { organizationId: { in: [ORG_ID, OTHER_ORG_ID] } },
    });
    await prisma.user.deleteMany({ where: { email: { contains: 'memory.test' } } });
    await prisma.agentCapabilityGrant.deleteMany({
      where: { capabilityDefinition: { code: { in: CAPABILITY_CODES } } },
    });
    await prisma.roleCapabilityGrant.deleteMany({
      where: { capabilityDefinition: { code: { in: CAPABILITY_CODES } } },
    });
    await prisma.capabilityDefinition.deleteMany({ where: { code: { in: CAPABILITY_CODES } } });
    await prisma.roleAgentGrant.deleteMany({
      where: { agentDefinition: { code: { in: sourceAgentCodes } } },
    });
    await prisma.agentVersion.deleteMany({
      where: { agentDefinition: { code: { in: sourceAgentCodes } } },
    });
    await prisma.agentDefinition.deleteMany({ where: { code: { in: sourceAgentCodes } } });
  });

  describe('evidence + source execution', () => {
    it('sem evidence explícita, deriva uma evidência com provenance a partir da própria execução', async () => {
      const { user } = await makeUserWithJobRole('LDR');
      const execution = await makeTerminalExecution(user.id);

      const candidate = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution.executionId,
        targetScope: 'AGENT',
        topic: nextTopic('evidence'),
        category: 'OPERATIONAL',
        proposedContent: { summary: 'Lead responde melhor a follow-up no período da manhã.' },
        reflection: { rationale: 'Padrão observado em execuções recentes deste agente.' },
      });

      expect(candidate.sourceExecutionId).toBe(execution.executionId);
      expect(candidate.evidence).toHaveLength(1);
      expect(candidate.evidence[0]!.sourceExecutionId).toBe(execution.executionId);
      expect(candidate.evidence[0]!.sourceAgent).toBe('ldr-intelligence');
    });

    it('rejeita criar um candidate a partir de uma execução que não existe', async () => {
      const { user } = await makeUserWithJobRole('LDR');
      await expect(
        createLearningCandidateFromExecution({
          actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
          sourceExecutionId: 'execution-inexistente',
          targetScope: 'AGENT',
          topic: nextTopic('no-execution'),
          category: 'OPERATIONAL',
          proposedContent: { summary: 'Texto qualquer.' },
          reflection: { rationale: 'Racional qualquer.' },
        }),
      ).rejects.toMatchObject({ code: 'EXECUTION_NOT_FOUND' });
    });
  });

  describe('PII — nunca aprova automaticamente com PII residual', () => {
    it('CPF no summary é redigido, sanitization sinaliza revisão manual, e OPERATIONAL não auto-aprova', async () => {
      const { user } = await makeUserWithJobRole('LDR');
      const execution = await makeTerminalExecution(user.id);

      const candidate = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution.executionId,
        targetScope: 'AGENT',
        topic: nextTopic('pii'),
        category: 'OPERATIONAL',
        proposedContent: { summary: 'Cliente com CPF 123.456.789-00 confirmou interesse.' },
        reflection: { rationale: 'Confirmação direta do cliente durante a ligação.' },
      });

      expect(candidate.proposedContent.summary).not.toContain('123.456.789-00');
      expect(candidate.proposedContent.summary).toContain('[CPF REDIGIDO]');
      expect(candidate.sanitization?.requiresManualReview).toBe(true);
      expect(candidate.sanitization?.detectedTypes).toContain('CPF');
      // Nunca auto-aprova com PII residual, mesmo sendo OPERATIONAL.
      expect(candidate.status).toBe('PROPOSED');
    });
  });

  describe('categoria sensível sempre exige humano', () => {
    it('FORECAST_RULE nunca auto-aprova mesmo com conteúdo limpo; SDR não pode decidir, GESTOR pode', async () => {
      const { user } = await makeUserWithJobRole('LDR');
      const execution = await makeTerminalExecution(user.id);

      const candidate = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution.executionId,
        targetScope: 'AGENT',
        topic: nextTopic('sensitive'),
        category: 'FORECAST_RULE',
        proposedContent: { summary: 'Leads deste segmento fecham em média 20% mais rápido.' },
        reflection: { rationale: 'Observado em 5 execuções consecutivas.' },
      });
      expect(candidate.status).toBe('PROPOSED');

      await expect(
        decideLearningCandidate({
          actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
          candidateId: candidate.id,
          outcome: 'APPROVED',
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      const { user: gestor } = await makeUserWithJobRole('GERENTE_COMERCIAL', 'GESTOR');
      const decided = await decideLearningCandidate({
        actor: { userId: gestor.id, organizationId: ORG_ID, userRole: 'GESTOR' },
        candidateId: candidate.id,
        outcome: 'APPROVED',
      });
      expect(decided.status).toBe('APPROVED');
      expect(decided.resultingMemoryId).not.toBeNull();

      const active = await getActiveAgentMemory(ORG_ID, 'ldr-intelligence');
      expect(active.map((m) => m.id)).toContain(decided.resultingMemoryId);
    });
  });

  describe('candidate não aprovado não influencia a memória ativa', () => {
    it('um candidate PROPOSED, e depois REJECTED, nunca aparece em getActiveAgentMemory', async () => {
      const { user } = await makeUserWithJobRole('LDR');
      const execution = await makeTerminalExecution(user.id);
      const topic = nextTopic('not-approved');

      const candidate = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution.executionId,
        targetScope: 'AGENT',
        topic,
        category: 'CONTRACT',
        proposedContent: { summary: 'Cláusula de reajuste anual costuma travar a negociação.' },
        reflection: { rationale: 'Observado no fechamento desta conta.' },
      });
      expect(candidate.status).toBe('PROPOSED');

      let active = await getActiveAgentMemory(ORG_ID, 'ldr-intelligence');
      expect(active.some((m) => m.topic === topic)).toBe(false);

      const { user: gestor } = await makeUserWithJobRole('GERENTE_COMERCIAL', 'GESTOR');
      const rejected = await decideLearningCandidate({
        actor: { userId: gestor.id, organizationId: ORG_ID, userRole: 'GESTOR' },
        candidateId: candidate.id,
        outcome: 'REJECTED',
        notes: 'Não generalizável.',
      });
      expect(rejected.status).toBe('REJECTED');
      expect(rejected.resultingMemoryId).toBeNull();

      active = await getActiveAgentMemory(ORG_ID, 'ldr-intelligence');
      expect(active.some((m) => m.topic === topic)).toBe(false);
    });
  });

  describe('conflict detection', () => {
    it('segunda memória com conteúdo diferente para o mesmo tópico exige supersedesMemoryId explícito', async () => {
      const { user } = await makeUserWithJobRole('LDR');
      const topic = nextTopic('conflict');

      const execution1 = await makeTerminalExecution(user.id);
      const candidateA = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution1.executionId,
        targetScope: 'AGENT',
        topic,
        category: 'OPERATIONAL',
        proposedContent: { summary: 'Melhor horário de contato: manhã.' },
        reflection: { rationale: 'Padrão A.' },
      });
      // OPERATIONAL + sem PII + sem conflito prévio -> auto-aprova.
      expect(candidateA.status).toBe('APPROVED');
      const activeAfterA = await getActiveAgentMemory(ORG_ID, 'ldr-intelligence');
      const memoryV1 = activeAfterA.find((m) => m.topic === topic);
      expect(memoryV1).toBeDefined();
      expect(memoryV1!.version).toBe(1);

      const execution2 = await makeTerminalExecution(user.id);
      const candidateB = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution2.executionId,
        targetScope: 'AGENT',
        topic,
        category: 'OPERATIONAL',
        proposedContent: { summary: 'Melhor horário de contato: fim de tarde.' },
        reflection: { rationale: 'Padrão B, contradiz o anterior.' },
      });
      // Conteúdo diferente do já ativo -> nunca auto-aprova, mesmo OPERATIONAL e sem PII.
      expect(candidateB.status).toBe('PROPOSED');

      const { user: gestor } = await makeUserWithJobRole('GERENTE_COMERCIAL', 'GESTOR');
      await expect(
        decideLearningCandidate({
          actor: { userId: gestor.id, organizationId: ORG_ID, userRole: 'GESTOR' },
          candidateId: candidateB.id,
          outcome: 'APPROVED',
        }),
      ).rejects.toMatchObject({ code: 'MEMORY_CONFLICT' });

      const decided = await decideLearningCandidate({
        actor: { userId: gestor.id, organizationId: ORG_ID, userRole: 'GESTOR' },
        candidateId: candidateB.id,
        outcome: 'APPROVED',
        supersedesMemoryId: memoryV1!.id,
      });
      expect(decided.status).toBe('APPROVED');

      const activeAfterB = await getActiveAgentMemory(ORG_ID, 'ldr-intelligence');
      const activeForTopic = activeAfterB.filter((m) => m.topic === topic);
      expect(activeForTopic).toHaveLength(1);
      expect(activeForTopic[0]!.version).toBe(2);
      expect(activeForTopic[0]!.id).toBe(decided.resultingMemoryId);

      const superseded = await prisma.agentMemoryRecord.findUniqueOrThrow({
        where: { id: memoryV1!.id },
      });
      expect(superseded.status).toBe('SUPERSEDED');
      expect(superseded.supersededById).toBe(decided.resultingMemoryId);
    });

    it('reconfirmar o mesmo conteúdo já ativo nunca cria uma nova versão', async () => {
      const { user } = await makeUserWithJobRole('LDR');
      const topic = nextTopic('reconfirm');
      const summary = 'Este agente sempre resolve em uma única execução.';

      const execution1 = await makeTerminalExecution(user.id);
      const first = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution1.executionId,
        targetScope: 'AGENT',
        topic,
        category: 'OPERATIONAL',
        proposedContent: { summary },
        reflection: { rationale: 'Primeira observação.' },
      });
      expect(first.status).toBe('APPROVED');

      const execution2 = await makeTerminalExecution(user.id);
      const second = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution2.executionId,
        targetScope: 'AGENT',
        topic,
        category: 'OPERATIONAL',
        proposedContent: { summary },
        reflection: { rationale: 'Segunda observação, mesmo conteúdo.' },
      });
      // Mesmo conteúdo do já ativo -> auto-aprova reaproveitando a mesma memória (sem nova versão).
      expect(second.status).toBe('APPROVED');
      expect(second.resultingMemoryId).toBe(first.resultingMemoryId);

      const active = await getActiveAgentMemory(ORG_ID, 'ldr-intelligence');
      expect(active.filter((m) => m.topic === topic)).toHaveLength(1);
    });
  });

  describe('rollback', () => {
    it('GESTOR revoga uma memória ativa; ela some de getActiveAgentMemory; SDR não pode revogar', async () => {
      const { user } = await makeUserWithJobRole('LDR');
      const topic = nextTopic('rollback');
      const execution = await makeTerminalExecution(user.id);

      const candidate = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution.executionId,
        targetScope: 'AGENT',
        topic,
        category: 'OPERATIONAL',
        proposedContent: { summary: 'Fato temporário que será revogado.' },
        reflection: { rationale: 'Teste de rollback.' },
      });
      expect(candidate.status).toBe('APPROVED');
      const memoryId = candidate.resultingMemoryId!;

      await expect(
        rollbackMemory({
          actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
          scope: 'AGENT',
          memoryId,
          reason: 'Tentativa sem permissão.',
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      const { user: gestor } = await makeUserWithJobRole('GERENTE_COMERCIAL', 'GESTOR');
      await rollbackMemory({
        actor: { userId: gestor.id, organizationId: ORG_ID, userRole: 'GESTOR' },
        scope: 'AGENT',
        memoryId,
        reason: 'Fato não se confirmou em execuções seguintes.',
      });

      const active = await getActiveAgentMemory(ORG_ID, 'ldr-intelligence');
      expect(active.some((m) => m.id === memoryId)).toBe(false);

      const row = await prisma.agentMemoryRecord.findUniqueOrThrow({ where: { id: memoryId } });
      expect(row.status).toBe('ROLLED_BACK');
      expect(row.rolledBackBy).toBe(gestor.id);
      expect(row.rolledBackReason).toContain('não se confirmou');

      await expect(
        rollbackMemory({
          actor: { userId: gestor.id, organizationId: ORG_ID, userRole: 'GESTOR' },
          scope: 'AGENT',
          memoryId,
          reason: 'Segunda tentativa.',
        }),
      ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    });
  });

  describe('escopos ROLE e ORGANIZATION', () => {
    it('ROLE cria RoleMemoryRecord quando a execução tem jobRoleCode; sem cargo, rejeita com MISSING_JOB_ROLE', async () => {
      const { user } = await makeUserWithJobRole('LDR');
      const execution = await makeTerminalExecution(user.id);

      const candidate = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution.executionId,
        targetScope: 'ROLE',
        topic: nextTopic('role-scope'),
        category: 'OPERATIONAL',
        proposedContent: { summary: 'Cargo LDR converte melhor com resposta em até 5 minutos.' },
        reflection: { rationale: 'Padrão do cargo, não só deste agente.' },
      });
      expect(candidate.status).toBe('APPROVED');
      const active = await getActiveRoleMemory(ORG_ID, 'LDR');
      expect(active.map((m) => m.id)).toContain(candidate.resultingMemoryId);

      // Usuário sem NENHUM JobRole -> execução real, mas com jobRoleCode nulo (DENIED por
      // NO_JOB_ROLE, ainda assim um outcome real/terminal).
      const { user: noRoleUser } = await makeUserWithJobRole(null, 'SDR');
      const lead = await makeLead();
      const orphanExecution = await runAgentExecution({
        actorId: noRoleUser.id,
        organizationId: ORG_ID,
        actorRole: 'SDR',
        agentCode: 'ldr-intelligence',
        requestedCapability: 'lead.read',
        resource: { leadId: lead.id },
      });
      expect(orphanExecution.status).toBe('DENIED');

      await expect(
        createLearningCandidateFromExecution({
          actor: { userId: noRoleUser.id, organizationId: ORG_ID, userRole: 'SDR' },
          sourceExecutionId: orphanExecution.executionId,
          targetScope: 'ROLE',
          topic: nextTopic('role-scope-missing'),
          category: 'OPERATIONAL',
          proposedContent: { summary: 'Texto qualquer.' },
          reflection: { rationale: 'Racional qualquer.' },
        }),
      ).rejects.toMatchObject({ code: 'MISSING_JOB_ROLE' });
    });

    it('ORGANIZATION cria OrganizationMemoryRecord compartilhado', async () => {
      const { user } = await makeUserWithJobRole('LDR');
      const execution = await makeTerminalExecution(user.id);

      const candidate = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution.executionId,
        targetScope: 'ORGANIZATION',
        topic: nextTopic('org-scope'),
        category: 'OPERATIONAL',
        proposedContent: { summary: 'Terças e quartas têm a melhor taxa de resposta geral.' },
        reflection: { rationale: 'Padrão agregado da organização.' },
      });
      expect(candidate.status).toBe('APPROVED');
      const active = await getActiveOrganizationMemory(ORG_ID);
      expect(active.map((m) => m.id)).toContain(candidate.resultingMemoryId);
    });
  });

  describe('tenant isolation', () => {
    it('um candidate/memória de um tenant nunca é visto a partir de outro organizationId', async () => {
      const { user } = await makeUserWithJobRole('LDR', 'SDR', ORG_ID);
      const execution = await makeTerminalExecution(user.id);
      const topic = nextTopic('tenant-isolation');

      const candidate = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution.executionId,
        targetScope: 'AGENT',
        topic,
        category: 'OPERATIONAL',
        proposedContent: { summary: 'Fato isolado por tenant.' },
        reflection: { rationale: 'Teste de isolamento.' },
      });
      expect(candidate.status).toBe('APPROVED');

      await expect(getCandidate(OTHER_ORG_ID, candidate.id)).rejects.toBeInstanceOf(
        MemoryServiceError,
      );

      const crossTenantActive = await requestContext.run({ tenantId: OTHER_ORG_ID }, () =>
        getActiveAgentMemory(ORG_ID, 'ldr-intelligence'),
      );
      expect(crossTenantActive.some((m) => m.topic === topic)).toBe(false);
    });
  });

  describe('no self-modification', () => {
    it('todo o ciclo (candidate -> aprovar -> rollback) nunca altera AgentVersion/CapabilityDefinition', async () => {
      const agentVersionBefore = await prisma.agentVersion.findFirst({
        where: { agentDefinition: { code: 'ldr-intelligence' }, status: 'ACTIVE' },
      });
      const capabilityBefore = await prisma.capabilityDefinition.findUniqueOrThrow({
        where: { code: 'lead.read' },
      });

      const { user } = await makeUserWithJobRole('LDR');
      const { user: gestor } = await makeUserWithJobRole('GERENTE_COMERCIAL', 'GESTOR');
      const execution = await makeTerminalExecution(user.id);

      const candidate = await createLearningCandidateFromExecution({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        sourceExecutionId: execution.executionId,
        targetScope: 'AGENT',
        topic: nextTopic('no-self-mod'),
        category: 'CAPABILITY',
        proposedContent: { summary: 'Esta capability deveria aceitar um novo parâmetro.' },
        reflection: { rationale: 'Sugestão de melhoria futura, nunca aplicada automaticamente.' },
      });
      const decided = await decideLearningCandidate({
        actor: { userId: gestor.id, organizationId: ORG_ID, userRole: 'GESTOR' },
        candidateId: candidate.id,
        outcome: 'APPROVED',
      });
      await rollbackMemory({
        actor: { userId: gestor.id, organizationId: ORG_ID, userRole: 'GESTOR' },
        scope: 'AGENT',
        memoryId: decided.resultingMemoryId!,
        reason: 'Só para o teste de no-self-modification.',
      });

      const agentVersionAfter = await prisma.agentVersion.findFirst({
        where: { agentDefinition: { code: 'ldr-intelligence' }, status: 'ACTIVE' },
      });
      const capabilityAfter = await prisma.capabilityDefinition.findUniqueOrThrow({
        where: { code: 'lead.read' },
      });

      expect(JSON.stringify(agentVersionAfter)).toBe(JSON.stringify(agentVersionBefore));
      expect(JSON.stringify(capabilityAfter)).toBe(JSON.stringify(capabilityBefore));
    });
  });
});
