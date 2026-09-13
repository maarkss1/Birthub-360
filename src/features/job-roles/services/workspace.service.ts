// PROMPT 6 — 12 Workspaces por Login/Cargo.
//
// Fluxo obrigatório (regra do prompt da onda): Login → UserRole → JobRole → Workspace do cargo →
// agentes/capabilities permitidos. Esta função é o ÚNICO ponto que monta essa resposta — nunca
// decide autorização real sozinha (isso continua em `capabilityAuthorization.service.ts`, PROMPT
// 3): tudo aqui é LEITURA/agregação do que já foi concedido (`RoleAgentGrant`,
// `RoleCapabilityGrant`) e do que já é público (`ROLE_SUPERVISOR_PROFILES`, `TOOL_BINDINGS`,
// `ROLE_WORKSPACE_DEFINITIONS`). O status de cada KPI aqui é um PREVIEW em nível de cargo ("este
// cargo tem, em princípio, acesso a este dado?") — nunca substitui a cadeia completa de
// `authorizeCapability` (que também depende do agente específico), que continua rodando de verdade
// em toda execução real (`agentRuntime.service.ts`/`roleSupervisor.service.ts`).
import type { AgentAccessLevel } from '@prisma/client';
import { getCapabilityCatalogEntry } from '../../../config/capability-catalog.js';
import {
  COMMERCIAL_INTELLIGENCE_ROLES,
  COPILOTO_IA_ROLES,
  hasRequiredRole,
  MESA_TRATAMENTO_ROLES,
} from '../../../lib/auth/authorization.js';
import { getSupervisorProfile } from '../config/role-supervisor-profiles.js';
import {
  getWorkspaceDefinition,
  type WorkspaceWidgetKey,
} from '../config/role-workspace-definitions.js';
import { getToolBinding } from '../config/tool-bindings.js';
import { listAgentsForJobRole } from './agentCatalog.service.js';
import { listCapabilitiesForJobRole } from './capability.service.js';
import { getJobRoleById, getPrimaryActiveJobRoleForUser } from './jobRole.service.js';

export type WorkspaceStatus = 'READY' | 'NO_JOB_ROLE' | 'NO_WORKSPACE_DEFINITION';

/** Estados de bloqueio nunca colapsados um no outro (mesma regra de `ToolBinding.reason`, PROMPT
 *  3B item 5) + os dois estados de concessão de cargo que só fazem sentido aqui (nível de KPI, não
 *  de tool): `NOT_GRANTED` (o cargo nem tem `RoleCapabilityGrant` ativo pra isso — não deveria
 *  acontecer em uso normal, já que `preferredCapabilities` vem de grants reais, mas é tratado
 *  explicitamente, nunca escondido) e `DISCOVER_ONLY`/`REQUEST` (nível de acesso concedido abaixo
 *  de execução real). */
export type WorkspaceCapabilityStatus =
  | 'AVAILABLE'
  | 'APPROVAL_REQUIRED'
  | 'REQUEST'
  | 'DISCOVER_ONLY'
  | 'SOURCE_REQUIRED'
  | 'FUTURE_TOOL'
  | 'TOOL_UNAVAILABLE'
  | 'NOT_GRANTED';

export interface WorkspaceKpiDto {
  capabilityCode: string;
  label: string;
  description: string;
  domain: string | null;
  status: WorkspaceCapabilityStatus;
}

export interface WorkspaceAgentGroupDto {
  accessLevel: AgentAccessLevel;
  agents: { code: string; name: string; domain: string | null; requiresApproval: boolean }[];
}

export interface WorkspaceModuleDto {
  moduleKey: string;
  /** `true` quando o `UserRole` real da sessão não atinge o patamar mínimo já exigido por essa
   *  rota em `App.tsx`/`bootstrap/routes.ts` (ex.: `commercial_intelligence` exige GESTOR/ADMIN) —
   *  JobRole nunca eleva UserRole (ver seção "UserRole vs JobRole" em `prisma/schema.prisma`); isto
   *  só EXPÕE de forma honesta um gate que já existe, nunca cria um novo. */
  locked: boolean;
  lockedReason: string | null;
}

export interface WorkspaceQuickActionDto extends WorkspaceModuleDto {
  label: string;
}

export interface WorkspaceDto {
  status: WorkspaceStatus;
  jobRole: { code: string; name: string; department: string; description: string } | null;
  homeWidgets: WorkspaceWidgetKey[];
  kpis: WorkspaceKpiDto[];
  agentGroups: WorkspaceAgentGroupDto[];
  modules: WorkspaceModuleDto[];
  quickActions: WorkspaceQuickActionDto[];
}

function emptyWorkspace(status: WorkspaceStatus): WorkspaceDto {
  return {
    status,
    jobRole: null,
    homeWidgets: [],
    kpis: [],
    agentGroups: [],
    modules: [],
    quickActions: [],
  };
}

/** Mesmos gates já aplicados nas rotas reais (`App.tsx` via `RequireRole`, `bootstrap/routes.ts`
 *  via `requireRole`) — reafirmados aqui só para decidir `locked`/`lockedReason`, nunca uma segunda
 *  fonte de verdade: se um gate mudar lá, precisa mudar aqui junto (mesmo princípio de
 *  `authorization.ts` para o resto do RBAC). Módulo ausente deste mapa = rota aberta a qualquer
 *  `UserRole` autenticado (inclusive VISUALIZADOR). */
const MODULE_MIN_ROLE: Record<string, { roles: readonly string[]; label: string }> = {
  commercial_intelligence: { roles: COMMERCIAL_INTELLIGENCE_ROLES, label: 'Gestor ou superior' },
  copiloto_ia: { roles: COPILOTO_IA_ROLES, label: 'SDR ou superior' },
  'mesa-tratamento': { roles: MESA_TRATAMENTO_ROLES, label: 'SDR ou superior' },
  usage: { roles: ['ADMIN'], label: 'Administrador' },
  team: { roles: ['ADMIN'], label: 'Administrador' },
  'module-access': { roles: ['ADMIN'], label: 'Administrador' },
};

function resolveModuleLock(moduleKey: string, userRole: string): WorkspaceModuleDto {
  const gate = MODULE_MIN_ROLE[moduleKey];
  if (!gate) return { moduleKey, locked: false, lockedReason: null };
  const locked = !hasRequiredRole(userRole, gate.roles);
  return {
    moduleKey,
    locked,
    lockedReason: locked ? `Requer papel ${gate.label}.` : null,
  };
}

const ACCESS_LEVEL_ORDER: AgentAccessLevel[] = ['EXECUTE', 'READ', 'REQUEST', 'DISCOVER'];

/** Preview de status de uma capability para o cargo (nunca para um agente específico — ver
 *  cabeçalho do arquivo). Espelha as etapas 6/10/11/12 de `authorizeCapability`, mas só com o que
 *  já está disponível sem escolher um agente: `RoleCapabilityGrant` + `ToolBinding`. */
function resolveKpiStatus(
  capabilityCode: string,
  grants: Awaited<ReturnType<typeof listCapabilitiesForJobRole>>,
): WorkspaceCapabilityStatus {
  const grant = grants.find((g) => g.capability.code === capabilityCode);
  if (!grant) return 'NOT_GRANTED';
  if (grant.accessLevel === 'DISCOVER') return 'DISCOVER_ONLY';
  if (grant.accessLevel === 'REQUEST') return 'REQUEST';

  const binding = getToolBinding(capabilityCode);
  if (binding?.reason !== 'AVAILABLE' || !binding.available) {
    return (binding?.reason ?? 'TOOL_UNAVAILABLE') as WorkspaceCapabilityStatus;
  }

  const requiresApproval =
    grant.requiresApproval ||
    grant.capability.requiresApprovalByDefault ||
    grant.capability.riskLevel === 'HIGH' ||
    grant.capability.riskLevel === 'CRITICAL';
  return requiresApproval ? 'APPROVAL_REQUIRED' : 'AVAILABLE';
}

export async function getWorkspaceForUser(
  organizationId: string,
  userId: string,
  userRole: string,
): Promise<WorkspaceDto> {
  const primaryJobRole = await getPrimaryActiveJobRoleForUser(organizationId, userId);
  if (!primaryJobRole) return emptyWorkspace('NO_JOB_ROLE');

  const jobRole = await getJobRoleById(primaryJobRole.id);
  if (!jobRole?.isActive) return emptyWorkspace('NO_JOB_ROLE');

  const definition = getWorkspaceDefinition(jobRole.code);
  const supervisorProfile = getSupervisorProfile(jobRole.code);
  if (!definition || !supervisorProfile) return emptyWorkspace('NO_WORKSPACE_DEFINITION');

  const [roleAgentGrants, roleCapabilityGrants] = await Promise.all([
    listAgentsForJobRole(jobRole.id),
    listCapabilitiesForJobRole(jobRole.id),
  ]);

  const kpis: WorkspaceKpiDto[] = supervisorProfile.preferredCapabilities.map((code) => {
    const catalogEntry = getCapabilityCatalogEntry(code);
    return {
      capabilityCode: code,
      label: catalogEntry?.name ?? code,
      description: catalogEntry?.description ?? '',
      domain: catalogEntry?.domain ?? null,
      status: resolveKpiStatus(code, roleCapabilityGrants),
    };
  });

  const agentGroups: WorkspaceAgentGroupDto[] = ACCESS_LEVEL_ORDER.map((accessLevel) => ({
    accessLevel,
    agents: roleAgentGrants
      .filter((g) => g.accessLevel === accessLevel)
      .map((g) => ({
        code: g.agent.code,
        name: g.agent.name,
        domain: g.agent.domain,
        requiresApproval: g.requiresApproval,
      })),
  })).filter((group) => group.agents.length > 0);

  const modules = definition.modules.map((moduleKey) => resolveModuleLock(moduleKey, userRole));
  const quickActions: WorkspaceQuickActionDto[] = definition.quickActions.map((qa) => ({
    ...resolveModuleLock(qa.moduleKey, userRole),
    label: qa.label,
  }));

  return {
    status: 'READY',
    jobRole: {
      code: jobRole.code,
      name: jobRole.name,
      department: jobRole.department ?? '',
      description: jobRole.description ?? '',
    },
    homeWidgets: definition.homeWidgets,
    kpis,
    agentGroups,
    modules,
    quickActions,
  };
}
