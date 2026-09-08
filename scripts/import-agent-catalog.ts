// PROMPT 2 — Importação, Normalização, Deduplicação e Distribuição dos 392 Agentes.
//
// Lê o artefato auditável `src/features/job-roles/catalog/agents.normalized.json` (gerado por
// scripts/agent-import/build-normalized-catalog.ts a partir do pacote Birth Hub 360) e faz upsert
// idempotente em AgentDefinition/AgentVersion/RoleAgentGrant — nunca cria classes/arquivos por
// agente (ver seção 2 do prompt da onda: `AgentDefinition` é o catálogo, `AgentVersion` guarda o
// conteúdo versionável).
//
// Idempotente: rodar duas vezes produz o mesmo estado (upsert por `code` / por par
// jobRoleId+agentDefinitionId / por par agentDefinitionId+version). Nunca faz downgrade de um
// RoleAgentGrant já concedido com nível maior (ver `ensureFloorGrant` abaixo).
//
// Uso: npx tsx scripts/import-agent-catalog.ts
import type { AgentDefinitionStatus } from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';
import { seedCanonicalJobRoles } from '../src/features/job-roles/services/jobRole.service.js';
import {
  upsertAgentDefinition,
  upsertAgentVersion,
  grantAgentToRole,
} from '../src/features/job-roles/services/agentCatalog.service.js';
import {
  JOB_ROLE_CATALOG,
  JOB_ROLE_CODES,
  type JobRoleCode,
} from '../src/config/job-role-catalog.js';
import normalizedCatalog from '../src/features/job-roles/catalog/agents.normalized.json';

interface NormalizedAgent {
  code: string;
  name: string;
  domain: string;
  sourceIds: string[];
  aliasNames: string[];
  primaryJobRole: JobRoleCode | null;
  secondaryJobRoles: { code: JobRoleCode; accessLevel: 'READ' | 'REQUEST' }[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  binding: { type: string; existingCode?: string };
  hasPrompt: boolean;
  description: string | null;
  systemPrompt: string | null;
  requiresApproval: boolean;
  isCommon: boolean;
}

const COMMON_AGENT_CODES = [
  'ldr-intelligence',
  'bdr-outbound',
  'bitrix-guardian',
  'agent-builder',
  'knowledge',
  'handoff-agent',
];

function resolveStatus(agent: NormalizedAgent): AgentDefinitionStatus {
  if (agent.binding.type === 'FUTURE_TOOL') return 'BLOCKED';
  if (agent.hasPrompt) return 'PROMPT_READY';
  if (agent.binding.type === 'SOURCE_REQUIRED') return 'SOURCE_REQUIRED';
  return 'CATALOG_ONLY';
}

async function importJobRoles(): Promise<Map<JobRoleCode, string>> {
  const roles = await seedCanonicalJobRoles(JOB_ROLE_CATALOG);
  return new Map(roles.map((r) => [r.code as JobRoleCode, r.id]));
}

/** Concede um piso de acesso (DISCOVER/READ) sem nunca fazer downgrade de um grant já existente
 *  com nível maior — usado para os 6 agentes "comuns a todos os 12 cargos" (seção 21), cujo cargo
 *  dono já pode ter EXECUTE concedido pelo passo normal (primaryJobRole) ou pelo seed do Prompt 1. */
async function ensureFloorGrant(
  jobRoleId: string,
  agentDefinitionId: string,
  floor: 'DISCOVER' | 'READ',
) {
  await prisma.roleAgentGrant.upsert({
    where: { jobRoleId_agentDefinitionId: { jobRoleId, agentDefinitionId } },
    create: { jobRoleId, agentDefinitionId, accessLevel: floor, isActive: true },
    update: {}, // nunca sobrescreve um grant já existente (evita downgrade)
  });
}

/** Garante o piso de acesso de um agente comum nos 12 cargos, sem downgrade (ver
 *  `ensureFloorGrant`). Retorna quantos cargos foram processados, para o total do relatório. */
async function ensureCommonGrants(
  agentDefinitionId: string,
  jobRoleIdByCode: Map<JobRoleCode, string>,
  floor: 'DISCOVER' | 'READ',
): Promise<number> {
  let count = 0;
  for (const code of JOB_ROLE_CODES) {
    const roleId = jobRoleIdByCode.get(code);
    if (!roleId) continue;
    await ensureFloorGrant(roleId, agentDefinitionId, floor);
    count++;
  }
  return count;
}

export interface AgentCatalogImportSummary {
  agentDefinitionsUpserted: number;
  agentVersionsUpserted: number;
  grantsApplied: number;
  commonGrantsEnsured: number;
  missingJobRoleRefs: string[];
}

/** Exportado (além de acionado por `main()` abaixo) para ser chamado direto por um teste de
 *  integração, sem precisar spawnar este arquivo como processo separado — mesmo padrão de
 *  `runMultiCargoSeed` em scripts/seed-multi-cargo.ts (Prompt 1). */
export async function runAgentCatalogImport(): Promise<AgentCatalogImportSummary> {
  const agents = normalizedCatalog.agents as NormalizedAgent[];
  console.log(`Importando ${agents.length} agentes canônicos de agents.normalized.json...`);

  const jobRoleIdByCode = await importJobRoles();

  let created = 0;
  let withVersion = 0;
  let grantsCreated = 0;
  let commonGrantsEnsured = 0;
  const missingRole: string[] = [];

  for (const agent of agents) {
    const primaryJobRoleId = agent.primaryJobRole
      ? (jobRoleIdByCode.get(agent.primaryJobRole) ?? null)
      : null;
    if (agent.primaryJobRole && !primaryJobRoleId)
      missingRole.push(`${agent.code} -> ${agent.primaryJobRole}`);

    const definition = await upsertAgentDefinition({
      code: agent.code,
      name: agent.name,
      description: agent.description ?? undefined,
      domain: agent.domain,
      primaryJobRoleId,
      status: resolveStatus(agent),
      risk: agent.risk,
      requiresApproval: agent.requiresApproval,
    });
    created++;

    if (agent.hasPrompt && agent.systemPrompt) {
      await upsertAgentVersion({
        agentDefinitionId: definition.id,
        version: 1,
        systemPrompt: agent.systemPrompt,
        status: 'ACTIVE',
      });
      withVersion++;
    }

    if (agent.primaryJobRole && primaryJobRoleId) {
      await grantAgentToRole({
        jobRoleId: primaryJobRoleId,
        agentDefinitionId: definition.id,
        accessLevel: 'EXECUTE',
        requiresApproval: agent.requiresApproval,
      });
      grantsCreated++;
    }
    for (const sec of agent.secondaryJobRoles) {
      const secId = jobRoleIdByCode.get(sec.code);
      if (!secId) {
        missingRole.push(`${agent.code} -> ${sec.code} (secundário)`);
        continue;
      }
      await grantAgentToRole({
        jobRoleId: secId,
        agentDefinitionId: definition.id,
        accessLevel: sec.accessLevel,
      });
      grantsCreated++;
    }

    if (agent.isCommon) {
      const floor = agent.binding.type === 'FUTURE_TOOL' ? 'DISCOVER' : 'READ';
      commonGrantsEnsured += await ensureCommonGrants(definition.id, jobRoleIdByCode, floor);
    }
  }

  // "ldr-intelligence"/"bdr-outbound"/"bitrix-guardian" são 3 dos 6 conceitos comuns (seção 21),
  // mas já existem como AgentDefinition do PROMPT 1 (commercialAgentRegistry) — nunca aparecem no
  // catálogo normalizado do ZIP, então o loop acima nunca os alcança. Tratados aqui à parte, só
  // por lookup (nunca recriados/duplicados).
  const EXISTING_COMMON_CODES = ['ldr-intelligence', 'bdr-outbound', 'bitrix-guardian'];
  for (const code of EXISTING_COMMON_CODES) {
    const existing = await prisma.agentDefinition.findUnique({ where: { code } });
    if (!existing) {
      missingRole.push(
        `agente comum já existente "${code}" não encontrado — rode o seed do PROMPT 1 antes deste importador`,
      );
      continue;
    }
    commonGrantsEnsured += await ensureCommonGrants(existing.id, jobRoleIdByCode, 'READ');
  }

  console.log('\n--- Relatório de importação ---');
  console.log('AgentDefinition upsertadas:', created);
  console.log('AgentVersion criadas/atualizadas (prompt real):', withVersion);
  console.log('RoleAgentGrant primário/secundário aplicados:', grantsCreated);
  console.log(
    'RoleAgentGrant "piso comum" garantidos (6 agentes comuns x 12 cargos):',
    commonGrantsEnsured,
  );
  if (missingRole.length > 0) {
    console.warn(
      '\nAVISO — código de cargo referenciado no catálogo normalizado sem JobRole correspondente:',
    );
    console.warn(missingRole.join('\n'));
  }
  console.log('\nAgentes comuns confirmados:', COMMON_AGENT_CODES.join(', '));

  return {
    agentDefinitionsUpserted: created,
    agentVersionsUpserted: withVersion,
    grantsApplied: grantsCreated,
    commonGrantsEnsured,
    missingJobRoleRefs: missingRole,
  };
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runAgentCatalogImport()
    .catch((error) => {
      console.error('Falha na importação do catálogo de agentes:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      const { prisma } = await import('../src/lib/prisma.js');
      await prisma.$disconnect();
    });
}
