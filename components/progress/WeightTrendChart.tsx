// components/progress/WeightTrendChart.tsx
import type { WeightPoint } from '@/lib/db/queries/progress-dashboard';

export function WeightTrendChart({ series, goalKg }: { series: WeightPoint[]; goalKg: number | null }) {
  if (series.length === 0) {
    return <p className="text-xs text-faint">Registra tu peso para ver tu evolución aquí.</p>;
  }
  const W = 300, H = 120, padX = 6, padY = 10;
  const kgs = series.map((p) => p.kg);
  const lo = Math.min(...kgs, goalKg ?? Infinity);
  const hi = Math.max(...kgs, goalKg ?? -Infinity);
  const span = hi - lo || 1;
  const x = (i: number) => padX + (series.length === 1 ? (W - 2 * padX) / 2 : (i * (W - 2 * padX)) / (series.length - 1));
  const y = (kg: number) => padY + (1 - (kg - lo) / span) * (H - 2 * padY);
  const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.kg).toFixed(1)}`).join(' ');
  const len = W * 1.6;
  const first = series[0]?.kg ?? 0;
  const last = series[series.length - 1]?.kg ?? 0;
  const delta = Math.round((last - first) * 10) / 10;

  return (
    <div className="space-y-1.5">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución de peso">
        {goalKg != null && (
          <line x1={padX} x2={W - padX} y1={y(goalKg)} y2={y(goalKg)} stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="4 3" opacity={0.6} />
        )}
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="efm-line" style={{ ['--efm-len' as string]: `${len}`, strokeDasharray: len, strokeDashoffset: len }} />
        {series.map((p, i) => <circle key={p.dateISO + i} cx={x(i)} cy={y(p.kg)} r="2.5" fill="var(--color-primary)" />)}
      </svg>
      <p className="text-xs text-muted">
        {delta < 0 ? `↘ ${delta} kg` : delta > 0 ? `↗ +${delta} kg` : '→ sin cambio'} desde el inicio
        {goalKg != null ? ' · línea punteada = meta' : ''}
      </p>
    </div>
  );
}
