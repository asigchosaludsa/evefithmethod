import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { AcceptInvitationForm } from '@/components/auth/AcceptInvitationForm';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/utils/tokens';

export const metadata = { title: 'Aceptar invitación' };

function InvalidToken() {
  return (
    <AuthShell title="Invitación no válida" subtitle="Falta el enlace de invitación">
      <p className="text-sm text-muted">
        El enlace no incluye un token válido. Pídele a tu coach que te reenvíe la invitación.
      </p>
      <p className="mt-4 text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Ir a iniciar sesión
        </Link>
      </p>
    </AuthShell>
  );
}

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidToken />;
  }

  // Look up the invitation by token hash so we can prefill the email and name.
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from('invitations')
    .select('email, student_name')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  return (
    <AuthShell title="Acepta tu invitación" subtitle="Crea tu cuenta para empezar con tu coach">
      <AcceptInvitationForm
        token={token}
        email={inv?.email ?? undefined}
        studentName={inv?.student_name ?? undefined}
      />
    </AuthShell>
  );
}
