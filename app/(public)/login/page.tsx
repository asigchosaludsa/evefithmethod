import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { LoginForm } from '@/components/auth/LoginForm';
import { createClient } from '@/lib/supabase/server';
import { dashboardPathForProfile } from '@/lib/auth/redirects';

export const metadata = { title: 'Iniciar sesión' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in: skip the form and go straight to the dashboard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    redirect(dashboardPathForProfile(profile));
  }

  const { error } = await searchParams;
  const message =
    error === 'account_inactive'
      ? 'Tu cuenta está inactiva. Contacta a tu coach.'
      : error === 'oauth'
        ? 'No se pudo iniciar sesión con el proveedor. Intenta de nuevo.'
        : null;

  return (
    <AuthShell
      title="Bienvenida de vuelta"
      subtitle="Entra para continuar tu método"
      footer={
        <>
          ¿Aún no entrenas con la coach?{' '}
          <Link href="/solicitud" className="text-primary hover:underline">
            Empieza ya
          </Link>
        </>
      }
    >
      {message && (
        <p className="mb-4 rounded-md border border-danger/25 bg-danger/5 p-3 text-sm text-danger" role="alert">
          {message}
        </p>
      )}
      <OAuthButtons />
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-faint">
        <span className="h-px flex-1 bg-hairline" />o con tu email<span className="h-px flex-1 bg-hairline" />
      </div>
      <LoginForm />
    </AuthShell>
  );
}
