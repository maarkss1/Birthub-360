import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layers, UserX, Compass, Loader2 } from 'lucide-react';
import { BlockedState } from '../../../components/ui/BlockedState';
import { useWorkspace } from '../../../hooks/useWorkspace';
import { cn } from '../../../lib/utils';
// We can re-use some blocks from WorkspaceReadySection if needed, or import them.
// But we'll define the new dynamic schema here.

export interface WorkspaceWidgetDef {
  id: string;
  componentCode: string;
  config?: Record<string, any>;
  colSpan?: number;
}

export interface WorkspaceSectionDef {
  id: string;
  title?: string;
  columns?: number; // 1, 2, 3, 4, etc. Defaults to 1.
  widgets: WorkspaceWidgetDef[];
}

export interface WorkspaceLayoutDef {
  id: string;
  sections: WorkspaceSectionDef[];
}

// ============================================================================
// Dicionário de Componentes (WIDGET_REGISTRY)
// ============================================================================

// Componentes Placeholders genéricos para o Renderer
function PlaceholderWidget({ code, config }: { code: string; config?: any }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface p-4 text-center">
      <Layers className="mb-2 h-6 w-6 text-ink-2 opacity-50" />
      <span className="text-sm font-semibold text-ink-2">Widget não encontrado</span>
      <span className="text-xs text-ink-2 opacity-70">Code: {code}</span>
    </div>
  );
}

// Simulando widgets atuais para manter a compatibilidade ou criar estrutura.
function MissionWidget() {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-card border border-line bg-surface shadow-card">
      <h3 className="font-serif text-2xl font-medium tracking-tight text-ink md:text-3xl">
        Missão do Cargo
      </h3>
      <p className="mt-0.5 text-sm text-ink-2">
        Este é o widget de missão renderizado via registry.
      </p>
    </div>
  );
}

function KpisWidget() {
  return (
    <div className="p-4 rounded-card border border-line bg-surface shadow-card">
      <h3 className="text-sm font-bold text-ink mb-2">Indicadores</h3>
      <p className="text-xs text-ink-2">Exibição de KPIs dinâmicos.</p>
    </div>
  );
}

function QuickActionsWidget() {
  return (
    <div className="p-4 rounded-card border border-line bg-surface shadow-card">
      <h3 className="text-sm font-bold text-ink mb-2">Ações Rápidas</h3>
      <p className="text-xs text-ink-2">Acesso rápido aos fluxos de trabalho.</p>
    </div>
  );
}

function ProspectListWidget() {
  return (
    <div className="p-4 rounded-card border border-line bg-surface shadow-card col-span-full">
      <h3 className="text-sm font-bold text-ink mb-2">ProspectList</h3>
      <p className="text-xs text-ink-2">Lista dinâmica de prospects carregada pela engine.</p>
    </div>
  );
}

const WIDGET_REGISTRY: Record<string, React.ComponentType<any>> = {
  Mission: MissionWidget,
  Kpis: KpisWidget,
  QuickActions: QuickActionsWidget,
  ProspectList: ProspectListWidget,
};

// ============================================================================
// Workspace Renderer Engine
// ============================================================================

export function WorkspaceRenderer({ layout }: { layout: WorkspaceLayoutDef }) {
  if (!layout || !layout.sections) return null;

  return (
    <div className="w-full max-w-[92rem] space-y-8">
      {layout.sections.map((section) => (
        <section key={section.id} className="space-y-4">
          {section.title && (
            <h2 className="text-lg font-bold text-ink tracking-tight">{section.title}</h2>
          )}

          <div
            className={cn(
              'grid gap-4',
              section.columns === 1 && 'grid-cols-1',
              section.columns === 2 && 'grid-cols-1 sm:grid-cols-2',
              section.columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
              section.columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
              (!section.columns || section.columns > 4) && 'grid-cols-1',
            )}
          >
            {section.widgets.map((widget) => {
              const WidgetComponent = WIDGET_REGISTRY[widget.componentCode] || PlaceholderWidget;

              return (
                <div
                  key={widget.id}
                  className={cn(
                    widget.colSpan === 2 && 'sm:col-span-2',
                    widget.colSpan === 3 && 'lg:col-span-3',
                    widget.colSpan === 4 && 'lg:col-span-4',
                  )}
                >
                  <WidgetComponent config={widget.config} code={widget.componentCode} />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function WorkspaceHome() {
  const { workspace, isLoading, error, reload } = useWorkspace();

  // MOCK: Simulando o layout dinâmico que viria do backend
  // Isso será substituído por dados reais do Prisma (WorkspaceLayout/WorkspaceSection)
  const dynamicLayoutMock = useMemo<WorkspaceLayoutDef>(
    () => ({
      id: 'layout-1',
      sections: [
        {
          id: 'sec-1',
          columns: 1,
          widgets: [{ id: 'w-1', componentCode: 'Mission' }],
        },
        {
          id: 'sec-2',
          title: 'Gestão Diária',
          columns: 3,
          widgets: [
            { id: 'w-2', componentCode: 'Kpis' },
            { id: 'w-3', componentCode: 'QuickActions' },
            { id: 'w-4', componentCode: 'UnknownWidget' },
          ],
        },
        {
          id: 'sec-3',
          title: 'Operação',
          columns: 1,
          widgets: [{ id: 'w-5', componentCode: 'ProspectList' }],
        },
      ],
    }),
    [],
  );

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center overflow-y-auto bg-transparent font-sans px-4 pb-8 md:px-8 pt-8">
      <div className="bh-page relative z-[1] flex w-full flex-1 flex-col items-center justify-start">
        {isLoading && (
          <div
            aria-live="polite"
            aria-busy="true"
            className="flex items-center gap-2 text-ink-2 mt-20"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando interface dinâmica…</span>
          </div>
        )}

        {!isLoading && error && (
          <BlockedState
            tone="warning"
            title="Falha ao carregar o Workspace"
            description="Tente novamente em instantes. Se o problema persistir, avise um administrador."
            actionLabel="Tentar de novo"
            onAction={reload}
          />
        )}

        {!isLoading && !error && workspace?.status === 'NO_JOB_ROLE' && (
          <BlockedState
            tone="neutral"
            icon={<UserX className="h-6 w-6" />}
            title="Sem Cargo (Role) associado"
            description="O renderizador precisa de um cargo definido para buscar o WorkspaceLayout correspondente."
          />
        )}

        {!isLoading && !error && workspace?.status === 'NO_WORKSPACE_DEFINITION' && (
          <BlockedState
            tone="neutral"
            icon={<Compass className="h-6 w-6" />}
            title="Layout não publicado"
            description="Não existe uma definição de layout para o seu cargo atual."
          />
        )}

        {!isLoading && !error && workspace?.status === 'READY' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            {/* Aqui usamos a nova engine */}
            <WorkspaceRenderer layout={dynamicLayoutMock} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
