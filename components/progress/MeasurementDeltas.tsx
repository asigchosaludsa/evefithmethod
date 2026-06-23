// components/progress/MeasurementDeltas.tsx
import type { MeasurementRow } from '@/lib/db/queries/progress-dashboard';

const FIELDS: { key: keyof MeasurementRow; label: string }[] = [
  { key: 'waist_cm', label: 'Cintura' },
  { key: 'hip_cm', label: 'Cadera' },
  { key: 'chest_cm', label: 'Pecho' },
  { key: 'thigh_cm', label: 'Muslo' },
  { key: 'arm_cm', label: 'Brazo' },
];

export function MeasurementDeltas({ first, last }: { first: MeasurementRow | null; last: MeasurementRow | null }) {
  if (!last) return <p className="text-xs text-faint">Registra tus medidas para ver tu evolución.</p>;
  return (
    <ul className="space-y-2">
      {FIELDS.map(({ key, label }) => {
        const lastV = last[key] as number | null;
        if (lastV == null) return null;
        const firstV = (first?.[key] as number | null) ?? null;
        const delta = firstV != null ? Math.round((lastV - firstV) * 10) / 10 : null;
        return (
          <li key={String(key)} className="flex items-center justify-between text-sm">
            <span className="text-muted">{label}</span>
            <span className="tabular text-foreground">
              {lastV} cm
              {delta != null && delta !== 0 && (
                <span className={delta < 0 ? 'ml-2 text-success' : 'ml-2 text-warning'}>
                  {delta < 0 ? '↘' : '↗'} {Math.abs(delta)} cm
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
