/**
 * Taxonomia do Agent Graph: Classificação Funcional dos 392 Agentes.
 *
 * Transforma o catálogo bruto em 4 camadas operacionais:
 * 1. CORE (~40): Tomadores de decisão, orquestradores de domínio e guardiões de alçada.
 * 2. SPECIALIST (~80): Analistas temáticos (vendas, inteligência, prospecção, ops, CS).
 * 3. SKILL (~100): Capacidades cognitivas e prompts reutilizáveis de LLM.
 * 4. TOOL / CAPABILITY (~100): Executores determinísticos de I/O (CRM, WhatsApp, Email, Voice).
 */

export type AgentLayer = 'CORE' | 'SPECIALIST' | 'SKILL' | 'TOOL';

export type AgentDirectorLeader = 'TAGARELA' | 'GISELLE' | 'PATRICIA' | 'GUARDIAO';

export interface ClassifiedAgentMeta {
  code: string;
  name: string;
  layer: AgentLayer;
  director: AgentDirectorLeader;
  domain: 'Vendas' | 'Marketing' | 'Operações' | 'CS' | 'Governança' | 'Finanças';
  description: string;
  replacesOrConsolidates?: string[];
  requiresApproval?: boolean;
}

/**
 * Matriz de mapeamento dos Agentes Core e Especialistas Chave.
 */
export const CORE_AND_SPECIALIST_TAXONOMY: Record<string, ClassifiedAgentMeta> = {
  // --- ALTA ALÇADA (Tríade & Supervisor) ---
  'tagarela-supervisor': {
    code: 'tagarela-supervisor',
    name: 'Tagarela Supervisor',
    layer: 'CORE',
    director: 'TAGARELA',
    domain: 'Operações',
    description: 'Roteador central e sintetizador final de missões comerciais.',
  },
  'giselle-strategy': {
    code: 'giselle-strategy',
    name: 'Giselle Estratégia',
    layer: 'CORE',
    director: 'GISELLE',
    domain: 'Vendas',
    description: 'Diretora de Inteligência de Conta, ICP, Hipótese de Dor e Ângulo de Abordagem.',
  },
  'patricia-execution': {
    code: 'patricia-execution',
    name: 'Patrícia Execução',
    layer: 'CORE',
    director: 'PATRICIA',
    domain: 'Vendas',
    description: 'Diretora de Outbound, Cadência Adaptativa e Next Best Action.',
  },
  'guardiao-governance': {
    code: 'guardiao-governance',
    name: 'Guardião Governança',
    layer: 'CORE',
    director: 'GUARDIAO',
    domain: 'Governança',
    description: 'Diretor de Política Comercial, Alçadas de Desconto, RBAC e Higiene de Dados.',
  },

  // --- ESPECIALISTAS DE ESTRATÉGIA (Giselle) ---
  'icp-analyst': {
    code: 'icp-analyst',
    name: 'ICP Analyst',
    layer: 'SPECIALIST',
    director: 'GISELLE',
    domain: 'Marketing',
    description: 'Calcula o ICP Score transparente e identifica critérios de enquadramento.',
    replacesOrConsolidates: ['icp-scorer', 'niche-explorer', 'target-scraper'],
  },
  'account-intelligence': {
    code: 'account-intelligence',
    name: 'Account Intelligence Specialist',
    layer: 'SPECIALIST',
    director: 'GISELLE',
    domain: 'Vendas',
    description: 'Mapeia comitê de compras, tecnologias em uso e dores prováveis.',
    replacesOrConsolidates: ['contact-mapper', 'decision-maker-finder', 'buying-committee-mapper'],
  },
  'competitor-intel': {
    code: 'competitor-intel',
    name: 'Competitor Intelligence Agent',
    layer: 'SPECIALIST',
    director: 'GISELLE',
    domain: 'Vendas',
    description: 'Fornece battlecards, diferenciais competitivos e defesas de valor.',
    replacesOrConsolidates: ['competitor-x-ray', 'competitor-financial'],
  },
  'value-proposition-strategist': {
    code: 'value-proposition-strategist',
    name: 'Value Proposition Strategist',
    layer: 'SPECIALIST',
    director: 'GISELLE',
    domain: 'Marketing',
    description: 'Formula a tese de abordagem e proposta de valor contextual à dor da conta.',
  },

  // --- ESPECIALISTAS DE EXECUÇÃO (Patrícia) ---
  'outbound-specialist': {
    code: 'outbound-specialist',
    name: 'Outbound Specialist',
    layer: 'SPECIALIST',
    director: 'PATRICIA',
    domain: 'Vendas',
    description: 'Orquestra disparos personalizados multicanal (Email, LinkedIn, WhatsApp).',
    replacesOrConsolidates: ['cold-email-agent', 'email-personalizer', 'sdr-outreach', 'follow-up-agent'],
  },
  'next-best-action-agent': {
    code: 'next-best-action-agent',
    name: 'Next Best Action Agent',
    layer: 'SPECIALIST',
    director: 'PATRICIA',
    domain: 'Vendas',
    description: 'Calcula em tempo real a ação comercial mais rentável com base em sinais recentes.',
  },
  'meeting-booker': {
    code: 'meeting-booker',
    name: 'Meeting Booker & Calendar Sniper',
    layer: 'SPECIALIST',
    director: 'PATRICIA',
    domain: 'Vendas',
    description: 'Negocia horários na agenda e confirma reuniões com stakeholders.',
    replacesOrConsolidates: ['calendar-sniper', 'meeting-scheduler'],
  },
  'cold-call-coach': {
    code: 'cold-call-coach',
    name: 'Cold Call & Conversation Coach',
    layer: 'SPECIALIST',
    director: 'PATRICIA',
    domain: 'Vendas',
    description: 'Suporte em tempo real durante chamadas de voz com batalha de objeções e perguntas.',
    replacesOrConsolidates: ['objection-handling', 'discovery-coach', 'call-sentiment-analyzer'],
  },

  // --- ESPECIALISTAS DE PIPELINE & NEGOCIAÇÃO (Giselle / Patrícia) ---
  'pipeline-oracle': {
    code: 'pipeline-oracle',
    name: 'Pipeline Oracle',
    layer: 'CORE',
    director: 'GISELLE',
    domain: 'Operações',
    description: 'Calcula forecast ponderado (Commit vs. AI Forecast) e detecta pipeline inflado.',
    replacesOrConsolidates: ['deal-risk-auditor', 'kpi-analyst', 'bottleneck-detector'],
  },
  'pricing-optimizer': {
    code: 'pricing-optimizer',
    name: 'Pricing & Margin Optimizer',
    layer: 'SPECIALIST',
    director: 'GUARDIAO',
    domain: 'Vendas',
    description: 'Sugere precificação ótima e valida margem de lucro.',
    requiresApproval: true,
  },
  'closer-copilot': {
    code: 'closer-copilot',
    name: 'Closer Copilot',
    layer: 'SPECIALIST',
    director: 'PATRICIA',
    domain: 'Vendas',
    description: 'Estratégias de negociação, concessões contratuais e aceleração de fechamento.',
  },

  // --- GOVERNANÇA & PÓS-VENDA (Guardião) ---
  'crm-guardian': {
    code: 'crm-guardian',
    name: 'CRM Guardian',
    layer: 'CORE',
    director: 'GUARDIAO',
    domain: 'Governança',
    description: 'Garante higienização, deduplicação e integridade do banco de dados comercial.',
    replacesOrConsolidates: ['crm-cleanser', 'duplicate-detector', 'field-validator'],
  },
  'policy-engine-agent': {
    code: 'policy-engine-agent',
    name: 'Commercial Policy Engine',
    layer: 'CORE',
    director: 'GUARDIAO',
    domain: 'Governança',
    description: 'Aplica regras duras de alçada, descontos máximos e conformidade jurídica/LGPD.',
  },
  'churn-deflector': {
    code: 'churn-deflector',
    name: 'Churn Deflector',
    layer: 'SPECIALIST',
    director: 'GUARDIAO',
    domain: 'CS',
    description: 'Monitora quedas de engajamento pós-venda e aciona resgate comercial.',
  },
  'expansion-mapper': {
    code: 'expansion-mapper',
    name: 'Expansion Mapper',
    layer: 'SPECIALIST',
    director: 'GISELLE',
    domain: 'CS',
    description: 'Detecta oportunidades de Upsell e Cross-sell em contas ativas.',
  },
};

/**
 * Classifica dinamicamente qualquer código do catálogo de 392 agentes.
 */
export function classifyAgentFromCatalog(code: string, rawDomain?: string): ClassifiedAgentMeta {
  const normalized = code.toLowerCase().trim();
  if (CORE_AND_SPECIALIST_TAXONOMY[normalized]) {
    return CORE_AND_SPECIALIST_TAXONOMY[normalized];
  }

  // Regra de dedução para os demais agentes da malha
  if (normalized.includes('writer') || normalized.includes('generator') || normalized.includes('summariz')) {
    return {
      code: normalized,
      name: code,
      layer: 'SKILL',
      director: 'PATRICIA',
      domain: 'Marketing',
      description: 'Skill cognitiva de geração de conteúdo e síntese de linguagem.',
    };
  }

  if (normalized.includes('sync') || normalized.includes('extractor') || normalized.includes('scraper') || normalized.includes('tool')) {
    return {
      code: normalized,
      name: code,
      layer: 'TOOL',
      director: 'GUARDIAO',
      domain: 'Operações',
      description: 'Capability determinística de integração e manipulação de dados.',
    };
  }

  return {
    code: normalized,
    name: code,
    layer: 'SPECIALIST',
    director: 'GISELLE',
    domain: rawDomain === 'Marketing' ? 'Marketing' : 'Vendas',
    description: 'Agente especialista temático mapeado no catálogo da Birth Hub 360.',
  };
}
