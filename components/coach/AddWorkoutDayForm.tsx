'use client';

import { useActionState } from 'react';
import { Plus } from 'lucide-react';
import { addWorkoutDay } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, Select, SubmitButton } from '@/components/common';
import { WEEKDAYS } from '@/domain/workouts/calendar';

export function AddWorkoutDayForm({ planId }: { planId: string }) {
  const [state, action] = useActionState(addWorkoutDay, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="workout_plan_id" value={planId} />
      <FormField label="Nuevo día" htmlFor="day_title" className="flex-1">
        <Input id="day_title" name="title" placeholder="Ej: Día 1 — Tren inferior" required />
      </FormField>
      <FormField label="Enfoque" htmlFor="day_focus" className="flex-1">
        <Input id="day_focus" name="focus" placeholder="Opcional" />
      </FormField>
      <FormField label="Día de la semana" htmlFor="day_weekday" className="sm:w-44">
        <Select id="day_weekday" name="weekday" defaultValue="">
          <option value="">Sin asignar</option>
          {WEEKDAYS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </Select>
      </FormField>
      <SubmitButton>
        <Plus className="size-4" /> Agregar día
      </SubmitButton>
      {state.error && <p className="text-sm text-danger sm:w-full">{state.error}</p>}
    </form>
  );
}
