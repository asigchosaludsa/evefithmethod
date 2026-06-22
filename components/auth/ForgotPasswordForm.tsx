'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/lib/auth/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, SubmitButton } from '@/components/common';
import { TurnstileField } from './TurnstileField';

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <FormField label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
      </FormField>
      {state.success && (
        <p className="rounded-md border border-success/25 bg-success/5 p-3 text-sm text-foreground">
          {state.success}
        </p>
      )}
      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <TurnstileField />
      <SubmitButton className="w-full" size="lg">
        Enviar enlace
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
