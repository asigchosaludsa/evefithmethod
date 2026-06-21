import * as React from 'react';
import { cn } from '@/lib/utils/cn';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'info' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-elevated text-muted border-border',
  primary: 'bg-primary/12 text-primary border-primary/25',
  success: 'bg-success/12 text-success border-success/25',
  warning: 'bg-warning/12 text-warning border-warning/25',
  info: 'bg-info/12 text-info border-info/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
