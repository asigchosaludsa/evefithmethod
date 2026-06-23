import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { Card } from './Card';

/**
 * Animated shimmer placeholder. Respects prefers-reduced-motion (the shimmer
 * sweep is neutralized globally by the reduced-motion block in globals.css,
 * leaving a static muted block).
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-md bg-elevated',
        'after:absolute after:inset-0 after:-translate-x-full',
        'after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent',
        'after:animate-[shimmer_1.4s_ease-in-out_infinite]',
        className,
      )}
      {...props}
    />
  );
}

/** Skeleton mimicking the PageHeader bar (eyebrow + big title + description). */
export function SkeletonPageHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-9 w-28 shrink-0" />
    </div>
  );
}

/** Skeleton card roughly matching a content Card (title + a few lines). */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <Card className={cn('p-5', className)}>
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </Card>
  );
}

/** A full-page section placeholder: header bar + a couple of skeleton cards. */
export function SkeletonSection({ cards = 2 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
