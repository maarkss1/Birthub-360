// Classificador determinístico da importação Birth Hub 360 (PROMPT 2). Puro — sem I/O, sem
// console.log — para poder ser reexecutado por scripts/agent-import/build-normalized-catalog.ts
// e por testes de unidade sem efeito colateral. Reexecutar sempre produz o mesmo resultado para
// o mesmo nome de entrada (requisito de idempotência do importador).
export type JobRoleCode =
  | 'LDR'
  | 'BDR'
  | 'SDR'
  | 'CLOSER'
  | 'COORDENADOR_COMERCIAL'
  | 'GERENTE_COMERCIAL'
  | 'DIRETOR_COMERCIAL'
  | 'RECEITA_FATURAMENTO'
  | 'CHURN_RETENCAO'
  | 'CONTRATOS_ASSINATURA'
  | 'BITRIX_GUARDIAN'
  | 'REVENUE_INTELLIGENCE';

export const ALL_ROLES: JobRoleCode[] = [
  'LDR',
  'BDR',
  'SDR',
  'CLOSER',
  'COORDENADOR_COMERCIAL',
  'GERENTE_COMERCIAL',
  'DIRETOR_COMERCIAL',
  'RECEITA_FATURAMENTO',
  'CHURN_RETENCAO',
  'CONTRATOS_ASSINATURA',
  'BITRIX_GUARDIAN',
  'REVENUE_INTELLIGENCE',
];

// --- Tokenização ---------------------------------------------------------
export function tokenize(rawName: string): string {
  let s = rawName.replace(/\b(Agent|Bot|Pack|Premium|AI)\b/gi, ' ');
  s = s.replace(/[-_/&]/g, ' ');
  s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  s = s.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

// --- Palavras-chave por cargo (seções 8-19 do prompt + vocabulário real observado nos 392 nomes)
const KEYWORDS: Record<JobRoleCode, string[]> = {
  LDR: [
    'icp',
    'market expansion',
    'niche explor',
    'territory map',
    'territory balanc',
    'account map',
    'lead scor',
    'inbound scor',
    'lead enrich',
    'enrichment',
    'intent decod',
    'trigger event',
    'competitor intel',
    'competitor x ray',
    'competitor financial',
    'annual report analy',
    'org nav',
    'stakeholder persona',
    'vertical translat',
    'target scraper',
    'lead hunter',
    'geospatial expansion',
    'market share estimat',
    'market sentinel',
    'audience segment discover',
  ],
  BDR: [
    'outbound',
    'cold call',
    'cold email',
    'sdr outreach',
    'voicemail drop',
    'gatekeeper bypass',
    'multi thread',
    'cadence',
    'personalization engine',
    'content to lead',
    'meeting booker',
    'webinar nurtur',
    'early adopter nurtur',
    'follow up ghost',
    'ghosting prevent',
    'calendar sniper',
    'event qualif',
    'partner ecosystem scout',
    'strategic alliance scout',
    'strategic partner scout',
    'lead magnet',
    'drip campaign',
  ],
  SDR: [
    'qualification',
    'qualifier',
    'discovery',
    'call review',
    'transcript coach',
    'no show',
    'onboarding sales',
    'objection handling',
    'objection flashcard',
    'objection crusher',
    'roleplay trainer',
    'rep coach',
    'ramp up assistant',
    'one on one prep',
    'follow up',
    'demo scripter',
    'demo sandboxer',
  ],
  CLOSER: [
    'closer',
    'closing forecast',
    'deal risk',
    'deal at risk',
    'deal desk',
    'negotiat',
    'proposal',
    'pricing optimizer',
    'pricing tester',
    'price discount impact',
    'discount waterfall',
    'discount approver',
    'discount leak',
    'roi calculator',
    'roi scenario',
    'use case generator',
    'rfp auto responder',
    'security questionnaire',
    'poc',
    'mutual action tracker',
    'multi year deal',
    'win loss analyz',
    'exec summary generator',
    'executive demo curator',
    'fast quoter',
    'tech objection resolver',
    'value aligner',
    'comp plan calculator',
    'contract drafter',
    'procurement hacker',
    'competitor displacement',
    'deck customizer',
    'architecture diagram',
  ],
  COORDENADOR_COMERCIAL: [
    'admin ops',
    'productivity bot',
    'communication bot',
    'activity analyz',
    'gamification',
    'leaderboard broadcast',
    'quota setter',
    'quota attainment tracker',
    'onboarding ramp tracker',
    'routing traffic cop',
    'process bottleneck',
    'process flow map',
    'requirements gatherer',
    'stakeholder update automat',
    'approval workflow router',
    'scope creep detect',
    'capacity planner',
    'resource balancer',
    'shift scheduler',
  ],
  GERENTE_COMERCIAL: [
    'sales manager',
    'quota architect',
    'quota',
    'pipeline auditor',
    'pipeline inspector',
    'conversion forecaster',
    'forecasting modeler',
    'forecast rollup',
    'comp plan',
    'enablement coach',
    'playbook creator',
    'playbook generator',
    'playbook updater',
    'tiering optimizer',
    'pipeline velocity tracker',
  ],
  DIRETOR_COMERCIAL: [
    'board prep',
    'board reporting',
    'capital allocator',
    'crisis navigator',
    'narrative weaver',
    'trend catcher',
    'scenario modeler',
    'strategic kpi aggregator',
    'executive summary bot',
    'macro factor tracker',
    // "X Agent Pack"/"X Premium Agent" chegam ao classificador já sem "Agent"/"Pack"/"Premium"
    // (removidos pela tokenização) — o que sobra é só o acrônimo do cargo executivo de origem.
    // Fit de baixa confiança (ver relatório de lacunas): mantido como melhor aproximação
    // disponível entre os 12 cargos canônicos para um placeholder puramente executivo.
    '^cro',
    '^ceo',
    '^coo',
    '^cmo',
    '^cfo',
  ],
  RECEITA_FATURAMENTO: [
    'billing',
    'invoice',
    'mrr',
    'arr bridge',
    'acv growth',
    'accrual engine',
    'aging report',
    'bank reconciliation',
    'cash app matcher',
    'cash flow',
    'collection agency',
    'credit hold',
    'credit limit',
    'credit score fetcher',
    'dunning automat',
    'failed payment',
    'payment link',
    'payment plan negotiat',
    'proration calculator',
    'remittance extractor',
    'promise to pay',
    'disputed charge',
    'bad debt predictor',
    'budget fluid',
    'budget variance',
    'burn rate monitor',
    'financial ratio calculator',
    'gl anomaly',
    'month end close',
    'cap table manager',
    'trade reference checker',
    'vendor negotiator',
    'spend controller',
    'tax optimizer',
    'tax exemption',
    'bankruptcy risk',
  ],
  CHURN_RETENCAO: [
    'churn',
    'retention',
    'renewal',
    'health score',
    'customer health',
    'account manager',
    'expansion mapper',
    'cross sell mapper',
    'upsell prompt',
    'csat nps',
    'sentiment aggregator',
    'sentiment shift',
    'advocacy finder',
    'aha moment tracker',
    'angry customer escalator',
    'escalation predictor',
    'executive sponsor tracker',
    'journey architect',
    'milestone chaser',
    'onboarding ramp tracker',
    'white space analyzer',
    'relationship matrix',
    'vip concierge',
    'welcome sequencer',
    'ticket backlog',
    'ticket classifier',
    'sla monitor',
    'l1 auto resolver',
    'l3 bug replicator',
    'faq auto responder',
    'kb gap identifier',
    'semantic search kb',
    'best practice recommender',
    'adoption metric analyz',
    'scalability predictor',
    'delay escalator',
    'outage communicator',
    'patch update alerter',
    'qbr deck builder',
    'refund processor',
    'training video recommender',
    'pricing tier recommender',
    'data migration validator',
    'project plan tracker',
    'api key configurator',
    'churn win back sequencer',
    'churn cohort isolator',
    'channel attrition predictor',
    'net retention modeler',
  ],
  CONTRATOS_ASSINATURA: [
    'contract',
    'nda auto signer',
    'redliner',
    'legal clause matcher',
    'legal agent pack',
    'renewal contract generator',
    'amendment',
    'signature',
    'signer',
  ],
  BITRIX_GUARDIAN: [
    'crm sync',
    'crm cleanser',
    'data cleaner',
    'data cleaning bot',
    'data enrichment automator',
    'data silo bridger',
    'data hygiene monitor',
    'duplicate merger',
    'webhook monitor',
    'api integration builder',
    'custom crm ui builder',
    'validation rule enforcer',
    'sql query generator',
    'anomaly detector',
    'non standard flag',
    'dashboard auto freshener',
  ],
  REVENUE_INTELLIGENCE: [
    'forecast intelligence',
    'revops intelligence',
    'kpi analyst',
    'pipeline oracle',
    'forecast',
    'pipeline',
    'attainment',
    'coverage',
    'win rate',
    'sales cycle',
    'aging',
    'health score architect',
    'health score trigger',
    'attribution modeler',
    'cohort analyzer',
    'funnel leak detector',
    'gtm alignment scorer',
    'bottleneck detector',
    'ltv by channel',
    'margin calculator',
    'market share estimator',
    'stat significance tester',
    'stickiness tracker',
    'tool roi analyzer',
    'ab test synthesizer',
    'campaign decay predictor',
  ],
};

// Ordem de prioridade quando várias roles empatam no score (mais específico -> mais genérico).
const TIE_BREAK_ORDER: JobRoleCode[] = [
  'CONTRATOS_ASSINATURA',
  'RECEITA_FATURAMENTO',
  'CHURN_RETENCAO',
  'BITRIX_GUARDIAN',
  'CLOSER',
  'SDR',
  'BDR',
  'LDR',
  'COORDENADOR_COMERCIAL',
  'GERENTE_COMERCIAL',
  'REVENUE_INTELLIGENCE',
  'DIRETOR_COMERCIAL',
];

// Domínio de origem (ZIP) -> role default quando nenhuma keyword específica bate. `null` = sem
// fit honesto entre os 12 cargos canônicos (fica sem primaryJobRole, é uma lacuna real).
const DOMAIN_DEFAULT: Record<string, JobRoleCode | null> = {
  Vendas: null, // bucket mais heterogêneo — sempre por keyword, sem default
  Operações: 'BITRIX_GUARDIAN',
  Marketing: null,
  'Customer Success': 'CHURN_RETENCAO',
  Financeiro: 'RECEITA_FATURAMENTO',
  'Compliance/Jurídico': null, // só os que baterem keyword de contrato viram CONTRATOS_ASSINATURA
  Executivo: 'DIRETOR_COMERCIAL',
  Tecnologia: null,
  RH: null,
};

export interface ClassificationResult {
  primary: JobRoleCode | null;
  secondary: JobRoleCode[];
  scores: Partial<Record<JobRoleCode, number>>;
}

export function classify(name: string, domain: string): ClassificationResult {
  const t = tokenize(name);
  const scores: Partial<Record<JobRoleCode, number>> = {};
  const compact = t.replace(/\s+/g, '');
  for (const role of ALL_ROLES) {
    let score = 0;
    for (const kw of KEYWORDS[role]) {
      // Prefixo "^" = igualdade exata do nome inteiro tokenizado (só para acrônimo isolado tipo
      // "cro"/"ceo" — como substring faria falso positivo em "MicroLearning").
      const matched = kw.startsWith('^')
        ? t === kw.slice(1)
        : t.includes(kw) || compact.includes(kw.replace(/\s+/g, ''));
      if (matched) score += kw.split(' ').length; // frases mais longas pesam mais
    }
    if (score > 0) scores[role] = score;
  }

  const scored = Object.entries(scores) as [JobRoleCode, number][];
  scored.sort(
    (a, b) => b[1] - a[1] || TIE_BREAK_ORDER.indexOf(a[0]) - TIE_BREAK_ORDER.indexOf(b[0]),
  );

  let primary: JobRoleCode | null =
    scored.length > 0 ? scored[0][0] : (DOMAIN_DEFAULT[domain] ?? null);
  const secondary = scored
    .filter(([r]) => r !== primary)
    .map(([r]) => r)
    .slice(0, 2);

  return { primary, secondary, scores };
}

// --- Normalização de nome / detecção de alias --------------------------
/** Núcleo normalizado (sem Premium/Bot/Agent/Pack/AI, sem espaço) — chave de agrupamento para
 *  detectar duplicatas/alias (ex.: "Pipeline Oracle Premium Agent" e "PipelineOracle Agent" caem
 *  na mesma chave "pipelineoracle"). */
export function normalizeCore(name: string): string {
  return tokenize(name).replace(/\s+/g, '');
}

/** Código canônico (slug) do `AgentDefinition.code` — determinístico a partir do nome. */
export function buildCode(name: string): string {
  return tokenize(name).replace(/\s+/g, '-');
}

// --- Classificação de risco (seção 31) — nunca herdada cegamente do ZIP -------------------
export type AgentRisk = 'LOW' | 'MEDIUM' | 'HIGH';

const HIGH_RISK_KEYWORDS = [
  'signature',
  'signer',
  'contract',
  'pricing',
  'discount',
  'payment',
  'invoice',
  'billing',
  'writeback',
  'sanctions',
  'money mule',
  'crypto tracing',
  'chargeback',
  'refund',
  'credit',
  'tax',
  'nda auto signer',
  'auto decision engine',
  'auto signer',
];
const MEDIUM_RISK_KEYWORDS = [
  'crm',
  'suggestion',
  'document',
  'proposal',
  'workflow router',
  'approval',
  'escalat',
  'automat',
  'generator',
  'drafter',
  'enforcer',
];

export function classifyRisk(name: string): AgentRisk {
  const t = tokenize(name);
  if (HIGH_RISK_KEYWORDS.some((kw) => t.includes(kw))) return 'HIGH';
  if (MEDIUM_RISK_KEYWORDS.some((kw) => t.includes(kw))) return 'MEDIUM';
  return 'LOW';
}

// --- Classificação de binding (seção 24) ------------------------------------------------
export type BindingType =
  | 'EXISTING_SERVICE'
  | 'EXISTING_WORKFLOW'
  | 'LLM_PROMPT'
  | 'COMPOSITE'
  | 'SOURCE_REQUIRED'
  | 'FUTURE_TOOL';

export interface Binding {
  type: BindingType;
  /** Código do AgentDefinition/serviço real já existente na Central, quando type=EXISTING_SERVICE. */
  existingCode?: string;
  note?: string;
}

/** Concentra a infraestrutura de orquestração (Maestro/Agent Mesh/Planner/Implementer/Reviewer) —
 *  explicitamente fora do escopo desta onda (nenhum AgentRuntime/Supervisor novo, ver seções
 *  38-42 do prompt). Nunca recebe primaryJobRole nem RoleAgentGrant. */
export function isOrchestrationInfra(name: string): boolean {
  const t = tokenize(name);
  return [
    'maestro',
    'agent mesh',
    'orchestrator',
    'implementer',
    'planner',
    'reviewer',
    'context memory',
  ].some((kw) => t.includes(kw));
}
