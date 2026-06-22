import { cn } from '@/lib/utils/cn';
import { BrandIcon } from './BrandIcon';

/**
 * Full wordmark: EVEFIT (the "V" is the brand check) / METHOD.
 * The check icon replaces the V, echoing the brand mark.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center font-display', className)}>
      <span className="inline-flex items-center font-extrabold tracking-tight text-foreground">
        E
        <BrandIcon className="mx-[0.04em] inline-block h-[0.78em] w-auto" />
        EFIT
      </span>
      <span className="mx-1.5 font-extrabold text-primary">/</span>
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Method</span>
    </span>
  );
}
