'use client';

import { useActionState } from 'react';
import { Plus } from 'lucide-react';
import { addWorkoutDay } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, SubmitButton } from '@/components/common';

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
      <SubmitButton>
        <Plus className="size-4" /> Agregar día
      </SubmitButton>
      {state.error && <p className="text-sm text-danger sm:w-full">{state.error}</p>}
    </form>
  );
}
