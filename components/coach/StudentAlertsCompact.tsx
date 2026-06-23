'use client';

import { useActionState } from 'react';
import { Bell, Plus } from 'lucide-react';
import {
  Badge,
  FormField,
  Input,
  Select,
  SubmitButton,
  Textarea,
  type BadgeProps,
} from '@/components/common';
import { initialActionState } from '@/lib/auth/action-state';
import { createManualAlert, resolveAlertAction } from '@/lib/coach/alert-actions';

type Severity = 'info' | 'warning' | 'critical' | 'success';

export type CompactAlertRow = {
  id: string;
  title: string;
  message: string | null;
  severity: Severity;
  created_at: string;
};

/** Derived (non-persisted) signal shown as a small badge, e.g. "sin comida hoy". */
export type DerivedSignal = {
  tone: BadgeProps['tone'];
  label: string;
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

export function StudentAlertsCompact({
  studentId,
  alerts,
  signals,
}: {
  studentId: string;
  alerts: CompactAlertRow[];
  signals: DerivedSignal[];
}) {
  const [state, action] = useActionState(createManualAlert, initialActionState);

  const nothing = alerts.length === 0 && signals.length === 0;

  return (
    <div className="space-y-3">
      {nothing ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Bell className="size-4 text-success" /> Todo en orden, sin alertas.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {signals.map((s, i) => (
            <Badge key={`signal-${i}`} tone={s.tone}>
              {s.label}
            </Badge>
          ))}
          {alerts.map((a) => (
            <form key={a.id} action={resolveAlertAction.bind(null, a.id, studentId)}>
              <button
                type="submit"
                title="Marcar como resuelta"
                className="group inline-flex items-center gap-1 rounded-full border border-border bg-elevated px-2 py-0.5 text-xs font-medium transition-colors hover:border-success/40 hover:text-success"
              >
                <Badge tone={SEVERITY_TONE[a.severity]} className="border-0 bg-transparent px-0 py-0">
                  {a.title}
                </Badge>
                <span className="text-faint group-hover:text-success">✓</span>
              </button>
            </form>
          ))}
        </div>
      )}

      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground">
          <Plus className="size-3.5 transition-transform group-open:rotate-45" /> Gestionar alertas
        </summary>
        <form action={action} className="mt-3 space-y-3 border-t border-hairline pt-3">
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
            <Textarea id="alert-message" name="message" rows={2} placeholder="Detalle opcional…" />
          </FormField>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.success && <p className="text-sm text-success">{state.success}</p>}

          <SubmitButton size="sm">Crear alerta</SubmitButton>
        </form>
      </details>
    </div>
  );
}
