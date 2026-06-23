// lib/db/queries/exercise-progression.ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { maxWeightSeries, lastWeightForExercise, type LoggedSet, type MaxWeightPoint } from '@/domain/workouts/progression';

export interface ExerciseProgression {
  /** exerciseId -> serie de peso máximo por sesión (ascendente por fecha). */
  seriesByExercise: Record<string, MaxWeightPoint[]>;
  /** exerciseId -> último peso usado (o null). */
  lastWeightByExercise: Record<string, number>;
}

/**
 * Series de peso máximo y último peso por ejercicio para una alumna, derivadas de
 * sus workout_log_sets (uniendo la session_date de cada workout_log). Limitado a
 * los exerciseIds dados (los del plan activo) para no traer historial irrelevante.
 */
export async function getExerciseProgression(
  studentId: string,
  exerciseIds: string[],
): Promise<ExerciseProgression> {
  if (exerciseIds.length === 0) {
    return { seriesByExercise: {}, lastWeightByExercise: {} };
  }
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('workout_logs')
    .select('id, session_date')
    .eq('student_id', studentId)
    .not('session_date', 'is', null);

  const logDate = new Map<string, string>();
  for (const l of logs ?? []) {
    if (l.session_date) logDate.set(l.id, l.session_date);
  }
  const logIds = [...logDate.keys()];
  if (logIds.length === 0) {
    return { seriesByExercise: {}, lastWeightByExercise: {} };
  }

  const { data: rows } = await supabase
    .from('workout_log_sets')
    .select('workout_log_id, exercise_id, weight_kg, completed')
    .in('workout_log_id', logIds)
    .in('exercise_id', exerciseIds);

  const sets: LoggedSet[] = (rows ?? []).map((r) => ({
    exercise_id: r.exercise_id,
    weight_kg: r.weight_kg,
    completed: r.completed,
    session_date: logDate.get(r.workout_log_id) ?? null,
  }));

  const seriesByExercise: Record<string, MaxWeightPoint[]> = {};
  const lastWeightByExercise: Record<string, number> = {};
  for (const id of exerciseIds) {
    const series = maxWeightSeries(sets, id);
    if (series.length > 0) seriesByExercise[id] = series;
    const last = lastWeightForExercise(sets, id);
    if (last != null) lastWeightByExercise[id] = last;
  }
  return { seriesByExercise, lastWeightByExercise };
}
