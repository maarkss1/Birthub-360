import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/utils.js';

const inputVariants = cva(
  'flex w-full rounded-control border border-line bg-surface-elevated/70 backdrop-blur-sm text-ink placeholder:text-ink-2/75 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-brand/40 hover:bg-surface-elevated hover:shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] hover:scale-[1.005] focus-visible:outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/20 focus-visible:scale-[1.01] focus-visible:shadow-[inset_0_2px_12px_rgba(212,175,55,0.08)] disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 disabled:hover:border-line disabled:hover:scale-100 disabled:focus-visible:scale-100',
  {
    variants: {
      inputSize: {
        default: 'h-10 px-3 py-2 text-sm',
        sm: 'h-8 px-2.5 py-1 text-xs',
        md: 'h-9 px-3 py-1.5 text-sm',
        lg: 'h-11 px-4 py-2.5 text-base',
      },
      variant: {
        default: '',
        filled:
          'bg-surface-2 border-transparent hover:bg-surface-interactive focus-visible:bg-surface focus-visible:border-brand',
        ghost:
          'bg-transparent border-transparent hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:border-brand/30',
      },
    },
    defaultVariants: {
      inputSize: 'default',
      variant: 'default',
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ inputSize, variant, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input, inputVariants };
