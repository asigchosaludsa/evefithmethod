import * as React from 'react';
import { Loader2, type LucideIcon, Inbox, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { SectionIllustration, type IllustrationVariant } from './SectionIllustration';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-muted', className)} aria-hidden />;
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted" role="status">
      <Spinner className="size-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /**
   * Ilustración SVG on-brand para el hueco vacío. Si se pasa, sustituye al
   * pequeño ícono en círculo por una ilustración más elaborada (estilo Linear).
   */
  illustration?: IllustrationVariant;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  illustration,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center',
        className,
      )}
    >
      {illustration ? (
        <SectionIllustration variant={illustration} className="mb-1 w-28 text-faint sm:w-32" />
      ) : (
        <div className="flex size-11 items-center justify-center rounded-full bg-elevated text-muted">
          <Icon className="size-5" aria-hidden />
        </div>
      )}
      <div className="space-y-1">
        <p className="font-display text-base font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Algo salió mal',
  description = 'Intenta de nuevo en un momento.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/25 bg-danger/5 px-6 py-12 text-center">
      <TriangleAlert className="size-6 text-danger" aria-hidden />
      <div className="space-y-1">
        <p className="font-display text-base font-semibold text-foreground">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
