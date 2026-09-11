import * as React from 'react';
import { cn } from '../../lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => {
  return (
    <select
      className={cn(
        // hover:border-ink-2/40 + focus:shadow-glow-brand — mesma lacuna e mesmo token já
        // corrigidos em Input/Textarea (era só transition-colors, sem nenhum feedback de hover).
        'flex h-10 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink transition-[border-color,box-shadow] duration-200 hover:border-ink-2/40 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand focus:shadow-glow-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Select.displayName = 'Select';

export { Select };
