import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { AcceptInvitationForm } from '@/components/auth/AcceptInvitationForm';

export const metadata = { title: 'Aceptar invitación' };

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
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

  return (
    <AuthShell title="Acepta tu invitación" subtitle="Crea tu cuenta para empezar con tu coach">
      <AcceptInvitationForm token={token} />
    </AuthShell>
  );
}
