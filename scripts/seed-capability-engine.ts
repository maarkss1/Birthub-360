// PROMPT 3 — Capability & Permission Engine.
//
// Lê os 3 artefatos auditáveis gerados por `scripts/capability-import/build-capability-catalog.ts`
// (`src/features/job-roles/catalog/{capabilities,agentCapabilities,roleCapabilities}.normalized.json`)
// e faz upsert idempotente em CapabilityDefinition/AgentCapabilityGrant/RoleCapabilityGrant.
//
// Pré-requisito de ordem real de rollout (mesmo padrão do PROMPT 2): este importador espera que o
// seed do PROMPT 1 (`scripts/seed-multi-cargo.ts`, 12 cargos + 12 agentes reais) e o importador do
// PROMPT 2 (`scripts/import-agent-catalog.ts`, 379 agentes Birth Hub) já tenham rodado — ele nunca
// cria AgentDefinition/JobRole, só concede capability a quem já existe. Um `code` referenciado sem
// AgentDefinition/JobRole correspondente é registrado como aviso, nunca criado por suposição.
//
// Idempotente: rodar duas vezes produz o mesmo estado (upsert por `code`/pelos pares únicos do
// schema).
//
// Uso: npx tsx scripts/seed-capability-engine.ts
import { prisma } from '../src/lib/prisma.js';
import { CAPABILITY_CATALOG } from '../src/config/capability-catalog.js';
import { JOB_ROLE_CODES, type JobRoleCode } from '../src/config/job-role-catalog.js';
import {
  upsertCapabilityDefinition,
  grantCapabilityToAgent,
  grantCapabilityToRole,
} from '../src/features/job-roles/services/capability.service.js';
import agentCapabilitiesCatalog from '../src/features/job-roles/catalog/agentCapabilities.normalized.json' with { type: 'json' };
import roleCapabilitiesCatalog from '../src/features/job-roles/catalog/roleCapabilities.normalized.json' with { type: 'json' };

interface AgentCapabilityEntry {
  agentCode: string;
  capabilityCodes: string[];
}

interface RoleCapabilityEntry {
  jobRoleCode: JobRoleCode;
  capabilityCode: string;
  accessLevel: 'DISCOVER' | 'READ' | 'EXECUTE' | 'REQUEST';
}

export interface CapabilityEngineSeedSummary {
  capabilityDefinitionsUpserted: number;
  agentGrantsApplied: number;
  roleGrantsApplied: number;
  missingAgentRefs: string[];
  missingCapabilityRefs: string[];
  missingRoleRefs: string[];
}

export async function runCapabilityEngineSeed(): Promise<CapabilityEngineSeedSummary> {
  let capabilityDefinitionsUpserted = 0;
  const capabilityIdByCode = new Map<string, string>();

  for (const capability of CAPABILITY_CATALOG) {
    const definition = await upsertCapabilityDefinition({
      code: capability.code,
      name: capability.name,
      description: capability.description,
      domain: capability.domain,
      actionType: capability.actionType,
      riskLevel: capability.riskLevel,
    });
    capabilityIdByCode.set(definition.code, definition.id);
    capabilityDefinitionsUpserted++;
  }

  let agentGrantsApplied = 0;
  const missingAgentRefs: string[] = [];
  const missingCapabilityRefs: string[] = [];

  for (const entry of agentCapabilitiesCatalog.agentCapabilities as AgentCapabilityEntry[]) {
    const agent = await prisma.agentDefinition.findUnique({
      where: { code: entry.agentCode },
      select: { id: true },
    });
    if (!agent) {
      missingAgentRefs.push(entry.agentCode);
      continue;
    }
    for (const capabilityCode of entry.capabilityCodes) {
      const capabilityId = capabilityIdByCode.get(capabilityCode);
      if (!capabilityId) {
        missingCapabilityRefs.push(`${entry.agentCode} -> ${capabilityCode}`);
        continue;
      }
      await grantCapabilityToAgent({ agentDefinitionId: agent.id, capabilityDefinitionId: capabilityId });
      agentGrantsApplied++;
    }
  }

  let roleGrantsApplied = 0;
  const missingRoleRefs: string[] = [];
  const jobRoleIdByCode = new Map<JobRoleCode, string>();
  for (const code of JOB_ROLE_CODES) {
    const jobRole = await prisma.jobRole.findUnique({ where: { code }, select: { id: true } });
    if (jobRole) jobRoleIdByCode.set(code, jobRole.id);
  }

  for (const entry of roleCapabilitiesCatalog.roleCapabilities as RoleCapabilityEntry[]) {
    const jobRoleId = jobRoleIdByCode.get(entry.jobRoleCode);
    if (!jobRoleId) {
      missingRoleRefs.push(`${entry.jobRoleCode} -> ${entry.capabilityCode}`);
      continue;
    }
    const capabilityId = capabilityIdByCode.get(entry.capabilityCode);
    if (!capabilityId) {
      missingCapabilityRefs.push(`${entry.jobRoleCode} -> ${entry.capabilityCode}`);
      continue;
    }
    const capability = CAPABILITY_CATALOG.find((c) => c.code === entry.capabilityCode);
    const requiresApproval =
      entry.accessLevel === 'REQUEST' ||
      capability?.riskLevel === 'HIGH' ||
      capability?.riskLevel === 'CRITICAL';
    await grantCapabilityToRole({
      jobRoleId,
      capabilityDefinitionId: capabilityId,
      accessLevel: entry.accessLevel,
      requiresApproval,
    });
    roleGrantsApplied++;
  }

  const summary: CapabilityEngineSeedSummary = {
    capabilityDefinitionsUpserted,
    agentGrantsApplied,
    roleGrantsApplied,
    missingAgentRefs,
    missingCapabilityRefs,
    missingRoleRefs,
  };

  console.log('\n--- Relatório do seed do Capability & Permission Engine ---');
  console.log('CapabilityDefinition upsertadas:', capabilityDefinitionsUpserted);
  console.log('AgentCapabilityGrant aplicados:', agentGrantsApplied);
  console.log('RoleCapabilityGrant aplicados:', roleGrantsApplied);
  if (missingAgentRefs.length > 0) {
    console.warn(
      `\nAVISO — ${missingAgentRefs.length} agente(s) referenciado(s) sem AgentDefinition (rode o PROMPT 1/2 antes deste seed):`,
    );
    console.warn(missingAgentRefs.slice(0, 20).join(', '));
  }
  if (missingRoleRefs.length > 0) {
    console.warn(`\nAVISO — cargo(s) referenciado(s) sem JobRole:`, missingRoleRefs.join(', '));
  }
  if (missingCapabilityRefs.length > 0) {
    console.warn(
      `\nAVISO — capability(ies) referenciada(s) sem CapabilityDefinition:`,
      missingCapabilityRefs.join(', '),
    );
  }

  return summary;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runCapabilityEngineSeed()
    .catch((error) => {
      console.error('Falha no seed do Capability & Permission Engine:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      const { prisma } = await import('../src/lib/prisma.js');
      await prisma.$disconnect();
    });
}
