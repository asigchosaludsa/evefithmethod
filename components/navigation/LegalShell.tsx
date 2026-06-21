import Link from 'next/link';
import { PublicNav } from './PublicNav';

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
        {updated && <p className="mt-1 text-sm text-faint">Última actualización: {updated}</p>}
        <article className="mt-8 space-y-4 text-sm leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:text-foreground">
          {children}
        </article>
        <p className="mt-10 border-t border-hairline pt-6 text-sm">
          <Link href="/" className="text-primary hover:underline">
            ← Volver al inicio
          </Link>
        </p>
      </main>
    </>
  );
}
