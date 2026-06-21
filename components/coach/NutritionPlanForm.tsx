'use client';

import { useActionState } from 'react';
import { createNutritionPlan } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, Textarea, SubmitButton } from '@/components/common';

export function NutritionPlanForm({ studentId }: { studentId: string }) {
  const [state, action] = useActionState(createNutritionPlan, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="student_id" value={studentId} />
      <FormField label="Título del plan" htmlFor="title">
        <Input id="title" name="title" placeholder="Ej: Definición — fase 1" required />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Calorías (kcal)" htmlFor="calories_target">
          <Input id="calories_target" name="calories_target" type="number" inputMode="numeric" />
        </FormField>
        <FormField label="Comidas/día" htmlFor="meals_per_day">
          <Input id="meals_per_day" name="meals_per_day" type="number" inputMode="numeric" />
        </FormField>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Proteína (g)" htmlFor="protein_target_g">
          <Input id="protein_target_g" name="protein_target_g" type="number" step="0.1" inputMode="decimal" />
        </FormField>
        <FormField label="Carbos (g)" htmlFor="carbs_target_g">
          <Input id="carbs_target_g" name="carbs_target_g" type="number" step="0.1" inputMode="decimal" />
        </FormField>
        <FormField label="Grasas (g)" htmlFor="fat_target_g">
          <Input id="fat_target_g" name="fat_target_g" type="number" step="0.1" inputMode="decimal" />
        </FormField>
      </div>
      <FormField label="Notas" htmlFor="notes" hint="Opcional">
        <Textarea id="notes" name="notes" rows={3} />
      </FormField>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton>Crear plan nutricional</SubmitButton>
    </form>
  );
}
