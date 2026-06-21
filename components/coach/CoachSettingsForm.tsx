'use client';

import { useActionState } from 'react';
import { updateCoachSettings } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, Textarea, SubmitButton } from '@/components/common';

export function CoachSettingsForm({
  defaults,
}: {
  defaults: { full_name: string; business_name: string; bio: string };
}) {
  const [state, action] = useActionState(updateCoachSettings, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <FormField label="Nombre completo" htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={defaults.full_name} required />
      </FormField>
      <FormField label="Nombre del negocio / marca" htmlFor="business_name" hint="Opcional">
        <Input id="business_name" name="business_name" defaultValue={defaults.business_name} />
      </FormField>
      <FormField label="Bio" htmlFor="bio" hint="Opcional">
        <Textarea id="bio" name="bio" rows={4} defaultValue={defaults.bio} />
      </FormField>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
      <SubmitButton>Guardar cambios</SubmitButton>
    </form>
  );
}
