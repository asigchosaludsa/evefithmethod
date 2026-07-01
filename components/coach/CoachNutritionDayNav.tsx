'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDaysISO } from '@/domain/workouts/calendar';

/**
 * Navegador de día para la vista de nutrición del coach: día anterior/siguiente
 * + selector de fecha. Empuja `?date=` a la ruta actual (no pasa de hoy).
 */
export function CoachNutritionDayNav({
  selectedISO,
  todayISO,
}: {
  selectedISO: string;
  todayISO: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function go(iso: string) {
    const clamped = iso > todayISO ? todayISO : iso;
    router.push(`${pathname}?date=${clamped}`, { scroll: false });
  }

  const prevISO = addDaysISO(selectedISO, -1);
  const nextISO = addDaysISO(selectedISO, 1);
  const atToday = selectedISO >= todayISO;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => go(prevISO)}
        className="rounded-md border border-border bg-surface p-1.5 text-muted transition-colors hover:text-foreground"
        aria-label="Día anterior"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <input
        type="date"
        value={selectedISO}
        max={todayISO}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-foreground focus:border-primary focus:outline-none"
        aria-label="Elegir día"
      />
      <button
        type="button"
        onClick={() => go(nextISO)}
        disabled={atToday}
        className="rounded-md border border-border bg-surface p-1.5 text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Día siguiente"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
