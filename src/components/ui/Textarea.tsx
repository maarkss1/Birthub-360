import * as React from 'react';
import { cn } from '../../lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Mesmo par hover/focus do Input (hover:border-ink-2/40 + shadow-glow-brand — antes uma
          // intensidade de 30% fixa, sem reagir a tema, e nenhum feedback antes do foco).
          'flex min-h-[80px] w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-2 transition-[border-color,box-shadow] duration-200 hover:border-ink-2/40 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:shadow-glow-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
