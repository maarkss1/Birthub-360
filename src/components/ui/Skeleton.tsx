import type React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md',
        shimmer ? 'atlas-skeleton-shimmer' : 'animate-pulse bg-surface-2',
        className
      )}
      {...props}
    />
  );
}

export function MetricSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface p-5 shadow-card space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface p-6 shadow-card space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-60" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2.5 pt-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-line">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full rounded-xl border border-line bg-surface overflow-hidden shadow-card">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-line bg-surface-2/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`th-${i}`} className="h-3.5 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`tr-${r}`} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={`td-${r}-${c}`} className={cn('h-4 flex-1', c === 0 && 'w-1/3 flex-none')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-2.5 w-full">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={`list-item-${i}`}
          className="flex items-center justify-between p-3.5 rounded-xl border border-line bg-surface"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface p-6 shadow-card space-y-6',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
      <div className="h-56 w-full flex items-end gap-3 pt-6">
        {[40, 75, 55, 90, 65, 80, 45, 95, 70, 85, 60, 100].map((h, i) => (
          <Skeleton
            key={`bar-${i}`}
            className="flex-1 rounded-t-md"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
