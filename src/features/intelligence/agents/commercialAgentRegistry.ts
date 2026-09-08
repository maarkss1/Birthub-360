import type {
  CommercialAgentId,
  CommercialAgentRisk,
  CommercialAgentStatus,
} from './commercialAgentTypes.js';

/**
 * Catálogo dos 12 agentes do pacote ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0
 * (`C:\Users\Marks\Desktop\ATLASGR_COMMERCIAL_AGENT_CELL_v1.1.0`), instalado nesta onda.
 *
 * DIFERENÇA DELIBERADA em relação a `registry/agents.compact.json` do pacote original: aquele
 * arquivo foi montado sem leitura do código real deste repositório (ver `REPO_REALITY_CHECK.md`
 * do próprio pacote, seção final — "não tenho acesso de leitura ao código real"). Os campos
 * `status`/`risk`/`bindings` abaixo foram corrigidos nesta onda depois de ler o código real:
 *
 * - `contract-signature`: o pacote marcava `status: BLOCKED, risk: HIGH` ("nenhuma integração de
 *   assinatura confiável encontrada"). Falso — `src/features/cadence/domain/signature.ts`,
 *   `application/documentSignature.ts`, `infra/GovBrSignatureProviderPort.ts` e
 *   `infra/PrismaSignatureRequestRepository.ts` já implementam o fluxo real (provedor gov.br,
 *   hoje um stub de transporte documentado, mas a máquina de estados e o webhook são reais).
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
      'Espelha (sem importar — no-cross-feature-imports) os status reais de src/features/cadence/domain/signature.ts (SignatureStatus). Nunca chama requestDocumentSignature/applySignatureStatusUpdate.',
    ],
    agentModule: './contractSignature.agent.js',
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
  },
];

export function getCommercialAgentDefinition(
  id: CommercialAgentId,
): CommercialAgentDefinition | undefined {
  return COMMERCIAL_AGENT_REGISTRY.find((agent) => agent.id === id);
}
