// components/workouts/SessionCompleteCard.tsx
import { Check, Flame, X } from 'lucide-react';

export interface SessionExerciseLine {
  name: string;
  status: 'done' | 'missed';
}

/**
 * Tarjeta de "sesión completada": anillo escarlata al 100% con visto, racha y el
 * desglose ✓/✗ por ejercicio. El anillo se llena con animación CSS; respeta
 * prefers-reduced-motion vía la clase global definida en globals.css (Task 12).
 */
export function SessionCompleteCard({
  dateLabel,
  focusLabel,
  streak,
  exercises,
  skipped = false,
}: {
  dateLabel: string;
  focusLabel: string;
  streak: number;
  exercises: SessionExerciseLine[];
  skipped?: boolean;
}) {
  const circumference = 2 * Math.PI * 30; // r = 30
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative size-[72px] shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--color-hairline)" strokeWidth="7" />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="7"
              strokeLinecap="round"
              transform="rotate(-90 36 36)"
              strokeDasharray={circumference}
              strokeDashoffset={0}
              className="efm-ring"
              style={{ ['--efm-circ' as string]: `${circumference}` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Check className="size-7 text-primary" />
          </div>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {skipped ? 'Sesión marcada como no hecha' : '¡Sesión completada!'}
          </p>
          <p className="text-sm text-muted">
            {dateLabel} · {focusLabel}
          </p>
          {streak > 0 && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Flame className="size-3.5" /> Racha de {streak} {streak === 1 ? 'día' : 'días'}
            </span>
          )}
        </div>
      </div>

      {exercises.length > 0 && (
        <ul className="space-y-2">
          {exercises.map((ex, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {ex.status === 'done' ? (
                <Check className="size-4 text-primary" />
              ) : (
                <X className="size-4 text-faint" />
              )}
              <span className={ex.status === 'done' ? 'text-foreground' : 'text-faint'}>{ex.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
