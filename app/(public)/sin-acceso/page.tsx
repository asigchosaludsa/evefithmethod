import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/common';

export const metadata = { title: 'Sin acceso' };

export default function SinAccesoPage() {
  return (
    <AuthShell title="Tu cuenta aún no está activa">
      <p className="text-sm text-muted">
        EveFit Method es por invitación. Si te interesa entrenar con la coach,
        solicita tu cupo y te contactaremos.
      </p>
      <div className="mt-6 space-y-3">
        <Button asChild size="lg" className="w-full">
          <Link href="/solicitud">Solicitar mi cupo</Link>
        </Button>
        <Link
          href="/auth/logout"
          className="block text-center text-sm text-muted transition-colors hover:text-foreground"
        >
          Cerrar sesión
        </Link>
      </div>
    </AuthShell>
  );
}
