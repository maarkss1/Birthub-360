import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { listJobRoles } from '../../src/features/job-roles/services/jobRole.service';
import {
  listAgentsForJobRole,
  getAgentDefinitionById,
} from '../../src/features/job-roles/services/agentCatalog.service';
import { COMMERCIAL_AGENT_REGISTRY } from '../../src/features/intelligence/agents/commercialAgentRegistry';
import {
  runMultiCargoSeed,
  AGENT_ID_TO_JOB_ROLE_CODE,
  COMMERCIAL_STATUS_TO_AGENT_DEFINITION_STATUS,
} from '../../scripts/seed-multi-cargo';

// Exercita a MESMA função usada por `npx tsx scripts/seed-multi-cargo.ts` (ver guarda
// `isDirectExecution` no script — importar este módulo não dispara main() sozinho). Rodar o
// arquivo como processo standalone neste sandbox trava indefinidamente tentando conectar a
// Redis/Meilisearch reais (nenhum dos dois está disponível aqui) — algo no import de
// src/lib/prisma.ts's tem um `await` de nível de módulo que nunca resolve sem esses serviços; a
// função em si (só Prisma) não depende de nenhum dos dois, então testar via import evita o
// travamento sem mudar o que está sendo verificado. Ver "K. Problemas encontrados" no relatório
// da onda.
describe('scripts/seed-multi-cargo.ts', () => {
  afterEach(async () => {
    await prisma.roleAgentGrant.deleteMany();
    await prisma.agentVersion.deleteMany();
    await prisma.agentDefinition.deleteMany({
      where: { code: { in: COMMERCIAL_AGENT_REGISTRY.map((a) => a.id) } },
    });
    await prisma.userJobRole.deleteMany();
  });

  it('semeia os 12 cargos e os 12 agentes da Célula Comercial, concedendo cada um ao seu cargo principal', async () => {
    await runMultiCargoSeed();

    const jobRoles = await listJobRoles({ activeOnly: false });
    expect(jobRoles).toHaveLength(12);

    for (const agent of COMMERCIAL_AGENT_REGISTRY) {
      const jobRoleCode = AGENT_ID_TO_JOB_ROLE_CODE[agent.id];
      const jobRole = jobRoles.find((r) => r.code === jobRoleCode);
      expect(jobRole, `cargo ${jobRoleCode} do agente ${agent.id} deveria existir`).toBeDefined();

      const grantedAgents = await listAgentsForJobRole(jobRole!.id);
      const grant = grantedAgents.find((g) => g.agent.code === agent.id);
      expect(
        grant,
        `agente ${agent.id} deveria estar concedido ao cargo ${jobRoleCode}`,
      ).toBeDefined();
      expect(grant?.agent.status).toBe(COMMERCIAL_STATUS_TO_AGENT_DEFINITION_STATUS[agent.status]);
    }
  });

  it('reexecutar o seed é idempotente — nem cargo nem agente duplica', async () => {
    await runMultiCargoSeed();
    await runMultiCargoSeed();

    const jobRoles = await listJobRoles({ activeOnly: false });
    expect(jobRoles).toHaveLength(12);

    const agentDefinitions = await prisma.agentDefinition.findMany({
      where: { code: { in: COMMERCIAL_AGENT_REGISTRY.map((a) => a.id) } },
    });
    expect(agentDefinitions).toHaveLength(COMMERCIAL_AGENT_REGISTRY.length);

    for (const agent of agentDefinitions) {
      const grants = await prisma.roleAgentGrant.findMany({
        where: { agentDefinitionId: agent.id },
      });
      expect(grants.length).toBeLessThanOrEqual(1);
    }
  });

  it('preserva os metadados reais de cada agente (nome/missão/domínio/risco/aprovação)', async () => {
    await runMultiCargoSeed();

    const bdr = COMMERCIAL_AGENT_REGISTRY.find((a) => a.id === 'bdr-outbound')!;
    const stored = await prisma.agentDefinition.findUnique({ where: { code: 'bdr-outbound' } });
    expect(stored?.name).toBe(bdr.name);
    expect(stored?.description).toBe(bdr.mission);
    expect(stored?.domain).toBe(bdr.layer);
    expect(stored?.risk).toBe(bdr.risk);
    expect(stored?.requiresApproval).toBe(bdr.requiresApproval);

    const detail = await getAgentDefinitionById(stored!.id);
    expect(detail?.primaryJobRole?.code).toBe('BDR');
  });
});
