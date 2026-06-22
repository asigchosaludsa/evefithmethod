'use client';

import { useActionState } from 'react';
import {
  Badge,
  EmptyState,
  FormField,
  Input,
  Select,
  SubmitButton,
  Textarea,
  type BadgeProps,
} from '@/components/common';
import { initialActionState } from '@/lib/auth/action-state';
import { createManualAlert, resolveAlertAction } from '@/lib/coach/alert-actions';
import { formatDate } from '@/lib/utils/date';

type Severity = 'info' | 'warning' | 'critical' | 'success';

type AlertRow = {
  id: string;
  title: string;
  message: string | null;
  severity: Severity;
  created_at: string;
};

const SEVERITY_TONE: Record<Severity, BadgeProps['tone']> = {
  critical: 'danger',
  warning: 'warning',
  success: 'success',
  info: 'info',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  info: 'Información',
  warning: 'Advertencia',
  critical: 'Crítica',
  success: 'Logro',
};

export function AlertManager({
  studentId,
  alerts,
}: {
  studentId: string;
  alerts: AlertRow[];
}) {
  const [state, action] = useActionState(createManualAlert, initialActionState);

  return (
    <div className="space-y-4">
      {alerts.length === 0 ? (
        <EmptyState title="Sin alertas abiertas" />
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-md border border-hairline bg-canvas/40 p-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={SEVERITY_TONE[a.severity]}>{SEVERITY_LABEL[a.severity]}</Badge>
                  <span className="text-sm font-medium text-foreground">{a.title}</span>
                </div>
                {a.message && (
                  <p className="whitespace-pre-wrap text-sm text-muted">{a.message}</p>
                )}
                <p className="text-xs text-faint">{formatDate(a.created_at)}</p>
              </div>
              <form action={resolveAlertAction.bind(null, a.id, studentId)}>
                <SubmitButton size="sm" variant="secondary">
                  Resolver
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="space-y-3 border-t border-hairline pt-4">
        <input type="hidden" name="student_id" value={studentId} />

        <FormField label="Severidad" htmlFor="alert-severity">
          <Select id="alert-severity" name="severity" defaultValue="info">
            <option value="info">{SEVERITY_LABEL.info}</option>
            <option value="warning">{SEVERITY_LABEL.warning}</option>
            <option value="critical">{SEVERITY_LABEL.critical}</option>
            <option value="success">{SEVERITY_LABEL.success}</option>
          </Select>
        </FormField>

        <FormField label="Título" htmlFor="alert-title" required>
          <Input id="alert-title" name="title" placeholder="Título de la alerta" required />
        </FormField>

        <FormField label="Mensaje" htmlFor="alert-message">
          <Textarea id="alert-message" name="message" rows={3} placeholder="Detalle opcional…" />
        </FormField>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.success && <p className="text-sm text-success">{state.success}</p>}

        <SubmitButton size="sm">Crear alerta</SubmitButton>
      </form>
    </div>
  );
}
