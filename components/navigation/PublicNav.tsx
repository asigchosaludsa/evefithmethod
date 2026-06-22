import Link from 'next/link';
import { Logo, Button } from '@/components/common';

export function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline/60 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="EveFit Method, inicio">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/solicitud">Empieza ya</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
