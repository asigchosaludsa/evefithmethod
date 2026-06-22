'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { acceptInvitationAction } from '@/lib/auth/invitation-actions';
import { signInWithGoogle } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/client';
import { Button, FormField, Input } from '@/components/common';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 2.9 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.1 0 8.5-4.3 8.5-7.6 0-.5 0-.9-.1-1.3H12z"
      />
    </svg>
  );
}

export function AcceptInvitationForm({
  token,
  email,
  studentName,
}: {
  token: string;
  email?: string;
  studentName?: string;
}) {
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
    <div className="space-y-5">
      <div className="space-y-2">
        <form action={signInWithGoogle}>
          <Button type="submit" variant="secondary" className="w-full justify-center" size="lg">
            <GoogleIcon /> Continuar con Google
          </Button>
        </form>
        <p className="text-xs text-muted">
          Si te inscribiste con una cuenta de Google, entra con Google y tu registro se completa solo.
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-faint">
        <span className="h-px flex-1 bg-hairline" />o crea una contraseña
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        {email && (
          <FormField label="Email">
            <Input value={email} disabled readOnly />
          </FormField>
        )}
        <FormField label="Nombre completo" htmlFor="full_name">
          <Input id="full_name" name="full_name" autoComplete="name" defaultValue={studentName} required />
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
    </div>
  );
}
