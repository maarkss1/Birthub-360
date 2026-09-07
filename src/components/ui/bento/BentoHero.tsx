import type React from 'react';
import { BentoCard, type BentoCardProps } from './BentoCard';
import { cn } from '../../../lib/utils';

export interface BentoHeroProps extends BentoCardProps {
  badge?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function BentoHero({
  badge,
  title,
  description,
  action,
  colSpan = 2,
  className,
  children,
  ...props
}: BentoHeroProps) {
  return (
    <BentoCard
      colSpan={colSpan}
      className={cn(
        'relative overflow-hidden p-6 md:p-8 flex flex-col justify-between gap-6',
        className,
      )}
      {...props}
    >
      <div className="space-y-3 z-10 max-w-xl">
        {badge && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            {badge}
          </span>
        )}
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-ink font-display">
          {title}
        </h2>
        {description && <p className="text-sm text-ink-2 leading-relaxed">{description}</p>}
      </div>

      {children && <div className="z-10">{children}</div>}

      {action && <div className="z-10 pt-2">{action}</div>}

      {/* Grafismo sutil angular de 60 graus AtlasGR em marca d'água */}
      <div
        className="pointer-events-none absolute -right-8 -bottom-8 w-48 h-48 opacity-[0.04] dark:opacity-[0.07] bg-gradient-to-tr from-brand to-brand-2 rounded-3xl [transform:rotate(60deg)]"
        aria-hidden="true"
      />
    </BentoCard>
  );
}
