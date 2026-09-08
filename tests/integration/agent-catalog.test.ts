import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { JOB_ROLE_CATALOG } from '../../src/config/job-role-catalog';
import { seedCanonicalJobRoles, getJobRoleByCode } from '../../src/features/job-roles/services/jobRole.service';
import {
  upsertAgentDefinition,
  upsertAgentVersion,
  grantAgentToRole,
  revokeAgentFromRole,
  listAgentDefinitions,
  getAgentDefinitionById,
  listAgentsForJobRole,
  AgentCatalogServiceError,
} from '../../src/features/job-roles/services/agentCatalog.service';

describe('Fundação Multi-Cargo — AgentDefinition/AgentVersion/RoleAgentGrant', () => {
  beforeEach(async () => {
    await seedCanonicalJobRoles(JOB_ROLE_CATALOG);
  });

  afterEach(async () => {
    await prisma.roleAgentGrant.deleteMany();
    await prisma.agentVersion.deleteMany();
    await prisma.agentDefinition.deleteMany();
  });

  it('cria e lista um AgentDefinition vinculado ao cargo principal', async () => {
    const sdr = await getJobRoleByCode('SDR');
    const agent = await upsertAgentDefinition({
      code: 'test-sdr-agent',
      name: 'Agente de Teste SDR',
      status: 'PRODUCTION_READY',
      primaryJobRoleId: sdr!.id,
    });

    expect(agent.primaryJobRole?.code).toBe('SDR');

    const list = await listAgentDefinitions({ activeOnly: true });
    expect(list.find((a) => a.code === 'test-sdr-agent')).toBeDefined();
  });

  it('reexecutar o upsert do mesmo `code` não cria uma segunda linha (idempotente)', async () => {
    await upsertAgentDefinition({ code: 'test-idempotent-agent', name: 'v1', status: 'CATALOG_ONLY' });
    await upsertAgentDefinition({ code: 'test-idempotent-agent', name: 'v2', status: 'PRODUCTION_READY' });

    const rows = await prisma.agentDefinition.findMany({ where: { code: 'test-idempotent-agent' } });
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('v2');
    expect(rows[0].status).toBe('PRODUCTION_READY');
  });

  it('agente inativo não aparece na listagem `activeOnly`', async () => {
    const agent = await upsertAgentDefinition({ code: 'test-inactive-agent', name: 'Inativo', status: 'DEPRECATED' });
    await prisma.agentDefinition.update({ where: { id: agent.id }, data: { isActive: false } });

    const activeList = await listAgentDefinitions({ activeOnly: true });
    expect(activeList.find((a) => a.code === 'test-inactive-agent')).toBeUndefined();

    const fullList = await listAgentDefinitions({ activeOnly: false });
    expect(fullList.find((a) => a.code === 'test-inactive-agent')).toBeDefined();
  });

  it('versiona um agente sem sobrescrever a versão anterior', async () => {
    const agent = await upsertAgentDefinition({ code: 'test-versioned-agent', name: 'Versionado', status: 'PROMPT_READY' });
    await upsertAgentVersion({ agentDefinitionId: agent.id, version: 1, systemPrompt: 'prompt v1', status: 'DEPRECATED' });
    await upsertAgentVersion({ agentDefinitionId: agent.id, version: 2, systemPrompt: 'prompt v2', status: 'ACTIVE' });

    const detail = await getAgentDefinitionById(agent.id);
    expect(detail?.versions).toHaveLength(2);
    const v1 = detail?.versions.find((v) => v.version === 1);
    const v2 = detail?.versions.find((v) => v.version === 2);
    expect(v1?.status).toBe('DEPRECATED');
    expect(v2?.status).toBe('ACTIVE');
  });

  it('um mesmo agente pode ser concedido a vários cargos sem duplicar o AgentDefinition', async () => {
    const sdr = await getJobRoleByCode('SDR');
    const bdr = await getJobRoleByCode('BDR');
    const closer = await getJobRoleByCode('CLOSER');

    const agent = await upsertAgentDefinition({
      code: 'company-research',
      name: 'Pesquisa de Empresa',
      status: 'PRODUCTION_READY',
    });

    await grantAgentToRole({ jobRoleId: sdr!.id, agentDefinitionId: agent.id, accessLevel: 'EXECUTE' });
    await grantAgentToRole({ jobRoleId: bdr!.id, agentDefinitionId: agent.id, accessLevel: 'EXECUTE' });
    await grantAgentToRole({ jobRoleId: closer!.id, agentDefinitionId: agent.id, accessLevel: 'READ' });

    // Continua existindo uma única linha de AgentDefinition — nunca clonada por cargo.
    const definitions = await prisma.agentDefinition.findMany({ where: { code: 'company-research' } });
    expect(definitions).toHaveLength(1);

    const sdrAgents = await listAgentsForJobRole(sdr!.id);
    const bdrAgents = await listAgentsForJobRole(bdr!.id);
    const closerAgents = await listAgentsForJobRole(closer!.id);

    expect(sdrAgents.map((g) => g.agent.code)).toContain('company-research');
    expect(bdrAgents.map((g) => g.agent.code)).toContain('company-research');
    expect(closerAgents.find((g) => g.agent.code === 'company-research')?.accessLevel).toBe('READ');
  });

  it('nega (revoga) o acesso de um cargo a um agente sem afetar outros cargos', async () => {
    const sdr = await getJobRoleByCode('SDR');
    const bdr = await getJobRoleByCode('BDR');
    const agent = await upsertAgentDefinition({ code: 'test-revoke-agent', name: 'Revogável', status: 'PRODUCTION_READY' });

    await grantAgentToRole({ jobRoleId: sdr!.id, agentDefinitionId: agent.id });
    await grantAgentToRole({ jobRoleId: bdr!.id, agentDefinitionId: agent.id });

    await revokeAgentFromRole({ jobRoleId: sdr!.id, agentDefinitionId: agent.id, actorId: 'admin-1' });

    const sdrAgents = await listAgentsForJobRole(sdr!.id);
    const bdrAgents = await listAgentsForJobRole(bdr!.id);
    expect(sdrAgents.find((g) => g.agent.code === 'test-revoke-agent')).toBeUndefined();
    expect(bdrAgents.find((g) => g.agent.code === 'test-revoke-agent')).toBeDefined();
  });

  it('rejeita revogar uma concessão inexistente', async () => {
    const sdr = await getJobRoleByCode('SDR');
    const agent = await upsertAgentDefinition({ code: 'test-never-granted', name: 'Nunca concedido', status: 'CATALOG_ONLY' });

    await expect(
      revokeAgentFromRole({ jobRoleId: sdr!.id, agentDefinitionId: agent.id, actorId: 'admin-1' }),
    ).rejects.toThrow(AgentCatalogServiceError);
  });
});
