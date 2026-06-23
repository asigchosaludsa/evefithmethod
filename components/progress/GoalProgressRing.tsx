// components/progress/GoalProgressRing.tsx
export function GoalProgressRing({
  pct,
  currentKg,
  goalKg,
  remainingKg,
}: {
  pct: number | null;
  currentKg: number | null;
  goalKg: number | null;
  remainingKg: number | null;
}) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const shown = pct ?? 0;
  const offset = circ * (1 - shown / 100);
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[84px] shrink-0">
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r={r} fill="none" stroke="var(--color-hairline)" strokeWidth="8" />
          {pct != null && (
            <circle
              cx="42" cy="42" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="8" strokeLinecap="round"
              transform="rotate(-90 42 42)" strokeDasharray={circ}
              className="efm-line" style={{ ['--efm-len' as string]: `${offset}`, strokeDashoffset: offset }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="tabular text-lg font-bold text-foreground">{pct != null ? `${pct}%` : '—'}</span>
        </div>
      </div>
      <div>
        <p className="text-sm text-muted">Avance hacia tu meta</p>
        {goalKg != null ? (
          <>
            <p className="tabular font-semibold text-foreground">{currentKg ?? '—'} kg → {goalKg} kg</p>
            {remainingKg != null && remainingKg > 0 && (
              <p className="text-xs text-muted">Te faltan {remainingKg} kg</p>
            )}
          </>
        ) : (
          <p className="text-xs text-faint">Fija tu peso objetivo abajo para ver tu avance.</p>
        )}
      </div>
    </div>
  );
}
