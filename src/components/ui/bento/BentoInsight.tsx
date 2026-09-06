import { BentoCard, type BentoCardProps } from './BentoCard';
import { Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface BentoInsightProps extends BentoCardProps {
  category?: string;
  title: string;
  recommendation: string;
  timestamp?: string;
  actionText?: string;
  onAction?: () => void;
  priority?: 'high' | 'medium' | 'low';
}

export function BentoInsight({
  category = 'Inteligência Comercial',
  title,
  recommendation,
  timestamp,
  actionText,
  onAction,
  priority = 'medium',
  className,
  ...props
}: BentoInsightProps) {
  const priorityColors = {
    high: 'text-critical-active bg-critical/10 border-critical/20',
    medium: 'text-brand bg-brand/10 border-brand/20',
    low: 'text-ink-2 bg-surface-2 border-line',
  }[priority];

  return (
    <BentoCard
      className={cn('p-5 flex flex-col justify-between gap-4 border-brand/20', className)}
      {...props}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 font-semibold text-brand">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{category}</span>
          </div>
          {priority === 'high' && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                priorityColors
              )}
            >
              Prioritário
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-ink tracking-tight line-clamp-2">{title}</h3>
        <p className="text-xs text-ink-2 leading-relaxed line-clamp-3">{recommendation}</p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-line/60 text-xs">
        {timestamp && <span className="text-[11px] text-ink-2">{timestamp}</span>}
        {actionText && (
          <button
            type="button"
            onClick={onAction}
            className="ml-auto inline-flex items-center gap-1 font-semibold text-brand hover:underline cursor-pointer"
          >
            {actionText} →
          </button>
        )}
      </div>
    </BentoCard>
  );
}
