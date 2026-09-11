import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Layers, Sparkles } from 'lucide-react';
import { TAB_META, type TabType } from '../layout/tabMeta';
import { Badge, type BadgeProps } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../lib/utils';
import type {
  Workspace,
  WorkspaceAgentGroup,
  WorkspaceCapabilityStatus,
  WorkspaceKpi,
  WorkspaceModule,
  WorkspaceQuickAction,
} from '../../features/workspace/workspace.api';

// Vive fora de src/features/** de propósito: é reaproveitado por duas features (`workspace`, tela
// dedicada em /app/workspace, e `dashboard`, seção da home unificada em /app e /app/dashboard) —
// um import direto feature-a-feature violaria `no-cross-feature-imports`
// (.dependency-cruiser.cjs). Um componente fora de src/features/ pode ser importado por qualquer
// feature (mesma regra que já vale para src/components/ui/**), e pode importar tipos/serviços de
// uma feature específica sem violar a regra (que só restringe o que SAI de dentro de
// src/features/<x>/).

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

/** Conteúdo por cargo (PROMPT 6) — 1 componente genérico, nunca 12 telas duplicadas: o que muda
 *  por cargo é só o payload de `GET /api/workspace/me` (`ROLE_WORKSPACE_DEFINITIONS` + grants
 *  reais no backend), nunca este arquivo. Consumido por `WorkspaceHome.tsx` (tela dedicada
 *  `/app/workspace`) e por `AdaptiveDashboard.tsx` (seção por cargo da home unificada). */
export function WorkspaceReadySection({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const goToModule = (moduleKey: string) => navigate(`/app/${moduleKey}` as `/app/${TabType}`);

  const widgets = new Set(workspace.homeWidgets);

  return (
    <div className="w-full max-w-[92rem] space-y-6">
      {widgets.has('mission') && workspace.jobRole && (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink dark:text-brand">
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
