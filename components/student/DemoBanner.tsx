import { Sparkles } from 'lucide-react';

/**
 * Barra fija superior visible solo en sesiones demo (perfil is_demo). Avisa que
 * nada se guarda y ofrece salir (POST a /api/demo/end, que borra la cuenta
 * desechable). Server component: es un <form> nativo, sin JS de cliente.
 *
 * Se monta por encima del RouteProgress y de la top bar móvil (ambos z-30),
 * por eso usa z-50. El layout añade padding superior cuando se muestra.
 */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 border-b border-primary/40 bg-primary/15 backdrop-blur"
    >
      <div className="mx-auto flex h-11 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <p className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground sm:text-sm">
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate">
            Estás explorando EveFit como alumna · lo que hagas aquí no se guarda
          </span>
        </p>
        <form action="/api/demo/end" method="post" className="shrink-0">
          <button
            type="submit"
            className="inline-flex h-7 items-center justify-center rounded-md border border-primary/50 px-3 text-xs font-semibold text-primary transition-colors duration-150 ease-out hover:bg-primary hover:text-on-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            Salir de la demo
          </button>
        </form>
      </div>
    </div>
  );
}
