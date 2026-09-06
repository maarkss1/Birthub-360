import type React from 'react';
import { cn } from '../../../lib/utils';

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3 | 4;
}

export function BentoGrid({
  columns = 4,
  className,
  children,
  ...props
}: BentoGridProps) {
  const colClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div
      className={cn(
        'grid gap-4 md:gap-6 auto-rows-[minmax(160px,auto)]',
        colClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
