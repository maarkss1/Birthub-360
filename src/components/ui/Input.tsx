import * as React from 'react';
import { cn } from '../../lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-2 transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:shadow-[0_0_12px_-2px_color-mix(in_srgb,var(--brand)_30%,transparent)] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
