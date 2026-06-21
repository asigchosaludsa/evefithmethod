import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/common';

export const metadata = { title: 'Error de autenticación' };

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-danger/12 text-danger">
        <TriangleAlert className="size-6" aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold text-foreground">No pudimos verificar tu enlace</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        El enlace puede haber expirado o ya fue utilizado. Intenta iniciar sesión de nuevo o solicita un
        nuevo enlace.
      </p>
      <Button asChild className="mt-6">
        <Link href="/login">Volver a iniciar sesión</Link>
      </Button>
    </main>
  );
}
