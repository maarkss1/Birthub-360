import * as React from 'react';
import { cn } from '../../lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-control border border-line bg-surface-elevated/70 backdrop-blur-sm px-3 py-2 text-sm text-ink transition-all duration-200 hover:border-brand/40 hover:bg-surface-elevated hover:shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 disabled:hover:border-line',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Select.displayName = 'Select';

export { Select };
