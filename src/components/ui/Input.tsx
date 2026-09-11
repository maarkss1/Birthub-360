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
          'flex h-10 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-2 transition-[border-color,box-shadow] duration-200 hover:border-ink-2/40 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:shadow-glow-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line',
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
