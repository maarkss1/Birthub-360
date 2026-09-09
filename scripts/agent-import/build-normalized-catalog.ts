// PROMPT 2 — monta o artefato auditável `agents.normalized.json` a partir dos dados brutos do
// Birth Hub 360 (source-data.ts + source-prompts.ts), aplicando normalização, deduplicação,
// classificação de cargo/risco/binding. Não toca no banco — só gera o arquivo JSON versionado que
// `scripts/import-agent-catalog.ts` depois consome para fazer upsert real.
//
// Rodar de novo com os mesmos dados de entrada produz sempre o mesmo JSON (determinístico) — sem
// isso a importação não seria auditável nem idempotente de verdade.
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BUCKETS, sourceRoles } from './source-data.js';
import { sourcePrompts } from './source-prompts.js';
import {
  classify,
  classifyRisk,
  normalizeCore,
  buildCode,
  isOrchestrationInfra,
  type JobRoleCode,
  type BindingType,
} from './classify.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Agentes já existentes da Célula Comercial (Prompt 1) — nunca duplicar, só referenciar. ---
// Mesma lista de commercialAgentRegistry.ts (código real). Mapeamento nome-normalizado ->
// existingCode usado para classificar binding=EXISTING_SERVICE quando um agente do ZIP é, na
// prática, a mesma capability que um desses 12 já cobre.
const EXISTING_AGENT_BY_NORMALIZED_NAME: Record<string, string> = {
  forecastintelligence: 'revenue-intelligence',
  revopsintelligence: 'revenue-intelligence',
  pipelineoracle: 'revenue-intelligence',
  kpianalyst: 'revenue-intelligence',
  churndeflector: 'churn-retention',
  customerhealth: 'churn-retention',
  customersuccess: 'churn-retention',
  expansionmapper: 'churn-retention',
  crmsync: 'bitrix-guardian',
  crmcleanser: 'bitrix-guardian',
  duplicatemerger: 'bitrix-guardian',
  webhookmonitor: 'bitrix-guardian',
  datacleaner: 'bitrix-guardian',
  datacleaningbot: 'bitrix-guardian',
  renewalcontractgenerator: 'contract-signature',
  contractredliner: 'contract-signature',
  ndaautosigner: 'contract-signature',
  legalclausematcher: 'contract-signature',
  financeagentpack: 'billing-revenue',
  budgetfluid: 'billing-revenue',
  accountmanager: 'churn-retention',
  leadenrichment: 'ldr-intelligence',
  leadhunter: 'ldr-intelligence',
  icprefiner: 'ldr-intelligence',
  leadscoringmodeler: 'ldr-intelligence',
  inboundscorer: 'ldr-intelligence',
  closercopilot: 'closer-sales',
  qualificationbot: 'sdr-qualification',
  sdroutreach: 'bdr-outbound',
  adminops: 'bitrix-guardian',
};

// --- Conceitos "comuns a todos os 12 cargos" (seção 21) que não existem no ZIP -----------------
// Criados aqui como AgentDefinition canônica mínima (CATALOG_ONLY) só quando o ZIP não já
// contém o conceito. "Knowledge Bot" (COO/Platform Ops) já cobre Knowledge Agent — não recriado.
const SYNTHETIC_COMMON_AGENTS: { code: string; name: string; description: string }[] = [
  {
    code: 'agent-builder',
    name: 'Agent Builder',
    description:
      'Catálogo apenas — futura ferramenta de criação/configuração de novos agentes pelo próprio usuário. Nenhuma capacidade de gerar código nesta onda (ver PROMPT 10).',
  },
  {
    code: 'handoff-agent',
    name: 'Handoff Agent',
    description:
      'Catálogo apenas — representação futura do mecanismo de handoff/comunicação entre agentes de cargos diferentes. Nenhum Agent Bus implementado nesta onda (ver PROMPT 4).',
  },
];

// Os 6 conceitos "comuns" propriamente ditos, por código canônico (existente ou recém-criado).
const COMMON_AGENT_CODES = [
  'ldr-intelligence', // já existe (Prompt 1)
  'bdr-outbound', // já existe (Prompt 1) — equivalente a "BDR Intelligence"
  'bitrix-guardian', // já existe (Prompt 1)
  'agent-builder', // sintético desta onda
  'knowledge', // "Knowledge Bot" do próprio ZIP (COO/Platform Ops) — "Bot" é removido pelo tokenizer
  'handoff-agent', // sintético desta onda
];

interface RawEntry {
  sourceRoleId: string;
  sourceName: string;
  domain: string;
}

interface CanonicalAgent {
  code: string;
  name: string;
  domain: string;
  sourceIds: string[];
  aliasNames: string[];
  primaryJobRole: JobRoleCode | null;
  secondaryJobRoles: { code: JobRoleCode; accessLevel: 'READ' | 'REQUEST' }[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  binding: { type: BindingType; existingCode?: string };
  hasPrompt: boolean;
  description: string | null;
  systemPrompt: string | null;
  classification: 'IMPORTED' | 'ALIAS' | 'DUPLICATE' | 'REJECTED' | 'BLOCKED';
  requiresApproval: boolean;
  isCommon: boolean;
  notes: string[];
}

function main() {
  const roleDomain: Record<string, string> = Object.fromEntries(
    sourceRoles.map((r) => [r.id, r.domain]),
  );

  const raw: RawEntry[] = [];
  for (const bucket of ALL_BUCKETS) {
    for (const name of bucket.names) {
      raw.push({
        sourceRoleId: bucket.roleId,
        sourceName: name,
        domain: roleDomain[bucket.roleId],
      });
    }
  }

  // Agrupa por núcleo normalizado -> candidatos a alias/duplicata (ex.: par Premium/Standard).
  const groups = new Map<string, RawEntry[]>();
  for (const entry of raw) {
    const key = normalizeCore(entry.sourceName);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  const promptByKey = new Map(sourcePrompts.map((p) => [normalizeCore(p.name), p]));

  const agents: CanonicalAgent[] = [];
  const usedCodes = new Set<string>();

  for (const [key, list] of groups) {
    // Representante canônico: prefere o nome SEM "Premium" (a variante mais simples/estável);
    // se nenhum tiver, usa o primeiro. Os demais da lista viram aliasNames rastreados.
    const canonicalEntry = list.find((e) => !/premium/i.test(e.sourceName)) ?? list[0];
    const aliasEntries = list.filter((e) => e !== canonicalEntry);

    let code = buildCode(canonicalEntry.sourceName);
    while (usedCodes.has(code)) code = `${code}-dup`;
    usedCodes.add(code);

    const notes: string[] = [];
    if (aliasEntries.length > 0) {
      notes.push(
        `Consolidado com ${aliasEntries.length} variante(s) de nome equivalente: ${aliasEntries
          .map((a) => `"${a.sourceName}"`)
          .join(', ')} (mesma capability, tier Premium/Standard do pacote de origem).`,
      );
    }

    const orchestration = isOrchestrationInfra(canonicalEntry.sourceName);
    const prompt = promptByKey.get(key);
    const risk = classifyRisk(canonicalEntry.sourceName);

    let primary: JobRoleCode | null = null;
    let secondary: JobRoleCode[] = [];
    if (!orchestration) {
      const result = classify(canonicalEntry.sourceName, canonicalEntry.domain);
      primary = result.primary;
      secondary = result.secondary;
    } else {
      notes.push(
        'Infraestrutura de orquestração/memória de plataforma (Maestro/Agent Mesh/Planner/Implementer/Reviewer/Context Memory) — fora do escopo desta onda (sem AgentRuntime/Supervisor novo, ver seções 38-42). Sem primaryJobRole, sem RoleAgentGrant.',
      );
    }

    const existingCode = EXISTING_AGENT_BY_NORMALIZED_NAME[key];
    let binding: CanonicalAgent['binding'];
    if (orchestration) {
      binding = { type: 'FUTURE_TOOL' };
    } else if (existingCode) {
      binding = { type: 'EXISTING_SERVICE', existingCode };
      notes.push(
        `Capability já coberta por um motor real da Central via o agente "${existingCode}" (ver commercialAgentRegistry.ts) — nunca reimplementada aqui.`,
      );
    } else if (canonicalEntry.domain === 'Financeiro' && !prompt) {
      binding = { type: 'SOURCE_REQUIRED' };
      notes.push(
        'Depende de fonte financeira real (billing/faturamento) ainda não confirmada na Central — nunca fabricar o dado ausente (mesmo critério de billing-revenue no registry existente).',
      );
    } else {
      binding = { type: 'LLM_PROMPT' };
    }

    let requiresApproval = risk === 'HIGH';
    if (orchestration) requiresApproval = true; // nunca executável sem revisão futura

    agents.push({
      code,
      name:
        canonicalEntry.sourceName.replace(/\s+(Agent|Bot|Pack)$/i, '').trim() ||
        canonicalEntry.sourceName,
      domain: canonicalEntry.domain,
      sourceIds: list.map((e) => `${e.sourceRoleId}:${e.sourceName}`),
      aliasNames: aliasEntries.map((e) => e.sourceName),
      primaryJobRole: primary,
      secondaryJobRoles: secondary.map((code, i) => ({
        code,
        accessLevel: i === 0 ? 'READ' : 'REQUEST',
      })),
      risk,
      binding,
      hasPrompt: Boolean(prompt),
      description: prompt?.description ?? null,
      systemPrompt: prompt?.systemPrompt ?? null,
      classification: 'IMPORTED',
      requiresApproval,
      isCommon: false,
      notes,
    });
  }

  // Agentes sintéticos "comuns a todos os cargos" que ainda não existem no ZIP (seção 21).
  for (const synthetic of SYNTHETIC_COMMON_AGENTS) {
    agents.push({
      code: synthetic.code,
      name: synthetic.name,
      domain: 'Plataforma',
      sourceIds: [],
      aliasNames: [],
      primaryJobRole: null,
      secondaryJobRoles: [],
      risk: 'LOW',
      binding: { type: 'FUTURE_TOOL' },
      hasPrompt: false,
      description: synthetic.description,
      systemPrompt: null,
      classification: 'IMPORTED',
      requiresApproval: false,
      isCommon: true,
      notes: [
        'Agente canônico mínimo criado nesta onda para preparar a concessão comum aos 12 cargos — sem runtime, sem execução.',
      ],
    });
  }

  // Marca os 6 conceitos comuns (existentes ou sintéticos) com isCommon=true.
  for (const agent of agents) {
    if (COMMON_AGENT_CODES.includes(agent.code)) agent.isCommon = true;
  }

  const summary = {
    totalSourceRecords: raw.length,
    totalCanonicalAgents: agents.length,
    aliasesConsolidated: agents.reduce((acc, a) => acc + a.aliasNames.length, 0),
    withPrimaryJobRole: agents.filter((a) => a.primaryJobRole).length,
    withoutPrimaryJobRole: agents.filter((a) => !a.primaryJobRole && !a.isCommon).length,
    withPrompt: agents.filter((a) => a.hasPrompt).length,
    byRisk: {
      LOW: agents.filter((a) => a.risk === 'LOW').length,
      MEDIUM: agents.filter((a) => a.risk === 'MEDIUM').length,
      HIGH: agents.filter((a) => a.risk === 'HIGH').length,
    },
    byBinding: Object.fromEntries(
      (
        [
          'EXISTING_SERVICE',
          'EXISTING_WORKFLOW',
          'LLM_PROMPT',
          'COMPOSITE',
          'SOURCE_REQUIRED',
          'FUTURE_TOOL',
        ] as BindingType[]
      ).map((t) => [t, agents.filter((a) => a.binding.type === t).length]),
    ),
  };

  const output = {
    generatedAt: new Date().toISOString().slice(0, 10),
    sourcePackage: 'Birth Hub 360 (ZIP fornecido pelo usuário, upload 2026-09-08)',
    summary,
    agents: agents.sort((a, b) => a.code.localeCompare(b.code)),
  };

  const outPath = resolve(__dirname, '../../src/features/job-roles/catalog/agents.normalized.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');

  console.log('agents.normalized.json gerado em', outPath);
  console.log(JSON.stringify(summary, null, 2));
}

main();
