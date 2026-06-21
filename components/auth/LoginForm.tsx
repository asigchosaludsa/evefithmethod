'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signInWithEmail } from '@/lib/auth/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, SubmitButton } from '@/components/common';

export function LoginForm() {
  const [state, action] = useActionState(signInWithEmail, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <FormField label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
      </FormField>
      <FormField label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </FormField>
      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton className="w-full" size="lg">
        Iniciar sesión
      </SubmitButton>
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-muted transition-colors hover:text-foreground">
          Olvidé mi contraseña
        </Link>
        <Link href="/register" className="text-primary hover:underline">
          Crear cuenta
        </Link>
      </div>
    </form>
  );
}
