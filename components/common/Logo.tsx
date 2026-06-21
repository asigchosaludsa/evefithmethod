import { cn } from '@/lib/utils/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 font-display', className)}>
      <span className="font-extrabold tracking-tight text-foreground">EVEFIT</span>
      <span className="text-primary font-extrabold">/</span>
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Method</span>
    </span>
  );
}
