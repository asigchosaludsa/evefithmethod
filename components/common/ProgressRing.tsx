import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** content rendered in the center */
  children?: React.ReactNode;
  className?: string;
  /** stroke color (defaults to brand scarlet) */
  color?: string;
  glow?: boolean;
}

/**
 * The signature macro ring. Scarlet progress arc over a steel track, with an
 * optional subtle glow. Animates smoothly via stroke-dashoffset.
 */
export function ProgressRing({
  value,
  size = 88,
  strokeWidth = 8,
  children,
  className,
  color = 'var(--color-primary)',
  glow = true,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 600ms var(--ease-out)',
            filter: glow ? `drop-shadow(0 0 6px color-mix(in oklab, ${color} 55%, transparent))` : undefined,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
