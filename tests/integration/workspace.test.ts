import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CAPABILITY_CODES } from '../../src/config/capability-catalog';
import { JOB_ROLE_CODES } from '../../src/config/job-role-catalog';
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
import { getWorkspaceForUser } from '../../src/features/job-roles/services/workspace.service';

const ORG_ID = 'test-org-id';
const OTHER_ORG_ID = 'test-org-id-2';

let userCounter = 0;
async function makeUserWithJobRole(jobRoleCode: string, userRole = 'ADMIN') {
  userCounter++;
  const user = await prisma.user.create({
    data: {
      name: `Workspace Test User ${userCounter}`,
      email: `workspace.test.${Date.now()}.${userCounter}@test.com`,
      organizationId: ORG_ID,
      role: userRole,
    },
  });
  const jobRole = await getJobRoleByCode(jobRoleCode);
  await assignJobRole({
    organizationId: ORG_ID,
    userId: user.id,
    jobRoleId: jobRole!.id,
    assignedBy: 'admin-workspace-test',
  });
  return { user, jobRole: jobRole! };
}

describe('Workspaces por Login/Cargo (PROMPT 6)', () => {
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
    await prisma.userJobRole.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.user.deleteMany({
      where: { organizationId: ORG_ID, email: { contains: 'workspace.test' } },
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

  describe('os 12 cargos', () => {
    it.each(JOB_ROLE_CODES)(
      '%s: workspace READY com jobRole, KPIs, agentGroups, módulos e homeWidgets',
      async (code) => {
        const { user } = await makeUserWithJobRole(code);
        const workspace = await getWorkspaceForUser(ORG_ID, user.id, 'ADMIN');

        expect(workspace.status).toBe('READY');
        expect(workspace.jobRole?.code).toBe(code);
        expect(workspace.homeWidgets.length).toBeGreaterThan(0);
        expect(workspace.kpis.length).toBeGreaterThan(0);
        expect(workspace.modules.length).toBeGreaterThan(0);
        // Nenhum status inventado — cada KPI cai numa das razões já conhecidas do Capability Engine.
        for (const kpi of workspace.kpis) {
          expect([
            'AVAILABLE',
            'APPROVAL_REQUIRED',
            'REQUEST',
            'DISCOVER_ONLY',
            'SOURCE_REQUIRED',
            'FUTURE_TOOL',
            'TOOL_UNAVAILABLE',
            'NOT_GRANTED',
          ]).toContain(kpi.status);
        }
      },
    );
  });

  describe('usuário sem cargo', () => {
    it('sem UserJobRole primário ativo: status NO_JOB_ROLE, payload vazio (nunca inventa um cargo)', async () => {
      userCounter++;
      const user = await prisma.user.create({
        data: {
          name: 'Workspace Test User Sem Cargo',
          email: `workspace.test.${Date.now()}.${userCounter}@test.com`,
          organizationId: ORG_ID,
          role: 'ADMIN',
        },
      });

      const workspace = await getWorkspaceForUser(ORG_ID, user.id, 'ADMIN');

      expect(workspace.status).toBe('NO_JOB_ROLE');
      expect(workspace.jobRole).toBeNull();
      expect(workspace.kpis).toEqual([]);
      expect(workspace.agentGroups).toEqual([]);
      expect(workspace.modules).toEqual([]);
      expect(workspace.quickActions).toEqual([]);
    });
  });

  describe('VISUALIZADOR — UserRole nunca eleva o que o workspace mostra', () => {
    it('mesmo JobRole, UserRole VISUALIZADOR retorna exatamente os mesmos KPIs/agentGroups de UserRole ADMIN', async () => {
      const { user: userAdmin } = await makeUserWithJobRole('SDR', 'ADMIN');
      const { user: userViz } = await makeUserWithJobRole('SDR', 'VISUALIZADOR');

      const workspaceAdmin = await getWorkspaceForUser(ORG_ID, userAdmin.id, 'ADMIN');
      const workspaceViz = await getWorkspaceForUser(ORG_ID, userViz.id, 'VISUALIZADOR');

      expect(workspaceViz.kpis).toEqual(workspaceAdmin.kpis);
      expect(workspaceViz.agentGroups).toEqual(workspaceAdmin.agentGroups);
    });
  });

  describe('deep link — módulo restrito reflete o mesmo gate real de UserRole (RequireRole)', () => {
    it('GERENTE_COMERCIAL com UserRole SDR: commercial_intelligence vem locked=true, com motivo', async () => {
      const { user } = await makeUserWithJobRole('GERENTE_COMERCIAL', 'SDR');
      const workspace = await getWorkspaceForUser(ORG_ID, user.id, 'SDR');

      const module = workspace.modules.find((m) => m.moduleKey === 'commercial_intelligence');
      expect(module).toBeDefined();
      expect(module!.locked).toBe(true);
      expect(module!.lockedReason).toMatch(/Gestor/);

      const quickAction = workspace.quickActions.find(
        (qa) => qa.moduleKey === 'commercial_intelligence',
      );
      expect(quickAction!.locked).toBe(true);
    });

    it('GERENTE_COMERCIAL com UserRole GESTOR: commercial_intelligence vem locked=false', async () => {
      const { user } = await makeUserWithJobRole('GERENTE_COMERCIAL', 'GESTOR');
      const workspace = await getWorkspaceForUser(ORG_ID, user.id, 'GESTOR');

      const module = workspace.modules.find((m) => m.moduleKey === 'commercial_intelligence');
      expect(module!.locked).toBe(false);
      expect(module!.lockedReason).toBeNull();
    });
  });

  describe('REQUEST', () => {
    it('RoleCapabilityGrant.accessLevel=REQUEST reflete status REQUEST no KPI correspondente', async () => {
      const { user } = await makeUserWithJobRole('LDR');
      const jobRole = await getJobRoleByCode('LDR');
      const capability = await prisma.capabilityDefinition.findUniqueOrThrow({
        where: { code: 'lead.read' },
      });
      const existing = await prisma.roleCapabilityGrant.findUniqueOrThrow({
        where: {
          jobRoleId_capabilityDefinitionId: {
            jobRoleId: jobRole!.id,
            capabilityDefinitionId: capability.id,
          },
        },
      });

      await prisma.roleCapabilityGrant.update({
        where: { id: existing.id },
        data: { accessLevel: 'REQUEST' },
      });
      try {
        const workspace = await getWorkspaceForUser(ORG_ID, user.id, 'ADMIN');
        const kpi = workspace.kpis.find((k) => k.capabilityCode === 'lead.read');
        expect(kpi?.status).toBe('REQUEST');
      } finally {
        await prisma.roleCapabilityGrant.update({
          where: { id: existing.id },
          data: { accessLevel: existing.accessLevel },
        });
      }
    });
  });

  describe('SOURCE_REQUIRED / FUTURE_TOOL — bloqueio real permanece visível, nunca escondido', () => {
    it('RECEITA_FATURAMENTO: billing.read e billing.reconcile aparecem como SOURCE_REQUIRED', async () => {
      const { user } = await makeUserWithJobRole('RECEITA_FATURAMENTO');
      const workspace = await getWorkspaceForUser(ORG_ID, user.id, 'ADMIN');

      const billingRead = workspace.kpis.find((k) => k.capabilityCode === 'billing.read');
      const billingReconcile = workspace.kpis.find((k) => k.capabilityCode === 'billing.reconcile');
      expect(billingRead?.status).toBe('SOURCE_REQUIRED');
      expect(billingReconcile?.status).toBe('SOURCE_REQUIRED');
    });

    it('CONTRATOS_ASSINATURA: contract.generate e signature.request aparecem como FUTURE_TOOL; contract.read continua AVAILABLE', async () => {
      const { user } = await makeUserWithJobRole('CONTRATOS_ASSINATURA');
      const workspace = await getWorkspaceForUser(ORG_ID, user.id, 'ADMIN');

      const generate = workspace.kpis.find((k) => k.capabilityCode === 'contract.generate');
      const signature = workspace.kpis.find((k) => k.capabilityCode === 'signature.request');
      const read = workspace.kpis.find((k) => k.capabilityCode === 'contract.read');
      expect(generate?.status).toBe('FUTURE_TOOL');
      expect(signature?.status).toBe('FUTURE_TOOL');
      expect(read?.status).toBe('AVAILABLE');
    });
  });

  describe('agent groups — refletem RoleAgentGrant real, nunca inventado', () => {
    it('SDR: grupo EXECUTE não está vazio (agente canônico do cargo já concedido)', async () => {
      const { user } = await makeUserWithJobRole('SDR');
      const workspace = await getWorkspaceForUser(ORG_ID, user.id, 'ADMIN');

      const executeGroup = workspace.agentGroups.find((g) => g.accessLevel === 'EXECUTE');
      expect(executeGroup).toBeDefined();
      expect(executeGroup!.agents.length).toBeGreaterThan(0);
    });
  });

  describe('responsividade dos dados (payload agnóstico de viewport)', () => {
    it('workspace não carrega nenhum dado dependente de tamanho de tela — mesma resposta para qualquer client', async () => {
      const { user } = await makeUserWithJobRole('BDR');
      const first = await getWorkspaceForUser(ORG_ID, user.id, 'ADMIN');
      const second = await getWorkspaceForUser(ORG_ID, user.id, 'ADMIN');
      expect(first).toEqual(second);
    });
  });

  describe('tenant isolation', () => {
    it('workspace resolvido só dentro do próprio tenant (RLS) — cargo de outro tenant nunca é visto', async () => {
      const { user } = await makeUserWithJobRole('LDR');

      const crossTenantWorkspace = await requestContext.run({ tenantId: OTHER_ORG_ID }, () =>
        getWorkspaceForUser(ORG_ID, user.id, 'ADMIN'),
      );
      expect(crossTenantWorkspace.status).toBe('NO_JOB_ROLE');

      const realWorkspace = await requestContext.run({ tenantId: ORG_ID }, () =>
        getWorkspaceForUser(ORG_ID, user.id, 'ADMIN'),
      );
      expect(realWorkspace.status).toBe('READY');
    });
  });
});
