import type { DomainAlert, WeightGoal, WeightPoint } from './types';

const MS_PER_DAY = 86_400_000;

/** Whole days between two YYYY-MM-DD dates (to - from). */
function daysBetween(from: string, to: string): number {
  return Math.floor((Date.parse(to) - Date.parse(from)) / MS_PER_DAY);
}

/** No food log within `days`. */
export function detectNoFoodLogs(
  student: { lastFoodLogAt: string | null },
  today: string,
  days: number,
): DomainAlert | null {
  if (student.lastFoodLogAt && daysBetween(student.lastFoodLogAt, today) <= days) {
    return null;
  }
  return {
    type: 'no_food_logs',
    severity: 'warning',
    title: 'Sin registros de comida',
    message: `No hay registros de comida en los últimos ${days} días.`,
    source: 'system',
  };
}

/** Protein adherence below 60%. */
export function detectLowProteinAdherence(adherencePct: number): DomainAlert | null {
  if (adherencePct >= 60) return null;
  return {
    type: 'low_protein',
    severity: 'warning',
    title: 'Proteína baja',
    message: `La adherencia de proteína está en ${Math.round(adherencePct)}%.`,
    source: 'system',
  };
}

/** No workout within `days`. */
export function detectMissedWorkouts(
  student: { lastWorkoutAt: string | null },
  today: string,
  days: number,
): DomainAlert | null {
  if (student.lastWorkoutAt && daysBetween(student.lastWorkoutAt, today) <= days) {
    return null;
  }
  return {
    type: 'missed_workouts',
    severity: 'warning',
    title: 'Entrenamientos pendientes',
    message: `No hay entrenamientos registrados en los últimos ${days} días.`,
    source: 'system',
  };
}

/** A sudden weight change of >= 2kg between the two most recent entries. */
export function detectWeightSpike(entries: WeightPoint[]): DomainAlert | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const last = sorted[sorted.length - 1]!;
  const prev = sorted[sorted.length - 2]!;
  const change = last.weight_kg - prev.weight_kg;
  if (Math.abs(change) < 2) return null;
  return {
    type: 'weight_spike',
    severity: 'info',
    title: 'Cambio de peso brusco',
    message: `El peso cambió ${change > 0 ? '+' : ''}${Math.round(change * 10) / 10}kg respecto al último registro.`,
    source: 'system',
  };
}

/** Positive trend toward the stated goal. */
export function detectPositiveProgress(
  entries: WeightPoint[],
  goal: WeightGoal,
): DomainAlert | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const change = sorted[sorted.length - 1]!.weight_kg - sorted[0]!.weight_kg;
  const positive =
    (goal === 'loss' && change < 0) ||
    (goal === 'gain' && change > 0) ||
    (goal === 'maintenance' && Math.abs(change) < 1);
  if (!positive) return null;
  return {
    type: 'positive_progress',
    severity: 'success',
    title: 'Buen progreso',
    message: 'La alumna avanza hacia su objetivo. ¡Buen momento para reforzar!',
    source: 'system',
  };
}

/** Build a normalized coach-authored alert. */
export function createCoachAlert(input: {
  type: string;
  title: string;
  message?: string;
  severity?: DomainAlert['severity'];
}): DomainAlert {
  return {
    type: input.type,
    severity: input.severity ?? 'info',
    title: input.title,
    message: input.message ?? '',
    source: 'coach',
  };
}
