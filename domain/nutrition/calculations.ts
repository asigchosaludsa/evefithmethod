import type { Macros } from '@/types/app';
import type {
  FoodMacroSource,
  MacroProgress,
  MacroRescueSuggestion,
  RescueFocus,
} from './types';

/** Round to 1 decimal place (epsilon-nudged to tame float noise). */
const r1 = (n: number): number => Math.round((n + Number.EPSILON) * 10) / 10;

const ZERO: Macros = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/** Scale a food's per-100g macros to a given gram amount. */
export function calculateFoodMacros(food: FoodMacroSource, grams: number): Macros {
  const q = grams / 100;
  return {
    calories: r1(food.calories_per_100g * q),
    protein_g: r1(food.protein_per_100g * q),
    carbs_g: r1(food.carbs_per_100g * q),
    fat_g: r1(food.fat_per_100g * q),
  };
}

/** Sum a list of macro entries. */
export function calculateMealTotals(items: Macros[]): Macros {
  const total = items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein_g: acc.protein_g + i.protein_g,
      carbs_g: acc.carbs_g + i.carbs_g,
      fat_g: acc.fat_g + i.fat_g,
    }),
    { ...ZERO },
  );
  return {
    calories: r1(total.calories),
    protein_g: r1(total.protein_g),
    carbs_g: r1(total.carbs_g),
    fat_g: r1(total.fat_g),
  };
}

/** Daily totals are simply the sum of every item logged that day. */
export function calculateDailyNutritionTotals(items: Macros[]): Macros {
  return calculateMealTotals(items);
}

/** Progress of a single macro toward its target. */
export function calculateMacroProgress(consumed: number, target: number): MacroProgress {
  const remaining = r1(Math.max(0, target - consumed));
  const pct = target > 0 ? Math.round((consumed / target) * 100) : 0;
  return { consumed, target, remaining, pct };
}

const RESCUE_FOODS: Record<Exclude<RescueFocus, 'none'>, string[]> = {
  protein: ['Yogur griego', 'Pollo', 'Atún', 'Huevos'],
  carbs: ['Arroz', 'Banana', 'Papa', 'Avena'],
  fat: ['Aguacate', 'Salmón', 'Huevos'],
  general: ['Yogur griego', 'Banana', 'Granola'],
};

const RESCUE_MESSAGES: Record<RescueFocus, string> = {
  protein: 'Te falta proteína para hoy. Una porción de estas opciones te ayuda a completar tu meta.',
  carbs: 'Te faltan carbohidratos. Estas opciones te dan energía para tu día y tu entrenamiento.',
  fat: 'Te faltan grasas saludables. Suma una porción pequeña de estas opciones.',
  general: 'Te faltan calorías para llegar a tu meta. Combina estas opciones según tu plan.',
  none: '¡Vas muy bien! Estás cerca de tu meta del día.',
};

/**
 * Rule-based macro coaching suggestion (no AI). Coaching support, not medical
 * advice. `remaining` is how much of each macro is still left for the day.
 */
export function generateMacroRescueSuggestion(remaining: {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}): MacroRescueSuggestion {
  let focus: RescueFocus;
  if (remaining.protein_g >= 20) focus = 'protein';
  else if (remaining.carbs_g >= 30) focus = 'carbs';
  else if (remaining.fat_g >= 15) focus = 'fat';
  else if (remaining.calories >= 200) focus = 'general';
  else focus = 'none';

  return {
    focus,
    foods: focus === 'none' ? [] : RESCUE_FOODS[focus],
    message: RESCUE_MESSAGES[focus],
  };
}

/** Adherence score 0..100: average of per-macro ratios (capped at target). */
export function calculateNutritionAdherence(
  consumed: Partial<Macros>,
  target: Partial<Macros>,
): { score: number } {
  const keys: (keyof Macros)[] = ['calories', 'protein_g', 'carbs_g', 'fat_g'];
  const ratios: number[] = [];
  for (const k of keys) {
    const t = target[k];
    if (typeof t === 'number' && t > 0) {
      const c = consumed[k] ?? 0;
      ratios.push(Math.min(c / t, 1));
    }
  }
  if (ratios.length === 0) return { score: 100 };
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return { score: Math.round(avg * 100) };
}
