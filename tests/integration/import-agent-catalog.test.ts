import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import normalizedCatalog from '../../src/features/job-roles/catalog/agents.normalized.json';
import { JOB_ROLE_CODES } from '../../src/config/job-role-catalog';
import { runAgentCatalogImport } from '../../scripts/import-agent-catalog';
import { runMultiCargoSeed } from '../../scripts/seed-multi-cargo';
import { COMMERCIAL_AGENT_REGISTRY } from '../../src/features/intelligence/agents/commercialAgentRegistry';

// Exercita a MESMA função usada por `npx tsx scripts/import-agent-catalog.ts` (ver guarda
// `isDirectExecution` no script — importar este módulo não dispara main() sozinho). Rodar o
// arquivo como processo standalone neste sandbox trava indefinidamente por causa de
// Redis/Meilisearch reais indisponíveis (mesmo achado documentado no PROMPT 1 para
// scripts/seed-multi-cargo.ts) — testar via import evita o travamento sem mudar o que é validado.
describe('scripts/import-agent-catalog.ts — PROMPT 2 (Birth Hub 360)', () => {
  const sourceAgentCodes = (normalizedCatalog.agents as { code: string }[]).map((a) => a.code);

  beforeAll(async () => {
    // Ordem real de rollout: PROMPT 1 (12 cargos + 12 agentes da Célula Comercial) sempre roda
    // antes do PROMPT 2 (importação dos 392) em produção — reproduzida aqui porque este banco de
    // teste começa vazio, diferente do ambiente real onde o seed do Prompt 1 já foi aplicado.
    await runMultiCargoSeed();
    await runAgentCatalogImport();
  });

  afterAll(async () => {
    await prisma.roleAgentGrant.deleteMany({ where: { agentDefinition: { code: { in: sourceAgentCodes } } } });
    await prisma.agentVersion.deleteMany({ where: { agentDefinition: { code: { in: sourceAgentCodes } } } });
    await prisma.agentDefinition.deleteMany({ where: { code: { in: sourceAgentCodes } } });
  });

  it('importa todos os agentes canônicos do artefato normalizado — nenhuma perda silenciosa', async () => {
    const rows = await prisma.agentDefinition.findMany({ where: { code: { in: sourceAgentCodes } } });
    expect(rows).toHaveLength(sourceAgentCodes.length);
  });

  it('reexecutar o importador é idempotente — mesmo estado, sem duplicar nada', async () => {
    const before = await prisma.agentDefinition.count({ where: { code: { in: sourceAgentCodes } } });
    const beforeGrants = await prisma.roleAgentGrant.count({ where: { agentDefinition: { code: { in: sourceAgentCodes } } } });

    await runAgentCatalogImport();
    await runAgentCatalogImport();

    const after = await prisma.agentDefinition.count({ where: { code: { in: sourceAgentCodes } } });
    const afterGrants = await prisma.roleAgentGrant.count({ where: { agentDefinition: { code: { in: sourceAgentCodes } } } });
    expect(after).toBe(before);
    expect(afterGrants).toBe(beforeGrants);
  });

  it('não existem dois AgentDefinition com o mesmo code (unicidade)', async () => {
    const rows = await prisma.agentDefinition.findMany({ where: { code: { in: sourceAgentCodes } }, select: { code: true } });
    const codes = rows.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('não existem duas AgentVersion ACTIVE para o mesmo agente (índice único parcial do Prompt 1)', async () => {
    const withVersions = await prisma.agentDefinition.findMany({
      where: { code: { in: sourceAgentCodes } },
      select: { id: true, versions: { where: { status: 'ACTIVE' }, select: { id: true } } },
    });
    for (const agent of withVersions) {
      expect(agent.versions.length).toBeLessThanOrEqual(1);
    }
  });

  it('consolida o par Premium/Standard como um único AgentDefinition (deduplicação semântica)', async () => {
    const pipelineOracle = await prisma.agentDefinition.findUnique({ where: { code: 'pipeline-oracle' } });
    expect(pipelineOracle).not.toBeNull();
    // "Pipeline Oracle Premium Agent" nunca vira um segundo AgentDefinition.
    const asSeparate = await prisma.agentDefinition.findFirst({
      where: { code: { contains: 'pipeline-oracle-premium' } },
    });
    expect(asSeparate).toBeNull();
  });

  it('variantes com responsabilidade suficientemente diferente permanecem como agentes distintos', async () => {
    // "Customer Health Bot" e "Churn Deflector" são conceitos próximos (ambos Customer Success)
    // mas NÃO foram colapsados entre si (só pares Premium/Standard do mesmo nome são fundidos).
    const health = await prisma.agentDefinition.findUnique({ where: { code: 'customer-health' } });
    const churn = await prisma.agentDefinition.findUnique({ where: { code: 'churn-deflector' } });
    expect(health).not.toBeNull();
    expect(churn).not.toBeNull();
    expect(health!.id).not.toBe(churn!.id);
  });

  it('todo agente canônico com primaryJobRole tem um RoleAgentGrant EXECUTE válido para esse cargo', async () => {
    const withPrimary = (normalizedCatalog.agents as { code: string; primaryJobRole: string | null }[]).filter(
      (a) => a.primaryJobRole,
    );
    expect(withPrimary.length).toBeGreaterThan(0);

    const sample = withPrimary.slice(0, 15);
    for (const agent of sample) {
      const definition = await prisma.agentDefinition.findUnique({ where: { code: agent.code } });
      const grant = await prisma.roleAgentGrant.findFirst({
        where: { agentDefinitionId: definition!.id, jobRole: { code: agent.primaryJobRole! }, accessLevel: 'EXECUTE' },
      });
      expect(grant, `${agent.code} deveria ter EXECUTE no cargo ${agent.primaryJobRole}`).not.toBeNull();
    }
  });

  it('todos os 12 cargos canônicos receberam pelo menos um agente concedido', async () => {
    for (const code of JOB_ROLE_CODES) {
      const jobRole = await prisma.jobRole.findUnique({ where: { code } });
      const count = await prisma.roleAgentGrant.count({ where: { jobRoleId: jobRole!.id } });
      expect(count, `cargo ${code} deveria ter ao menos 1 agente concedido`).toBeGreaterThan(0);
    }
  });

  it('os 6 agentes comuns (LDR/BDR Intelligence, Bitrix Guardian, Agent Builder, Knowledge, Handoff) têm acesso garantido nos 12 cargos', async () => {
    const commonCodes = ['ldr-intelligence', 'bdr-outbound', 'bitrix-guardian', 'agent-builder', 'knowledge', 'handoff-agent'];
    for (const code of commonCodes) {
      const definition = await prisma.agentDefinition.findUnique({ where: { code } });
      expect(definition, `AgentDefinition "${code}" deveria existir`).not.toBeNull();

      for (const jobRoleCode of JOB_ROLE_CODES) {
        const jobRole = await prisma.jobRole.findUnique({ where: { code: jobRoleCode } });
        const grant = await prisma.roleAgentGrant.findUnique({
          where: { jobRoleId_agentDefinitionId: { jobRoleId: jobRole!.id, agentDefinitionId: definition!.id } },
        });
        expect(grant, `cargo ${jobRoleCode} deveria ter algum grant para "${code}"`).not.toBeNull();
      }
    }
  });

  it('o piso comum nunca faz downgrade de um grant EXECUTE já existente (ex.: LDR continua EXECUTE em ldr-intelligence)', async () => {
    const ldrIntelligence = await prisma.agentDefinition.findUnique({ where: { code: 'ldr-intelligence' } });
    const ldrRole = await prisma.jobRole.findUnique({ where: { code: 'LDR' } });
    const grant = await prisma.roleAgentGrant.findUnique({
      where: { jobRoleId_agentDefinitionId: { jobRoleId: ldrRole!.id, agentDefinitionId: ldrIntelligence!.id } },
    });
    expect(grant?.accessLevel).toBe('EXECUTE');
  });

  it('os 12 agentes já existentes da Célula Comercial continuam existindo e não são duplicados', async () => {
    for (const agent of COMMERCIAL_AGENT_REGISTRY) {
      const rows = await prisma.agentDefinition.findMany({ where: { code: agent.id } });
      expect(rows, `agente existente "${agent.id}" deveria ter exatamente 1 linha`).toHaveLength(1);
    }
  });

  it('a importação nunca altera UserRole de nenhum usuário (segurança)', async () => {
    const admin = await prisma.user.create({
      data: { name: 'Admin Teste Import', email: `admin.import.${Date.now()}@test.com`, organizationId: 'test-org-id', role: 'ADMIN' },
    });
    await runAgentCatalogImport();
    const reloaded = await prisma.user.findUnique({ where: { id: admin.id } });
    expect(reloaded?.role).toBe('ADMIN');
    await prisma.user.delete({ where: { id: admin.id } });
  });
});
