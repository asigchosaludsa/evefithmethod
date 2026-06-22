import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { estimateOneRepMax, calculateWorkoutVolume } from '@/domain/workouts/calculations';

export interface LoggedExercise {
  exerciseId: string;
  name: string;
  sessions: number;
}

/**
 * Exercises the student has logged at least one set for, with how many distinct
 * sessions (workout_logs) each appears in, sorted by sessions desc.
 */
export async function getLoggedExercises(studentId: string): Promise<LoggedExercise[]> {
  const supabase = await createClient();

  // 1) The student's workout log ids.
  const { data: logs } = await supabase
    .from('workout_logs')
    .select('id')
    .eq('student_id', studentId);

  const logIds = (logs ?? []).map((l) => l.id);
  if (logIds.length === 0) return [];

  // 2) Every set in those logs (only the columns we need to group).
  const { data: sets } = await supabase
    .from('workout_log_sets')
    .select('exercise_id, workout_log_id')
    .in('workout_log_id', logIds);

  // 3) Count distinct logs per exercise_id (skip null exercise_id).
  const logsByExercise = new Map<string, Set<string>>();
  for (const s of sets ?? []) {
    const exerciseId = s.exercise_id;
    if (!exerciseId) continue;
    let bucket = logsByExercise.get(exerciseId);
    if (!bucket) {
      bucket = new Set<string>();
      logsByExercise.set(exerciseId, bucket);
    }
    bucket.add(s.workout_log_id);
  }

  const exerciseIds = [...logsByExercise.keys()];
  if (exerciseIds.length === 0) return [];

  // 4) Exercise names.
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name')
    .in('id', exerciseIds);

  const nameById = new Map<string, string>();
  for (const e of exercises ?? []) {
    nameById.set(e.id, e.name);
  }

  // 5) Assemble + sort by sessions desc.
  const result: LoggedExercise[] = exerciseIds.map((exerciseId) => ({
    exerciseId,
    name: nameById.get(exerciseId) ?? 'Ejercicio',
    sessions: logsByExercise.get(exerciseId)?.size ?? 0,
  }));

  result.sort((a, b) => b.sessions - a.sessions);
  return result;
}

export interface ExerciseSession {
  date: string;
  sets: { reps: number | null; weight: number | null; completed: boolean }[];
  topWeight: number | null;
  est1RM: number | null;
  volume: number;
}

export interface ExerciseHistory {
  exerciseName: string;
  sessions: ExerciseSession[];
  bestWeight: number | null;
  best1RM: number | null;
}

/**
 * Full progression of one exercise for one student across logged sessions.
 * Sessions are returned most-recent-first; bestWeight/best1RM are computed over
 * all sets in all sessions.
 */
export async function getExerciseHistory(
  studentId: string,
  exerciseId: string,
): Promise<ExerciseHistory> {
  const supabase = await createClient();

  // Exercise name (independent of whether there are any logs).
  const { data: exercise } = await supabase
    .from('exercises')
    .select('name')
    .eq('id', exerciseId)
    .maybeSingle();
  const exerciseName = exercise?.name ?? 'Ejercicio';

  // 1) The student's logs, newest first, so we can map id -> date and order.
  const { data: logs } = await supabase
    .from('workout_logs')
    .select('id, logged_at')
    .eq('student_id', studentId)
    .order('logged_at', { ascending: false });

  const logList = logs ?? [];
  const logIds = logList.map((l) => l.id);
  if (logIds.length === 0) {
    return { exerciseName, sessions: [], bestWeight: null, best1RM: null };
  }

  const dateByLogId = new Map<string, string>();
  for (const l of logList) {
    dateByLogId.set(l.id, l.logged_at);
  }

  // 2) Sets for this exercise across those logs.
  const { data: sets } = await supabase
    .from('workout_log_sets')
    .select('workout_log_id, reps_completed, weight_kg, completed, set_number')
    .eq('exercise_id', exerciseId)
    .in('workout_log_id', logIds)
    .order('set_number', { ascending: true });

  // 3) Group sets by workout_log_id.
  type RawSet = { reps: number | null; weight: number | null; completed: boolean };
  const setsByLog = new Map<string, RawSet[]>();
  for (const s of sets ?? []) {
    let bucket = setsByLog.get(s.workout_log_id);
    if (!bucket) {
      bucket = [];
      setsByLog.set(s.workout_log_id, bucket);
    }
    bucket.push({
      reps: s.reps_completed ?? null,
      weight: s.weight_kg ?? null,
      completed: s.completed,
    });
  }

  // 4) Build one ExerciseSession per log that has sets, preserving log order
  //    (already newest-first from the query above).
  let bestWeight: number | null = null;
  let best1RM: number | null = null;

  const sessions: ExerciseSession[] = [];
  for (const logId of logIds) {
    const logSets = setsByLog.get(logId);
    if (!logSets || logSets.length === 0) continue;

    let topWeight: number | null = null;
    let est1RM: number | null = null;

    for (const s of logSets) {
      if (s.weight != null) {
        topWeight = topWeight == null ? s.weight : Math.max(topWeight, s.weight);
        if (bestWeight == null || s.weight > bestWeight) bestWeight = s.weight;
      }
      if (s.weight != null && s.reps != null) {
        const oneRm = estimateOneRepMax(s.weight, s.reps);
        est1RM = est1RM == null ? oneRm : Math.max(est1RM, oneRm);
        if (best1RM == null || oneRm > best1RM) best1RM = oneRm;
      }
    }

    const volume = calculateWorkoutVolume(
      logSets.map((s) => ({ reps_completed: s.reps, weight_kg: s.weight })),
    );

    sessions.push({
      date: dateByLogId.get(logId) ?? '',
      sets: logSets,
      topWeight,
      est1RM,
      volume,
    });
  }

  // Sort sessions by date desc (logs were already ordered, but be explicit).
  sessions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return { exerciseName, sessions, bestWeight, best1RM };
}
