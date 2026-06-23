import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'primary' | 'success' | 'warning';
  /** Clase extra para el valor (p.ej. color de macro). Por defecto foreground. */
  valueClassName?: string;
  className?: string;
}

const TONE_ICON: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-muted bg-elevated',
  primary: 'text-primary bg-primary/12',
  success: 'text-success bg-success/12',
  warning: 'text-warning bg-warning/12',
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {Icon && (
          <span className={cn('flex size-7 items-center justify-center rounded-md', TONE_ICON[tone])}>
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <p className={cn('tabular mt-2 font-display text-2xl font-bold text-foreground', valueClassName)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}
