import type React from 'react';
import { BentoCard, type BentoCardProps } from './BentoCard';
import { cn } from '../../../lib/utils';

export interface BentoMetricProps extends Omit<BentoCardProps, 'children'> {
  title: string;
  value: string | number;
  delta?: {
    value: string | number;
    positive?: boolean;
    neutral?: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  subtitle?: string;
}

export function BentoMetric({
  title,
  value,
  delta,
  icon,
  subtitle,
  className,
  ...props
}: BentoMetricProps) {
  return (
    <BentoCard className={cn('p-5 flex flex-col justify-between gap-4', className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-2 truncate">
          {title}
        </span>
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-brand">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-ink">
          {value}
        </div>
        {(delta || subtitle) && (
          <div className="flex items-center gap-2 text-xs">
            {delta && (
              <span
                className={cn(
                  'inline-flex items-center font-semibold px-1.5 py-0.5 rounded',
                  delta.neutral
                    ? 'bg-surface-2 text-ink-2'
                    : delta.positive
                      ? 'bg-ok/15 text-ok-active'
                      : 'bg-critical/15 text-critical-active'
                )}
              >
                {delta.positive ? '↑ ' : delta.neutral ? '' : '↓ '}
                {delta.value}
              </span>
            )}
            {subtitle && <span className="text-ink-2 truncate">{subtitle}</span>}
          </div>
        )}
      </div>
    </BentoCard>
  );
}
