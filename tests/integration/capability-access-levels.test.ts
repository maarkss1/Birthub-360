import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JOB_ROLE_CATALOG } from '../../src/config/job-role-catalog.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  grantAgentToRole,
  upsertAgentDefinition,
} from '../../src/features/job-roles/services/agentCatalog.service.js';
import { authorizeCapability } from '../../src/features/job-roles/services/capabilityAuthorization.service.js';
import {
  grantCapabilityToAgent,
  grantCapabilityToRole,
  upsertCapabilityDefinition,
} from '../../src/features/job-roles/services/capabilityCatalog.service.js';
import {
  assignJobRole,
  getJobRoleByCode,
  seedCanonicalJobRoles,
} from '../../src/features/job-roles/services/jobRole.service.js';

const ORG_ID = 'test-org-id';

async function createActor(role: 'ADMIN' | 'GESTOR' | 'CLOSER' | 'SDR' | 'VISUALIZADOR') {
  const jobRole = await getJobRoleByCode('SDR');
  const user = await prisma.user.create({
    data: {
      name: `Actor ${role}`,
      email: `actor.${role.toLowerCase()}.${Date.now()}@capability.test`,
      role,
      organizationId: ORG_ID,
    },
  });
  await assignJobRole({
    organizationId: ORG_ID,
    userId: user.id,
    jobRoleId: jobRole!.id,
    assignedBy: 'test-admin',
  });
  return { user, jobRole: jobRole! };
}

describe('Capability Engine hardening — semântica de access levels', () => {
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

  it('DISCOVER no RoleAgentGrant nunca autoriza execução', async () => {
    const { user, jobRole } = await createActor('SDR');
    const agent = await upsertAgentDefinition({
      code: 'discover-only-agent',
      name: 'Discover Only Agent',
      primaryJobRoleId: jobRole.id,
    });
    await grantAgentToRole({
      jobRoleId: jobRole.id,
      agentDefinitionId: agent.id,
      accessLevel: 'DISCOVER',
    });

    const capability = await upsertCapabilityDefinition({
      code: 'lead.qualify',
      name: 'Qualificar Lead',
      domain: 'lead',
      riskLevel: 'LOW',
      actionType: 'EXECUTE',
    });
    await grantCapabilityToAgent({
      agentDefinitionId: agent.id,
      capabilityDefinitionId: capability.id,
    });
    await grantCapabilityToRole({
      jobRoleId: jobRole.id,
      capabilityDefinitionId: capability.id,
      accessLevel: 'EXECUTE',
    });

    const decision = await authorizeCapability({
      actor: { id: user.id, organizationId: ORG_ID, role: user.role },
      agentId: agent.code,
      capabilityCode: capability.code,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('DISCOVER_ONLY');
    expect(decision.accessLevel).toBe('DISCOVER');
  });

  it('READ no RoleCapabilityGrant não autoriza capability WRITE', async () => {
    const { user, jobRole } = await createActor('SDR');
    const agent = await upsertAgentDefinition({
      code: 'read-cannot-write-agent',
      name: 'Read Cannot Write Agent',
      primaryJobRoleId: jobRole.id,
    });
    await grantAgentToRole({
      jobRoleId: jobRole.id,
      agentDefinitionId: agent.id,
      accessLevel: 'EXECUTE',
    });

    const capability = await upsertCapabilityDefinition({
      code: 'lead.update',
      name: 'Atualizar Lead',
      domain: 'lead',
      riskLevel: 'LOW',
      actionType: 'WRITE',
    });
    await grantCapabilityToAgent({
      agentDefinitionId: agent.id,
      capabilityDefinitionId: capability.id,
    });
    await grantCapabilityToRole({
      jobRoleId: jobRole.id,
      capabilityDefinitionId: capability.id,
      accessLevel: 'READ',
    });

    const decision = await authorizeCapability({
      actor: { id: user.id, organizationId: ORG_ID, role: user.role },
      agentId: agent.code,
      capabilityCode: capability.code,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('READ_ONLY_ACCESS');
    expect(decision.accessLevel).toBe('READ');
  });

  it('REQUEST nunca executa diretamente e preserva requirement de aprovação cross-role', async () => {
    const { user, jobRole } = await createActor('SDR');
    const agent = await upsertAgentDefinition({
      code: 'request-only-agent',
      name: 'Request Only Agent',
      primaryJobRoleId: jobRole.id,
    });
    await grantAgentToRole({
      jobRoleId: jobRole.id,
      agentDefinitionId: agent.id,
      accessLevel: 'REQUEST',
    });

    const capability = await upsertCapabilityDefinition({
      code: 'forecast.read',
      name: 'Ler Forecast',
      domain: 'revenue',
      riskLevel: 'LOW',
      actionType: 'READ',
    });
    await grantCapabilityToAgent({
      agentDefinitionId: agent.id,
      capabilityDefinitionId: capability.id,
    });
    await grantCapabilityToRole({
      jobRoleId: jobRole.id,
      capabilityDefinitionId: capability.id,
      accessLevel: 'READ',
    });

    const decision = await authorizeCapability({
      actor: { id: user.id, organizationId: ORG_ID, role: user.role },
      agentId: agent.code,
      capabilityCode: capability.code,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('CROSS_ROLE_REQUEST_REQUIRED');
    expect(decision.requiresApproval).toBe(true);
    expect(decision.accessLevel).toBe('REQUEST');
  });

  it('UserRole SDR não pode prosseguir com actionType ADMIN mesmo com grants funcionais', async () => {
    const { user, jobRole } = await createActor('SDR');
    const agent = await upsertAgentDefinition({
      code: 'sdr-admin-denied-agent',
      name: 'SDR Admin Denied Agent',
      primaryJobRoleId: jobRole.id,
    });
    await grantAgentToRole({
      jobRoleId: jobRole.id,
      agentDefinitionId: agent.id,
      accessLevel: 'EXECUTE',
    });

    const capability = await upsertCapabilityDefinition({
      code: 'bitrix.configure',
      name: 'Configurar Bitrix',
      domain: 'integrations',
      riskLevel: 'CRITICAL',
      actionType: 'ADMIN',
      requiresApprovalByDefault: true,
    });
    await grantCapabilityToAgent({
      agentDefinitionId: agent.id,
      capabilityDefinitionId: capability.id,
    });
    await grantCapabilityToRole({
      jobRoleId: jobRole.id,
      capabilityDefinitionId: capability.id,
      accessLevel: 'EXECUTE',
      requiresApproval: true,
    });

    const decision = await authorizeCapability({
      actor: { id: user.id, organizationId: ORG_ID, role: user.role },
      agentId: agent.code,
      capabilityCode: capability.code,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('USER_ROLE_FORBIDDEN');
  });
});
