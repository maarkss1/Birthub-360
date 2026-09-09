// PROMPT 5 — Supervisores de Cargo.
//
// "1 RoleSupervisorRuntime genérico + 12 RoleSupervisorProfile" (regra do prompt da onda): este
// arquivo só declara os 12 perfis (dado estático, mesmo espírito de `tool-bindings.ts` e
// `capability-catalog.ts` — não é tabela de banco, é fonte de verdade auditável em código). A
// lógica de seleção/execução/loop-guard vive em `roleSupervisor.service.ts`, único runtime que lê
// estes perfis.
//
// `preferredCapabilities` de cada cargo é um subconjunto, na mesma ordem de prioridade, das
// capabilities de domínio REALMENTE concedidas a esse cargo em
// `scripts/capability-import/build-capability-catalog.ts` (`ROLE_DOMAIN_CAPABILITIES`) — nunca uma
// capability inventada aqui. `mission` reaproveita a descrição real de `job-role-catalog.ts`.
import { JOB_ROLE_CATALOG, type JobRoleCode } from '../../../config/job-role-catalog.js';

/** Sinal que interrompe o loop do supervisor quando um passo termina nesse estado — ver
 *  `classifyStepSignal` em `roleSupervisor.service.ts`. `DENIED` cobre qualquer negação que não
 *  seja aprovação humana (grant ausente, FUTURE_TOOL, SOURCE_REQUIRED, READ_ONLY_ACCESS etc.):
 *  deliberadamente NUNCA incluído nos defaults abaixo, para Billing (SOURCE_REQUIRED) e Contratos
 *  (FUTURE_TOOL) continuarem bloqueados sem derrubar o restante da missão do supervisor. */
export type SupervisorStopCondition = 'APPROVAL_REQUIRED' | 'DENIED' | 'FAILED';

export interface SupervisorEscalationPolicy {
  /** Nunca 'AUTO_APPROVE' — não existe essa opção neste tipo (invariante "no self-approval"). */
  onApprovalRequired: 'ESCALATE_TO_HUMAN';
  onFailure: 'ESCALATE_TO_HUMAN' | 'STOP';
  /** Cargo informativo a notificar — não há canal de notificação real ainda (isso é o PROMPT 7,
   *  Aprovações). Aqui é só metadado propagado no resultado, nunca uma ação disparada. */
  notifyRole: JobRoleCode;
}

export interface RoleSupervisorProfile {
  jobRoleCode: JobRoleCode;
  mission: string;
  /** Capabilities tentadas em ordem quando a chamada não pede uma capability específica. */
  preferredCapabilities: string[];
  /** Subconjunto de `AgentDefinition.domain` a que este supervisor pode selecionar agentes — nunca
   *  vazio: cada cargo vê só o domínio real do seu próprio agente da Célula Comercial
   *  (`commercialAgentRegistry.ts`, campo `layer`). */
  allowedAgentCategories: string[];
  maxSteps: number;
  maxParallelTasks: number;
  stopConditions: SupervisorStopCondition[];
  escalationPolicy: SupervisorEscalationPolicy;
}

const DEFAULT_STOP_CONDITIONS: SupervisorStopCondition[] = ['APPROVAL_REQUIRED', 'FAILED'];

function escalationTo(notifyRole: JobRoleCode): SupervisorEscalationPolicy {
  return { onApprovalRequired: 'ESCALATE_TO_HUMAN', onFailure: 'ESCALATE_TO_HUMAN', notifyRole };
}

function missionOf(code: JobRoleCode): string {
  const entry = JOB_ROLE_CATALOG.find((r) => r.code === code);
  if (!entry) throw new Error(`JobRoleCode desconhecido em JOB_ROLE_CATALOG: ${code}`);
  return entry.description;
}

export const ROLE_SUPERVISOR_PROFILES: Record<JobRoleCode, RoleSupervisorProfile> = {
  LDR: {
    jobRoleCode: 'LDR',
    mission: missionOf('LDR'),
    preferredCapabilities: ['lead.search', 'lead.read', 'company.search', 'company.read'],
    allowedAgentCategories: ['sales'],
    maxSteps: 4,
    maxParallelTasks: 1,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('COORDENADOR_COMERCIAL'),
  },
  BDR: {
    jobRoleCode: 'BDR',
    mission: missionOf('BDR'),
    preferredCapabilities: ['lead.search', 'lead.enrich', 'lead.read', 'company.read'],
    allowedAgentCategories: ['sales'],
    maxSteps: 4,
    maxParallelTasks: 1,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('COORDENADOR_COMERCIAL'),
  },
  SDR: {
    jobRoleCode: 'SDR',
    mission: missionOf('SDR'),
    preferredCapabilities: ['lead.read', 'lead.qualify', 'lead.update', 'meeting.schedule'],
    allowedAgentCategories: ['sales'],
    maxSteps: 4,
    maxParallelTasks: 1,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('COORDENADOR_COMERCIAL'),
  },
  CLOSER: {
    jobRoleCode: 'CLOSER',
    mission: missionOf('CLOSER'),
    preferredCapabilities: ['deal.read', 'deal.analyze', 'deal.move_stage', 'contract.read'],
    allowedAgentCategories: ['sales'],
    maxSteps: 4,
    maxParallelTasks: 1,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('GERENTE_COMERCIAL'),
  },
  COORDENADOR_COMERCIAL: {
    jobRoleCode: 'COORDENADOR_COMERCIAL',
    mission: missionOf('COORDENADOR_COMERCIAL'),
    preferredCapabilities: ['lead.read', 'deal.read', 'pipeline.read', 'bitrix.read'],
    allowedAgentCategories: ['management'],
    maxSteps: 4,
    maxParallelTasks: 2,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('GERENTE_COMERCIAL'),
  },
  GERENTE_COMERCIAL: {
    jobRoleCode: 'GERENTE_COMERCIAL',
    mission: missionOf('GERENTE_COMERCIAL'),
    preferredCapabilities: [
      'pipeline.read',
      'pipeline.analyze',
      'forecast.read',
      'forecast.explain',
    ],
    allowedAgentCategories: ['management'],
    maxSteps: 4,
    maxParallelTasks: 2,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('DIRETOR_COMERCIAL'),
  },
  DIRETOR_COMERCIAL: {
    jobRoleCode: 'DIRETOR_COMERCIAL',
    mission: missionOf('DIRETOR_COMERCIAL'),
    preferredCapabilities: [
      'forecast.read',
      'forecast.explain',
      'pipeline.read',
      'pipeline.analyze',
    ],
    allowedAgentCategories: ['executive'],
    maxSteps: 4,
    maxParallelTasks: 2,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('DIRETOR_COMERCIAL'),
  },
  RECEITA_FATURAMENTO: {
    jobRoleCode: 'RECEITA_FATURAMENTO',
    mission: missionOf('RECEITA_FATURAMENTO'),
    // billing.read/billing.reconcile são SOURCE_REQUIRED (sem fonte real de faturamento ainda) —
    // permanecem na lista de propósito: o supervisor precisa reportar o bloqueio real, nunca
    // pular a capability central do cargo silenciosamente.
    preferredCapabilities: ['billing.read', 'billing.reconcile'],
    allowedAgentCategories: ['control'],
    maxSteps: 3,
    maxParallelTasks: 1,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('DIRETOR_COMERCIAL'),
  },
  CHURN_RETENCAO: {
    jobRoleCode: 'CHURN_RETENCAO',
    mission: missionOf('CHURN_RETENCAO'),
    preferredCapabilities: ['deal.read', 'company.read', 'billing.read'],
    allowedAgentCategories: ['control'],
    maxSteps: 3,
    maxParallelTasks: 1,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('GERENTE_COMERCIAL'),
  },
  CONTRATOS_ASSINATURA: {
    jobRoleCode: 'CONTRATOS_ASSINATURA',
    mission: missionOf('CONTRATOS_ASSINATURA'),
    // contract.generate/signature.request são FUTURE_TOOL (stub de assinatura ainda não existe) —
    // mesmo raciocínio de billing.read/reconcile acima: o bloqueio precisa aparecer, não sumir.
    preferredCapabilities: ['contract.read', 'contract.generate', 'signature.request'],
    allowedAgentCategories: ['control'],
    maxSteps: 3,
    maxParallelTasks: 1,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('DIRETOR_COMERCIAL'),
  },
  BITRIX_GUARDIAN: {
    jobRoleCode: 'BITRIX_GUARDIAN',
    mission: missionOf('BITRIX_GUARDIAN'),
    preferredCapabilities: ['bitrix.read', 'bitrix.write'],
    allowedAgentCategories: ['control'],
    maxSteps: 3,
    maxParallelTasks: 1,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('GERENTE_COMERCIAL'),
  },
  // Revenue Intelligence (regra explícita do prompt da onda): nunca recalcula motor nenhum — só
  // lê pipeline.read/pipeline.analyze/forecast.read/forecast.explain, os 4 relatórios reais já
  // produzidos por `CommercialIntelligenceUseCases`. PIPELINE != FORECAST: os dois permanecem como
  // capabilities/métricas distintas na composição do resultado (`roleSupervisor.service.ts`),
  // nunca misturadas num único número. maxSteps=3 (< 4 capabilities) é deliberado — demonstra o
  // guard-rail de passos mesmo no perfil mais "read-heavy" da onda; a resposta fica honestamente
  // parcial (`haltReason: 'MAX_STEPS_REACHED'`) em vez de sempre esperar as 4 chamadas completarem.
  REVENUE_INTELLIGENCE: {
    jobRoleCode: 'REVENUE_INTELLIGENCE',
    mission: missionOf('REVENUE_INTELLIGENCE'),
    preferredCapabilities: [
      'pipeline.read',
      'pipeline.analyze',
      'forecast.read',
      'forecast.explain',
    ],
    allowedAgentCategories: ['control'],
    maxSteps: 3,
    maxParallelTasks: 2,
    stopConditions: DEFAULT_STOP_CONDITIONS,
    escalationPolicy: escalationTo('DIRETOR_COMERCIAL'),
  },
};

export function getSupervisorProfile(jobRoleCode: string): RoleSupervisorProfile | undefined {
  return (ROLE_SUPERVISOR_PROFILES as Record<string, RoleSupervisorProfile>)[jobRoleCode];
}
