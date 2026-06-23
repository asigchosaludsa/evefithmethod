// components/workouts/ExerciseProgressChart.tsx
import type { MaxWeightPoint } from '@/domain/workouts/progression';

/**
 * Mini-gráfico de barras del peso máximo por sesión de un ejercicio. SVG puro,
 * responsive (viewBox), sin dependencias. Muestra hasta los últimos 8 puntos.
 */
export function ExerciseProgressChart({ series }: { series: MaxWeightPoint[] }) {
  const points = series.slice(-8);
  if (points.length === 0) {
    return <p className="text-xs text-faint">Sin datos de progreso aún. Registra tu peso para verlo aquí.</p>;
  }
  const max = Math.max(...points.map((p) => p.maxKg), 1);
  const W = 280;
  const H = 80;
  const gap = 8;
  const barW = (W - gap * (points.length - 1)) / points.length;

  const first = points[0]?.maxKg ?? 0;
  const last = points[points.length - 1]?.maxKg ?? 0;
  const delta = Math.round((last - first) * 100) / 100;

  return (
    <div className="space-y-1.5">
      <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label="Progreso de peso máximo">
        {points.map((p, i) => {
          const h = Math.round((p.maxKg / max) * H);
          const x = i * (barW + gap);
          const y = H - h;
          return (
            <g key={p.dateISO}>
              <rect x={x} y={y} width={barW} height={h} rx="3" fill="var(--color-primary)" opacity={0.25 + 0.75 * (i / Math.max(1, points.length - 1))} />
              <text x={x + barW / 2} y={H + 13} textAnchor="middle" fontSize="9" fill="var(--color-faint)">
                {p.maxKg}
              </text>
            </g>
          );
        })}
      </svg>
      {points.length > 1 && (
        <p className="text-xs text-muted">
          {delta > 0 ? `↗ +${delta} kg` : delta < 0 ? `↘ ${delta} kg` : '→ igual'} desde el inicio
        </p>
      )}
    </div>
  );
}
