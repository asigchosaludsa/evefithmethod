'use client';

import { useActionState } from 'react';
import { Plus } from 'lucide-react';
import { addPlanExercise } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { Input, Select, SubmitButton } from '@/components/common';

export interface ExercisePick {
  id: string;
  name: string;
}

export function AddPlanExerciseForm({
  planId,
  dayId,
  exercises,
}: {
  planId: string;
  dayId: string;
  exercises: ExercisePick[];
}) {
  const [state, action] = useActionState(addPlanExercise, initialActionState);
  return (
    <form action={action} className="space-y-2 rounded-md border border-hairline bg-canvas/40 p-3">
      <input type="hidden" name="workout_plan_id" value={planId} />
      <input type="hidden" name="workout_plan_day_id" value={dayId} />
      <Select name="exercise_id" placeholder="Elegir ejercicio…" defaultValue="" required>
        {exercises.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <LabeledInput name="sets" label="Series" type="number" defaultValue="3" />
        <LabeledInput name="reps" label="Reps" defaultValue="10" placeholder="10-12" />
        <LabeledInput name="rest_seconds" label="Desc. (s)" type="number" placeholder="60" />
        <LabeledInput name="tempo" label="Tempo" placeholder="3-1-1" />
        <LabeledInput name="suggested_weight_kg" label="Peso (kg)" type="number" placeholder="—" />
      </div>
      <Input name="notes" placeholder="Nota técnica (opcional)" className="h-9" />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton size="sm">
        <Plus className="size-4" /> Agregar ejercicio
      </SubmitButton>
    </form>
  );
}

function LabeledInput({
  name,
  label,
  type = 'text',
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-faint">{label}</span>
      <Input
        name={name}
        type={type}
        step={type === 'number' ? '0.1' : undefined}
        inputMode={type === 'number' ? 'decimal' : undefined}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-9"
      />
    </label>
  );
}
