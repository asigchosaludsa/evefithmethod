// domain/workouts/progression.ts
/**
 * Lógica pura de progresión de entrenamiento. Sin dependencias de DB ni de fecha
 * del sistema. Trabaja sobre sets ya registrados (workout_log_sets enriquecidos
 * con la session_date de su workout_log).
 */

export interface LoggedSet {
  exercise_id: string | null;
  weight_kg: number | null;
  completed: boolean;
  session_date: string | null; // ISO YYYY-MM-DD
}

export interface MaxWeightPoint {
  dateISO: string;
  maxKg: number;
}

/**
 * Serie de peso máximo levantado por sesión para un ejercicio. Solo cuenta sets
 * con peso numérico (> = 0). Ordenada ascendente por fecha. Una sesión sin peso
 * registrado no aparece.
 */
export function maxWeightSeries(sets: LoggedSet[], exerciseId: string): MaxWeightPoint[] {
  const byDate = new Map<string, number>();
  for (const s of sets) {
    if (s.exercise_id !== exerciseId) continue;
    if (s.weight_kg == null || !s.session_date) continue;
    const prev = byDate.get(s.session_date);
    if (prev == null || s.weight_kg > prev) byDate.set(s.session_date, s.weight_kg);
  }
  return [...byDate.entries()]
    .map(([dateISO, maxKg]) => ({ dateISO, maxKg }))
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0));
}

/** Último peso usado en un ejercicio: el máximo de la sesión más reciente con peso. */
export function lastWeightForExercise(sets: LoggedSet[], exerciseId: string): number | null {
  const series = maxWeightSeries(sets, exerciseId);
  const last = series[series.length - 1];
  return last ? last.maxKg : null;
}

export type ExerciseDayStatus = 'done' | 'missed';

/**
 * Estado por ejercicio dentro de una sesión: 'done' si tiene al menos un set
 * completado; 'missed' si está en el plan pero no tiene ningún set completado.
 */
export function exerciseStatusForDay(
  planExerciseIds: string[],
  sessionSets: LoggedSet[],
): Record<string, ExerciseDayStatus> {
  const doneIds = new Set<string>();
  for (const s of sessionSets) {
    if (s.completed && s.exercise_id) doneIds.add(s.exercise_id);
  }
  const out: Record<string, ExerciseDayStatus> = {};
  for (const id of planExerciseIds) {
    out[id] = doneIds.has(id) ? 'done' : 'missed';
  }
  return out;
}
