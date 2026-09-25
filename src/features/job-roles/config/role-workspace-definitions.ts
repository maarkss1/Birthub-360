// PROMPT 6 — 12 Workspaces por Login/Cargo.
//
// "1 estrutura de Workspace genérica + 12 RoleWorkspaceDefinition" (mesmo espírito de
// `role-supervisor-profiles.ts`/`tool-bindings.ts`: dado estático em código, nunca 12 aplicações
// duplicadas). Este arquivo só declara o que É NOVO por cargo — o resto (KPIs, agent groups,
// mission) é sempre DERIVADO em runtime por `workspace.service.ts` a partir do que já existe
// (`ROLE_SUPERVISOR_PROFILES.preferredCapabilities`, `RoleAgentGrant`, `RoleCapabilityGrant`,
// `TOOL_BINDINGS`) — nunca redeclarado aqui, para as duas fontes nunca poderem divergir.
//
// `modules`/`quickActions.moduleKey` são sempre um `TabType` REAL já roteado em `App.tsx`
// (ver `src/components/layout/tabMeta.ts`) — nunca uma rota nova. Este arquivo é importado pelo
// backend (workspace.service.ts) e por isso nunca importa `tabMeta.ts` (arquivo de frontend, com
// `lucide-react`) nem qualquer módulo com dependência de UI — mesmo cuidado de
// `src/config/module-catalog.ts` (`iconKey` como string solta, nunca o componente de ícone).
import { JOB_ROLE_CATALOG, type JobRoleCode } from '../../../config/job-role-catalog.js';

/** Vocabulário fixo de seções da home do workspace — a ORDEM por cargo é o que varia, nunca o
 *  conjunto de componentes usados (isso é o que impede "12 aplicações duplicadas": 1 componente de
 *  frontend por chave, reordenado/filtrado por cargo). */
export type WorkspaceWidgetKey = 'mission' | 'kpis' | 'agentGroups' | 'quickActions' | 'navigation';

export interface RoleWorkspaceQuickAction {
  label: string;
  /** `TabType` real (`src/components/layout/tabMeta.ts`) — validado defensivamente no frontend
   *  (`isKnownModuleKey`); nunca falha silenciosamente se um dia divergir. */
  moduleKey: string;
}

export interface RoleWorkspaceDefinition {
  jobRoleCode: JobRoleCode;
  homeWidgets: WorkspaceWidgetKey[];
  /** Subconjunto de `TabType` relevantes à jornada deste cargo — vira a seção "navigation" no
   *  frontend (rótulo/ícone vêm de `TAB_META`, nunca duplicados aqui). */
  modules: string[];
  quickActions: RoleWorkspaceQuickAction[];
}

const DEFAULT_WIDGETS: WorkspaceWidgetKey[] = [
  'mission',
  'kpis',
  'agentGroups',
  'quickActions',
  'navigation',
];

export const ROLE_WORKSPACE_DEFINITIONS: Record<JobRoleCode, RoleWorkspaceDefinition> = {
  LDR: {
    jobRoleCode: 'LDR',
    homeWidgets: DEFAULT_WIDGETS,
    modules: ['market-intelligence', 'prospect', 'companies'],
    quickActions: [
      { label: 'Contas priorizadas', moduleKey: 'market-intelligence' },
      { label: 'Prospecção', moduleKey: 'prospect' },
    ],
  },
  BDR: {
    jobRoleCode: 'BDR',
    homeWidgets: DEFAULT_WIDGETS,
    modules: ['prospect', 'cadence', 'contacts'],
    quickActions: [
      { label: 'Prospecção outbound', moduleKey: 'prospect' },
      { label: 'Cadências', moduleKey: 'cadence' },
    ],
  },
  SDR: {
    jobRoleCode: 'SDR',
    homeWidgets: DEFAULT_WIDGETS,
    // Mesmo destino que o perfil restrito de UserRole SDR já usa hoje na Sidebar
    // (isRestrictedSdrProfile) — não é coincidência, é o mesmo cargo do dia a dia.
    modules: ['daily-plan', 'crm', 'calendar'],
    quickActions: [
      { label: 'Plano diário', moduleKey: 'daily-plan' },
      { label: 'Agendar reunião', moduleKey: 'calendar' },
    ],
  },
  CLOSER: {
    jobRoleCode: 'CLOSER',
    homeWidgets: DEFAULT_WIDGETS,
    modules: ['crm', 'crm360', 'propostas'],
    quickActions: [
      { label: 'Pipeline', moduleKey: 'crm' },
      { label: 'Propostas', moduleKey: 'propostas' },
    ],
  },
  COORDENADOR_COMERCIAL: {
    jobRoleCode: 'COORDENADOR_COMERCIAL',
    homeWidgets: DEFAULT_WIDGETS,
    modules: ['mesa-tratamento', 'crm360', 'reports'],
    quickActions: [
      { label: 'Mesa de tratamento', moduleKey: 'mesa-tratamento' },
      { label: 'Cockpit CRM', moduleKey: 'crm360' },
    ],
  },
  GERENTE_COMERCIAL: {
    jobRoleCode: 'GERENTE_COMERCIAL',
    homeWidgets: DEFAULT_WIDGETS,
    modules: ['commercial_intelligence', 'analytics', 'team'],
    quickActions: [
      { label: 'Comercial Inteligente', moduleKey: 'commercial_intelligence' },
      { label: 'Analytics', moduleKey: 'analytics' },
    ],
  },
  DIRETOR_COMERCIAL: {
    jobRoleCode: 'DIRETOR_COMERCIAL',
    homeWidgets: DEFAULT_WIDGETS,
    modules: ['commercial_intelligence', 'winloss', 'reports'],
    quickActions: [
      { label: 'Cockpit executivo', moduleKey: 'commercial_intelligence' },
      { label: 'Win/Loss', moduleKey: 'winloss' },
    ],
  },
  RECEITA_FATURAMENTO: {
    jobRoleCode: 'RECEITA_FATURAMENTO',
    homeWidgets: DEFAULT_WIDGETS,
    // Nenhuma quick action aponta para "usage" de propósito: aquele módulo é custo de uso de IA
    // (consumo de token), não faturamento de venda (ver tool-bindings.ts, billing.read/reconcile)
    // — apontar pra lá seria enganoso. O bloqueio real (SOURCE_REQUIRED) já aparece nos KPIs.
    modules: ['crm360', 'analytics'],
    quickActions: [{ label: 'Cockpit CRM', moduleKey: 'crm360' }],
  },
  CHURN_RETENCAO: {
    jobRoleCode: 'CHURN_RETENCAO',
    homeWidgets: DEFAULT_WIDGETS,
    modules: ['crm360', 'companies'],
    quickActions: [{ label: 'Cockpit CRM', moduleKey: 'crm360' }],
  },
  CONTRATOS_ASSINATURA: {
    jobRoleCode: 'CONTRATOS_ASSINATURA',
    homeWidgets: DEFAULT_WIDGETS,
    modules: ['propostas', 'crm360'],
    quickActions: [{ label: 'Propostas', moduleKey: 'propostas' }],
  },
  BITRIX_GUARDIAN: {
    jobRoleCode: 'BITRIX_GUARDIAN',
    homeWidgets: DEFAULT_WIDGETS,
    modules: ['bitrix', 'integrations'],
    quickActions: [{ label: 'Guia Bitrix24', moduleKey: 'bitrix' }],
  },
  REVENUE_INTELLIGENCE: {
    jobRoleCode: 'REVENUE_INTELLIGENCE',
    homeWidgets: DEFAULT_WIDGETS,
    modules: ['commercial_intelligence', 'analytics'],
    quickActions: [{ label: 'Comercial Inteligente', moduleKey: 'commercial_intelligence' }],
  },
};

export function getWorkspaceDefinition(jobRoleCode: string): RoleWorkspaceDefinition | undefined {
  return (ROLE_WORKSPACE_DEFINITIONS as Record<string, RoleWorkspaceDefinition>)[jobRoleCode];
}

// Falha cedo (import-time, não só em teste) se um cargo do catálogo ficar sem definição de
// workspace — mesmo tipo de invariante que `ROLE_SUPERVISOR_PROFILES` já garante estaticamente via
// `Record<JobRoleCode, ...>`, reforçado aqui em runtime porque `JOB_ROLE_CATALOG` é a lista viva.
for (const entry of JOB_ROLE_CATALOG) {
  if (!ROLE_WORKSPACE_DEFINITIONS[entry.code]) {
    throw new Error(`Cargo sem RoleWorkspaceDefinition: ${entry.code}`);
  }
}
