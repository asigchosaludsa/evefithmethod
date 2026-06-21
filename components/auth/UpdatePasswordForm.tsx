'use client';

import { useActionState } from 'react';
import { updatePassword } from '@/lib/auth/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, SubmitButton } from '@/components/common';

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePassword, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <FormField label="Nueva contraseña" htmlFor="password" hint="Mínimo 8 caracteres">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </FormField>
      <FormField label="Confirmar contraseña" htmlFor="confirm_password">
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton className="w-full" size="lg">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
