'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { signUpWithEmail } from '@/lib/auth/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, SubmitButton } from '@/components/common';

function Consent({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-sm text-muted">
      <input
        type="checkbox"
        name={name}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
        required
      />
      <span>{children}</span>
    </label>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(signUpWithEmail, initialActionState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-success/25 bg-success/5 p-6 text-center">
        <CheckCircle2 className="size-7 text-success" aria-hidden />
        <p className="font-display text-lg font-semibold text-foreground">Revisa tu correo</p>
        <p className="text-sm text-muted">{state.success}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormField label="Nombre completo" htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </FormField>
      <FormField label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>
      <FormField label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </FormField>
      <FormField label="Confirmar contraseña" htmlFor="confirm_password">
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </FormField>

      <div className="space-y-2 rounded-md border border-hairline bg-canvas/40 p-3">
        <Consent name="accept_terms">
          Acepto los{' '}
          <Link href="/terms" className="text-primary hover:underline" target="_blank">
            Términos
          </Link>
        </Consent>
        <Consent name="accept_privacy">
          Acepto la{' '}
          <Link href="/privacy" className="text-primary hover:underline" target="_blank">
            Política de Privacidad
          </Link>
        </Consent>
        <Consent name="accept_disclaimer">
          Entiendo el{' '}
          <Link href="/disclaimer" className="text-primary hover:underline" target="_blank">
            aviso de salud/fitness
          </Link>
        </Consent>
      </div>

      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton className="w-full" size="lg">
        Crear cuenta
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
