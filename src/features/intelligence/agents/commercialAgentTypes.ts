/**
 * Contrato compartilhado da Célula Comercial de Agentes (Onda 13 — instalação do pacote
 * ATLASGR_COMMERCIAL_AGENT_CELL v1.1.0). Não é um framework paralelo ao Enxame que já roda em
 * produção (Supervisor + SDR/BDR/Closer/CRM/Ops, ver `supervisor.agent.ts`) — é o envelope de
 * saída e o formato de handoff que os agentes NOVOS desta célula usam (`ldrIntelligence.agent.ts`,
 * `coordinatorCommercial.agent.ts`, `managerCommercial.agent.ts`, `executiveDirector.agent.ts`,
 * `revenueIntelligence.agent.ts`, `bitrixGuardian.agent.ts`, `contractSignature.agent.ts`,
 * `billingRevenue.agent.ts`, `churnRetention.agent.ts`). Os 4 agentes de swarm já existentes
 * (BDR/SDR/Closer/CRM/Ops) mantêm seu formato de retorno atual — não foram tocados por esta onda
 * (ver `.agents/runs/` desta onda para o racional de não duplicar/quebrar o que já está em
 * produção).
 *
 * Fonte destas 3 interfaces: `prompts/shared/base-agent.md` (envelope) e
 * `prompts/shared/reflection.md` (reflexão) do pacote de instalação. Se este arquivo e os `.md`
 * do pacote divergirem no futuro, este arquivo — já integrado ao código real — prevalece.
 */

/** Identificadores dos 12 agentes do pacote (ver `commercialAgentRegistry.ts`). */
export type CommercialAgentId =
  | 'ldr-intelligence'
  | 'bdr-outbound'
  | 'sdr-qualification'
  | 'closer-sales'
  | 'coordinator-commercial'
  | 'manager-commercial'
  | 'executive-director'
  | 'billing-revenue'
  | 'churn-retention'
  | 'contract-signature'
  | 'bitrix-guardian'
  | 'revenue-intelligence';

export type CommercialAgentRisk = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Status verificado contra o código real deste repositório nesta onda — não é o `status` do
 * pacote original (`registry/agents.compact.json` upstream), que foi montado sem leitura de
 * código. Ver `commercialAgentRegistry.ts` para o valor de cada agente e o porquê.
 */
export type CommercialAgentStatus =
  /** Já existe como agente de swarm em produção; este pacote só refina o prompt. */
  | 'REAL_EM_PRODUCAO'
  /** Não existe como agente, mas o motor/serviço que ele narra já é real — implementado nesta onda como wrapper fino. */
  | 'NOVO_SOBRE_SERVICO_REAL'
  /** Implementado nesta onda, mas a fonte de dado que o justificaria plenamente ainda não existe (ex.: faturamento real). Nunca fabrica o dado ausente — reporta `SOURCE_REQUIRED`. */
  | 'NOVO_FONTE_PARCIAL'
  /** Registrado no catálogo, mas não implementado nesta onda — depende de decisão de escopo (freeze Sprint 00→13) ou de dono de outro domínio. Ver handoff correspondente. */
  | 'MAPEADO_NAO_IMPLEMENTADO';

/**
 * Separação fato/inferência/recomendação exigida por `base-agent.md` regra #2 — nunca apresentar
 * inferência como fato, nem recomendação como decisão já tomada.
 */
export interface AgentFact {
  label: string;
  value: string;
  source: string;
}

export interface AgentRisk {
  label: string;
  severity: 'critical' | 'warning' | 'info';
  evidence: string;
}

export interface AgentRecommendation {
  title: string;
  rationale: string;
  suggestedAction: string;
}

/**
 * Handoff estruturado entre agentes da célula comercial — protocolo de RUNTIME (missão comercial
 * em execução), diferente do handoff de dev-agente em `.agents/handoffs/onda-<n>/**` (que
 * coordena QUEM MEXE NO CÓDIGO). Ver `REPO_REALITY_CHECK.md` do pacote de instalação, §4.
 */
export interface AgentHandoff {
  missionId: string;
  from: CommercialAgentId;
  to: CommercialAgentId;
  question: string;
  knownFacts: string[];
  evidenceRefs: string[];
  desiredOutput: string;
  riskLevel: CommercialAgentRisk;
}

/** Reflexão canônica de 9 campos — `prompts/shared/reflection.md` do pacote é a fonte de verdade textual; este tipo apenas espelha o shape. */
export interface AgentReflection {
  whatWorked: string[];
  whatFailed: string[];
  newEvidence: string[];
  reusableRule: string | null;
  confidence: number;
  shareable: boolean;
  recommendedTargets: CommercialAgentId[];
  contradictionWithExistingMemory: boolean;
  rollbackReason: string | null;
}

/**
 * Envelope padrão de saída — `base-agent.md` seção "CONTRATO DE SAÍDA". Cada agente pode somar
 * campos específicos do próprio domínio (ex.: `churnRisk0to100`), nunca substituir estes.
 */
export interface AgentExecutionResult {
  summary: string;
  facts: AgentFact[];
  metrics: Record<string, number | string | null>;
  risks: AgentRisk[];
  recommendations: AgentRecommendation[];
  nextActions: string[];
  handoffs: AgentHandoff[];
  /** 0 a 1, calibrada pela evidência disponível — nunca decorativa. */
  confidence: number;
  /** O que falta e qual fonte deveria fornecer — nunca substituído por um valor plausível (base-agent.md regra #3). */
  missingData: string[];
  reflection?: AgentReflection;
}

export function emptyExecutionResult(summary: string): AgentExecutionResult {
  return {
    summary,
    facts: [],
    metrics: {},
    risks: [],
    recommendations: [],
    nextActions: [],
    handoffs: [],
    confidence: 0,
    missingData: [],
  };
}
