// components/progress/TrainingSummaryCard.tsx
import { Flame } from 'lucide-react';
import type { TopProgression } from '@/lib/db/queries/progress-dashboard';

export function TrainingSummaryCard({
  sessionsLast30,
  streak,
  topProgressions,
}: {
  sessionsLast30: number;
  streak: number;
  topProgressions: TopProgression[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-6">
        <div>
          <p className="tabular text-2xl font-bold text-foreground">{sessionsLast30}</p>
          <p className="text-xs text-muted">sesiones (30 días)</p>
        </div>
        <div>
          <p className="tabular flex items-center gap-1 text-2xl font-bold text-foreground">
            <Flame className="size-5 text-primary" /> {streak}
          </p>
          <p className="text-xs text-muted">racha</p>
        </div>
      </div>
      {topProgressions.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">Más progreso</p>
          <ul className="space-y-1">
            {topProgressions.map((p) => (
              <li key={p.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{p.name}</span>
                <span className="tabular text-success">↗ +{p.deltaKg} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
