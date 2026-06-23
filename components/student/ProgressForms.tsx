'use client';

import { useActionState } from 'react';
import { addMeasurement, addWeight, setGoalWeight } from '@/lib/student/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, SubmitButton } from '@/components/common';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function WeightForm() {
  const [state, action] = useActionState(addWeight, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Peso (kg)" htmlFor="weight_kg">
          <Input id="weight_kg" name="weight_kg" type="number" step="0.1" inputMode="decimal" required />
        </FormField>
        <FormField label="Fecha" htmlFor="recorded_at">
          <Input id="recorded_at" name="recorded_at" type="date" defaultValue={today()} required />
        </FormField>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
      <SubmitButton size="sm">Registrar peso</SubmitButton>
    </form>
  );
}

export function MeasurementForm() {
  const [state, action] = useActionState(addMeasurement, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <FormField label="Fecha" htmlFor="m_recorded_at">
        <Input id="m_recorded_at" name="recorded_at" type="date" defaultValue={today()} required />
      </FormField>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Cintura" htmlFor="waist_cm">
          <Input id="waist_cm" name="waist_cm" type="number" step="0.1" inputMode="decimal" />
        </FormField>
        <FormField label="Cadera" htmlFor="hip_cm">
          <Input id="hip_cm" name="hip_cm" type="number" step="0.1" inputMode="decimal" />
        </FormField>
        <FormField label="Pecho" htmlFor="chest_cm">
          <Input id="chest_cm" name="chest_cm" type="number" step="0.1" inputMode="decimal" />
        </FormField>
        <FormField label="Muslo" htmlFor="thigh_cm">
          <Input id="thigh_cm" name="thigh_cm" type="number" step="0.1" inputMode="decimal" />
        </FormField>
        <FormField label="Brazo" htmlFor="arm_cm">
          <Input id="arm_cm" name="arm_cm" type="number" step="0.1" inputMode="decimal" />
        </FormField>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
      <SubmitButton size="sm">Registrar medidas</SubmitButton>
    </form>
  );
}

export function GoalWeightForm({ current }: { current: number | null }) {
  const [state, action] = useActionState(setGoalWeight, initialActionState);
  return (
    <form action={action} className="flex items-end gap-3">
      <FormField label="Peso objetivo (kg)" htmlFor="goal_weight_kg">
        <Input id="goal_weight_kg" name="goal_weight_kg" type="number" step="0.1" inputMode="decimal" defaultValue={current ?? ''} />
      </FormField>
      <SubmitButton size="sm">Guardar meta</SubmitButton>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
    </form>
  );
}
