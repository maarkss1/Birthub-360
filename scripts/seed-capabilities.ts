import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../src/lib/prisma.js';
import {
  upsertCapabilityDefinition,
  grantCapabilityToAgent,
  grantCapabilityToRole,
} from '../src/features/job-roles/services/capabilityCatalog.service.js';
import type { AgentAccessLevel, CapabilityRiskLevel, CapabilityActionType } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface CapabilitySeedSummary {
  capabilitiesUpserted: number;
  agentGrantsApplied: number;
  roleGrantsApplied: number;
}

export async function runCapabilitySeed(): Promise<CapabilitySeedSummary> {
  const capsJson = JSON.parse(
    readFileSync(resolve(__dirname, '../src/features/job-roles/catalog/capabilities.normalized.json'), 'utf-8'),
  );
  const agentCapsJson = JSON.parse(
    readFileSync(resolve(__dirname, '../src/features/job-roles/catalog/agentCapabilities.normalized.json'), 'utf-8'),
  );
  const roleCapsJson = JSON.parse(
    readFileSync(resolve(__dirname, '../src/features/job-roles/catalog/roleCapabilities.normalized.json'), 'utf-8'),
  );

  console.log(`Iniciando seed de ${capsJson.capabilities.length} capabilities canônicas...`);

  // 1. Upsert de todas as capabilities
  let capCount = 0;
  const capabilityIdByCode = new Map<string, string>();

  for (const cap of capsJson.capabilities) {
    const record = await upsertCapabilityDefinition({
      code: cap.code,
      name: cap.name,
      description: cap.description,
      domain: cap.domain,
      riskLevel: cap.riskLevel as CapabilityRiskLevel,
      actionType: cap.actionType as CapabilityActionType,
      isReadOnly: cap.isReadOnly,
      requiresApprovalByDefault: cap.requiresApprovalByDefault,
      isSystem: true,
    });
    capabilityIdByCode.set(record.code, record.id);
    capCount++;
  }

  // 2. Map de AgentDefinition existentes no banco por code
  const existingAgents = await prisma.agentDefinition.findMany({
    select: { id: true, code: true, requiresApproval: true },
  });
  const agentByCode = new Map(existingAgents.map((a) => [a.code, a]));

  // 3. Aplicação dos AgentCapabilityGrant
  let agentGrantCount = 0;
  for (const [agentCode, capCodes] of Object.entries(agentCapsJson.agentCapabilities as Record<string, string[]>)) {
    const agent = agentByCode.get(agentCode);
    if (!agent) continue;

    for (const capCode of capCodes) {
      const capId = capabilityIdByCode.get(capCode);
      if (!capId) continue;

      await grantCapabilityToAgent({
        agentDefinitionId: agent.id,
        capabilityDefinitionId: capId,
        requiresApproval: agent.requiresApproval,
      });
      agentGrantCount++;
    }
  }

  // 4. Map de JobRole existentes no banco por code
  const existingRoles = await prisma.jobRole.findMany({
    select: { id: true, code: true },
  });
  const roleByCode = new Map(existingRoles.map((r) => [r.code, r]));

  // 5. Aplicação dos RoleCapabilityGrant
  let roleGrantCount = 0;
  for (const [roleCode, grants] of Object.entries(
    roleCapsJson.roleCapabilities as Record<string, { code: string; accessLevel: string; requiresApproval?: boolean }[]>,
  )) {
    const role = roleByCode.get(roleCode);
    if (!role) continue;

    for (const g of grants) {
      const capId = capabilityIdByCode.get(g.code);
      if (!capId) continue;

      await grantCapabilityToRole({
        jobRoleId: role.id,
        capabilityDefinitionId: capId,
        accessLevel: g.accessLevel as AgentAccessLevel,
        requiresApproval: g.requiresApproval ?? false,
      });
      roleGrantCount++;
    }
  }

  console.log('\n--- Relatório de Seed de Capabilities ---');
  console.log('Capabilities upsertadas:', capCount);
  console.log('AgentCapabilityGrant aplicados:', agentGrantCount);
  console.log('RoleCapabilityGrant aplicados:', roleGrantCount);

  return {
    capabilitiesUpserted: capCount,
    agentGrantsApplied: agentGrantCount,
    roleGrantsApplied: roleGrantCount,
  };
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runCapabilitySeed()
    .catch((error) => {
      console.error('Falha no seed de capabilities:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
