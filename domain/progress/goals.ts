// domain/progress/goals.ts
/** Avance hacia la meta de peso, 0..100. Maneja bajar y subir de peso. */
export function goalProgressPct(
  firstKg: number | null,
  currentKg: number | null,
  goalKg: number | null,
): number | null {
  if (firstKg == null || currentKg == null || goalKg == null) return null;
  const total = goalKg - firstKg;
  if (total === 0) return 100;
  const done = currentKg - firstKg;
  const pct = (done / total) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** Kg que faltan para la meta (absoluto, 1 decimal). */
export function remainingToGoal(currentKg: number | null, goalKg: number | null): number | null {
  if (currentKg == null || goalKg == null) return null;
  return Math.round(Math.abs(goalKg - currentKg) * 10) / 10;
}
