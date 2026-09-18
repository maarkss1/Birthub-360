import type {
  AgentCenterTrace,
  GiselleStrategyPlan,
  GuardiaoPolicyVerdict,
  PatriciaExecutionPlan,
} from './triad.types.js';
import { GiselleStrategyAgent, type GiselleStrategyInput } from './giselleStrategy.agent.js';
import { PatriciaExecutionAgent } from './patriciaExecution.agent.js';
import { GuardiaoGovernanceAgent } from './guardiaoGovernance.agent.js';

export interface CommercialMissionRequest {
  missionId?: string;
  accountName: string;
  cnpj?: string;
  segment?: string;
  fleetSize?: number;
  estimatedRevenue?: number;
  dealValue?: number;
  userRole?: 'SDR' | 'CLOSER' | 'GERENTE' | 'DIRETOR' | 'ADMIN';
  requestedDiscountPercent?: number;
  containsSensitiveData?: boolean;
  hasPiiConsent?: boolean;
}

export interface CommercialMissionResponse {
  missionId: string;
  accountName: string;
  strategy: GiselleStrategyPlan;
  governance: GuardiaoPolicyVerdict[];
  execution: PatriciaExecutionPlan;
  trace: AgentCenterTrace;
}

export class TagarelaRouterService {
  private giselle = new GiselleStrategyAgent();
  private patricia = new PatriciaExecutionAgent();
  private guardiao = new GuardiaoGovernanceAgent();

  public async runCommercialMission(
    req: CommercialMissionRequest,
  ): Promise<CommercialMissionResponse> {
    const missionId =
      req.missionId ?? `mission-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // 1. Etapa de Governança e Higiene Inicial (Guardião)
    const crmVerdict = this.guardiao.evaluateCrmIntegrity({
      companyName: req.accountName,
      cnpj: req.cnpj,
    });

    const piiVerdict = this.guardiao.evaluatePiiAndConsent({
      hasConsent: req.hasPiiConsent ?? true,
      containsSensitiveData: req.containsSensitiveData ?? false,
    });

    const discountVerdict = this.guardiao.evaluateDiscountPolicy({
      userRole: req.userRole ?? 'CLOSER',
      requestedDiscountPercent: req.requestedDiscountPercent ?? 0,
      dealValue: req.dealValue ?? 50000,
    });

    const governanceVerdicts = [crmVerdict, piiVerdict, discountVerdict];

    // 2. Etapa de Estratégia e Inteligência (Giselle)
    const strategyInput: GiselleStrategyInput = {
      companyName: req.accountName,
      cnpj: req.cnpj,
      segment: req.segment,
      fleetSize: req.fleetSize,
      estimatedRevenue: req.estimatedRevenue,
    };
    const strategy = await this.giselle.generateStrategy(strategyInput);

    // 3. Etapa de Execução e Cadência (Patrícia)
    const execution = await this.patricia.planExecution(strategy);

    // 4. Montagem da Árvore de Rastreamento (Agent Center Trace)
    const trace: AgentCenterTrace = {
      missionId,
      title: `Preparar Abordagem e Estratégia: ${req.accountName}`,
      accountName: req.accountName,
      status: governanceVerdicts.some((v) => v.verdict === 'REQUIRES_APPROVAL')
        ? 'WAITING_HUMAN_ACTION'
        : 'COMPLETED',
      root: 'Tagarela (Supervisor Geral)',
      directors: {
        giselle: {
          status: 'COMPLETED',
          specialists: [
            {
              id: `node-icp-${Date.now()}`,
              agentCode: 'icp-analyst',
              agentName: 'ICP Analyst',
              roleLabel: 'Analista de Perfil Ideal',
              director: 'GISELLE',
              status: 'COMPLETED',
              resultSummary: `ICP Score ${strategy.scores.icp.score}/100 com alta compatibilidade`,
              timestamp: now,
            },
            {
              id: `node-acc-${Date.now()}`,
              agentCode: 'account-intelligence',
              agentName: 'Account Intelligence Specialist',
              roleLabel: 'Mapeador de Conta',
              director: 'GISELLE',
              status: 'COMPLETED',
              resultSummary: `Decisor identificado: ${strategy.targetPersona.name} (${strategy.targetPersona.role})`,
              timestamp: now,
            },
            {
              id: `node-pain-${Date.now()}`,
              agentCode: 'value-proposition-strategist',
              agentName: 'Value Proposition Strategist',
              roleLabel: 'Estrategista de Valor',
              director: 'GISELLE',
              status: 'COMPLETED',
              resultSummary: `Tese definida: ${strategy.primaryPain}`,
              timestamp: now,
            },
            {
              id: `node-comp-${Date.now()}`,
              agentCode: 'competitor-intel',
              agentName: 'Competitor Intelligence Agent',
              roleLabel: 'Inteligência Concorrencial',
              director: 'GISELLE',
              status: 'COMPLETED',
              resultSummary: `Battlecard ativo contra ${strategy.account.competitors.join(', ')}`,
              timestamp: now,
            },
          ],
        },
        patricia: {
          status: 'COMPLETED',
          specialists: [
            {
              id: `node-out-${Date.now()}`,
              agentCode: 'outbound-specialist',
              agentName: 'Outbound Specialist',
              roleLabel: 'Especialista em Cadência',
              director: 'PATRICIA',
              status: 'COMPLETED',
              resultSummary: `Cadência multicanal de ${execution.cadence.length} toques estruturada`,
              timestamp: now,
            },
            {
              id: `node-nba-${Date.now()}`,
              agentCode: 'next-best-action-agent',
              agentName: 'Next Best Action Agent',
              roleLabel: 'Otimizador de Próxima Ação',
              director: 'PATRICIA',
              status: 'COMPLETED',
              resultSummary: `${execution.nextBestAction.title} (${execution.nextBestAction.windowRecommendation})`,
              timestamp: now,
            },
            {
              id: `node-book-${Date.now()}`,
              agentCode: 'meeting-booker',
              agentName: 'Meeting Booker',
              roleLabel: 'Agendador de Reunião',
              director: 'PATRICIA',
              status: 'PENDING',
              resultSummary: 'Aguardando interação do contato após o próximo toque',
              timestamp: now,
            },
          ],
        },
        guardiao: {
          status: governanceVerdicts.some((v) => v.verdict === 'REQUIRES_APPROVAL')
            ? 'RUNNING'
            : 'COMPLETED',
          specialists: [
            {
              id: `node-crm-${Date.now()}`,
              agentCode: 'crm-guardian',
              agentName: 'CRM Guardian',
              roleLabel: 'Guardião do CRM',
              director: 'GUARDIAO',
              status: crmVerdict.verdict === 'APPROVED' ? 'COMPLETED' : 'BLOCKED',
              resultSummary: crmVerdict.details,
              timestamp: now,
            },
            {
              id: `node-policy-${Date.now()}`,
              agentCode: 'policy-engine-agent',
              agentName: 'Commercial Policy Engine',
              roleLabel: 'Motor de Alçadas e Margem',
              director: 'GUARDIAO',
              status: discountVerdict.verdict === 'APPROVED' ? 'COMPLETED' : 'BLOCKED',
              resultSummary: discountVerdict.details,
              timestamp: now,
            },
          ],
        },
      },
    };

    return {
      missionId,
      accountName: req.accountName,
      strategy,
      governance: governanceVerdicts,
      execution,
      trace,
    };
  }
}
