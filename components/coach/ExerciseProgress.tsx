import { Dumbbell, TrendingUp, CalendarDays } from 'lucide-react';
import { StatCard, EmptyState } from '@/components/common';
import { formatDate } from '@/lib/utils/date';
import type { ExerciseHistory, ExerciseSession } from '@/lib/db/queries/exercise-history';

function kg(value: number | null): string {
  return value == null ? '—' : `${value} kg`;
}

/** Compact set line, e.g. "12×40 · 10×40 · 8×42" ('—' for missing values). */
function setLine(sets: ExerciseSession['sets']): string {
  return sets
    .map((s) => {
      const reps = s.reps == null ? '—' : String(s.reps);
      const weight = s.weight == null ? '—' : String(s.weight);
      return `${reps}×${weight}`;
    })
    .join(' · ');
}

export function ExerciseProgress({ history }: { history: ExerciseHistory }) {
  const { sessions, bestWeight, best1RM } = history;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Mejor peso" value={kg(bestWeight)} icon={Dumbbell} tone="primary" />
        <StatCard label="Mejor 1RM est." value={kg(best1RM)} icon={TrendingUp} tone="success" />
        <StatCard label="Sesiones" value={sessions.length} icon={CalendarDays} />
      </div>

      {sessions.length === 0 ? (
        <EmptyState title="Sin registros de este ejercicio" />
      ) : (
        <ul className="space-y-3">
          {sessions.map((session, i) => (
            <li
              key={`${session.date}-${i}`}
              className="rounded-lg border border-hairline bg-surface p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">{formatDate(session.date)}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted">
                    Peso máx. <span className="tabular text-foreground">{kg(session.topWeight)}</span>
                  </span>
                  <span className="text-muted">
                    Volumen <span className="tabular text-foreground">{session.volume}</span>
                  </span>
                  <span className="text-muted">
                    1RM est. <span className="tabular text-success">{kg(session.est1RM)}</span>
                  </span>
                </div>
              </div>
              <p className="tabular mt-2 text-sm text-faint">{setLine(session.sets)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
