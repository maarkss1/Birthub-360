import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Compass, Layers, Loader2, Sparkles, UserX } from 'lucide-react';
import { useWorkspace } from '../../../hooks/useWorkspace';
import { TAB_META, type TabType } from '../../../components/layout/tabMeta';
import { Badge, type BadgeProps } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { BlockedState } from '../../../components/ui/BlockedState';
import { cn } from '../../../lib/utils';
import type {
  Workspace,
  WorkspaceAgentGroup,
  WorkspaceCapabilityStatus,
  WorkspaceKpi,
  WorkspaceModule,
  WorkspaceQuickAction,
} from '../workspace.api';

// Rótulo/ícone de cada status de KPI — fonte única desta tela (nunca reinventa o vocabulário de
// `TOOL_BINDINGS.reason`/`CapabilityDecisionReason` do backend, só traduz pra UI). Ver
// `workspace.service.ts` (backend) para a origem de cada status.
const KPI_STATUS_META: Record<
  WorkspaceCapabilityStatus,
  { label: string; badge: NonNullable<BadgeProps['variant']> }
> = {
  AVAILABLE: { label: 'Disponível', badge: 'success' },
  APPROVAL_REQUIRED: { label: 'Requer aprovação', badge: 'warning' },
  REQUEST: { label: 'Sob solicitação', badge: 'info' },
  DISCOVER_ONLY: { label: 'Só descoberta', badge: 'outline' },
  SOURCE_REQUIRED: { label: 'Fonte de dado ausente', badge: 'danger' },
  FUTURE_TOOL: { label: 'Em construção', badge: 'neon' },
  TOOL_UNAVAILABLE: { label: 'Indisponível', badge: 'outline' },
  NOT_GRANTED: { label: 'Não concedido ao cargo', badge: 'outline' },
};

const ACCESS_LEVEL_LABEL: Record<WorkspaceAgentGroup['accessLevel'], string> = {
  EXECUTE: 'Executa diretamente',
  READ: 'Só leitura',
  REQUEST: 'Sob solicitação',
  DISCOVER: 'Só descoberta',
};

function moduleMeta(moduleKey: string): { label: string; icon: typeof Layers } {
  const meta = (TAB_META as Partial<Record<string, { label: string; icon: typeof Layers }>>)[
    moduleKey
  ];
  return meta ?? { label: moduleKey, icon: Layers };
}

function WorkspaceKpiCard({ kpi }: { kpi: WorkspaceKpi }) {
  const statusMeta = KPI_STATUS_META[kpi.status];
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">{kpi.label}</p>
          {kpi.domain && (
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-2">
              {kpi.domain}
            </p>
          )}
        </div>
        <Badge variant={statusMeta.badge}>{statusMeta.label}</Badge>
      </div>
      {kpi.description && <p className="mt-2 text-xs text-ink-2">{kpi.description}</p>}
    </div>
  );
}

function ModuleLink({
  item,
  onNavigate,
  variant = 'nav',
}: {
  item: WorkspaceModule | WorkspaceQuickAction;
  onNavigate: (moduleKey: string) => void;
  variant?: 'nav' | 'quick';
}) {
  const { label, icon: Icon } = moduleMeta(item.moduleKey);
  const displayLabel = 'label' in item ? item.label : label;

  return (
    <button
      type="button"
      disabled={item.locked}
      onClick={() => onNavigate(item.moduleKey)}
      title={item.locked ? (item.lockedReason ?? undefined) : undefined}
      aria-disabled={item.locked}
      className={cn(
        'group flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left text-xs font-semibold text-ink transition-colors',
        !item.locked &&
          'hover:border-brand/30 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer',
        item.locked && 'cursor-not-allowed opacity-50',
        variant === 'quick' && 'py-2.5',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-ink-2 group-hover:text-brand" />
      <span className="truncate">{displayLabel}</span>
      {!item.locked && (
        <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-ink-2 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function WorkspaceReady({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const goToModule = (moduleKey: string) => navigate(`/app/${moduleKey}` as `/app/${TabType}`);

  const widgets = new Set(workspace.homeWidgets);

  return (
    <div className="w-full max-w-[92rem] space-y-6">
      {widgets.has('mission') && workspace.jobRole && (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-active dark:text-brand-2">
            {workspace.jobRole.department}
          </p>
          <h1 className="text-xl font-black tracking-tight text-ink md:text-2xl">
            {workspace.jobRole.name}
          </h1>
          <p className="mt-0.5 max-w-2xl text-sm text-ink-2">{workspace.jobRole.description}</p>
        </div>
      )}

      {widgets.has('kpis') && (
        <section aria-labelledby="workspace-kpis-heading" className="space-y-3">
          <h2 id="workspace-kpis-heading" className="text-sm font-bold text-ink">
            Indicadores do cargo
          </h2>
          {workspace.kpis.length === 0 ? (
            <EmptyState
              title="Nenhum indicador configurado"
              description="Este cargo ainda não tem nenhuma capability de leitura mapeada."
              icon={<Sparkles className="h-8 w-8" />}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {workspace.kpis.map((kpi) => (
                <WorkspaceKpiCard key={kpi.capabilityCode} kpi={kpi} />
              ))}
            </div>
          )}
        </section>
      )}

      {widgets.has('agentGroups') && (
        <section aria-labelledby="workspace-agents-heading" className="space-y-3">
          <h2 id="workspace-agents-heading" className="text-sm font-bold text-ink">
            Agentes do cargo
          </h2>
          {workspace.agentGroups.length === 0 ? (
            <EmptyState
              title="Nenhum agente concedido ainda"
              description="Peça a um administrador para conceder um agente a este cargo em Governança de Agentes."
              icon={<Bot className="h-8 w-8" />}
            />
          ) : (
            <div className="space-y-3">
              {workspace.agentGroups.map((group) => (
                <div
                  key={group.accessLevel}
                  className="rounded-card border border-line bg-surface p-4"
                >
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ink-2">
                    {ACCESS_LEVEL_LABEL[group.accessLevel]}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.agents.map((agent) => (
                      <span
                        key={agent.code}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-ink"
                      >
                        <Bot className="h-3.5 w-3.5 text-ink-2" />
                        {agent.name}
                        {agent.requiresApproval && (
                          <Badge variant="warning" className="ml-1 py-0">
                            aprovação
                          </Badge>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {widgets.has('quickActions') && workspace.quickActions.length > 0 && (
        <section aria-labelledby="workspace-quick-actions-heading" className="space-y-3">
          <h2 id="workspace-quick-actions-heading" className="text-sm font-bold text-ink">
            Ações rápidas
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {workspace.quickActions.map((qa) => (
              <ModuleLink key={qa.moduleKey} item={qa} onNavigate={goToModule} variant="quick" />
            ))}
          </div>
        </section>
      )}

      {widgets.has('navigation') && workspace.modules.length > 0 && (
        <section aria-labelledby="workspace-navigation-heading" className="space-y-3">
          <h2 id="workspace-navigation-heading" className="text-sm font-bold text-ink">
            Navegação do cargo
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {workspace.modules.map((m) => (
              <ModuleLink key={m.moduleKey} item={m} onNavigate={goToModule} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Home do workspace por cargo (PROMPT 6) — 1 componente genérico, nunca 12 telas duplicadas: o
 *  que muda por cargo é só o payload de `GET /api/workspace/me` (`ROLE_WORKSPACE_DEFINITIONS` +
 *  grants reais no backend), nunca este arquivo. Renderizado dentro de `MainLayout` (que já provê
 *  o landmark `<main>`), por isso a raiz aqui é `<div>`, mesmo padrão de `SinglePageDashboard.tsx`. */
export function WorkspaceHome() {
  const { workspace, isLoading, error, reload } = useWorkspace();

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center overflow-y-auto bg-transparent p-4 font-sans md:p-8">
      <div className="relative z-[1] flex w-full max-w-[92rem] flex-1 flex-col items-center justify-center">
        {isLoading && (
          <div aria-live="polite" aria-busy="true" className="flex items-center gap-2 text-ink-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando seu workspace…</span>
          </div>
        )}

        {!isLoading && error && (
          <BlockedState
            tone="warning"
            title="Não foi possível carregar seu workspace"
            description="Tente novamente em instantes. Se o problema persistir, avise um administrador."
            actionLabel="Tentar de novo"
            onAction={reload}
          />
        )}

        {!isLoading && !error && workspace?.status === 'NO_JOB_ROLE' && (
          <BlockedState
            tone="neutral"
            icon={<UserX className="h-6 w-6" />}
            title="Nenhum cargo atribuído"
            description="Seu usuário ainda não tem um cargo (JobRole) principal ativo. Peça a um administrador para atribuir um cargo em Cargos e Agentes para liberar o seu workspace."
          />
        )}

        {!isLoading && !error && workspace?.status === 'NO_WORKSPACE_DEFINITION' && (
          <BlockedState
            tone="neutral"
            icon={<Compass className="h-6 w-6" />}
            title="Workspace ainda não configurado para este cargo"
            description="Este cargo existe no catálogo, mas ainda não tem uma definição de workspace publicada."
          />
        )}

        {!isLoading && !error && workspace?.status === 'READY' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            <WorkspaceReady workspace={workspace} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
