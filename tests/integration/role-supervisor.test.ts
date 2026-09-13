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
  getJobRoleByCode,
  assignJobRole,
} from '../../src/features/job-roles/services/jobRole.service';
import {
  planSupervisorSteps,
  runRoleSupervisor,
} from '../../src/features/job-roles/services/roleSupervisor.service';
import { ROLE_SUPERVISOR_PROFILES } from '../../src/features/job-roles/config/role-supervisor-profiles';

const ORG_ID = 'test-org-id';
const OTHER_ORG_ID = 'test-org-id-2';

let userCounter = 0;
async function makeUserWithJobRole(jobRoleCode: string, userRole = 'SDR') {
  userCounter++;
  const user = await prisma.user.create({
    data: {
      name: `Role Supervisor Test User ${userCounter}`,
      email: `role.supervisor.test.${Date.now()}.${userCounter}@test.com`,
      organizationId: ORG_ID,
      role: userRole,
    },
  });
  const jobRole = await getJobRoleByCode(jobRoleCode);
  await assignJobRole({
    organizationId: ORG_ID,
    userId: user.id,
    jobRoleId: jobRole!.id,
    assignedBy: 'admin-role-supervisor-test',
  });
  return { user, jobRole: jobRole! };
}

async function makeLead(overrides: Record<string, unknown> = {}) {
  return prisma.lead.create({
    data: {
      organizationId: ORG_ID,
      title: 'Lead de teste do Role Supervisor',
      status: 'Lead_Recebido',
      ...overrides,
    },
  });
}

describe('Supervisores de Cargo (PROMPT 5)', () => {
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
    await prisma.agentExecution.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.userJobRole.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.user.deleteMany({
      where: { organizationId: ORG_ID, email: { contains: 'role.supervisor.test' } },
    });
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

  describe('planSupervisorSteps (puro — loop guard e maxSteps)', () => {
    it('deduplica capabilities repetidas na lista preferida (loop prevention)', () => {
      const plan = planSupervisorSteps({
        preferredCapabilities: ['lead.read', 'lead.read', 'lead.search'],
        maxSteps: 5,
      });
      expect(plan.capabilities).toEqual(['lead.read', 'lead.search']);
      expect(plan.truncated).toBe(false);
    });

    it('corta em maxSteps quando a lista deduplicada é maior (loop guard de orçamento)', () => {
      const plan = planSupervisorSteps({
        preferredCapabilities: ['a', 'b', 'c', 'd'],
        maxSteps: 2,
      });
      expect(plan.capabilities).toEqual(['a', 'b']);
      expect(plan.truncated).toBe(true);
    });

    it('capability explicitamente pedida ignora preferredCapabilities do perfil', () => {
      const plan = planSupervisorSteps(
        { preferredCapabilities: ['a', 'b'], maxSteps: 5 },
        'lead.read',
      );
      expect(plan.capabilities).toEqual(['lead.read']);
      expect(plan.truncated).toBe(false);
    });
  });

  describe('seleção correta de agente', () => {
    it('LDR pedindo lead.read seleciona o agente canônico ldr-intelligence e executa com sucesso', async () => {
      const { user } = await makeUserWithJobRole('LDR', 'SDR');
      const lead = await makeLead();

      const result = await runRoleSupervisor({
        actorId: user.id,
        organizationId: ORG_ID,
        actorRole: 'SDR',
        requestedCapability: 'lead.read',
        resource: { leadId: lead.id },
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.jobRoleCode).toBe('LDR');
      expect(result.mission).toBe(ROLE_SUPERVISOR_PROFILES.LDR.mission);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]?.selectedAgentCode).toBe('ldr-intelligence');
      expect(result.steps[0]?.outcome).toBe('SUCCEEDED');
      expect(result.steps[0]?.execution?.summary).toContain(lead.title);
      expect(result.requiresApproval).toBe(false);
      expect(result.escalation.triggered).toBe(false);
    });

    it('sem requestedCapability, tenta as preferredCapabilities do perfil em ordem e resolve cada uma com o recurso correspondente', async () => {
      const { user } = await makeUserWithJobRole('LDR', 'SDR');
      const lead = await makeLead();
      const company = await prisma.company.create({
        data: {
          organizationId: ORG_ID,
          legalName: 'Empresa de Teste do Role Supervisor LTDA',
          tradeName: 'Empresa de Teste do Role Supervisor',
        },
      });
      // Um `resource` só, compartilhado por todos os passos — cada executor lê só a chave que
      // precisa (leadId/companyId). `query` fica de fora de propósito: `lead.search`/`query`
      // aciona busca real via Meilisearch (fora deste ambiente de teste), igual a
      // `company.search`, que não precisa de `query` para suceder (PROMPT 4 já cobre isso).
      const result = await runRoleSupervisor({
        actorId: user.id,
        organizationId: ORG_ID,
        actorRole: 'SDR',
        resource: { leadId: lead.id, companyId: company.id },
      });
      expect(result.steps.map((s) => s.capabilityCode)).toEqual(
        ROLE_SUPERVISOR_PROFILES.LDR.preferredCapabilities,
      );
      for (const step of result.steps) {
        expect(step.outcome).toBe('SUCCEEDED');
      }
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('sem candidato elegível', () => {
    // deal.move_stage só é concedido (agente + cargo) a closer-sales/CLOSER na Célula Comercial —
    // ao contrário de lead.read (também presente nos agentes "piso comum" ldr-intelligence e
    // bdr-outbound, concedidos a todos os 12 cargos), aqui não há nenhum agente alternativo que
    // sirva de fallback quando o grant canônico é desativado — garante NO_ELIGIBLE_AGENT de
    // verdade, não um outro candidato inesperado.
    it('agente sem RoleAgentGrant ativo para o cargo: NO_ELIGIBLE_AGENT', async () => {
      const { user } = await makeUserWithJobRole('CLOSER', 'CLOSER');
      const agent = await prisma.agentDefinition.findUniqueOrThrow({
        where: { code: 'closer-sales' },
      });
      const jobRole = await getJobRoleByCode('CLOSER');
      const grant = await prisma.roleAgentGrant.findFirstOrThrow({
        where: { jobRoleId: jobRole!.id, agentDefinitionId: agent.id },
      });
      await prisma.roleAgentGrant.update({ where: { id: grant.id }, data: { isActive: false } });
      try {
        const result = await runRoleSupervisor({
          actorId: user.id,
          organizationId: ORG_ID,
          actorRole: 'CLOSER',
          requestedCapability: 'deal.move_stage',
        });
        expect(result.steps).toHaveLength(1);
        expect(result.steps[0]?.outcome).toBe('NO_ELIGIBLE_AGENT');
        expect(result.steps[0]?.selectedAgentCode).toBeNull();
        expect(result.steps[0]?.execution).toBeNull();
      } finally {
        await prisma.roleAgentGrant.update({ where: { id: grant.id }, data: { isActive: true } });
      }
    });

    it('capability sem AgentCapabilityGrant ativo no agente do cargo: NO_ELIGIBLE_AGENT', async () => {
      const { user } = await makeUserWithJobRole('CLOSER', 'CLOSER');
      const agent = await prisma.agentDefinition.findUniqueOrThrow({
        where: { code: 'closer-sales' },
      });
      const capability = await prisma.capabilityDefinition.findUniqueOrThrow({
        where: { code: 'deal.move_stage' },
      });
      const grant = await prisma.agentCapabilityGrant.findFirstOrThrow({
        where: { agentDefinitionId: agent.id, capabilityDefinitionId: capability.id },
      });
      await prisma.agentCapabilityGrant.update({
        where: { id: grant.id },
        data: { isActive: false },
      });
      try {
        const result = await runRoleSupervisor({
          actorId: user.id,
          organizationId: ORG_ID,
          actorRole: 'CLOSER',
          requestedCapability: 'deal.move_stage',
        });
        expect(result.steps[0]?.outcome).toBe('NO_ELIGIBLE_AGENT');
      } finally {
        await prisma.agentCapabilityGrant.update({
          where: { id: grant.id },
          data: { isActive: true },
        });
      }
    });
  });

  describe('bloqueios de binding continuam bloqueados, sem derrubar a missão', () => {
    it('CONTRATOS_ASSINATURA: contract.read sucede, contract.generate/signature.request permanecem FUTURE_TOOL sem interromper o run', async () => {
      const { user } = await makeUserWithJobRole('CONTRATOS_ASSINATURA', 'GESTOR');
      const result = await runRoleSupervisor({
        actorId: user.id,
        organizationId: ORG_ID,
        actorRole: 'GESTOR',
        resource: { documentId: 'documento-inexistente-role-supervisor' },
      });

      expect(result.jobRoleCode).toBe('CONTRATOS_ASSINATURA');
      expect(result.steps.map((s) => s.capabilityCode)).toEqual([
        'contract.read',
        'contract.generate',
        'signature.request',
      ]);
      expect(result.steps[0]?.outcome).toBe('SUCCEEDED');
      expect(result.steps[1]?.outcome).toBe('DENIED');
      expect(result.steps[1]?.execution?.policyDecision.reason).toBe('FUTURE_TOOL');
      expect(result.steps[2]?.outcome).toBe('DENIED');
      expect(result.steps[2]?.execution?.policyDecision.reason).toBe('FUTURE_TOOL');
      // FUTURE_TOOL não está em stopConditions — o run precisa ter completado os 3 passos.
      expect(result.status).toBe('COMPLETED');
      expect(result.haltReason).toBeNull();
    });

    it('RECEITA_FATURAMENTO: billing.read e billing.reconcile permanecem SOURCE_REQUIRED sem interromper o run', async () => {
      const { user } = await makeUserWithJobRole('RECEITA_FATURAMENTO', 'GESTOR');
      const result = await runRoleSupervisor({
        actorId: user.id,
        organizationId: ORG_ID,
        actorRole: 'GESTOR',
      });

      expect(result.steps.map((s) => s.capabilityCode)).toEqual([
        'billing.read',
        'billing.reconcile',
      ]);
      for (const step of result.steps) {
        expect(step.outcome).toBe('DENIED');
        expect(step.execution?.policyDecision.reason).toBe('SOURCE_REQUIRED');
      }
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('approval propagation', () => {
    it('CLOSER pedindo deal.move_stage (HIGH): DENIED com APPROVAL_REQUIRED, run HALTED, lead nunca mutado', async () => {
      const { user } = await makeUserWithJobRole('CLOSER', 'CLOSER');
      const lead = await makeLead({ status: 'Lead_Recebido' });

      const result = await runRoleSupervisor({
        actorId: user.id,
        organizationId: ORG_ID,
        actorRole: 'CLOSER',
        requestedCapability: 'deal.move_stage',
        resource: { leadId: lead.id, status: 'Negociacao' },
      });

      expect(result.steps[0]?.selectedAgentCode).toBe('closer-sales');
      expect(result.steps[0]?.outcome).toBe('DENIED');
      expect(result.steps[0]?.requiresApproval).toBe(true);
      expect(result.requiresApproval).toBe(true);
      expect(result.status).toBe('HALTED');
      expect(result.haltReason).toBe('APPROVAL_REQUIRED');
      expect(result.escalation).toEqual({
        triggered: true,
        notifyRole: 'GERENTE_COMERCIAL',
        reason: 'APPROVAL_REQUIRED',
        stepCapabilityCode: 'deal.move_stage',
      });

      const untouched = await prisma.lead.findUnique({ where: { id: lead.id } });
      expect(untouched?.status).toBe('Lead_Recebido');
    });
  });

  describe('maxSteps (loop guard de orçamento) em execução real', () => {
    it('REVENUE_INTELLIGENCE (maxSteps=3, 4 preferredCapabilities): para nos 3 primeiros passos, HALTED com MAX_STEPS_REACHED', async () => {
      const { user } = await makeUserWithJobRole('REVENUE_INTELLIGENCE', 'GESTOR');
      const result = await runRoleSupervisor({
        actorId: user.id,
        organizationId: ORG_ID,
        actorRole: 'GESTOR',
      });

      expect(ROLE_SUPERVISOR_PROFILES.REVENUE_INTELLIGENCE.preferredCapabilities).toHaveLength(4);
      expect(result.maxStepsConfigured).toBe(3);
      expect(result.steps).toHaveLength(3);
      expect(result.steps.map((s) => s.capabilityCode)).toEqual([
        'pipeline.read',
        'pipeline.analyze',
        'forecast.read',
      ]);
      // Nenhum dos 3 é HIGH/CRITICAL nem exige aprovação — o único motivo de parada é maxSteps.
      for (const step of result.steps) {
        expect(step.outcome).toBe('SUCCEEDED');
      }
      expect(result.status).toBe('HALTED');
      expect(result.haltReason).toBe('MAX_STEPS_REACHED');
      // PIPELINE != FORECAST: as métricas reais de pipeline e de forecast vêm em passos distintos,
      // nunca misturadas num único número.
      expect(result.steps[0]?.execution?.metrics.pacePercent).toBeDefined();
      expect(result.steps[2]?.execution?.metrics.forecastAmount).toBeDefined();
    });
  });

  describe('tenant isolation', () => {
    it('actor resolvido só dentro do próprio tenant (RLS) — cargo de outro tenant nunca é visto', async () => {
      const { user } = await makeUserWithJobRole('LDR', 'SDR');
      const lead = await makeLead();

      const crossTenantResult = await requestContext.run({ tenantId: OTHER_ORG_ID }, () =>
        runRoleSupervisor({
          actorId: user.id,
          organizationId: ORG_ID,
          actorRole: 'SDR',
          requestedCapability: 'lead.read',
          resource: { leadId: lead.id },
        }),
      );
      expect(crossTenantResult.status).toBe('NO_JOB_ROLE');
      expect(crossTenantResult.steps).toHaveLength(0);

      const realResult = await requestContext.run({ tenantId: ORG_ID }, () =>
        runRoleSupervisor({
          actorId: user.id,
          organizationId: ORG_ID,
          actorRole: 'SDR',
          requestedCapability: 'lead.read',
          resource: { leadId: lead.id },
        }),
      );
      expect(realResult.status).toBe('COMPLETED');
    });
  });
});
