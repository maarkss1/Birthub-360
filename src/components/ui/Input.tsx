import * as React from 'react';
import { cn } from '../../lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // hover:border-ink-2/40 — Input não tinha nenhum feedback antes do focus (mesma lacuna
          // real já corrigida em outline/ghost do Button). Foco troca o shadow fixo (30% em
          // qualquer tema) por shadow-glow-brand — mesmo token do Button/Card, discreto no claro e
          // vívido no escuro, em vez de uma intensidade só que não reagia a tema.
          'flex h-10 w-full rounded-control border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-2/75 transition-[border-color,box-shadow,background-color] duration-200 hover:border-ink-2/35 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 disabled:hover:border-line',
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
