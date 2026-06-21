'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { acceptInvitationAction } from '@/lib/auth/invitation-actions';
import { createClient } from '@/lib/supabase/client';
import { Button, FormField, Input } from '@/components/common';

export function AcceptInvitationForm({ token, email }: { token: string; email?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const password = String(formData.get('password') ?? '');

    startTransition(async () => {
      const res = await acceptInvitationAction(formData);
      if (res.error || !res.success || !res.email) {
        setError(res.error ?? 'No se pudo aceptar la invitación.');
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: res.email,
        password,
      });
      router.push(signInError ? '/login' : '/student/today');
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {email && (
        <FormField label="Email">
          <Input value={email} disabled readOnly />
        </FormField>
      )}
      <FormField label="Nombre completo" htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </FormField>
      <FormField label="Crea una contraseña" htmlFor="password" hint="Mínimo 8 caracteres">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </FormField>
      <FormField label="Confirmar contraseña" htmlFor="confirm_password">
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </FormField>

      <div className="space-y-2 rounded-md border border-hairline bg-canvas/40 p-3">
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" name="accept_terms" className="mt-0.5 size-4 accent-[var(--color-primary)]" required />
          <span>
            Acepto los{' '}
            <Link href="/terms" target="_blank" className="text-primary hover:underline">
              Términos
            </Link>{' '}
            y la{' '}
            <Link href="/privacy" target="_blank" className="text-primary hover:underline">
              Política de Privacidad
            </Link>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" name="accept_disclaimer" className="mt-0.5 size-4 accent-[var(--color-primary)]" required />
          <span>
            Entiendo el{' '}
            <Link href="/disclaimer" target="_blank" className="text-primary hover:underline">
              aviso de salud/fitness
            </Link>
          </span>
        </label>
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Crear mi cuenta
      </Button>
    </form>
  );
}
