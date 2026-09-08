import { prisma } from '../../src/lib/prisma.js';
import { COMMERCIAL_AGENT_REGISTRY } from '../../src/features/intelligence/agents/commercialAgentRegistry.js';
import normalizedAgents from '../../src/features/job-roles/catalog/agents.normalized.json';
import agentCapabilities from '../../src/features/job-roles/catalog/agentCapabilities.normalized.json';
import roleCapabilities from '../../src/features/job-roles/catalog/roleCapabilities.normalized.json';
import capabilities from '../../src/features/job-roles/catalog/capabilities.normalized.json';
import { TOOL_BINDING_REGISTRY } from '../../src/features/job-roles/catalog/toolBindings.js';
import { VERIFIED_TOOL_BINDINGS } from '../../src/features/job-roles/catalog/verifiedToolBindings.js';

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

export async function auditCapabilityEngine() {
  const importedCodes = new Set(
    (normalizedAgents.agents as Array<{ code: string }>).map((agent) => agent.code),
  );
  const cellCodes = new Set(COMMERCIAL_AGENT_REGISTRY.map((agent) => agent.id));
  const governedCodes = new Set([...importedCodes, ...cellCodes]);
  const mappedCodes = new Set(Object.keys(agentCapabilities.agentCapabilities));

  const dbDefinitions = await prisma.agentDefinition.findMany({
    where: { code: { in: sorted(governedCodes) } },
    select: { id: true, code: true, isActive: true },
  });
  const dbCodes = new Set(dbDefinitions.map((definition) => definition.code));

  const missingInDb = sorted([...governedCodes].filter((code) => !dbCodes.has(code)));
  const missingInMap = sorted([...governedCodes].filter((code) => !mappedCodes.has(code)));
  const extraInMap = sorted([...mappedCodes].filter((code) => !governedCodes.has(code)));

  const agentGrantCount = await prisma.agentCapabilityGrant.count({
    where: { agentDefinition: { code: { in: sorted(governedCodes) } } },
  });
  const roleGrantCount = await prisma.roleCapabilityGrant.count();
  const capabilityCount = await prisma.capabilityDefinition.count();

  const roleCounts = Object.fromEntries(
    Object.entries(roleCapabilities.roleCapabilities).map(([roleCode, grants]) => {
      const list = grants as Array<{ accessLevel: 'DISCOVER' | 'READ' | 'EXECUTE' | 'REQUEST' }>;
      return [
        roleCode,
        {
          DISCOVER: list.filter((grant) => grant.accessLevel === 'DISCOVER').length,
          READ: list.filter((grant) => grant.accessLevel === 'READ').length,
          EXECUTE: list.filter((grant) => grant.accessLevel === 'EXECUTE').length,
          REQUEST: list.filter((grant) => grant.accessLevel === 'REQUEST').length,
          TOTAL: list.length,
        },
      ];
    }),
  );

  const rawAvailable = Object.values(TOOL_BINDING_REGISTRY).filter((binding) => binding.available)
    .length;
  const verifiedAvailable = Object.keys(VERIFIED_TOOL_BINDINGS).length;

  const report = {
    importedCatalogAgents: importedCodes.size,
    preExistingCommercialCellAgents: cellCodes.size,
    overlapImportedVsCell: [...cellCodes].filter((code) => importedCodes.has(code)).length,
    governedAgentDefinitionsExpected: governedCodes.size,
    governedAgentDefinitionsPresentInDb: dbDefinitions.length,
    agentCodesInCapabilityMap: mappedCodes.size,
    missingInDb,
    missingInMap,
    extraInMap,
    capabilityDefinitionsInArtifact: capabilities.capabilities.length,
    capabilityDefinitionsInDb: capabilityCount,
    agentCapabilityGrantsInDb: agentGrantCount,
    roleCapabilityGrantsInDb: roleGrantCount,
    roleCounts,
    toolBindingsDeclared: Object.keys(TOOL_BINDING_REGISTRY).length,
    rawBindingsClaimingAvailable: rawAvailable,
    bindingsVerifiedByEvidence: verifiedAvailable,
  };

  console.log(JSON.stringify(report, null, 2));

  if (missingInDb.length > 0 || missingInMap.length > 0 || extraInMap.length > 0) {
    throw new Error('Capability Engine audit failed: agent catalog/map/database are inconsistent.');
  }

  if (capabilityCount !== capabilities.capabilities.length) {
    throw new Error('Capability Engine audit failed: capability artifact/database counts diverge.');
  }

  return report;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  auditCapabilityEngine()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
}
