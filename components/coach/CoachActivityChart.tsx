import { Dumbbell, Utensils } from 'lucide-react';
import type { ActivityDayBucket } from '@/lib/db/queries/coach-activity';

/**
 * Mini-gráfico SVG (sin dependencias) de registros por día across alumnas:
 * barras apiladas de entrenos (escarlata) + comidas (azul/info) sobre los
 * últimos N días. Mismo estilo que los charts de progreso/nutrición; usa
 * tokens del sistema de diseño y la animación reduced-motion-safe `efm-bar`.
 */
export function CoachActivityChart({ data }: { data: ActivityDayBucket[] }) {
  const total = data.reduce((acc, d) => acc + d.workouts + d.meals, 0);
  if (data.length === 0 || total === 0) {
    return (
      <p className="text-xs text-faint">
        Aún no hay registros de tus alumnas para mostrar la tendencia.
      </p>
    );
  }

  const W = 320;
  const H = 96;
  const gap = 4;
  const barW = (W - gap * (data.length - 1)) / data.length;
  const maxVal = Math.max(...data.map((d) => d.workouts + d.meals), 1);

  return (
    <div className="space-y-2">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Registros por día (entrenos y comidas)"
        preserveAspectRatio="none"
      >
        {data.map((d, i) => {
          const x = i * (barW + gap);
          const workoutsH = Math.round((d.workouts / maxVal) * H);
          const mealsH = Math.round((d.meals / maxVal) * H);
          const stackH = workoutsH + mealsH;
          return (
            <g key={d.dateISO} className="efm-bar" style={{ animationDelay: `${i * 25}ms` }}>
              {/* base de comidas (info), abajo */}
              {mealsH > 0 && (
                <rect
                  x={x}
                  y={H - mealsH}
                  width={barW}
                  height={mealsH}
                  rx="2"
                  fill="var(--color-info)"
                  opacity={0.7}
                />
              )}
              {/* entrenos (escarlata), encima */}
              {workoutsH > 0 && (
                <rect
                  x={x}
                  y={H - stackH}
                  width={barW}
                  height={workoutsH}
                  rx="2"
                  fill="var(--color-primary)"
                  opacity={0.85}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Dumbbell className="size-3.5 text-primary" aria-hidden /> Entrenos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Utensils className="size-3.5 text-info" aria-hidden /> Comidas
        </span>
        <span className="ml-auto tabular text-faint">{total} registros · últimos {data.length} días</span>
      </div>
    </div>
  );
}
