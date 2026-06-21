import { Sparkles } from 'lucide-react';
import { generateMacroRescueSuggestion } from '@/domain/nutrition/calculations';
import type { Macros } from '@/types/app';

interface Target {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export function MacroRescuePanel({ consumed, target }: { consumed: Macros; target: Target }) {
  const remaining = {
    calories: Math.max(0, (target.calories ?? 0) - consumed.calories),
    protein_g: Math.max(0, (target.protein_g ?? 0) - consumed.protein_g),
    carbs_g: Math.max(0, (target.carbs_g ?? 0) - consumed.carbs_g),
    fat_g: Math.max(0, (target.fat_g ?? 0) - consumed.fat_g),
  };
  const suggestion = generateMacroRescueSuggestion(remaining);
  if (suggestion.focus === 'none') return null;

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <p className="font-display text-sm font-semibold text-foreground">Macro Rescue</p>
      </div>
      <p className="mt-1.5 text-sm text-muted">{suggestion.message}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestion.foods.map((f) => (
          <span key={f} className="rounded-full bg-elevated px-2.5 py-1 text-xs text-foreground">
            {f}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-faint">
        Sugerencia de apoyo, no es indicación médica.
      </p>
    </div>
  );
}
