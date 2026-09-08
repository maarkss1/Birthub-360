// PROMPT 5 — Supervisores de Cargo.
//
// "1 RoleSupervisorRuntime genérico + 12 RoleSupervisorProfile" (regra do prompt da onda): este é
// o runtime único. Ele nunca decide autorização sozinho (isso continua 100% em
// `capabilityAuthorization.service.ts`, via `runAgentExecution`) e nunca duplica o motor de
// execução do PROMPT 4 — ele só decide QUAL agente do próprio cargo tentar para cada capability
// preferida, em que ordem, e quando parar (maxSteps/loop guard/stopConditions).
//
// REGRAS (texto do prompt da onda, cada uma mapeada para um pedaço específico deste arquivo):
//   - "supervisor só vê agentes do seu cargo" → `resolvePrimaryJobRole` nunca aceita jobRoleCode
//     do chamador, sempre resolve do UserJobRole primário ativo do ator; `selectAgentForCapability`
//     só busca AgentDefinition com RoleAgentGrant ativo PARA ESSE jobRoleId.
//   - "seleciona agente por grants + capability + status + binding" → mesma função: grants
//     (RoleAgentGrant + AgentCapabilityGrant ativos), status (`AgentDefinition.isActive` — o mesmo
//     campo que `authorizeCapability` usa para INACTIVE_AGENT, nunca um critério paralelo), e
//     binding é responsabilidade do `authorizeCapability` chamado dentro de `runAgentExecution`
//     logo depois (o supervisor não lê `ToolBinding` diretamente — não duplica essa checagem).
//   - "não bypassa Capability Engine" → todo passo chama `runAgentExecution`, que chama
//     `authorizeCapability` internamente. O supervisor NUNCA marca algo como executado sem passar
//     por ali.
//   - "não acessa outro cargo diretamente" → não há parâmetro de jobRoleCode na requisição.
//   - "não cria capability" / "não faz deploy" → este arquivo nunca importa
//     `capability.service.ts` (funções de escrita) nem toca infraestrutura.
//   - "maxSteps e loop guard obrigatórios" → `planSupervisorSteps` (puro, testável sem banco).
import type { AgentExecutionStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import {
  getSupervisorProfile,
  type RoleSupervisorProfile,
  type SupervisorStopCondition,
} from '../config/role-supervisor-profiles.js';
import { type AgentExecutionResultDto, runAgentExecution } from './agentRuntime.service.js';
import { getPrimaryActiveJobRoleForUser } from './jobRole.service.js';

export interface RoleSupervisorRequest {
  actorId: string;
  organizationId: string;
  actorRole: string;
  /** Capability específica a tentar; se omitida, o supervisor tenta `preferredCapabilities` do
   *  perfil do cargo do ator, em ordem, respeitando `maxSteps`/loop guard. */
  requestedCapability?: string;
  mission?: string;
  resource?: Record<string, unknown>;
  context?: Record<string, unknown>;
  correlationId?: string;
}

/** `NO_ELIGIBLE_AGENT` é o único valor que este runtime adiciona — os demais reaproveitam
 *  `AgentExecutionStatus` (PROMPT 4) tal como ele veio do `runAgentExecution`, nunca uma
 *  taxonomia paralela. Passos "pulados" por loop guard ou corte de `maxSteps` nunca chegam a
 *  existir como `RoleSupervisorStepResult` — são descartados antes, em `planSupervisorSteps`. */
export type RoleSupervisorStepOutcome = AgentExecutionStatus | 'NO_ELIGIBLE_AGENT';

export interface RoleSupervisorStepResult {
  stepIndex: number;
  capabilityCode: string;
  selectedAgentCode: string | null;
  outcome: RoleSupervisorStepOutcome;
  requiresApproval: boolean;
  /** `null` quando o passo nunca chegou a chamar `runAgentExecution` (NO_ELIGIBLE_AGENT ou
   *  guard de loop/maxSteps) — nesse caso não há nada real para auditar além deste próprio passo. */
  execution: AgentExecutionResultDto | null;
}

export type RoleSupervisorStatus =
  | 'NO_JOB_ROLE'
  | 'INACTIVE_JOB_ROLE'
  | 'NO_SUPERVISOR_PROFILE'
  | 'COMPLETED'
  | 'HALTED';

export interface RoleSupervisorResultDto {
  status: RoleSupervisorStatus;
  jobRoleCode: string | null;
  mission: string | null;
  /** Motivo do `HALTED` — `SupervisorStopCondition` do perfil, ou `'MAX_STEPS_REACHED'` quando o
   *  plano tinha mais capabilities do que `maxSteps` permitia tentar. `null` fora de `HALTED`. */
  haltReason: SupervisorStopCondition | 'MAX_STEPS_REACHED' | null;
  requiresApproval: boolean;
  escalation:
    | { triggered: false }
    | {
        triggered: true;
        notifyRole: string;
        reason: SupervisorStopCondition;
        stepCapabilityCode: string;
      };
  maxStepsConfigured: number;
  steps: RoleSupervisorStepResult[];
}

function emptyResult(
  status: RoleSupervisorStatus,
  overrides: Partial<RoleSupervisorResultDto> = {},
): RoleSupervisorResultDto {
  return {
    status,
    jobRoleCode: null,
    mission: null,
    haltReason: null,
    requiresApproval: false,
    escalation: { triggered: false },
    maxStepsConfigured: 0,
    steps: [],
    ...overrides,
  };
}

/**
 * Plano puro de execução — sem I/O, 100% testável isoladamente. Aplica, nesta ordem:
 *   1. a capability explicitamente pedida (lista de 1), OU as `preferredCapabilities` do perfil;
 *   2. deduplicação (loop guard "estrutural" — a mesma capability nunca é tentada duas vezes no
 *      mesmo run, protegendo contra um perfil mal configurado com entradas repetidas);
 *   3. corte em `maxSteps` (loop guard "de orçamento" — nunca tenta mais passos do que o perfil
 *      permite, mesmo que a lista deduplicada seja maior).
 * Retorna também `truncated` (true quando o corte de `maxSteps` descartou alguma capability
 * planejada) para o runtime marcar `haltReason: 'MAX_STEPS_REACHED'` honestamente.
 */
export function planSupervisorSteps(
  profile: Pick<RoleSupervisorProfile, 'preferredCapabilities' | 'maxSteps'>,
  requestedCapability?: string,
): { capabilities: string[]; truncated: boolean } {
  const raw = requestedCapability ? [requestedCapability] : profile.preferredCapabilities;
  const deduped = [...new Set(raw)];
  const capabilities = deduped.slice(0, Math.max(0, profile.maxSteps));
  return { capabilities, truncated: capabilities.length < deduped.length };
}

/** Agrupa uma lista em lotes de tamanho `size` — usado para respeitar `maxParallelTasks` (cada
 *  lote roda em paralelo via `Promise.all`; lotes seguintes só começam depois do anterior, para o
 *  `stopConditions` poder ser avaliado entre lotes). */
function chunk<T>(items: T[], size: number): T[][] {
  const n = Math.max(1, size);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

/** Seleciona o melhor AgentDefinition do próprio cargo do ator para uma capability: precisa ter
 *  RoleAgentGrant ativo para este `jobRoleId` E AgentCapabilityGrant ativo para esta capability, e
 *  estar dentro de `allowedAgentCategories` (quando o perfil restringe por domínio). Em caso de
 *  múltiplos candidatos (ex.: um agente Birth Hub que herda a mesma capability do agente real da
 *  Célula Comercial), prefere o AgentDefinition cujo `primaryJobRoleId` É este cargo — o
 *  representante canônico do cargo — antes de cair para ordem alfabética de `code` (desempate
 *  determinístico, nunca aleatório). Nunca decide autorização aqui — é só descoberta de
 *  candidato; a decisão real vem de `authorizeCapability` dentro de `runAgentExecution` logo
 *  depois. */
async function selectAgentForCapability(params: {
  jobRoleId: string;
  capabilityCode: string;
  allowedAgentCategories: string[];
}): Promise<{ id: string; code: string } | null> {
  const candidates = await prisma.agentDefinition.findMany({
    where: {
      isActive: true,
      ...(params.allowedAgentCategories.length > 0
        ? { domain: { in: params.allowedAgentCategories } }
        : {}),
      roleGrants: { some: { jobRoleId: params.jobRoleId, isActive: true } },
      capabilityGrants: {
        some: {
          isActive: true,
          capabilityDefinition: { code: params.capabilityCode, isActive: true },
        },
      },
    },
    select: { id: true, code: true, primaryJobRoleId: true },
    orderBy: { code: 'asc' },
  });
  if (candidates.length === 0) return null;
  const owned = candidates.find((c) => c.primaryJobRoleId === params.jobRoleId);
  return owned ?? candidates[0]!;
}

/** Classifica o resultado de um passo já executado no sinal de parada correspondente — nunca
 *  reavalia a decisão (`policyDecision` já veio pronta de `authorizeCapability`), só traduz o
 *  DTO num `SupervisorStopCondition` para comparar contra `profile.stopConditions`. */
function classifyStepSignal(
  execution: AgentExecutionResultDto,
): SupervisorStopCondition | 'SUCCEEDED' {
  if (execution.status === 'SUCCEEDED') return 'SUCCEEDED';
  if (execution.policyDecision?.requiresApproval) return 'APPROVAL_REQUIRED';
  if (execution.status === 'FAILED') return 'FAILED';
  return 'DENIED';
}

export async function runRoleSupervisor(
  request: RoleSupervisorRequest,
): Promise<RoleSupervisorResultDto> {
  const primaryJobRole = await getPrimaryActiveJobRoleForUser(
    request.organizationId,
    request.actorId,
  );
  if (!primaryJobRole) {
    return emptyResult('NO_JOB_ROLE');
  }

  const profile = getSupervisorProfile(primaryJobRole.code);
  if (!profile) {
    // Defensivo: só acontece se um JobRole fora dos 12 canônicos for atribuído como primário —
    // nenhum dos 12 perfis reais cai aqui hoje. Fail closed: sem perfil, nenhum passo é tentado.
    return emptyResult('NO_SUPERVISOR_PROFILE', { jobRoleCode: primaryJobRole.code });
  }

  const { capabilities, truncated } = planSupervisorSteps(profile, request.requestedCapability);

  const steps: RoleSupervisorStepResult[] = [];
  let halted = false;
  let haltReason: SupervisorStopCondition | 'MAX_STEPS_REACHED' | null = null;
  let escalation: RoleSupervisorResultDto['escalation'] = { triggered: false };
  let requiresApproval = false;

  for (const batch of chunk(capabilities, profile.maxParallelTasks)) {
    if (halted) break;

    const batchResults = await Promise.all(
      batch.map(async (capabilityCode, indexInBatch): Promise<RoleSupervisorStepResult> => {
        const stepIndex = steps.length + indexInBatch;
        const agent = await selectAgentForCapability({
          jobRoleId: primaryJobRole.id,
          capabilityCode,
          allowedAgentCategories: profile.allowedAgentCategories,
        });
        if (!agent) {
          return {
            stepIndex,
            capabilityCode,
            selectedAgentCode: null,
            outcome: 'NO_ELIGIBLE_AGENT',
            requiresApproval: false,
            execution: null,
          };
        }

        const execution = await runAgentExecution({
          actorId: request.actorId,
          organizationId: request.organizationId,
          actorRole: request.actorRole,
          agentCode: agent.code,
          requestedCapability: capabilityCode,
          mission: request.mission,
          resource: request.resource,
          context: request.context,
          correlationId: request.correlationId
            ? `${request.correlationId}::${capabilityCode}`
            : undefined,
        });

        return {
          stepIndex,
          capabilityCode,
          selectedAgentCode: agent.code,
          outcome: execution.status,
          requiresApproval: execution.policyDecision?.requiresApproval ?? false,
          execution,
        };
      }),
    );

    for (const stepResult of batchResults) {
      steps.push(stepResult);
      if (stepResult.requiresApproval) requiresApproval = true;

      const signal: SupervisorStopCondition | 'SUCCEEDED' | null =
        stepResult.outcome === 'NO_ELIGIBLE_AGENT'
          ? null // ausência de candidato não é uma decisão de política — nunca interrompe o run.
          : classifyStepSignal(stepResult.execution!);

      if (signal && signal !== 'SUCCEEDED' && profile.stopConditions.includes(signal)) {
        halted = true;
        haltReason = signal;
        escalation = {
          triggered: true,
          notifyRole: profile.escalationPolicy.notifyRole,
          reason: signal,
          stepCapabilityCode: stepResult.capabilityCode,
        };
        break;
      }
    }
  }

  if (!halted && truncated) {
    haltReason = 'MAX_STEPS_REACHED';
  }

  return {
    status: halted || truncated ? 'HALTED' : 'COMPLETED',
    jobRoleCode: primaryJobRole.code,
    mission: profile.mission,
    haltReason,
    requiresApproval,
    escalation,
    maxStepsConfigured: profile.maxSteps,
    steps,
  };
}
