// Seed idempotente da Fundação Multi-Cargo (PROMPT 1 — Fundação Multi-Cargo e Governança de
// Agentes): os 12 cargos canônicos + o catálogo de AgentDefinition construído a partir dos 12
// agentes já reais da Célula Comercial (`commercialAgentRegistry.ts`), com a concessão do agente
// ao seu cargo principal via RoleAgentGrant.
//
// Reexecutar não duplica nada: `seedCanonicalJobRoles`/`upsertAgentDefinition`/`grantAgentToRole`
// são upsert por chave natural (code / code / par jobRoleId+agentDefinitionId).
//
// Uso: npx tsx scripts/seed-multi-cargo.ts
import { JOB_ROLE_CATALOG, type JobRoleCode } from '../src/config/job-role-catalog.js';
import { seedCanonicalJobRoles } from '../src/features/job-roles/services/jobRole.service.js';
import {
  upsertAgentDefinition,
  grantAgentToRole,
} from '../src/features/job-roles/services/agentCatalog.service.js';
import {
  COMMERCIAL_AGENT_REGISTRY,
  type CommercialAgentDefinition,
} from '../src/features/intelligence/agents/commercialAgentRegistry.js';
import type {
  CommercialAgentId,
  CommercialAgentStatus,
} from '../src/features/intelligence/agents/commercialAgentTypes.js';
import type { AgentDefinitionStatus } from '@prisma/client';

// Mapeamento por `id` (não por `role` — o texto livre de `role` em commercialAgentRegistry.ts,
// ex.: "Finance/Revenue", "CS/Revenue", não bate 1:1 com o `code` canônico de JobRole). Exportado
// para ser exercitado por teste de integração (tests/integration/seed-multi-cargo.test.ts) sem
// precisar spawnar este arquivo como processo — ver nota de ambiente no relatório da onda sobre
// scripts standalone travando neste sandbox por causa de Redis/Meilisearch reais indisponíveis.
export const AGENT_ID_TO_JOB_ROLE_CODE: Record<CommercialAgentId, JobRoleCode> = {
  'ldr-intelligence': 'LDR',
  'bdr-outbound': 'BDR',
  'sdr-qualification': 'SDR',
  'closer-sales': 'CLOSER',
  'coordinator-commercial': 'COORDENADOR_COMERCIAL',
  'manager-commercial': 'GERENTE_COMERCIAL',
  'executive-director': 'DIRETOR_COMERCIAL',
  'billing-revenue': 'RECEITA_FATURAMENTO',
  'churn-retention': 'CHURN_RETENCAO',
  'contract-signature': 'CONTRATOS_ASSINATURA',
  'bitrix-guardian': 'BITRIX_GUARDIAN',
  'revenue-intelligence': 'REVENUE_INTELLIGENCE',
};

// CommercialAgentStatus (commercialAgentTypes.ts) -> AgentDefinitionStatus (schema Prisma novo).
// Ver comentário completo da conversão em prisma/schema.prisma, seção "Multi-Cargo e Governança
// de Agentes" — nenhum dos dois tipos é apagado ou substituído nesta onda.
export const COMMERCIAL_STATUS_TO_AGENT_DEFINITION_STATUS: Record<
  CommercialAgentStatus,
  AgentDefinitionStatus
> = {
  REAL_EM_PRODUCAO: 'PRODUCTION_READY',
  NOVO_SOBRE_SERVICO_REAL: 'SERVICE_WRAPPER',
  NOVO_FONTE_PARCIAL: 'SOURCE_REQUIRED',
  MAPEADO_NAO_IMPLEMENTADO: 'CATALOG_ONLY',
};

export async function seedJobRoles(): Promise<Map<JobRoleCode, string>> {
  const jobRoles = await seedCanonicalJobRoles(JOB_ROLE_CATALOG);
  console.log(`Cargos canônicos ok: ${jobRoles.length} (esperado: ${JOB_ROLE_CATALOG.length}).`);

  const idByCode = new Map<JobRoleCode, string>();
  for (const jr of jobRoles) idByCode.set(jr.code as JobRoleCode, jr.id);
  return idByCode;
}

export async function seedAgentCatalog(idByCode: Map<JobRoleCode, string>): Promise<void> {
  for (const agent of COMMERCIAL_AGENT_REGISTRY as CommercialAgentDefinition[]) {
    const jobRoleCode = AGENT_ID_TO_JOB_ROLE_CODE[agent.id];
    const primaryJobRoleId = jobRoleCode ? idByCode.get(jobRoleCode) : undefined;

    const definition = await upsertAgentDefinition({
      code: agent.id,
      name: agent.name,
      description: agent.mission,
      domain: agent.layer,
      primaryJobRoleId: primaryJobRoleId ?? null,
      status: COMMERCIAL_STATUS_TO_AGENT_DEFINITION_STATUS[agent.status],
      risk: agent.risk,
      requiresApproval: agent.requiresApproval,
    });

    if (primaryJobRoleId) {
      await grantAgentToRole({
        jobRoleId: primaryJobRoleId,
        agentDefinitionId: definition.id,
        accessLevel: 'EXECUTE',
        requiresApproval: agent.requiresApproval,
      });
    }
  }
  console.log(
    `Catálogo de agentes ok: ${COMMERCIAL_AGENT_REGISTRY.length} agentes (a partir de commercialAgentRegistry.ts).`,
  );
}

/** Exportado (além de acionado por `main()` abaixo) para ser chamado direto por um teste de
 *  integração, sem precisar spawnar este arquivo como processo separado. */
export async function runMultiCargoSeed(): Promise<void> {
  const idByCode = await seedJobRoles();
  await seedAgentCatalog(idByCode);
  console.log('Seed da Fundação Multi-Cargo concluído.');
}

// Só roda main() quando este arquivo é executado diretamente (`npx tsx scripts/seed-multi-cargo.ts`),
// nunca quando é importado por outro módulo (ex.: um teste de integração) — do contrário o seed
// rodaria (e desconectaria o Prisma client compartilhado) como efeito colateral do import.
const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runMultiCargoSeed()
    .catch((error) => {
      console.error('Falha no seed da Fundação Multi-Cargo:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      const { prisma } = await import('../src/lib/prisma.js');
      await prisma.$disconnect();
    });
}
