import { ProgressRing } from '@/components/common';
import { calculateMacroProgress } from '@/domain/nutrition/calculations';
import type { Macros } from '@/types/app';

interface Target {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

function Bar({
  label,
  consumed,
  target,
  color,
}: {
  label: string;
  consumed: number;
  target: number | null;
  color: string;
}) {
  const pct = target && target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular text-foreground">
          {Math.round(consumed)}
          {target ? <span className="text-faint"> / {Math.round(target)}g</span> : 'g'}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function MacroProgress({ consumed, target }: { consumed: Macros; target: Target }) {
  const calProgress = calculateMacroProgress(consumed.calories, target.calories ?? 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
      <ProgressRing value={target.calories ? calProgress.pct : 0} size={120} strokeWidth={10}>
        <span className="tabular font-display text-2xl font-bold text-foreground">
          {Math.round(consumed.calories)}
        </span>
        <span className="text-xs text-muted">
          {target.calories ? `de ${target.calories} kcal` : 'kcal'}
        </span>
      </ProgressRing>
      <div className="w-full flex-1 space-y-3">
        <Bar label="Proteína" consumed={consumed.protein_g} target={target.protein_g} color="var(--color-info)" />
        <Bar label="Carbohidratos" consumed={consumed.carbs_g} target={target.carbs_g} color="var(--color-warning)" />
        <Bar label="Grasas" consumed={consumed.fat_g} target={target.fat_g} color="var(--color-success)" />
      </div>
    </div>
  );
}
