import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CAPABILITY_CODES } from '../../src/config/capability-catalog';
import { requestContext } from '../../src/lib/async-context';
import { prisma } from '../../src/lib/prisma';
import normalizedBirthHubCatalog from '../../src/features/job-roles/catalog/agents.normalized.json';
import { setupDI } from '../../src/shared/di/setup';
import { runAgentCatalogImport } from '../../scripts/import-agent-catalog';
import { runCapabilityEngineSeed } from '../../scripts/seed-capability-engine';
import { runMultiCargoSeed } from '../../scripts/seed-multi-cargo';
import { assignJobRole, getJobRoleByCode } from '../../src/features/job-roles/services/jobRole.service';
import { createAccessRequest } from '../../src/features/job-roles/services/accessRequest.service';
import {
  AgentBusServiceError,
  acceptHandoff,
  cancelHandoff,
  completeHandoff,
  failHandoff,
  getHandoff,
  listHandoffsForMission,
  listPendingHandoffsForRole,
  publishHandoff,
} from '../../src/features/job-roles/services/agentBus.service';
import {
  MAX_HANDOFF_DEPTH,
  MAX_HANDOFF_STEPS_PER_MISSION,
  isHandoffLoop,
} from '../../src/features/job-roles/config/agent-bus-policy';

const ORG_ID = 'test-org-id';
const OTHER_ORG_ID = 'test-org-id-2';

// Cadeia sintética de agentes só para exercitar loop guard/maxDepth sem depender de nenhuma
// relação de negócio real entre eles — qualquer `AgentDefinition` importado pelo catálogo serve,
// já que a validação estrutural do Bus só exige `isActive`, nunca um `RoleAgentGrant` real (esse
// só entra na etapa de AUTORIZAÇÃO, depois do loop guard/orçamento).
const CHAIN_AGENT_CODES = [
  'ab-test-automator',
  'ab-test-synthesizer',
  'access-right-auditor',
  'account-manager',
  'account-mapper',
  'accrual-engine',
  'activation-optimizer',
  'activity-analyzer',
  'acv-growth-tracker',
];

let userCounter = 0;
async function makeUserWithJobRole(jobRoleCode: string, userRole = 'SDR', organizationId = ORG_ID) {
  userCounter++;
  const user = await prisma.user.create({
    data: {
      name: `Agent Bus Test User ${userCounter}`,
      email: `agent-bus.test.${Date.now()}.${userCounter}@test.com`,
      organizationId,
      role: userRole,
    },
  });
  const jobRole = await getJobRoleByCode(jobRoleCode);
  await assignJobRole({
    organizationId,
    userId: user.id,
    jobRoleId: jobRole!.id,
    assignedBy: 'admin-agent-bus-test',
  });
  return { user, jobRole: jobRole! };
}

async function makeLead(overrides: Record<string, unknown> = {}) {
  return prisma.lead.create({
    data: {
      organizationId: ORG_ID,
      title: 'Lead de teste do Agent Bus',
      status: 'Lead_Recebido',
      ...overrides,
    },
  });
}

let missionCounter = 0;
function nextMissionId(label: string): string {
  missionCounter++;
  return `mission-${label}-${missionCounter}`;
}

describe('Agent Bus + Handoffs (PROMPT 8)', () => {
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
    // AgentHandoffMessage/TemporaryCapabilityGrant/ApprovalDecision/AccessRequest têm RLS ESTRITO
    // (sem bypass_rls — ver migration 20260909040000_agent_bus_handoffs e o mesmo padrão já
    // documentado em access-request.test.ts). Escopo do wrap deliberadamente limitado só a estes 4
    // modelos (nunca o afterAll inteiro) — o resto roda fora, mesmo espírito de
        // role-supervisor.test.ts/access-request.test.ts (evita a contenção de lock real medida em CI
    // quando um afterAll inteiro é envolvido).
    await requestContext.run({ tenantId: ORG_ID }, async () => {
      await prisma.agentHandoffMessage.deleteMany({ where: { organizationId: ORG_ID } });
      await prisma.temporaryCapabilityGrant.deleteMany({ where: { organizationId: ORG_ID } });
      await prisma.approvalDecision.deleteMany({ where: { organizationId: ORG_ID } });
      await prisma.accessRequest.deleteMany({ where: { organizationId: ORG_ID } });
    });
    await prisma.agentExecution.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.auditLog.deleteMany({ where: { entity: 'AgentHandoffMessage' } });
    await prisma.auditLog.deleteMany({ where: { entity: 'AccessRequest' } });
    await prisma.userJobRole.deleteMany({
      where: { organizationId: { in: [ORG_ID, OTHER_ORG_ID] } },
    });
    await prisma.user.deleteMany({ where: { email: { contains: 'agent-bus.test' } } });
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

  describe('isHandoffLoop (puro — loop guard)', () => {
    it('detecta handoff para o próprio agente de origem (ciclo de tamanho 1)', () => {
      expect(isHandoffLoop('agent-a', 'agent-a', [])).toBe(true);
    });

    it('detecta destino já presente na cadeia de ancestrais', () => {
      expect(isHandoffLoop('agent-a', 'agent-c', ['agent-a', 'agent-b', 'agent-c'])).toBe(true);
    });

    it('libera destino inédito, fora da cadeia', () => {
      expect(isHandoffLoop('agent-d', 'agent-c', ['agent-a', 'agent-b', 'agent-c'])).toBe(false);
    });
  });

  describe('ciclo de vida completo — publish autoriza e accept entrega ao AgentRuntime', () => {
    it('LDR publica e aceita handoff de lead.read, executa com sucesso e completa (COMPLETED)', async () => {
      const { user } = await makeUserWithJobRole('LDR', 'SDR');
      const lead = await makeLead();
      const missionId = nextMissionId('happy-path');

      const published = await publishHandoff({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        missionId,
        conversationId: 'conv-1',
        fromAgent: 'account-manager',
        fromRole: 'LDR',
        toAgent: 'ldr-intelligence',
        toRole: 'LDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
        resourceScope: { leadId: lead.id },
        evidence: [
          {
            sourceAgent: 'account-manager',
            summary: 'Lead identificado como prioritário.',
            recordedAt: new Date().toISOString(),
          },
        ],
        priority: 'HIGH',
      });

      expect(published.status).toBe('QUEUED');
      expect(published.effectiveStatus).toBe('QUEUED');
      expect(published.evidence).toHaveLength(1);
      expect(published.authorizationContext).not.toBeNull();

      const accepted = await acceptHandoff({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        handoffId: published.id,
      });

      expect(accepted.status).toBe('COMPLETED');
      expect(accepted.executionId).not.toBeNull();
      expect(accepted.confidence).not.toBeNull();
      expect(accepted.response).not.toBeNull();

      const execution = await prisma.agentExecution.findUnique({
        where: { id: accepted.executionId! },
      });
      expect(execution?.status).toBe('SUCCEEDED');
      expect(execution?.correlationId).toBe(published.id);
    });
  });

  describe('DENIED por policy — sem TemporaryCapabilityGrant (Cross-Role Authorization)', () => {
    it('SDR pedindo contract.read fica DENIED (CROSS_ROLE_REQUEST_REQUIRED) sem grant ativo', async () => {
      const { user } = await makeUserWithJobRole('SDR');
      const agentGrant = await prisma.roleAgentGrant.findFirst({
        where: {
          jobRole: { code: 'SDR' },
          agentDefinition: {
            capabilityGrants: {
              some: { capabilityDefinition: { code: 'contract.read' }, isActive: true },
            },
          },
          isActive: true,
        },
        select: { agentDefinition: { select: { code: true } } },
      });
      expect(agentGrant).not.toBeNull();
      const missionId = nextMissionId('denied');

      const published = await publishHandoff({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        missionId,
        conversationId: 'conv-denied',
        fromAgent: 'account-manager',
        fromRole: 'SDR',
        toAgent: agentGrant!.agentDefinition.code,
        toRole: 'SDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'contract.read',
        resourceScope: { type: 'CONTRACT', id: 'contract-denied-1' },
      });

      expect(published.status).toBe('DENIED');
      expect(published.effectiveStatus).toBe('DENIED');
      expect(
        (published.authorizationContext as { decision?: { reason?: string } } | null)?.decision
          ?.reason,
      ).toBe('CROSS_ROLE_REQUEST_REQUIRED');

      await expect(
        acceptHandoff({
          actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
          handoffId: published.id,
        }),
      ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    });
  });

  describe('TemporaryCapabilityGrant do PROMPT 7 desbloqueia o handoff', () => {
    it('mesmo pedido do teste anterior, mas com grant ativo (mesmo resource), fica QUEUED', async () => {
      const { user } = await makeUserWithJobRole('SDR');
      const resource = { type: 'CONTRACT', id: 'contract-grant-1' };

      const accessRequest = await createAccessRequest({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        capabilityCode: 'contract.read',
        resource,
        reason: 'Preciso conferir o contrato antes de delegar ao Agent Bus.',
      });
      expect(accessRequest.status).toBe('APPROVED');
      expect(accessRequest.grant).not.toBeNull();

      const agentGrant = await prisma.roleAgentGrant.findFirst({
        where: {
          jobRole: { code: 'SDR' },
          agentDefinition: {
            capabilityGrants: {
              some: { capabilityDefinition: { code: 'contract.read' }, isActive: true },
            },
          },
          isActive: true,
        },
        select: { agentDefinition: { select: { code: true } } },
      });
      const missionId = nextMissionId('grant-unlocks');

      const published = await publishHandoff({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        missionId,
        conversationId: 'conv-grant',
        fromAgent: 'account-manager',
        fromRole: 'SDR',
        toAgent: agentGrant!.agentDefinition.code,
        toRole: 'SDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'contract.read',
        resourceScope: resource,
      });

      expect(published.status).toBe('QUEUED');
      expect(
        (
          published.authorizationContext as {
            decision?: { temporaryGrantId?: string | null };
          } | null
        )?.decision?.temporaryGrantId,
      ).toBe(accessRequest.grant!.id);
    });
  });

  describe('loop guard — ciclo entre agentes já presentes na cadeia', () => {
    it('rejeita um handoff cujo destino é o próprio fromAgent (ciclo de tamanho 1)', async () => {
      const { user } = await makeUserWithJobRole('SDR');
      await expect(
        publishHandoff({
          actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
          missionId: nextMissionId('loop-self'),
          conversationId: 'conv-loop-self',
          fromAgent: CHAIN_AGENT_CODES[0]!,
          fromRole: 'SDR',
          toAgent: CHAIN_AGENT_CODES[0]!,
          toRole: 'SDR',
          requestType: 'CAPABILITY_DELEGATION',
          requestedCapability: 'lead.read',
        }),
      ).rejects.toMatchObject({ code: 'LOOP_DETECTED' });
    });

    it('rejeita um handoff que fecharia um ciclo com um agente já presente na cadeia de ancestrais', async () => {
      const { user } = await makeUserWithJobRole('SDR');
      const missionId = nextMissionId('loop-chain');
      const actor = { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' };

      const first = await publishHandoff({
        actor,
        missionId,
        conversationId: 'conv-loop-chain',
        fromAgent: CHAIN_AGENT_CODES[0]!,
        fromRole: 'SDR',
        toAgent: CHAIN_AGENT_CODES[1]!,
        toRole: 'SDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
      });

      // Fecha o ciclo: o segundo handoff da cadeia tenta voltar para o agente que iniciou a cadeia.
      await expect(
        publishHandoff({
          actor,
          missionId,
          conversationId: 'conv-loop-chain',
          fromAgent: CHAIN_AGENT_CODES[1]!,
          toAgent: CHAIN_AGENT_CODES[0]!,
          fromRole: 'SDR',
          toRole: 'SDR',
          requestType: 'CAPABILITY_DELEGATION',
          requestedCapability: 'lead.read',
          parentHandoffId: first.id,
        }),
      ).rejects.toMatchObject({ code: 'LOOP_DETECTED' });
    });
  });

  describe('maxDepth — orçamento de profundidade da cadeia', () => {
    it(`rejeita o handoff que ultrapassaria a profundidade máxima (${MAX_HANDOFF_DEPTH})`, async () => {
      const { user } = await makeUserWithJobRole('SDR');
      const actor = { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' };
      const missionId = nextMissionId('max-depth');

      let parentId: string | undefined;
      for (let depth = 0; depth <= MAX_HANDOFF_DEPTH; depth++) {
        const handoff = await publishHandoff({
          actor,
          missionId,
          conversationId: 'conv-max-depth',
          fromAgent: CHAIN_AGENT_CODES[depth]!,
          toAgent: CHAIN_AGENT_CODES[depth + 1]!,
          fromRole: 'SDR',
          toRole: 'SDR',
          requestType: 'CAPABILITY_DELEGATION',
          requestedCapability: 'lead.read',
          parentHandoffId: parentId,
        });
        expect(handoff.depth).toBe(depth);
        parentId = handoff.id;
      }

      // A cadeia acima já usou profundidades 0..MAX_HANDOFF_DEPTH (MAX_HANDOFF_DEPTH + 1 handoffs) —
      // o próximo elo ultrapassaria o orçamento.
      await expect(
        publishHandoff({
          actor,
          missionId,
          conversationId: 'conv-max-depth',
          fromAgent: CHAIN_AGENT_CODES[MAX_HANDOFF_DEPTH + 1]!,
          toAgent: CHAIN_AGENT_CODES[MAX_HANDOFF_DEPTH + 2]!,
          fromRole: 'SDR',
          toRole: 'SDR',
          requestType: 'CAPABILITY_DELEGATION',
          requestedCapability: 'lead.read',
          parentHandoffId: parentId,
        }),
      ).rejects.toMatchObject({ code: 'MAX_DEPTH_EXCEEDED' });
    });
  });

  describe('maxSteps — orçamento total de handoffs por missão', () => {
    it(`rejeita o handoff número ${MAX_HANDOFF_STEPS_PER_MISSION + 1} de uma mesma missão`, async () => {
      const { user } = await makeUserWithJobRole('SDR');
      const actor = { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' };
      const missionId = nextMissionId('max-steps');

      for (let i = 0; i < MAX_HANDOFF_STEPS_PER_MISSION; i++) {
        await publishHandoff({
          actor,
          missionId,
          conversationId: `conv-max-steps-${i}`,
          fromAgent: CHAIN_AGENT_CODES[0]!,
          toAgent: CHAIN_AGENT_CODES[1]!,
          fromRole: 'SDR',
          toRole: 'SDR',
          requestType: 'CAPABILITY_DELEGATION',
          requestedCapability: 'lead.read',
        });
      }

      await expect(
        publishHandoff({
          actor,
          missionId,
          conversationId: 'conv-max-steps-overflow',
          fromAgent: CHAIN_AGENT_CODES[0]!,
          toAgent: CHAIN_AGENT_CODES[1]!,
          fromRole: 'SDR',
          toRole: 'SDR',
          requestType: 'CAPABILITY_DELEGATION',
          requestedCapability: 'lead.read',
        }),
      ).rejects.toMatchObject({ code: 'MAX_STEPS_EXCEEDED' });
    });
  });

  describe('idempotência — publicar duas vezes com a mesma idempotencyKey nunca duplica', () => {
    it('a segunda publicação com a mesma chave devolve exatamente o handoff já criado', async () => {
      const { user } = await makeUserWithJobRole('SDR');
      const actor = { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' };
      const missionId = nextMissionId('idempotency');
      const idempotencyKey = `handoff-idem-${Date.now()}`;

      const first = await publishHandoff({
        actor,
        missionId,
        conversationId: 'conv-idempotency',
        fromAgent: CHAIN_AGENT_CODES[0]!,
        toAgent: CHAIN_AGENT_CODES[1]!,
        fromRole: 'SDR',
        toRole: 'SDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
        idempotencyKey,
      });
      const second = await publishHandoff({
        actor,
        missionId,
        conversationId: 'conv-idempotency',
        fromAgent: CHAIN_AGENT_CODES[0]!,
        toAgent: CHAIN_AGENT_CODES[1]!,
        fromRole: 'SDR',
        toRole: 'SDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
        idempotencyKey,
      });

      expect(second.id).toBe(first.id);
      const count = await prisma.agentHandoffMessage.count({
        where: { organizationId: ORG_ID, idempotencyKey },
      });
      expect(count).toBe(1);
    });
  });

  describe('retry seguro / no duplicate write — accept/complete/fail repetidos', () => {
    it('aceitar um handoff já COMPLETED de novo devolve o mesmo estado sem rodar uma segunda execução', async () => {
      const { user } = await makeUserWithJobRole('LDR', 'SDR');
      const lead = await makeLead();
      const missionId = nextMissionId('retry-accept');

      const published = await publishHandoff({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        missionId,
        conversationId: 'conv-retry-accept',
        fromAgent: 'account-manager',
        fromRole: 'LDR',
        toAgent: 'ldr-intelligence',
        toRole: 'LDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
        resourceScope: { leadId: lead.id },
      });

      const firstAccept = await acceptHandoff({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        handoffId: published.id,
      });
      expect(firstAccept.status).toBe('COMPLETED');

      const secondAccept = await acceptHandoff({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        handoffId: published.id,
      });
      expect(secondAccept.status).toBe('COMPLETED');
      expect(secondAccept.executionId).toBe(firstAccept.executionId);

      const executionCount = await prisma.agentExecution.count({
        where: { correlationId: published.id },
      });
      expect(executionCount).toBe(1);
    });

    it('completar um handoff já COMPLETED de novo é um no-op (retry seguro)', async () => {
      const { user } = await makeUserWithJobRole('LDR', 'SDR');
      const lead = await makeLead();
      const missionId = nextMissionId('retry-complete');
      const actor = { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' };

      const published = await publishHandoff({
        actor,
        missionId,
        conversationId: 'conv-retry-complete',
        fromAgent: 'account-manager',
        fromRole: 'LDR',
        toAgent: 'ldr-intelligence',
        toRole: 'LDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
        resourceScope: { leadId: lead.id },
      });
      const firstAccept = await acceptHandoff({ actor, handoffId: published.id });

      const repeated = await completeHandoff({
        actor,
        handoffId: published.id,
        response: { forced: true },
      });
      // Repetir `complete` não reescreve o `response` já persistido — devolve exatamente o mesmo
      // estado gravado pelo `accept` (nunca o `response` forçado desta segunda chamada).
      expect(repeated.status).toBe('COMPLETED');
      expect(repeated.response).toEqual(firstAccept.response);
      expect(repeated.response).not.toEqual({ forced: true });
    });

    it('falhar um handoff QUEUED marca FAILED; repetir com o mesmo outcome é um no-op (retry seguro)', async () => {
      const { user } = await makeUserWithJobRole('LDR', 'SDR');
      const lead = await makeLead();
      const missionId = nextMissionId('retry-fail');
      const actor = { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' };

      // Mesma combinação ALLOWED do teste de ciclo de vida completo (LDR/ldr-intelligence/
      // lead.read) — garante QUEUED de forma determinística, sem depender de `accept`, para
      // simular um destino que decide FALHAR manualmente em vez de deixar o AgentRuntime rodar.
      const published = await publishHandoff({
        actor,
        missionId,
        conversationId: 'conv-retry-fail',
        fromAgent: 'account-manager',
        fromRole: 'LDR',
        toAgent: 'ldr-intelligence',
        toRole: 'LDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
        resourceScope: { leadId: lead.id },
      });
      expect(published.status).toBe('QUEUED');

      const firstFail = await failHandoff({
        actor,
        handoffId: published.id,
        errorMessage: 'Falha simulada.',
      });
      expect(firstFail.status).toBe('FAILED');

      // Tentar `fail` com outro outcome sobre um handoff já terminal (FAILED) é rejeitado.
      await expect(
        failHandoff({
          actor,
          handoffId: published.id,
          errorMessage: 'Tentativa com outcome diferente.',
          outcome: 'DENIED',
        }),
      ).rejects.toMatchObject({ code: 'INVALID_STATE' });

      const secondFail = await failHandoff({
        actor,
        handoffId: published.id,
        errorMessage: 'Segunda tentativa, mesma falha.',
      });
      expect(secondFail.status).toBe('FAILED');
      expect(secondFail.errorMessage).toBe(firstFail.errorMessage);
    });
  });

  describe('cancel', () => {
    it('quem publicou pode cancelar um handoff ainda QUEUED; cancelar de novo é um no-op', async () => {
      const { user } = await makeUserWithJobRole('SDR');
      const missionId = nextMissionId('cancel');
      const actor = { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' };

      const published = await publishHandoff({
        actor,
        missionId,
        conversationId: 'conv-cancel',
        fromAgent: CHAIN_AGENT_CODES[0]!,
        toAgent: CHAIN_AGENT_CODES[1]!,
        fromRole: 'SDR',
        toRole: 'SDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
      });

      const cancelled = await cancelHandoff({ actor, handoffId: published.id });
      expect(cancelled.status).toBe('CANCELLED');

      const cancelledAgain = await cancelHandoff({ actor, handoffId: published.id });
      expect(cancelledAgain.status).toBe('CANCELLED');
    });

    it('um handoff já ACCEPTED/COMPLETED não pode mais ser cancelado', async () => {
      const { user } = await makeUserWithJobRole('LDR', 'SDR');
      const lead = await makeLead();
      const missionId = nextMissionId('cancel-terminal');
      const actor = { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' };

      const published = await publishHandoff({
        actor,
        missionId,
        conversationId: 'conv-cancel-terminal',
        fromAgent: 'account-manager',
        fromRole: 'LDR',
        toAgent: 'ldr-intelligence',
        toRole: 'LDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
        resourceScope: { leadId: lead.id },
      });
      await acceptHandoff({ actor, handoffId: published.id });

      await expect(cancelHandoff({ actor, handoffId: published.id })).rejects.toMatchObject({
        code: 'INVALID_STATE',
      });
    });
  });

  describe('autorização de recebimento — só o cargo de destino (ou ADMIN) pode aceitar', () => {
    it('um usuário fora do toRole não pode aceitar o handoff (FORBIDDEN)', async () => {
      const { user: publisher } = await makeUserWithJobRole('SDR');
      const { user: outsider } = await makeUserWithJobRole('CLOSER', 'CLOSER');
      const lead = await makeLead();
      const missionId = nextMissionId('forbidden');

      const published = await publishHandoff({
        actor: { userId: publisher.id, organizationId: ORG_ID, userRole: 'SDR' },
        missionId,
        conversationId: 'conv-forbidden',
        fromAgent: 'account-manager',
        fromRole: 'SDR',
        toAgent: 'ldr-intelligence',
        toRole: 'LDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
        resourceScope: { leadId: lead.id },
      });

      await expect(
        acceptHandoff({
          actor: { userId: outsider.id, organizationId: ORG_ID, userRole: 'CLOSER' },
          handoffId: published.id,
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  describe('listagens', () => {
    it('listHandoffsForMission devolve todos os handoffs da missão, em ordem de criação', async () => {
      const { user } = await makeUserWithJobRole('SDR');
      const actor = { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' };
      const missionId = nextMissionId('list-mission');

      const h1 = await publishHandoff({
        actor,
        missionId,
        conversationId: 'conv-list-1',
        fromAgent: CHAIN_AGENT_CODES[0]!,
        toAgent: CHAIN_AGENT_CODES[1]!,
        fromRole: 'SDR',
        toRole: 'SDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
      });
      const h2 = await publishHandoff({
        actor,
        missionId,
        conversationId: 'conv-list-2',
        fromAgent: CHAIN_AGENT_CODES[0]!,
        toAgent: CHAIN_AGENT_CODES[1]!,
        fromRole: 'SDR',
        toRole: 'SDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
      });

      const list = await listHandoffsForMission(ORG_ID, missionId);
      expect(list.map((h) => h.id)).toEqual([h1.id, h2.id]);
    });

    it('listPendingHandoffsForRole só devolve QUEUED cujo toRole é o cargo do ator', async () => {
      const { user } = await makeUserWithJobRole('LDR', 'SDR');
      const lead = await makeLead();
      const missionId = nextMissionId('pending-role');

      const published = await publishHandoff({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        missionId,
        conversationId: 'conv-pending-role',
        fromAgent: 'account-manager',
        fromRole: 'LDR',
        toAgent: 'ldr-intelligence',
        toRole: 'LDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
        resourceScope: { leadId: lead.id },
      });

      const pending = await listPendingHandoffsForRole(ORG_ID, user.id, 'SDR');
      expect(pending.map((h) => h.id)).toContain(published.id);

      const { user: outsider } = await makeUserWithJobRole('CLOSER', 'CLOSER');
      const pendingForOutsider = await listPendingHandoffsForRole(ORG_ID, outsider.id, 'CLOSER');
      expect(pendingForOutsider.map((h) => h.id)).not.toContain(published.id);
    });
  });

  describe('tenant isolation', () => {
    it('um handoff de um tenant nunca é visto/operado a partir de outro organizationId', async () => {
      const { user } = await makeUserWithJobRole('SDR', 'SDR', ORG_ID);
      const missionId = nextMissionId('tenant-isolation');

      const published = await publishHandoff({
        actor: { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' },
        missionId,
        conversationId: 'conv-tenant-isolation',
        fromAgent: CHAIN_AGENT_CODES[0]!,
        toAgent: CHAIN_AGENT_CODES[1]!,
        fromRole: 'SDR',
        toRole: 'SDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
      });

      await expect(getHandoff(OTHER_ORG_ID, published.id)).rejects.toBeInstanceOf(
        AgentBusServiceError,
      );

      const crossTenantList = await requestContext.run({ tenantId: OTHER_ORG_ID }, () =>
        listHandoffsForMission(ORG_ID, missionId),
      );
      expect(crossTenantList).toHaveLength(0);
    });
  });

  describe('audit', () => {
    it('publish/accept geram entradas reais em AuditLog', async () => {
      const { user } = await makeUserWithJobRole('LDR', 'SDR');
      const lead = await makeLead();
      const missionId = nextMissionId('audit');
      const actor = { userId: user.id, organizationId: ORG_ID, userRole: 'SDR' };

      const published = await publishHandoff({
        actor,
        missionId,
        conversationId: 'conv-audit',
        fromAgent: 'account-manager',
        fromRole: 'LDR',
        toAgent: 'ldr-intelligence',
        toRole: 'LDR',
        requestType: 'CAPABILITY_DELEGATION',
        requestedCapability: 'lead.read',
        resourceScope: { leadId: lead.id },
      });
      await acceptHandoff({ actor, handoffId: published.id });

      const logs = await prisma.auditLog.findMany({
        where: { entity: 'AgentHandoffMessage', entityId: published.id },
        orderBy: { timestamp: 'asc' },
      });
      expect(logs.length).toBeGreaterThanOrEqual(3);
      expect(logs.every((l) => l.actorId === user.id)).toBe(true);
    });
  });
});
