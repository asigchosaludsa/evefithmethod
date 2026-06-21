'use client';

import { useActionState } from 'react';
import { completeOnboarding } from '@/lib/auth/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, SubmitButton } from '@/components/common';

export function OnboardingForm({ defaultName = '' }: { defaultName?: string }) {
  const [state, action] = useActionState(completeOnboarding, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <FormField label="Nombre completo" htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={defaultName} required />
      </FormField>
      <FormField label="¿Cuál es tu objetivo?" htmlFor="goal" hint="Ej: bajar grasa, ganar fuerza, recomposición">
        <Input id="goal" name="goal" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Altura (cm)" htmlFor="height_cm">
          <Input id="height_cm" name="height_cm" type="number" step="0.1" inputMode="decimal" />
        </FormField>
        <FormField label="Peso actual (kg)" htmlFor="current_weight_kg">
          <Input id="current_weight_kg" name="current_weight_kg" type="number" step="0.1" inputMode="decimal" />
        </FormField>
      </div>
      <FormField label="Fecha de nacimiento" htmlFor="date_of_birth">
        <Input id="date_of_birth" name="date_of_birth" type="date" />
      </FormField>
      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton className="w-full" size="lg">
        Continuar
      </SubmitButton>
    </form>
  );
}
