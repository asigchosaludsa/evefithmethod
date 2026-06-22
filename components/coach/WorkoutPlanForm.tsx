'use client';

import { useActionState } from 'react';
import { createWorkoutPlan } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { SPLIT_OPTIONS } from '@/lib/constants/splits';
import { FormField, Input, Select, SubmitButton } from '@/components/common';

export function WorkoutPlanForm({ studentId }: { studentId: string }) {
  const [state, action] = useActionState(createWorkoutPlan, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="student_id" value={studentId} />
      <FormField label="Título del plan" htmlFor="title">
        <Input id="title" name="title" placeholder="Ej: Fuerza — 4 días" required />
      </FormField>

      <FormField label="Split" htmlFor="split_type" hint="Genera los días automáticamente (Personalizado = tú los defines)">
        <Select id="split_type" name="split_type" placeholder="Elegir split…" defaultValue="">
          {SPLIT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
              {s.dayCount > 0 ? ` · ${s.dayCount} días` : ''}
            </option>
          ))}
        </Select>
      </FormField>

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
