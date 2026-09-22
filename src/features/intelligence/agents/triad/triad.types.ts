/**
 * Contratos de Tipos da Tríade de Comando do Agente Comercial de Elite (Birth Hub 360).
 *
 * Estrutura:
 * - Tagarela: Supervisor Central / Router de Alta Alçada.
 * - Giselle: Diretora de Estratégia e Inteligência (ICP, Hipótese de Dor, Valor, Abordagem).
 * - Patrícia: Diretora de Execução e Outbound (Cadência Adaptativa, Next Best Action, Comunicação).
 * - Guardião: Diretor de Governança, Risco e Policy (RBAC, Alçadas, PII/LGPD, Integridade CRM).
 */

export interface TransparentScore {
  score: number; // 0 a 100
  reason: string;
  evidence: string[];
  confidence: number; // 0 a 1
}

export interface DecisionMakerInfo {
  name: string;
  role: string;
  seniority: 'C-Level' | 'Director' | 'Manager' | 'Coordinator' | 'Specialist';
  linkedinUrl?: string;
  email?: string;
  phone?: string;
}

export interface AccountIntelligencePack {
  companyId?: string;
  companyName: string;
  cnpj?: string;
  domain?: string;
  segment?: string;
  region?: string;
  fleetSize?: number;
  headcount?: number;
  estimatedRevenue?: number;
  decisionMakers: DecisionMakerInfo[];
  technologies: string[];
  competitors: string[];
  recentNewsOrEvents: string[];
  probablePainHypothesis: string[];
}

export interface GiselleStrategyPlan {
  strategyId: string;
  account: AccountIntelligencePack;
  scores: {
    icp: TransparentScore;
    fit: TransparentScore;
    intent: TransparentScore;
    opportunity: TransparentScore;
  };
  targetPersona: DecisionMakerInfo;
  primaryPain: string;
  valueProposition: string;
  recommendedAngle: string;
  recommendedChannel: 'EMAIL' | 'LINKEDIN' | 'PHONE_VOICE' | 'WHATSAPP';
  recommendedTiming: string;
  suggestedCta: string;
  generatedAt: string;
}

export interface CadenceStep {
  day: number;
  channel: 'EMAIL' | 'LINKEDIN' | 'PHONE_VOICE' | 'WHATSAPP';
  actionDescription: string;
  contentTemplate: string;
  status: 'PENDING' | 'SCHEDULED' | 'EXECUTED' | 'WAITING_EVENT';
}

export interface NextBestAction {
  actionId: string;
  title: string;
  type: 'CALL' | 'EMAIL' | 'WHATSAPP' | 'PROPOSAL_REVIEW' | 'MEETING_PROPOSE';
  accountName: string;
  opportunityScore: TransparentScore;
  contactName: string;
  contactRole: string;
  contactPhone?: string;
  contactEmail?: string;
  windowRecommendation: string;
  reasons: string[];
  battlecardHints?: string[];
  suggestedQuestions?: string[];
}

export interface PatriciaExecutionPlan {
  executionId: string;
  strategyId: string;
  cadence: CadenceStep[];
  nextBestAction: NextBestAction;
  generatedAt: string;
}

export type PolicyCategory = 'RBAC' | 'DISCOUNT_MARGIN' | 'LGPD_PII' | 'CRM_INTEGRITY';

export interface GuardiaoPolicyVerdict {
  verdict: 'APPROVED' | 'REQUIRES_APPROVAL' | 'REJECTED';
  ruleId: string;
  category: PolicyCategory;
  details: string;
  requiredRoleForApproval?: 'GERENTE' | 'DIRETOR' | 'ADMIN';
  piiSanitized: boolean;
  auditLog: string;
}

export interface AgentCenterTraceNode {
  id: string;
  agentCode: string;
  agentName: string;
  roleLabel: string;
  director: 'TAGARELA' | 'GISELLE' | 'PATRICIA' | 'GUARDIAO';
  status: 'COMPLETED' | 'RUNNING' | 'PENDING' | 'BLOCKED';
  resultSummary?: string;
  timestamp: string;
}

export interface AgentCenterTrace {
  missionId: string;
  title: string;
  accountName: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'WAITING_HUMAN_ACTION';
  root: 'Tagarela (Supervisor Geral)';
  directors: {
    giselle: {
      status: 'COMPLETED' | 'RUNNING' | 'PENDING';
      specialists: AgentCenterTraceNode[];
    };
    patricia: {
      status: 'COMPLETED' | 'RUNNING' | 'PENDING';
      specialists: AgentCenterTraceNode[];
    };
    guardiao: {
      status: 'COMPLETED' | 'RUNNING' | 'PENDING';
      specialists: AgentCenterTraceNode[];
    };
  };
}

export interface SellerWorkspaceOverview {
  metrics: {
    monthTarget: number;
    closedWon: number;
    gap: number;
    influencablePipeline: number;
    commitForecast: number;
    aiForecast: number;
    targetCompletionPercent: number;
  };
  nextBestAction: NextBestAction;
  recentMissions: Array<{
    missionId: string;
    accountName: string;
    opportunityScore: number;
    status: string;
    lastUpdated: string;
  }>;
}
