import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/lib/prisma.js';
import { JOB_ROLE_CATALOG } from '../../src/config/job-role-catalog.js';
import {
  seedCanonicalJobRoles,
  getJobRoleByCode,
  assignJobRole,
} from '../../src/features/job-roles/services/jobRole.service.js';
import {
  upsertAgentDefinition,
  grantAgentToRole,
} from '../../src/features/job-roles/services/agentCatalog.service.js';
import {
  upsertCapabilityDefinition,
  grantCapabilityToAgent,
  grantCapabilityToRole,
  listCapabilityDefinitions,
} from '../../src/features/job-roles/services/capabilityCatalog.service.js';
import { runCapabilitySeed } from '../../scripts/seed-capabilities.js';
import { authorizeCapability } from '../../src/features/job-roles/services/capabilityAuthorization.service.js';
import express, { type Express } from 'express';
import { capabilityRoutes } from '../../src/features/job-roles/routes/capability.routes.js';
import { agentCatalogRoutes } from '../../src/features/job-roles/routes/agentCatalog.routes.js';
import { jobRoleRoutes } from '../../src/features/job-roles/routes/jobRole.routes.js';

const ORG_ID = 'test-org-id';

function buildTestApp(): Express {
  const app = express();
  app.use(express.json());
  // Mock middleware de autenticação
  app.use((req, _res, next) => {
    (req as any).user = {
      id: 'test-user-id',
      organizationId: ORG_ID,
      role: 'SDR',
    };
    next();
  });
  app.use('/api/capabilities', capabilityRoutes);
  app.use('/api/agents', agentCatalogRoutes);
  app.use('/api/job-roles', jobRoleRoutes);
  return app;
}

describe('PROMPT 3 — Capability & Permission Engine', () => {
  beforeEach(async () => {
    await seedCanonicalJobRoles(JOB_ROLE_CATALOG);
  });

  afterEach(async () => {
    await prisma.roleCapabilityGrant.deleteMany();
    await prisma.agentCapabilityGrant.deleteMany();
    await prisma.roleAgentGrant.deleteMany();
    await prisma.userJobRole.deleteMany();
    await prisma.agentVersion.deleteMany();
    await prisma.agentDefinition.deleteMany();
    await prisma.capabilityDefinition.deleteMany();
  });

  describe('1. Idempotência do Catálogo e Seeding', () => {
    it('executar o seed de capabilities 2x é idempotente e produz exatamente 117 capabilities', async () => {
      const sdrRole = await getJobRoleByCode('SDR');
      await upsertAgentDefinition({
        code: 'sdr-qualification',
        name: 'SDR de Qualificação',
        primaryJobRoleId: sdrRole!.id,
        status: 'PRODUCTION_READY',
      });

      const seed1 = await runCapabilitySeed();
      expect(seed1.capabilitiesUpserted).toBe(117);

      const capsFirstRun = await listCapabilityDefinitions({ activeOnly: false });
      expect(capsFirstRun).toHaveLength(117);

      const seed2 = await runCapabilitySeed();
      expect(seed2.capabilitiesUpserted).toBe(117);

      const capsSecondRun = await listCapabilityDefinitions({ activeOnly: false });
      expect(capsSecondRun).toHaveLength(117);
    });

    it('desativar capability oculta de activeOnly mas preserva histórico', async () => {
      const cap = await upsertCapabilityDefinition({
        code: 'test.temporary.audit',
        name: 'Capability Temporária',
        domain: 'TEST',
        riskLevel: 'LOW',
        actionType: 'READ',
        isReadOnly: true,
      });

      expect(cap.isActive).toBe(true);

      const activeList = await listCapabilityDefinitions({ activeOnly: true });
      expect(activeList.some((c) => c.code === 'test.temporary.audit')).toBe(true);

      await prisma.capabilityDefinition.update({
        where: { id: cap.id },
        data: { isActive: false },
      });

      const activeAfter = await listCapabilityDefinitions({ activeOnly: true });
      expect(activeAfter.some((c) => c.code === 'test.temporary.audit')).toBe(false);

      const allList = await listCapabilityDefinitions({ activeOnly: false });
      expect(allList.some((c) => c.code === 'test.temporary.audit')).toBe(true);
    });
  });

  describe('2. Autorização Canônica (authorizeCapability) — Fail Closed', () => {
    it('retorna PERMITTED para ator SDR com agente SDR e capability lead.qualify', async () => {
      const sdrRole = await getJobRoleByCode('SDR');

      const user = await prisma.user.create({
        data: { name: 'João SDR', email: 'joao.sdr@engine.test', role: 'SDR', organizationId: ORG_ID },
      });
      await assignJobRole({
        organizationId: ORG_ID,
        userId: user.id,
        jobRoleId: sdrRole!.id,
        assignedBy: 'admin-1',
      });

      const agent = await upsertAgentDefinition({
        code: 'sdr-qualification',
        name: 'SDR Qualificador',
        primaryJobRoleId: sdrRole!.id,
        status: 'PRODUCTION_READY',
      });

      await grantAgentToRole({
        jobRoleId: sdrRole!.id,
        agentDefinitionId: agent.id,
        accessLevel: 'EXECUTE',
      });

      const cap = await upsertCapabilityDefinition({
        code: 'lead.qualify',
        name: 'Qualificar Lead',
        domain: 'SDR',
        riskLevel: 'LOW',
        actionType: 'EXECUTE',
        isReadOnly: false,
      });

      await grantCapabilityToAgent({
        agentDefinitionId: agent.id,
        capabilityDefinitionId: cap.id,
      });

      await grantCapabilityToRole({
        jobRoleId: sdrRole!.id,
        capabilityDefinitionId: cap.id,
        accessLevel: 'EXECUTE',
      });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'SDR' },
        agentId: agent.code,
        capabilityCode: 'lead.qualify',
        resource: { type: 'lead', id: 'lead-123' },
      });

      expect(decision.allowed).toBe(true);
      expect(decision.reason).toBe('PERMITTED');
      expect(decision.requiresApproval).toBe(false);
      expect(decision.toolCode).toBe('crm');
      expect(decision.toolAvailable).toBe(true);
      expect(decision.actor.jobRoleCode).toBe('SDR');
      expect(decision.agent.code).toBe('sdr-qualification');
      expect(decision.resource).toEqual({ type: 'lead', id: 'lead-123' });
    });

    it('nega com UNKNOWN_CAPABILITY quando capabilityCode não existe', async () => {
      const sdrRole = await getJobRoleByCode('SDR');
      const user = await prisma.user.create({
        data: { name: 'User Test', email: 'user.test@engine.test', role: 'ADMIN', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: sdrRole!.id, assignedBy: 'system' });

      const agent = await upsertAgentDefinition({
        code: 'any-agent',
        name: 'Any Agent',
        primaryJobRoleId: sdrRole!.id,
      });
      await grantAgentToRole({ jobRoleId: sdrRole!.id, agentDefinitionId: agent.id, accessLevel: 'EXECUTE' });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'ADMIN' },
        agentId: 'any-agent',
        capabilityCode: 'non.existent.capability',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('UNKNOWN_CAPABILITY');
    });

    it('nega com INACTIVE_CAPABILITY se a capability foi desativada', async () => {
      const sdrRole = await getJobRoleByCode('SDR');
      const user = await prisma.user.create({
        data: { name: 'Lucas Inativo', email: 'lucas@engine.test', role: 'SDR', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: sdrRole!.id, assignedBy: 'admin-1' });

      const agent = await upsertAgentDefinition({
        code: 'agent-inactive-cap',
        name: 'Agente Cap Inativa',
        primaryJobRoleId: sdrRole!.id,
      });
      await grantAgentToRole({ jobRoleId: sdrRole!.id, agentDefinitionId: agent.id, accessLevel: 'EXECUTE' });

      const cap = await upsertCapabilityDefinition({
        code: 'cap.to.deactivate',
        name: 'Cap To Deactivate',
        domain: 'TEST',
        riskLevel: 'LOW',
        actionType: 'READ',
      });
      await prisma.capabilityDefinition.update({ where: { id: cap.id }, data: { isActive: false } });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'SDR' },
        agentId: agent.id,
        capabilityCode: 'cap.to.deactivate',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('INACTIVE_CAPABILITY');
    });

    it('nega com UNKNOWN_AGENT quando o agente não existe', async () => {
      const sdrRole = await getJobRoleByCode('SDR');
      const user = await prisma.user.create({
        data: { name: 'Marta User', email: 'marta@engine.test', role: 'SDR', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: sdrRole!.id, assignedBy: 'admin-1' });

      await upsertCapabilityDefinition({
        code: 'lead.read',
        name: 'Ler Lead',
        domain: 'CRM',
        riskLevel: 'LOW',
        actionType: 'READ',
      });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'SDR' },
        agentId: 'ghost-agent-cuid',
        capabilityCode: 'lead.read',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('UNKNOWN_AGENT');
    });

    it('nega com INACTIVE_AGENT se o agente estiver inativo', async () => {
      const sdrRole = await getJobRoleByCode('SDR');
      const user = await prisma.user.create({
        data: { name: 'Nathalia SDR', email: 'nath@engine.test', role: 'SDR', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: sdrRole!.id, assignedBy: 'admin-1' });

      const agent = await upsertAgentDefinition({
        code: 'disabled-agent',
        name: 'Agente Desativado',
        primaryJobRoleId: sdrRole!.id,
      });
      await prisma.agentDefinition.update({ where: { id: agent.id }, data: { isActive: false } });

      await upsertCapabilityDefinition({
        code: 'lead.read',
        name: 'Ler Lead',
        domain: 'CRM',
        riskLevel: 'LOW',
        actionType: 'READ',
      });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'SDR' },
        agentId: agent.code,
        capabilityCode: 'lead.read',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('INACTIVE_AGENT');
    });

    it('nega com NO_JOB_ROLE se o usuário não tiver cargo profissional ativo na organização', async () => {
      const user = await prisma.user.create({
        data: { name: 'User Sem Cargo', email: 'semcargo@engine.test', role: 'SDR', organizationId: ORG_ID },
      });

      await upsertCapabilityDefinition({
        code: 'lead.read',
        name: 'Ler Lead',
        domain: 'CRM',
        riskLevel: 'LOW',
        actionType: 'READ',
      });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'SDR' },
        agentId: 'any-agent',
        capabilityCode: 'lead.read',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('NO_JOB_ROLE');
    });

    it('nega com AGENT_NOT_GRANTED_TO_ROLE quando cargo não possui grant para o agente', async () => {
      const sdrRole = await getJobRoleByCode('SDR');
      const closerRole = await getJobRoleByCode('CLOSER');

      const user = await prisma.user.create({
        data: { name: 'SDR Sem Grant', email: 'sdr.nogrant@engine.test', role: 'SDR', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: sdrRole!.id, assignedBy: 'admin-1' });

      const closerAgent = await upsertAgentDefinition({
        code: 'closer-closing-bot',
        name: 'Bot Closer',
        primaryJobRoleId: closerRole!.id,
      });
      await grantAgentToRole({ jobRoleId: closerRole!.id, agentDefinitionId: closerAgent.id, accessLevel: 'EXECUTE' });

      await upsertCapabilityDefinition({
        code: 'deal.negotiate',
        name: 'Negociar Proposta',
        domain: 'CLOSER',
        riskLevel: 'LOW',
        actionType: 'EXECUTE',
      });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'SDR' },
        agentId: closerAgent.code,
        capabilityCode: 'deal.negotiate',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('AGENT_NOT_GRANTED_TO_ROLE');
    });

    it('nega com CAPABILITY_NOT_GRANTED_TO_AGENT se o agente não possui a capability (impede prompt injection / jailbreak)', async () => {
      const sdrRole = await getJobRoleByCode('SDR');
      const user = await prisma.user.create({
        data: { name: 'Paula Gestora', email: 'paula.gestora@engine.test', role: 'GESTOR', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: sdrRole!.id, assignedBy: 'admin-1' });

      const agent = await upsertAgentDefinition({
        code: 'sdr-qualification-safe',
        name: 'SDR Safe',
        primaryJobRoleId: sdrRole!.id,
      });
      await grantAgentToRole({ jobRoleId: sdrRole!.id, agentDefinitionId: agent.id, accessLevel: 'EXECUTE' });

      const bitrixCap = await upsertCapabilityDefinition({
        code: 'bitrix.configure',
        name: 'Configurar Bitrix',
        domain: 'BITRIX',
        riskLevel: 'HIGH',
        actionType: 'ADMIN',
      });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'GESTOR' },
        agentId: agent.code,
        capabilityCode: bitrixCap.code,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('CAPABILITY_NOT_GRANTED_TO_AGENT');
    });

    it('nega com CAPABILITY_NOT_GRANTED_TO_ROLE se o agente tem a capability mas o cargo do usuário não', async () => {
      const sdrRole = await getJobRoleByCode('SDR');
      const user = await prisma.user.create({
        data: { name: 'Rafael SDR', email: 'rafael@engine.test', role: 'SDR', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: sdrRole!.id, assignedBy: 'admin-1' });

      const agent = await upsertAgentDefinition({
        code: 'hybrid-agent',
        name: 'Hybrid Agent',
        primaryJobRoleId: sdrRole!.id,
      });
      await grantAgentToRole({ jobRoleId: sdrRole!.id, agentDefinitionId: agent.id, accessLevel: 'EXECUTE' });

      const contractCap = await upsertCapabilityDefinition({
        code: 'contract.sign',
        name: 'Assinar Contrato',
        domain: 'CONTRACTS',
        riskLevel: 'HIGH',
        actionType: 'EXECUTE',
      });

      await grantCapabilityToAgent({
        agentDefinitionId: agent.id,
        capabilityDefinitionId: contractCap.id,
      });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'SDR' },
        agentId: agent.code,
        capabilityCode: contractCap.code,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('CAPABILITY_NOT_GRANTED_TO_ROLE');
    });

    it('nega com SOURCE_REQUIRED quando a capability depende de backend não implementado (toolBindings.ts available=false)', async () => {
      const billingRole = await getJobRoleByCode('RECEITA_FATURAMENTO');
      const user = await prisma.user.create({
        data: { name: 'Fabio Billing', email: 'fabio.billing@engine.test', role: 'GESTOR', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: billingRole!.id, assignedBy: 'admin-1' });

      const agent = await upsertAgentDefinition({
        code: 'billing-invoice-bot',
        name: 'Bot Invoice',
        primaryJobRoleId: billingRole!.id,
      });
      await grantAgentToRole({ jobRoleId: billingRole!.id, agentDefinitionId: agent.id, accessLevel: 'EXECUTE' });

      const invoiceCap = await upsertCapabilityDefinition({
        code: 'invoice.generate',
        name: 'Gerar Fatura',
        domain: 'BILLING',
        riskLevel: 'MEDIUM',
        actionType: 'EXECUTE',
      });

      await grantCapabilityToAgent({ agentDefinitionId: agent.id, capabilityDefinitionId: invoiceCap.id });
      await grantCapabilityToRole({ jobRoleId: billingRole!.id, capabilityDefinitionId: invoiceCap.id, accessLevel: 'EXECUTE' });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'GESTOR' },
        agentId: agent.code,
        capabilityCode: 'invoice.generate',
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('SOURCE_REQUIRED');
      expect(decision.toolAvailable).toBe(false);
      expect(decision.toolCode).toBe('billing');
    });

    it('nega com USER_ROLE_FORBIDDEN se o usuário é VISUALIZADOR e a capability é WRITE ou ADMIN (Supremacia do UserRole)', async () => {
      const closerRole = await getJobRoleByCode('CLOSER');
      const user = await prisma.user.create({
        data: { name: 'Audit Closer', email: 'audit.closer@engine.test', role: 'VISUALIZADOR', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: closerRole!.id, assignedBy: 'admin-1' });

      const agent = await upsertAgentDefinition({
        code: 'closer-exec-bot',
        name: 'Bot Closer Exec',
        primaryJobRoleId: closerRole!.id,
      });
      await grantAgentToRole({ jobRoleId: closerRole!.id, agentDefinitionId: agent.id, accessLevel: 'EXECUTE' });

      const dealUpdateCap = await upsertCapabilityDefinition({
        code: 'deal.update',
        name: 'Atualizar Oportunidade',
        domain: 'CLOSER',
        riskLevel: 'LOW',
        actionType: 'WRITE',
      });

      await grantCapabilityToAgent({ agentDefinitionId: agent.id, capabilityDefinitionId: dealUpdateCap.id });
      await grantCapabilityToRole({ jobRoleId: closerRole!.id, capabilityDefinitionId: dealUpdateCap.id, accessLevel: 'EXECUTE' });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'VISUALIZADOR' },
        agentId: agent.code,
        capabilityCode: dealUpdateCap.code,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('USER_ROLE_FORBIDDEN');
    });

    it('UserRole ADMIN não bypassa grant funcional ausente (ADMIN não pode rodar Closer sem o grant)', async () => {
      const sdrRole = await getJobRoleByCode('SDR');
      const closerRole = await getJobRoleByCode('CLOSER');

      const adminUser = await prisma.user.create({
        data: { name: 'Admin Root', email: 'admin.root@engine.test', role: 'ADMIN', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: adminUser.id, jobRoleId: sdrRole!.id, assignedBy: 'system' });

      const closerAgent = await upsertAgentDefinition({
        code: 'exclusive-closer-bot',
        name: 'Exclusive Closer',
        primaryJobRoleId: closerRole!.id,
      });
      await grantAgentToRole({ jobRoleId: closerRole!.id, agentDefinitionId: closerAgent.id, accessLevel: 'EXECUTE' });

      const cap = await upsertCapabilityDefinition({
        code: 'deal.create',
        name: 'Criar Oportunidade',
        domain: 'CLOSER',
        riskLevel: 'LOW',
        actionType: 'WRITE',
      });

      const decision = await authorizeCapability({
        actor: { id: adminUser.id, organizationId: ORG_ID, role: 'ADMIN' },
        agentId: closerAgent.code,
        capabilityCode: cap.code,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('AGENT_NOT_GRANTED_TO_ROLE');
    });

    it('marca APPROVAL_REQUIRED quando capability HIGH possui binding real verificável', async () => {
      const bitrixRole = await getJobRoleByCode('BITRIX_GUARDIAN');
      const user = await prisma.user.create({
        data: { name: 'Gestora CRM', email: 'gestora.crm@engine.test', role: 'GESTOR', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: bitrixRole!.id, assignedBy: 'admin-1' });

      const agent = await upsertAgentDefinition({
        code: 'bitrix-writeback-test-agent',
        name: 'Bitrix Writeback Test Agent',
        primaryJobRoleId: bitrixRole!.id,
      });
      await grantAgentToRole({ jobRoleId: bitrixRole!.id, agentDefinitionId: agent.id, accessLevel: 'EXECUTE' });

      const cap = await upsertCapabilityDefinition({
        code: 'bitrix.write',
        name: 'Escrita no Bitrix24',
        domain: 'BITRIX',
        riskLevel: 'HIGH',
        actionType: 'WRITE',
        requiresApprovalByDefault: true,
      });

      await grantCapabilityToAgent({ agentDefinitionId: agent.id, capabilityDefinitionId: cap.id });
      await grantCapabilityToRole({ jobRoleId: bitrixRole!.id, capabilityDefinitionId: cap.id, accessLevel: 'EXECUTE' });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'GESTOR' },
        agentId: agent.code,
        capabilityCode: cap.code,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.requiresApproval).toBe(true);
      expect(decision.reason).toBe('APPROVAL_REQUIRED');
      expect(decision.riskLevel).toBe('HIGH');
      expect(decision.toolAvailable).toBe(true);
      expect(decision.bindingVerification).toBe('VERIFIED');
    });

    it('mantém assinatura externa como FUTURE_TOOL enquanto o transporte gov.br for stub', async () => {
      const contractRole = await getJobRoleByCode('CONTRATOS_ASSINATURA');
      const user = await prisma.user.create({
        data: { name: 'Gestora Contratos', email: 'gestora.contratos@engine.test', role: 'GESTOR', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: contractRole!.id, assignedBy: 'admin-1' });

      const agent = await upsertAgentDefinition({
        code: 'signature-stub-test-agent',
        name: 'Signature Stub Test Agent',
        primaryJobRoleId: contractRole!.id,
      });
      await grantAgentToRole({ jobRoleId: contractRole!.id, agentDefinitionId: agent.id, accessLevel: 'EXECUTE' });

      const cap = await upsertCapabilityDefinition({
        code: 'contract.request_signature',
        name: 'Disparo de Assinatura de Contrato',
        domain: 'CONTRACTS',
        riskLevel: 'CRITICAL',
        actionType: 'ADMIN',
        requiresApprovalByDefault: true,
      });

      await grantCapabilityToAgent({ agentDefinitionId: agent.id, capabilityDefinitionId: cap.id });
      await grantCapabilityToRole({ jobRoleId: contractRole!.id, capabilityDefinitionId: cap.id, accessLevel: 'EXECUTE' });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'GESTOR' },
        agentId: agent.code,
        capabilityCode: cap.code,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe('FUTURE_TOOL');
      expect(decision.toolAvailable).toBe(false);
      expect(decision.bindingVerification).toBe('UNVERIFIED');
    });

    it('retorna CROSS_ROLE_REQUEST_REQUIRED quando cargo possui nível de acesso REQUEST', async () => {
      const sdrRole = await getJobRoleByCode('SDR');
      const user = await prisma.user.create({
        data: { name: 'SDR Pedinte', email: 'sdr.pedinte@engine.test', role: 'SDR', organizationId: ORG_ID },
      });
      await assignJobRole({ organizationId: ORG_ID, userId: user.id, jobRoleId: sdrRole!.id, assignedBy: 'admin-1' });

      const agent = await upsertAgentDefinition({
        code: 'sdr-request-agent',
        name: 'Agente Request',
        primaryJobRoleId: sdrRole!.id,
      });
      await grantAgentToRole({ jobRoleId: sdrRole!.id, agentDefinitionId: agent.id, accessLevel: 'EXECUTE' });

      const cap = await upsertCapabilityDefinition({
        code: 'forecast.explain',
        name: 'Explicar Forecast',
        domain: 'REVENUE',
        riskLevel: 'LOW',
        actionType: 'READ',
      });

      await grantCapabilityToAgent({ agentDefinitionId: agent.id, capabilityDefinitionId: cap.id });
      await grantCapabilityToRole({ jobRoleId: sdrRole!.id, capabilityDefinitionId: cap.id, accessLevel: 'REQUEST' });

      const decision = await authorizeCapability({
        actor: { id: user.id, organizationId: ORG_ID, role: 'SDR' },
        agentId: agent.code,
        capabilityCode: cap.code,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.requiresApproval).toBe(true);
      expect(decision.reason).toBe('CROSS_ROLE_REQUEST_REQUIRED');
      expect(decision.accessLevel).toBe('REQUEST');
    });
  });

  describe('3. HTTP Endpoints (/api/capabilities, /api/agents/:id/capabilities, /api/job-roles/:id/capabilities)', () => {
    let testApp: Express;

    beforeEach(() => {
      testApp = buildTestApp();
    });

    it('GET /api/capabilities lista capabilities ativas', async () => {
      await upsertCapabilityDefinition({
        code: 'http.cap.test',
        name: 'HTTP Cap Test',
        domain: 'CRM',
        riskLevel: 'LOW',
        actionType: 'READ',
      });

      const res = await request(testApp).get('/api/capabilities');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.capabilities)).toBe(true);
      expect(res.body.data.capabilities.some((c: any) => c.code === 'http.cap.test')).toBe(true);
    });

    it('GET /api/capabilities/:code retorna a capability ou 404', async () => {
      await upsertCapabilityDefinition({
        code: 'http.cap.single',
        name: 'Single Cap',
        domain: 'CRM',
        riskLevel: 'LOW',
        actionType: 'READ',
      });

      const found = await request(testApp).get('/api/capabilities/http.cap.single');
      expect(found.status).toBe(200);
      expect(found.body.data.capability.code).toBe('http.cap.single');

      const notFound = await request(testApp).get('/api/capabilities/not-found-cap');
      expect(notFound.status).toBe(404);
    });

    it('GET /api/agents/:id/capabilities e GET /api/job-roles/:id/capabilities listam grants associados', async () => {
      const sdrRole = await getJobRoleByCode('SDR');
      const agent = await upsertAgentDefinition({
        code: 'agent-http-grants',
        name: 'Agent HTTP Grants',
        primaryJobRoleId: sdrRole!.id,
      });

      const cap = await upsertCapabilityDefinition({
        code: 'http.grant.cap',
        name: 'HTTP Grant Cap',
        domain: 'SDR',
        riskLevel: 'LOW',
        actionType: 'READ',
      });

      await grantCapabilityToAgent({ agentDefinitionId: agent.id, capabilityDefinitionId: cap.id });
      await grantCapabilityToRole({ jobRoleId: sdrRole!.id, capabilityDefinitionId: cap.id, accessLevel: 'READ' });

      const agentRes = await request(testApp).get(`/api/agents/${agent.id}/capabilities`);
      expect(agentRes.status).toBe(200);
      expect(agentRes.body.data.capabilities.length).toBeGreaterThanOrEqual(1);
      expect(agentRes.body.data.capabilities.some((g: any) => g.capability.code === 'http.grant.cap')).toBe(true);

      const roleRes = await request(testApp).get(`/api/job-roles/${sdrRole!.id}/capabilities`);
      expect(roleRes.status).toBe(200);
      expect(roleRes.body.data.capabilities.length).toBeGreaterThanOrEqual(1);
      expect(roleRes.body.data.capabilities.some((g: any) => g.capability.code === 'http.grant.cap')).toBe(true);
    });
  });
});