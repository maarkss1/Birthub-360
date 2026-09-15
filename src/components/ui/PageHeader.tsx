import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Ações à direita (botões, filtros) — mesmo padrão dos cabeçalhos de Analytics/Atividades. */
  actions?: ReactNode;
}

/**
 * Cabeçalho padrão de tela: título + subtítulo + ícone opcional, usando os tokens do design
 * system (text-ink/text-ink-2) e a mesma hierarquia visual já usada em Analytics e Atividades.
 * Componha a partir daqui em telas novas em vez de repetir o markup de h1/p em cada módulo.
 */
export function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col items-start justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-brand/25 bg-brand/10 text-brand-ink dark:text-brand">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-h2 font-bold text-ink">{title}</h1>
          {subtitle && (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
