// PROMPT 3 — Capability & Permission Engine + PROMPT 3B (Hardening Final).
//
// Gera os 3 artefatos normalizados e auditáveis (sem consultar o banco):
//   src/features/job-roles/catalog/capabilities.normalized.json
//   src/features/job-roles/catalog/agentCapabilities.normalized.json
//   src/features/job-roles/catalog/roleCapabilities.normalized.json
//
// "Não inferir em runtime por palavras-chave. O artefato final explícito deve ser a fonte da
// importação" (regra do prompt da onda) — o mapeamento agente→capability e cargo→capability é
// escrito aqui, uma vez, por decisão humana explícita (este arquivo), não recalculado a cada
// import. `scripts/seed-capability-engine.ts` só lê estes 3 JSONs, nunca decide sozinho.
//
// Cobertura deliberadamente conservadora: só concede uma capability de domínio a um agente quando
// há justificativa real (os 12 agentes da Célula Comercial, com missão/capabilities conhecidas de
// `commercialAgentRegistry.ts`, e os 28 agentes Birth Hub já reconhecidos como EXISTING_SERVICE no
// PROMPT 2, que herdam exatamente as mesmas capabilities do agente real que eles espelham). Os
// demais ~351 agentes Birth Hub sem binding EXISTING_SERVICE recebem só as 2 capabilities
// estruturais universais (`agent.discover`, `agent.execute` — nenhuma delas é específica de
// domínio, e `agent.execute` continua bloqueado por ToolBinding FUTURE_TOOL até o PROMPT 4
// independente de quem a possui). Nenhuma capability de domínio é fabricada sem uma fonte real —
// o gap é registrado no relatório da onda, nunca preenchido por inferência de nome.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CAPABILITY_CATALOG } from '../../src/config/capability-catalog.js';
import {
  TOOL_BINDINGS,
  getToolBinding,
} from '../../src/features/job-roles/config/tool-bindings.js';
import { JOB_ROLE_CODES, type JobRoleCode } from '../../src/config/job-role-catalog.js';
import { COMMERCIAL_AGENT_REGISTRY } from '../../src/features/intelligence/agents/commercialAgentRegistry.js';
import normalizedBirthHubCatalog from '../../src/features/job-roles/catalog/agents.normalized.json' with {
  type: 'json',
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../../src/features/job-roles/catalog');

interface BirthHubNormalizedAgent {
  code: string;
  name: string;
  binding: { type: string; existingCode?: string };
}

// As 3 capabilities estruturais (nunca de domínio) — `agent.discover`/`agent.execute` universais
// desde o PROMPT 3, `agent.request_cross_role` adicionada aqui no PROMPT 7. Bug real do PROMPT 3
// (commit 7757345): `buildRoleCapabilities` já concedia as 3 a todo `JobRole` (RoleCapabilityGrant),
// mas esta lista de capability de AGENTE (AgentCapabilityGrant) só tinha as 2 primeiras — nenhum
// agente jamais recebia `agent.request_cross_role`, então `selectAgentForCapability` nunca
// encontrava candidato e `agent.request_cross_role` ficava estruturalmente inatingível mesmo com
// o ToolBinding em VERIFIED (PROMPT 7). Só ficou visível agora porque só agora existe cobertura de
// teste de ponta a ponta para esta capability.
const UNIVERSAL_AGENT_CAPABILITIES = [
  'agent.discover',
  'agent.execute',
  'agent.request_cross_role',
];

/** Capabilities de domínio real dos 12 agentes da Célula Comercial — derivadas das `capabilities`
 *  já documentadas em `commercialAgentRegistry.ts` (nunca inventadas aqui), mapeadas para o
 *  vocabulário canônico `resource.action` deste catálogo. */
const COMMERCIAL_CELL_DOMAIN_CAPABILITIES: Record<string, string[]> = {
  'ldr-intelligence': ['lead.read', 'lead.search', 'company.read', 'company.search'],
  'bdr-outbound': ['lead.read', 'lead.search', 'company.read'],
  'sdr-qualification': ['lead.read', 'lead.qualify', 'lead.update', 'meeting.schedule'],
  'closer-sales': ['deal.read', 'deal.analyze', 'deal.update', 'deal.move_stage', 'contract.read'],
  'coordinator-commercial': ['lead.read', 'deal.read', 'pipeline.read', 'bitrix.read'],
  'manager-commercial': [
    'forecast.read',
    'forecast.explain',
    'pipeline.read',
    'pipeline.analyze',
    'deal.read',
  ],
  'executive-director': [
    'forecast.read',
    'forecast.explain',
    'pipeline.read',
    'pipeline.analyze',
    'billing.read',
  ],
  'billing-revenue': ['billing.read', 'billing.reconcile'],
  'churn-retention': ['deal.read', 'company.read', 'billing.read'],
  'contract-signature': ['contract.read', 'contract.generate', 'signature.request'],
  'bitrix-guardian': ['bitrix.read', 'bitrix.write', 'lead.search', 'company.search'],
  'revenue-intelligence': [
    'pipeline.read',
    'pipeline.analyze',
    'forecast.read',
    'forecast.explain',
  ],
};

interface AgentCapabilityEntry {
  agentCode: string;
  capabilityCodes: string[];
  source: 'COMMERCIAL_CELL' | 'EXISTING_SERVICE_INHERITED' | 'UNIVERSAL_ONLY';
  inheritedFrom?: string;
}

function buildAgentCapabilities(): AgentCapabilityEntry[] {
  const entries: AgentCapabilityEntry[] = [];

  for (const agent of COMMERCIAL_AGENT_REGISTRY) {
    const domainCaps = COMMERCIAL_CELL_DOMAIN_CAPABILITIES[agent.id] ?? [];
    entries.push({
      agentCode: agent.id,
      capabilityCodes: [...new Set([...domainCaps, ...UNIVERSAL_AGENT_CAPABILITIES])],
      source: 'COMMERCIAL_CELL',
    });
  }

  const birthHubAgents = normalizedBirthHubCatalog.agents as BirthHubNormalizedAgent[];
  for (const agent of birthHubAgents) {
    if (agent.binding.type === 'EXISTING_SERVICE' && agent.binding.existingCode) {
      const inherited = COMMERCIAL_CELL_DOMAIN_CAPABILITIES[agent.binding.existingCode] ?? [];
      entries.push({
        agentCode: agent.code,
        capabilityCodes: [...new Set([...inherited, ...UNIVERSAL_AGENT_CAPABILITIES])],
        source: 'EXISTING_SERVICE_INHERITED',
        inheritedFrom: agent.binding.existingCode,
      });
    } else {
      entries.push({
        agentCode: agent.code,
        capabilityCodes: [...UNIVERSAL_AGENT_CAPABILITIES],
        source: 'UNIVERSAL_ONLY',
      });
    }
  }

  return entries;
}

interface RoleCapabilityEntry {
  jobRoleCode: JobRoleCode;
  capabilityCode: string;
  accessLevel: 'DISCOVER' | 'READ' | 'EXECUTE' | 'REQUEST';
}

/** Distribuição cargo→capability — desenhada a partir da missão real de cada um dos 12 cargos
 *  (ver descrição em `src/config/job-role-catalog.ts`), não por palavra-chave em runtime. Segue a
 *  matriz de risco do prompt da onda (READ para consulta ampla, EXECUTE para a operação central do
 *  cargo, REQUEST como exemplo explícito de Cross-Role — CLOSER precisa de contrato mas não é dono
 *  dele, CONTRATOS_ASSINATURA é o dono). `agent.discover`/`agent.execute`/`agent.request_cross_role`
 *  são concedidos a EXECUTE em todos os 12 cargos: nenhum dos três é bloqueado por cargo nesta
 *  onda, o bloqueio real é estrutural (ToolBinding FUTURE_TOOL) até os PROMPTs 4/7 existirem.
 */
const ROLE_DOMAIN_CAPABILITIES: Record<
  JobRoleCode,
  [string, RoleCapabilityEntry['accessLevel']][]
> = {
  LDR: [
    ['lead.read', 'EXECUTE'],
    ['lead.search', 'EXECUTE'],
    ['company.read', 'EXECUTE'],
    ['company.search', 'EXECUTE'],
    ['pipeline.read', 'READ'],
    ['knowledge.search', 'EXECUTE'],
  ],
  BDR: [
    ['lead.read', 'EXECUTE'],
    ['lead.search', 'EXECUTE'],
    ['lead.enrich', 'EXECUTE'],
    ['company.read', 'EXECUTE'],
    ['company.search', 'READ'],
    ['meeting.schedule', 'EXECUTE'],
    ['knowledge.search', 'EXECUTE'],
  ],
  SDR: [
    ['lead.read', 'EXECUTE'],
    ['lead.search', 'EXECUTE'],
    ['lead.qualify', 'EXECUTE'],
    ['lead.update', 'EXECUTE'],
    ['meeting.schedule', 'EXECUTE'],
    ['meeting.read', 'EXECUTE'],
    ['contract.read', 'REQUEST'],
    ['knowledge.search', 'EXECUTE'],
  ],
  CLOSER: [
    ['deal.read', 'EXECUTE'],
    ['deal.analyze', 'EXECUTE'],
    ['deal.update', 'EXECUTE'],
    ['deal.move_stage', 'EXECUTE'],
    ['contract.read', 'EXECUTE'],
    ['contract.generate', 'REQUEST'],
    ['signature.request', 'REQUEST'],
    ['meeting.schedule', 'EXECUTE'],
    ['knowledge.search', 'EXECUTE'],
  ],
  COORDENADOR_COMERCIAL: [
    ['lead.read', 'READ'],
    ['lead.search', 'READ'],
    ['deal.read', 'READ'],
    ['pipeline.read', 'READ'],
    ['bitrix.read', 'EXECUTE'],
    ['knowledge.search', 'EXECUTE'],
  ],
  GERENTE_COMERCIAL: [
    ['pipeline.read', 'EXECUTE'],
    ['pipeline.analyze', 'EXECUTE'],
    ['forecast.read', 'EXECUTE'],
    ['forecast.explain', 'EXECUTE'],
    ['deal.read', 'READ'],
    ['deal.analyze', 'EXECUTE'],
    ['billing.read', 'READ'],
    ['knowledge.search', 'EXECUTE'],
  ],
  DIRETOR_COMERCIAL: [
    ['forecast.read', 'EXECUTE'],
    ['forecast.explain', 'EXECUTE'],
    ['pipeline.read', 'EXECUTE'],
    ['pipeline.analyze', 'EXECUTE'],
    ['billing.read', 'READ'],
    ['deal.read', 'READ'],
    ['knowledge.search', 'EXECUTE'],
  ],
  RECEITA_FATURAMENTO: [
    ['billing.read', 'EXECUTE'],
    ['billing.reconcile', 'EXECUTE'],
    ['deal.read', 'READ'],
    ['knowledge.search', 'EXECUTE'],
  ],
  CHURN_RETENCAO: [
    ['deal.read', 'EXECUTE'],
    ['company.read', 'EXECUTE'],
    ['lead.read', 'READ'],
    ['billing.read', 'READ'],
    ['knowledge.search', 'EXECUTE'],
  ],
  CONTRATOS_ASSINATURA: [
    ['contract.read', 'EXECUTE'],
    ['contract.generate', 'EXECUTE'],
    ['signature.request', 'EXECUTE'],
    ['deal.read', 'READ'],
    ['knowledge.search', 'EXECUTE'],
  ],
  BITRIX_GUARDIAN: [
    ['bitrix.read', 'EXECUTE'],
    ['bitrix.write', 'EXECUTE'],
    // EXECUTE (não REQUEST): BITRIX_GUARDIAN é o cargo dono da governança de integração Bitrix —
    // o freio real de "configuração crítica" já vem do UserRole mínimo GESTOR (actionType=ADMIN,
    // ver MIN_ROLE_BY_ACTION_TYPE em capabilityAuthorization.service.ts) somado ao risco CRITICAL
    // (sempre APPROVAL_REQUIRED, ver capability-catalog.ts). REQUEST aqui duplicaria a mesma trava
    // de forma redundante e incorreta (REQUEST é para quem NÃO é dono, ex.: Cross-Role — não é o
    // caso deste cargo).
    ['bitrix.configure', 'EXECUTE'],
    ['lead.search', 'READ'],
    ['company.search', 'READ'],
    ['knowledge.search', 'EXECUTE'],
  ],
  REVENUE_INTELLIGENCE: [
    ['pipeline.read', 'EXECUTE'],
    ['pipeline.analyze', 'EXECUTE'],
    ['forecast.read', 'EXECUTE'],
    ['forecast.explain', 'EXECUTE'],
    ['deal.read', 'READ'],
    ['knowledge.search', 'EXECUTE'],
  ],
};

function buildRoleCapabilities(): RoleCapabilityEntry[] {
  const entries: RoleCapabilityEntry[] = [];
  for (const jobRoleCode of JOB_ROLE_CODES) {
    for (const [capabilityCode, accessLevel] of ROLE_DOMAIN_CAPABILITIES[jobRoleCode]) {
      entries.push({ jobRoleCode, capabilityCode, accessLevel });
    }
    for (const capabilityCode of ['agent.discover', 'agent.execute', 'agent.request_cross_role']) {
      entries.push({ jobRoleCode, capabilityCode, accessLevel: 'EXECUTE' });
    }
  }
  return entries;
}

function main() {
  const capabilitiesOutput = CAPABILITY_CATALOG.map((c) => {
    const binding = getToolBinding(c.code);
    return {
      ...c,
      binding: binding
        ? {
            toolCode: binding.toolCode,
            available: binding.available,
            reason: binding.reason,
            verification: binding.verification,
            evidencePath: binding.evidencePath,
          }
        : null,
    };
  });

  const agentCapabilities = buildAgentCapabilities();
  const roleCapabilities = buildRoleCapabilities();

  const summary = {
    totalCapabilities: CAPABILITY_CATALOG.length,
    totalToolBindings: TOOL_BINDINGS.length,
    verifiedBindings: TOOL_BINDINGS.filter((b) => b.verification === 'VERIFIED').length,
    unverifiedBindings: TOOL_BINDINGS.filter((b) => b.verification === 'UNVERIFIED').length,
    byReason: {
      AVAILABLE: TOOL_BINDINGS.filter((b) => b.reason === 'AVAILABLE').length,
      SOURCE_REQUIRED: TOOL_BINDINGS.filter((b) => b.reason === 'SOURCE_REQUIRED').length,
      FUTURE_TOOL: TOOL_BINDINGS.filter((b) => b.reason === 'FUTURE_TOOL').length,
      TOOL_UNAVAILABLE: TOOL_BINDINGS.filter((b) => b.reason === 'TOOL_UNAVAILABLE').length,
    },
    totalAgentsWithCapabilityGrants: agentCapabilities.length,
    agentsWithDomainCapability: agentCapabilities.filter((a) => a.source !== 'UNIVERSAL_ONLY')
      .length,
    agentsUniversalOnly: agentCapabilities.filter((a) => a.source === 'UNIVERSAL_ONLY').length,
    totalRoleCapabilityGrants: roleCapabilities.length,
  };

  writeFileSync(
    path.join(OUTPUT_DIR, 'capabilities.normalized.json'),
    JSON.stringify(
      { summary: { total: capabilitiesOutput.length }, capabilities: capabilitiesOutput },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(
    path.join(OUTPUT_DIR, 'agentCapabilities.normalized.json'),
    JSON.stringify({ summary, agentCapabilities }, null, 2) + '\n',
  );
  writeFileSync(
    path.join(OUTPUT_DIR, 'roleCapabilities.normalized.json'),
    JSON.stringify({ summary: { total: roleCapabilities.length }, roleCapabilities }, null, 2) +
      '\n',
  );

  console.log('Catálogo de capabilities gerado:', JSON.stringify(summary, null, 2));
}

const isDirectExecution = process.argv[1] === __filename;
if (isDirectExecution) {
  main();
}

export { buildAgentCapabilities, buildRoleCapabilities };
