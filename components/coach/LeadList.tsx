import { Badge, ConfirmDialog, Button } from '@/components/common';
import { formatDateTime } from '@/lib/utils/date';
import { markLeadContacted, markLeadRejected } from '@/lib/coach/lead-actions';
import { ConvertLeadButton } from './ConvertLeadButton';
import type { Database } from '@/types/database';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadStatus = Lead['status'];

const STATUS_META: Record<LeadStatus, { label: string; tone: 'info' | 'warning' | 'success' | 'neutral' }> = {
  new: { label: 'Nueva', tone: 'info' },
  contacted: { label: 'Contactada', tone: 'warning' },
  converted: { label: 'Convertida', tone: 'success' },
  rejected: { label: 'Rechazada', tone: 'neutral' },
};

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</dt>
      <dd className="truncate text-sm text-foreground">{value}</dd>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const meta = STATUS_META[lead.status];
  const rejected = lead.status === 'rejected';

  return (
    <li
      className={
        rejected
          ? 'rounded-lg border border-border bg-surface p-4 opacity-60'
          : 'rounded-lg border border-border bg-surface p-4'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display font-semibold text-foreground">{lead.full_name}</p>
          <p className="truncate text-sm text-muted">{lead.goal}</p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Field label="Email" value={lead.email} />
        <Field label="Teléfono" value={lead.phone} />
        <Field label="Ciudad" value={lead.city} />
        <Field label="Edad" value={lead.age} />
        <Field label="Experiencia" value={lead.experience_level} />
        <Field label="Disponibilidad" value={lead.availability} />
      </dl>

      {(lead.injuries || lead.message) && (
        <div className="mt-3 space-y-2 border-t border-hairline pt-3">
          {lead.injuries && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-faint">Lesiones</p>
              <p className="text-sm text-muted">{lead.injuries}</p>
            </div>
          )}
          {lead.message && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-faint">Mensaje</p>
              <p className="text-sm text-muted">{lead.message}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        <span className="text-[11px] text-faint">Recibida: {formatDateTime(lead.created_at)}</span>
        {!rejected && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {lead.status === 'new' && (
              <>
                <form action={markLeadContacted.bind(null, lead.id)}>
                  <Button size="sm" variant="outline" type="submit">
                    Marcar contactada
                  </Button>
                </form>
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="ghost" type="button">
                      Rechazar
                    </Button>
                  }
                  title="Rechazar solicitud"
                  description={`¿Seguro que quieres rechazar la solicitud de ${lead.full_name}?`}
                  confirmLabel="Rechazar"
                  destructive
                  onConfirm={markLeadRejected.bind(null, lead.id)}
                />
              </>
            )}
            <ConvertLeadButton leadId={lead.id} alreadyConverted={lead.status === 'converted'} />
          </div>
        )}
      </div>
    </li>
  );
}

export function LeadList({ leads }: { leads: Lead[] }) {
  return (
    <ul className="space-y-3">
      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </ul>
  );
}
