// components/progress/NutritionAdherenceSummary.tsx
import { NutritionAdherenceChart } from '@/components/nutrition/NutritionAdherenceChart';
import type { NutritionPoint } from '@/lib/db/queries/progress-dashboard';

export function NutritionAdherenceSummary({
  pctDaysOk,
  daysLogged,
  points,
  targetCalories,
}: {
  pctDaysOk: number;
  daysLogged: number;
  points: NutritionPoint[];
  targetCalories: number | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="tabular text-2xl font-bold text-foreground">{pctDaysOk}%</span>
        <span className="text-xs text-muted">días en meta ({daysLogged} con registro)</span>
      </div>
      <NutritionAdherenceChart points={points.map((p) => ({ dateISO: p.dateISO, calories: p.calories }))} target={targetCalories} />
    </div>
  );
}
