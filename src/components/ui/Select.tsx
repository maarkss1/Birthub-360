import * as React from 'react';
import { cn } from '../../lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => {
  return (
    <select
      className={cn(
        // hover:border-ink-2/40 + focus:shadow-glow-brand — mesma lacuna e mesmo token já
        // corrigidos em Input/Textarea (era só transition-colors, sem nenhum feedback de hover).
        'flex h-10 w-full rounded-control border border-line bg-surface-elevated px-3 py-2 text-sm text-ink transition-[border-color,box-shadow,background-color] duration-200 hover:border-ink-2/35 focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 disabled:hover:border-line',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Select.displayName = 'Select';

export { Select };
