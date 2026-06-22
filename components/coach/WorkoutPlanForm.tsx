'use client';

import { useActionState, useMemo, useState } from 'react';
import { createWorkoutPlan } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { SPLIT_OPTIONS, SPLIT_TEMPLATES } from '@/lib/constants/splits';
import { WEEKDAYS } from '@/domain/workouts/calendar';
import { FormField, Input, Select, SubmitButton } from '@/components/common';

/**
 * Reparto por defecto de los días del split sobre la semana.
 * 1 -> Lun; 2 -> Lun/Jue; 3 -> Lun/Mié/Vie; 4 -> Lun/Mar/Jue/Vie;
 * 5 -> Lun..Vie; 6 -> Lun..Sáb; 7 -> Lun..Dom.
 */
const DEFAULT_SPREAD: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

function defaultWeekdayFor(dayIndex: number, dayCount: number): number {
  const spread = DEFAULT_SPREAD[dayCount];
  if (spread && spread[dayIndex] != null) return spread[dayIndex];
  // Más de 7 días: repartir cíclicamente Lun..Dom.
  return (dayIndex % 7) + 1;
}

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function WorkoutPlanForm({ studentId }: { studentId: string }) {
  const [state, action] = useActionState(createWorkoutPlan, initialActionState);
  const [splitType, setSplitType] = useState('');

  const splitDays = useMemo(() => {
    if (!splitType || splitType === 'personalizado') return [];
    const tpl = SPLIT_TEMPLATES[splitType as keyof typeof SPLIT_TEMPLATES];
    if (!tpl) return [];
    return tpl.days.map((day, i) => ({ day_number: i + 1, title: day.title, focus: day.focus }));
  }, [splitType]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="student_id" value={studentId} />
      <FormField label="Título del plan" htmlFor="title">
        <Input id="title" name="title" placeholder="Ej: Fuerza — 4 días" required />
      </FormField>

      <FormField label="Split" htmlFor="split_type" hint="Genera los días automáticamente (Personalizado = tú los defines)">
        <Select
          id="split_type"
          name="split_type"
          placeholder="Elegir split…"
          value={splitType}
          onChange={(e) => setSplitType(e.target.value)}
        >
          {SPLIT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
              {s.dayCount > 0 ? ` · ${s.dayCount} días` : ''}
            </option>
          ))}
        </Select>
      </FormField>

      {splitDays.length > 0 && (
        <div className="space-y-3 rounded-lg border border-border bg-surface/50 p-3">
          <p className="text-sm font-medium text-foreground">Día de la semana por sesión</p>
          <p className="text-xs text-muted">Los días sin sesión asignada son descanso.</p>
          <div className="space-y-2">
            {splitDays.map((day, i) => (
              <FormField
                key={day.day_number}
                label={`${day.title} · ${day.focus}`}
                htmlFor={`weekday_${day.day_number}`}
              >
                <Select
                  id={`weekday_${day.day_number}`}
                  name={`weekday_${day.day_number}`}
                  defaultValue={String(defaultWeekdayFor(i, splitDays.length))}
                >
                  {WEEKDAYS.map((wd) => (
                    <option key={wd.value} value={wd.value}>
                      {wd.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Semanas" htmlFor="weeks" hint="Duración del plan">
          <Input id="weeks" name="weeks" type="number" inputMode="numeric" min={1} max={52} defaultValue={8} />
        </FormField>
        <FormField label="Fecha de inicio" htmlFor="starts_at">
          <Input id="starts_at" name="starts_at" type="date" defaultValue={todayISO()} />
        </FormField>
      </div>

      <FormField label="Enfoque" htmlFor="focus" hint="Opcional — ej: tren inferior, full body">
        <Input id="focus" name="focus" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nivel" htmlFor="level">
          <Input id="level" name="level" placeholder="Principiante / Intermedio" />
        </FormField>
        <FormField label="Duración (min)" htmlFor="estimated_duration_minutes">
          <Input id="estimated_duration_minutes" name="estimated_duration_minutes" type="number" inputMode="numeric" />
        </FormField>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton>Crear plan de entrenamiento</SubmitButton>
    </form>
  );
}
