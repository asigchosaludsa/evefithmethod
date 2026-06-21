'use client';

import { useActionState } from 'react';
import { updateStudentProfile } from '@/lib/student/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, SubmitButton } from '@/components/common';

export function StudentProfileForm({ defaults }: { defaults: { full_name: string; goal: string } }) {
  const [state, action] = useActionState(updateStudentProfile, initialActionState);
  return (
    <form action={action} className="space-y-4">
      <FormField label="Nombre completo" htmlFor="full_name">
        <Input id="full_name" name="full_name" defaultValue={defaults.full_name} required />
      </FormField>
      <FormField label="Objetivo" htmlFor="goal">
        <Input id="goal" name="goal" defaultValue={defaults.goal} />
      </FormField>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
      <SubmitButton>Guardar</SubmitButton>
    </form>
  );
}
