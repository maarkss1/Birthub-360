import type {
  CommercialAgentId,
  CommercialAgentRisk,
  CommercialAgentStatus,
} from './commercialAgentTypes.js';

/**
 * Catálogo dos 12 agentes do pacote BIRTHHUB360_COMMERCIAL_AGENT_CELL v1.1.0
 * (`C:\Users\Marks\Desktop\BIRTHHUB360_COMMERCIAL_AGENT_CELL_v1.1.0`), instalado nesta onda.
 *
 * DIFERENÇA DELIBERADA em relação a `registry/agents.compact.json` do pacote original: aquele
 * arquivo foi montado sem leitura do código real deste repositório (ver `REPO_REALITY_CHECK.md`
 * do próprio pacote, seção final — "não tenho acesso de leitura ao código real"). Os campos
 * `status`/`risk`/`bindings` abaixo foram corrigidos nesta onda depois de ler o código real:
 *
 * - `contract-signature`: o pacote marcava `status: BLOCKED, risk: HIGH` ("nenhuma integração de
 *   assinatura confiável encontrada"). Falso — `src/shared/domain/signature.ts` (movido de
 *   `src/features/cadence/domain/signature.ts` no ITEM-13 de arquitetura — módulo puro sem dono
 *   de feature, sempre consumido de fora de `cadence`), `application/documentSignature.ts`,
 *   `infra/GovBrSignatureProviderPort.ts` e `infra/PrismaSignatureRequestRepository.ts` (esses três
 *   continuam em `src/features/cadence/**`) já implementam o fluxo real (provedor gov.br, hoje um
 *   stub de transporte documentado, mas a máquina de estados e o webhook são reais).
 * - `billing-revenue`: o pacote e a auditoria concordam que não existe fonte real de faturamento.
 *   Confirmado: `src/features/billing/**` é consumo de IA (custo de token), não faturamento de
 *   venda — o próprio arquivo documenta "deliberadamente NÃO é um módulo de faturamento".
 *   `SOURCE_REQUIRED` mantido.
 * - `churn-retention`: `src/features/analytics/services/churn-prediction.service.ts` já existe e
 *   já é a análise de risco (LLM). O agente desta célula narra esse resultado (recebido como
 *   texto do chamador) no contrato `AgentExecutionResult` — nunca uma segunda opinião de IA
 *   competindo com o motor real, e nunca um import direto: `no-cross-feature-imports`
 *   (dependency-cruiser, `npm run test:architecture`) rejeitou a tentativa de import direto nesta
 *   onda, então quem chama esse serviço e formata o resultado é responsabilidade de outro
 *   domínio/rota, não deste arquivo.
 * - `revenue-intelligence`: `CommercialIntelligenceAiService` (resumo executivo + mentor
 *   playbook) já cobre boa parte da missão, grounded em `CommercialIntelligenceUseCases`. Mesmo
 *   limite de arquitetura do item acima: o agente narra o texto já produzido pelo chamador, não
 *   importa o serviço.
 * - `ldr-intelligence`: `src/features/market-intelligence/**` (`AccountIntelligenceService`,
 *   componente `LdrAccountIntelligence.tsx`) já é, na prática, o "LDR" do produto — o pacote não
 *   sabia disso e classificava como `MAPPED`/reconstruir do zero.
 *
 * Ver `.agents/handoffs/onda-13/13-para-00-instalacao-celula-comercial.md` para o relatório
 * completo desta reclassificação, incluindo a rejeição do gate de arquitetura.
 *
 * ATUALIZAÇÃO (AIAGENT-004, onda 6 — "Execução Real de Agentes de IA"): a onda 43 implementou 9
 * agentes novos mas só conectou 3 a rotas HTTP (revenue-intelligence, churn-retention,
 * contract-signature). Os outros 6 tinham código completo e nenhum caminho de entrega — e este
 * catálogo, servido em `GET /api/agent/commercial-cell`, devolvia `agentModule` para todos eles
 * sem distinguir quem era realmente invocável. Resolução:
 *
 * - 5 dos 6 ganharam rota própria nesta onda (`ldr-intelligence`, `coordinator-commercial`,
 *   `manager-commercial`, `executive-director`, `bitrix-guardian`), todas seguindo exatamente o
 *   padrão dos 3 já conectados: o motor real é resolvido via DI container (nunca importado
 *   direto, por `no-cross-feature-imports`), o chamador formata o contexto, e o agente só narra.
 * - `billing-revenue` continua sem rota DE PROPÓSITO — ver o comentário na própria entrada.
 * - O campo `httpRoute` (novo) torna essa diferença explícita para quem consome o catálogo, em
 *   vez de deixá-la implícita na presença de `agentModule`.
 */
export interface CommercialAgentDefinition {
  id: CommercialAgentId;
  name: string;
  role: string;
  layer: 'sales' | 'management' | 'executive' | 'control';
  status: CommercialAgentStatus;
  risk: CommercialAgentRisk;
  requiresApproval: boolean;
  mission: string;
  capabilities: string[];
  handoffs: CommercialAgentId[];
  /** Arquivos/serviços reais que este agente narra ou refina — nunca reimplementa. */
  bindings: string[];
  /** Preenchido apenas quando o agente foi implementado nesta onda como wrapper fino. */
  agentModule: string | null;
  /**
   * AIAGENT-004 (onda 6 de execução real): caminho HTTP pelo qual este agente é REALMENTE
   * invocável hoje. `null` significa "existe código, não existe caminho de entrega" — antes deste
   * campo, `GET /api/agent/commercial-cell` devolvia `agentModule` para 6 agentes sem rota, o que
   * levava um consumidor de API a presumir paridade com os que tinham rota. Nunca preencha este
   * campo sem que a rota exista de fato em `src/features/intelligence/routes/agent.routes.ts` (ou,
   * para os agentes do enxame de produção, em `/api/agent/swarm/mission`).
   */
  httpRoute: string | null;
  /**
   * Preenchido SOMENTE quando `httpRoute` é `null` apesar de existir `agentModule` — explica por
   * que não há rota, para que a ausência seja uma decisão documentada e não um esquecimento.
   */
  noRouteReason: string | null;
}

export const COMMERCIAL_AGENT_REGISTRY: CommercialAgentDefinition[] = [
  {
    id: 'ldr-intelligence',
    name: 'Agente LDR — Inteligência de Leads',
    role: 'LDR',
    layer: 'sales',
    status: 'NOVO_SOBRE_SERVICO_REAL',
    risk: 'LOW',
    requiresApproval: false,
    mission:
      'Contextualizar e priorizar uma conta antes da abordagem, citando snapshot, score e sinais reais já coletados pela Inteligência de Mercado.',
    capabilities: [
      'icp_fit',
      'account_research',
      'market_signals',
      'lead_prioritization',
      'handoff_to_bdr',
    ],
    handoffs: ['bdr-outbound', 'coordinator-commercial', 'revenue-intelligence'],
    bindings: [
      'src/features/market-intelligence/server/accountIntelligence.service.ts (AccountIntelligenceService.getIntelligence)',
    ],
    agentModule: './ldrIntelligence.agent.js',
    httpRoute: '/api/agent/commercial-cell/ldr-intelligence/run',
    noRouteReason: null,
  },
  {
    id: 'bdr-outbound',
    name: 'Agente BDR — Outbound',
    role: 'BDR',
    layer: 'sales',
    status: 'REAL_EM_PRODUCAO',
    risk: 'LOW',
    requiresApproval: false,
    mission:
      'Transformar contas priorizadas em abordagens outbound relevantes e criar o primeiro movimento comercial.',
    capabilities: [
      'outbound_strategy',
      'first_touch',
      'account_mapping',
      'icebreaker',
      'cadence_start',
    ],
    handoffs: ['sdr-qualification', 'coordinator-commercial', 'bitrix-guardian'],
    bindings: ['src/features/intelligence/agents/bdr.agent.ts (BDRAgent, já em produção)'],
    agentModule: null,
    // Agente do enxame de produção: não tem rota própria de célula comercial, é acionado pelo
    // Supervisor (`supervisor.agent.ts`) dentro de uma missão.
    httpRoute: '/api/agent/swarm/mission',
    noRouteReason: null,
  },
  {
    id: 'sdr-qualification',
    name: 'Agente SDR — Qualificação',
    role: 'SDR',
    layer: 'sales',
    status: 'REAL_EM_PRODUCAO',
    risk: 'LOW',
    requiresApproval: true,
    mission:
      'Qualificar leads com evidência e converter interesse em oportunidade realmente trabalhável.',
    capabilities: [
      'lead_qualification',
      'meeting_preparation',
      'qualification_matrix',
      'crm_update_proposal',
      'handoff_to_closer',
    ],
    handoffs: ['closer-sales', 'coordinator-commercial', 'bitrix-guardian'],
    bindings: [
      'src/features/intelligence/agents/sdrQualification.agent.ts (SDRQualificationAgent, já em produção)',
    ],
    agentModule: null,
    httpRoute: '/api/agent/swarm/mission',
    noRouteReason: null,
  },
  {
    id: 'closer-sales',
    name: 'Agente Closer — Negociação e Fechamento',
    role: 'Closer',
    layer: 'sales',
    status: 'REAL_EM_PRODUCAO',
    risk: 'LOW',
    requiresApproval: true,
    mission:
      'Aumentar qualidade de negociação e fechamento protegendo margem e probabilidade real.',
    capabilities: [
      'deal_strategy',
      'objection_handling',
      'proposal_strategy',
      'decision_committee',
      'close_plan',
      'risk_assessment',
    ],
    handoffs: [
      'contract-signature',
      'coordinator-commercial',
      'revenue-intelligence',
      'bitrix-guardian',
    ],
    bindings: [
      'src/features/intelligence/agents/closer.agent.ts (CloserAgent, já em produção — nunca move deal para ganho, exige evento verificável)',
    ],
    agentModule: null,
    httpRoute: '/api/agent/swarm/mission',
    noRouteReason: null,
  },
  {
    id: 'coordinator-commercial',
    name: 'Agente Coordenador Comercial',
    role: 'Coordenador',
    layer: 'management',
    status: 'NOVO_SOBRE_SERVICO_REAL',
    risk: 'MEDIUM',
    requiresApproval: true,
    mission:
      'Narrar o ritmo diário do time a partir de alertas, aging e indicadores já calculados, apontando gargalos e próxima ação.',
    capabilities: [
      'daily_control',
      'leading_indicators',
      'sla_monitoring',
      'next_action_control',
      'team_coaching',
      'agent_orchestration',
    ],
    handoffs: ['manager-commercial', 'bitrix-guardian', 'revenue-intelligence'],
    bindings: [
      'Consome texto pré-formatado pelo chamador (mesmo padrão de BDRAgent/CRMAgent) — fontes esperadas: commercial-intelligence alerts/aging/leading-indicators, Activities.',
    ],
    agentModule: './coordinatorCommercial.agent.js',
    httpRoute: '/api/agent/commercial-cell/coordinator-commercial/run',
    noRouteReason: null,
  },
  {
    id: 'manager-commercial',
    name: 'Agente Gerente Comercial',
    role: 'Gerente',
    layer: 'management',
    status: 'NOVO_SOBRE_SERVICO_REAL',
    risk: 'MEDIUM',
    requiresApproval: true,
    mission: 'Revisar forecast, pipeline e performance do time separando fato, tendência e risco.',
    capabilities: [
      'forecast_review',
      'pipeline_review',
      'team_performance',
      'bottleneck_analysis',
      'coaching_priorities',
      'goal_management',
    ],
    handoffs: ['executive-director', 'coordinator-commercial', 'revenue-intelligence'],
    bindings: [
      'Consome texto pré-formatado pelo chamador — fontes esperadas: commercial-intelligence overview/performance/aging/losses.',
    ],
    agentModule: './managerCommercial.agent.js',
    httpRoute: '/api/agent/commercial-cell/manager-commercial/run',
    noRouteReason: null,
  },
  {
    id: 'executive-director',
    name: 'Agente Diretoria — Executivo Comercial',
    role: 'Diretoria',
    layer: 'executive',
    status: 'NOVO_SOBRE_SERVICO_REAL',
    risk: 'LOW',
    requiresApproval: false,
    mission:
      'Responder objetivamente se a máquina comercial sustenta a meta, traduzindo operação em decisão executiva.',
    capabilities: [
      'executive_summary',
      'scenario_analysis',
      'risk_prioritization',
      '90d_outlook',
      'strategic_decisions',
    ],
    handoffs: [
      'manager-commercial',
      'revenue-intelligence',
      'billing-revenue',
      'churn-retention',
      'contract-signature',
    ],
    bindings: [
      'Consome texto pré-formatado pelo chamador — fontes esperadas: commercial-intelligence executive overview/trends/health-score/forecast-accuracy.',
    ],
    agentModule: './executiveDirector.agent.js',
    httpRoute: '/api/agent/commercial-cell/executive-director/run',
    noRouteReason: null,
  },
  {
    id: 'billing-revenue',
    name: 'Agente Receita & Faturamento',
    role: 'Finance/Revenue',
    layer: 'control',
    status: 'NOVO_FONTE_PARCIAL',
    risk: 'MEDIUM',
    requiresApproval: true,
    mission:
      'Reconciliar vendido x faturado quando houver fonte confiável — nunca fabricar o faturado.',
    capabilities: [
      'sold_vs_billed',
      'mrr_reconciliation',
      'billing_gap',
      'revenue_trend',
      'revenue_alerts',
    ],
    handoffs: ['executive-director', 'manager-commercial', 'churn-retention', 'contract-signature'],
    bindings: [
      'Vendido: commercial-intelligence (Closed Won). Faturado: SEM FONTE REAL confirmada — src/features/billing/** é custo de uso de IA, não faturamento de venda. Sempre retorna billedAmount=null + missingData quando não houver fonte informada pelo chamador.',
    ],
    agentModule: './billingRevenue.agent.js',
    // AIAGENT-004 — decisão explícita da onda 6, NÃO um esquecimento: este é o único agente da
    // célula que continua sem rota de propósito. Os outros 5 órfãos ganharam rota porque tinham um
    // motor real atrás (CommercialIntelligenceUseCases / AccountIntelligenceService); este não tem.
    // Dar-lhe uma rota hoje só produziria, em 100% das chamadas, a saída
    // "faturado: não disponível — SOURCE_REQUIRED", porque não existe fonte de faturamento
    // integrada neste repositório (`src/features/billing/**` é custo de consumo de IA, não
    // faturamento de venda — ver `bindings` acima e o cabeçalho de `billingRevenue.agent.ts`).
    // Uma rota que só sabe responder "não sei" é pior que a ausência declarada: gastaria chamada
    // de IA e orçamento de token para devolver uma lacuna já conhecida em tempo de código.
    // Reavaliar quando existir integração real de faturamento/ERP (fora do escopo desta onda).
    httpRoute: null,
    noRouteReason:
      'Sem fonte de faturamento integrada (SOURCE_REQUIRED). Uma rota hoje devolveria sempre ' +
      '"faturado: não disponível" — reavaliar quando houver integração real de faturamento/ERP.',
  },
  {
    id: 'churn-retention',
    name: 'Agente Churn & Retenção',
    role: 'CS/Revenue',
    layer: 'control',
    status: 'NOVO_SOBRE_SERVICO_REAL',
    risk: 'MEDIUM',
    requiresApproval: true,
    mission:
      'Identificar risco de cancelamento e propor plano de retenção com evidência, sem recalcular o motor já existente.',
    capabilities: [
      'churn_risk',
      'health_score',
      'retention_plan',
      'revenue_at_risk',
      'account_priority',
    ],
    handoffs: [
      'manager-commercial',
      'executive-director',
      'billing-revenue',
      'coordinator-commercial',
    ],
    bindings: [
      'Consome texto pré-formatado pelo chamador com o resultado já calculado por ChurnPredictionService.analyzeChurnRisk (src/features/analytics/services/churn-prediction.service.ts) — import direto rejeitado pelo gate de arquitetura (no-cross-feature-imports).',
    ],
    agentModule: './churnRetention.agent.js',
    httpRoute: '/api/agent/commercial-cell/churn-retention/run',
    noRouteReason: null,
  },
  {
    id: 'contract-signature',
    name: 'Agente Contratos & Assinatura',
    role: 'Contract Ops',
    layer: 'control',
    status: 'NOVO_SOBRE_SERVICO_REAL',
    risk: 'MEDIUM',
    requiresApproval: true,
    mission:
      'Avaliar prontidão de um contrato e narrar o status real de assinatura, sem nunca assinar ou enviar autonomamente.',
    capabilities: [
      'contract_readiness',
      'data_validation',
      'signature_status',
      'contract_blockers',
      'handoff_to_billing',
    ],
    handoffs: ['billing-revenue', 'closer-sales', 'executive-director', 'bitrix-guardian'],
    bindings: [
      'Espelha (sem importar) os status reais de src/shared/domain/signature.ts (SignatureStatus, movido de src/features/cadence/domain/ no ITEM-13). Nunca chama requestDocumentSignature/applySignatureStatusUpdate.',
    ],
    agentModule: './contractSignature.agent.js',
    httpRoute: '/api/agent/commercial-cell/contract-signature/run',
    noRouteReason: null,
  },
  {
    id: 'bitrix-guardian',
    name: 'Agente Bitrix — CRM Guardian',
    role: 'RevOps/Bitrix',
    layer: 'control',
    status: 'NOVO_SOBRE_SERVICO_REAL',
    risk: 'MEDIUM',
    requiresApproval: true,
    mission:
      'Diagnosticar a saúde da sincronização Bitrix x Central a partir de dados reais — nunca grava nada (caminho de leitura, sem writeback).',
    capabilities: [
      'bitrix_sync_health',
      'crm_hygiene',
      'stage_validation',
      'duplicate_detection',
      'activity_quality',
      'bitrix_note',
    ],
    handoffs: [
      'coordinator-commercial',
      'manager-commercial',
      'revenue-intelligence',
      'sdr-qualification',
      'closer-sales',
    ],
    bindings: [
      'Consome texto pré-formatado pelo chamador (ex.: CrmQualityIndex.bitrixSync de commercial-intelligence, ou logs de src/features/integrations/bitrix/**). Sem acesso de escrita — writeback continua exclusivo do domínio de integrações (Agente 06).',
    ],
    agentModule: './bitrixGuardian.agent.js',
    httpRoute: '/api/agent/commercial-cell/bitrix-guardian/run',
    noRouteReason: null,
  },
  {
    id: 'revenue-intelligence',
    name: 'Agente Revenue Intelligence — Forecast & Pipeline',
    role: 'Revenue Intelligence',
    layer: 'control',
    status: 'NOVO_SOBRE_SERVICO_REAL',
    risk: 'LOW',
    requiresApproval: false,
    mission:
      'Traduzir métricas do cockpit comercial em previsibilidade, separando Pipeline de Forecast.',
    capabilities: [
      'new_mrr',
      'closed_mrr',
      'attainment',
      'commit',
      'best_case',
      'forecast',
      'forecast_gap',
      'pipeline_total',
      'eligible_pipeline',
      'pipeline_coverage',
      'win_rate',
      'sales_cycle',
      'aging',
      'loss_reasons',
      'leading_indicators',
      'forecast_accuracy',
    ],
    handoffs: [
      'manager-commercial',
      'executive-director',
      'coordinator-commercial',
      'bitrix-guardian',
      'billing-revenue',
    ],
    bindings: [
      'Consome texto pré-formatado pelo chamador com números já calculados por CommercialIntelligenceAiService/CommercialIntelligenceUseCases (src/features/commercial-intelligence/**) — import direto rejeitado pelo gate de arquitetura (no-cross-feature-imports).',
    ],
    agentModule: './revenueIntelligence.agent.js',
    httpRoute: '/api/agent/commercial-cell/revenue-intelligence/run',
    noRouteReason: null,
  },
];

export function getCommercialAgentDefinition(
  id: CommercialAgentId,
): CommercialAgentDefinition | undefined {
  return COMMERCIAL_AGENT_REGISTRY.find((agent) => agent.id === id);
}
