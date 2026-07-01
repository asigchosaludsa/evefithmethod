'use client';

import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { updateWorkoutDayWeekday } from '@/lib/coach/actions';
import { WEEKDAYS } from '@/domain/workouts/calendar';

/**
 * Selector inline del día de la semana de un día del plan. Guarda al cambiar.
 * "Descanso / sin asignar" (valor vacío) deja el día fuera del calendario.
 */
export function WorkoutDayWeekdayEditor({
  dayId,
  planId,
  weekday,
}: {
  dayId: string;
  planId: string;
  weekday: number | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      <span className="hidden sm:inline">Día:</span>
      <select
        value={weekday ?? ''}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value;
          startTransition(() => updateWorkoutDayWeekday(dayId, planId, value));
        }}
        className="h-8 rounded-md border border-border bg-surface px-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
        aria-label="Día de la semana de esta sesión"
      >
        <option value="">Descanso / sin asignar</option>
        {WEEKDAYS.map((w) => (
          <option key={w.value} value={w.value}>
            {w.label}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="size-3.5 animate-spin text-faint" aria-hidden />}
    </label>
  );
}
