// components/nutrition/NutritionAdherenceChart.tsx
export interface AdherencePoint {
  dateISO: string;
  calories: number;
}

/** Tendencia de calorías consumidas por día vs meta (línea de meta punteada). SVG puro. */
export function NutritionAdherenceChart({
  points,
  target,
}: {
  points: AdherencePoint[];
  target: number | null;
}) {
  const data = points.slice(-14);
  if (data.length === 0) {
    return <p className="text-xs text-faint">Aún no hay registros para mostrar tu tendencia.</p>;
  }
  const W = 300;
  const H = 90;
  const gap = 6;
  const barW = (W - gap * (data.length - 1)) / data.length;
  const maxVal = Math.max(...data.map((d) => d.calories), target ?? 0, 1);

  return (
    <div className="space-y-1.5">
      <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label="Tendencia de calorías">
        {target != null && target > 0 && (
          <line
            x1={0}
            x2={W}
            y1={H - (target / maxVal) * H}
            y2={H - (target / maxVal) * H}
            stroke="var(--color-primary)"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity={0.7}
          />
        )}
        {data.map((d, i) => {
          const h = Math.round((d.calories / maxVal) * H);
          const x = i * (barW + gap);
          return (
            <rect key={d.dateISO} x={x} y={H - h} width={barW} height={h} rx="2" fill="var(--color-primary)" opacity={0.55} />
          );
        })}
      </svg>
      {target != null && target > 0 && (
        <p className="text-xs text-muted">Línea punteada = tu meta ({target} kcal)</p>
      )}
    </div>
  );
}
