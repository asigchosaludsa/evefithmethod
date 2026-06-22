import { X } from 'lucide-react';
import { Badge, EmptyState, type BadgeProps } from '@/components/common';
import { formatDate } from '@/lib/utils/date';
import { cancelInvitationAction } from '@/lib/auth/invitation-actions';
import type { PendingInvitation } from '@/lib/db/queries/invitations';

const STATUS_META: Record<string, { tone: BadgeProps['tone']; label: string }> = {
  pending: { tone: 'warning', label: 'Pendiente' },
  accepted: { tone: 'success', label: 'Aceptada' },
  expired: { tone: 'neutral', label: 'Expirada' },
  cancelled: { tone: 'neutral', label: 'Cancelada' },
};

export function InvitationsList({ invitations }: { invitations: PendingInvitation[] }) {
  if (invitations.length === 0) {
    return (
      <EmptyState
        title="Sin invitaciones"
        description="Las invitaciones que crees aparecerán aquí."
      />
    );
  }

  return (
    <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-border bg-surface">
      {invitations.map((inv) => {
        const meta = STATUS_META[inv.status] ?? { tone: 'neutral' as const, label: inv.status };
        return (
          <li key={inv.id} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{inv.student_name ?? inv.email}</p>
              <p className="truncate text-sm text-muted">{inv.email}</p>
            </div>
            <div className="hidden text-right text-xs text-muted sm:block">
              <p>Expira: {formatDate(inv.expires_at)}</p>
            </div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {inv.status === 'pending' && (
              <form action={cancelInvitationAction.bind(null, inv.id)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <X className="size-3.5" aria-hidden />
                  Cancelar
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
