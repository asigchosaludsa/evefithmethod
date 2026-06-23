// domain/nutrition/adherence.ts
/** Adherencia diaria por calorías vs meta. Umbrales relativos. */
export const ADHERENCE_OK = 0.1; // ±10%
export const ADHERENCE_NEAR = 0.25; // ±25%

export type DayAdherence = 'cumplido' | 'cerca' | 'lejos' | 'sin_registro' | 'sin_meta';

export function dayAdherence(
  consumedCalories: number,
  targetCalories: number | null,
  hasLogs: boolean,
): DayAdherence {
  if (!hasLogs) return 'sin_registro';
  if (targetCalories == null || targetCalories <= 0) return 'sin_meta';
  const diff = Math.abs(consumedCalories - targetCalories) / targetCalories;
  if (diff <= ADHERENCE_OK) return 'cumplido';
  if (diff <= ADHERENCE_NEAR) return 'cerca';
  return 'lejos';
}
