import { api } from '../../lib/api';

export type WorkspaceStatus = 'READY' | 'NO_JOB_ROLE' | 'NO_WORKSPACE_DEFINITION';

/** Espelha `WorkspaceCapabilityStatus` de `src/features/job-roles/services/workspace.service.ts`
 *  (backend) — mesmo padrão leve de retipagem local já usado por `moduleAccess.api.ts` (sem
 *  infraestrutura de contrato compartilhado para este tamanho de payload). */
export type WorkspaceCapabilityStatus =
  | 'AVAILABLE'
  | 'APPROVAL_REQUIRED'
  | 'REQUEST'
  | 'DISCOVER_ONLY'
  | 'SOURCE_REQUIRED'
  | 'FUTURE_TOOL'
  | 'TOOL_UNAVAILABLE'
  | 'NOT_GRANTED';

export type WorkspaceAgentAccessLevel = 'EXECUTE' | 'READ' | 'REQUEST' | 'DISCOVER';

export interface WorkspaceKpi {
  capabilityCode: string;
  label: string;
  description: string;
  domain: string | null;
  status: WorkspaceCapabilityStatus;
}

export interface WorkspaceAgentGroup {
  accessLevel: WorkspaceAgentAccessLevel;
  agents: { code: string; name: string; domain: string | null; requiresApproval: boolean }[];
}

export interface WorkspaceModule {
  moduleKey: string;
  locked: boolean;
  lockedReason: string | null;
}

export interface WorkspaceQuickAction extends WorkspaceModule {
  label: string;
}

export type WorkspaceWidgetKey = 'mission' | 'kpis' | 'agentGroups' | 'quickActions' | 'navigation';

export interface Workspace {
  status: WorkspaceStatus;
  jobRole: { code: string; name: string; department: string; description: string } | null;
  homeWidgets: WorkspaceWidgetKey[];
  kpis: WorkspaceKpi[];
  agentGroups: WorkspaceAgentGroup[];
  modules: WorkspaceModule[];
  quickActions: WorkspaceQuickAction[];
}

export const workspaceApi = {
  /** Workspace do cargo do usuário logado — identidade sempre da sessão, nunca de parâmetro. */
  me: () => api.get<{ workspace: Workspace }>('/api/workspace/me'),
};
