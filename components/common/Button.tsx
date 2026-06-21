'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-pressed shadow-[0_0_0_0_transparent] hover:shadow-[0_6px_20px_-6px_var(--color-primary)]',
  secondary: 'bg-elevated text-foreground border border-border hover:border-muted/40',
  ghost: 'text-muted hover:text-foreground hover:bg-elevated',
  outline: 'border border-border text-foreground hover:bg-elevated',
  danger: 'bg-danger text-on-primary hover:bg-primary-pressed',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, asChild = false, children, disabled, ...props },
  ref,
) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium select-none',
    'transition-[transform,background-color,box-shadow,border-color] duration-150 ease-out',
    'active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
