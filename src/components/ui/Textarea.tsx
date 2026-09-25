import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/utils.js';

const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-control border text-sm text-ink placeholder:text-ink-2/75 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 disabled:hover:border-line disabled:hover:scale-100 disabled:focus-visible:scale-100',
  {
    variants: {
      variant: {
        default:
          'border-line bg-surface-elevated px-3 py-2 hover:border-ink-2/35 hover:scale-[1.005] focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:scale-[1.01]',
        filled:
          'border-transparent bg-surface-2 px-3 py-2 hover:bg-surface-interactive hover:border-brand/30 hover:scale-[1.005] focus-visible:bg-surface focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:scale-[1.01]',
        ghost:
          'border-transparent bg-transparent px-3 py-2 hover:bg-surface-subtle hover:border-brand/20 hover:scale-[1.005] focus-visible:bg-surface-subtle focus-visible:border-brand/30 focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:scale-[1.01]',
        holographic:
          'border-brand/30 bg-surface-elevated/60 backdrop-blur-xl px-3 py-2 hover:border-brand/50 hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:scale-[1.005] focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:shadow-[0_0_30px_rgba(212,175,55,0.3)] focus-visible:scale-[1.01]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <textarea className={cn(textareaVariants({ variant, className }))} ref={ref} {...props} />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
