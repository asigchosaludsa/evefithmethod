import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface CalendarPlan {
  id: string;
  title: string;
  split_type: string | null;
  starts_at: string | null;
  weeks: number | null;
}

export interface CalendarPlanDay {
  id: string;
  day_number: number;
  title: string;
  focus: string | null;
  weekday: number | null;
}

export interface CalendarExercise {
  exercise_id: string | null;
  name: string;
  sets: number;
  reps: string;
  suggested_weight_kg: number | null;
}

export type CalendarLogStatus = 'completed' | 'skipped' | 'started';

export interface LoggedSessionSet {
  exercise_id: string | null;
  weight_kg: number | null;
  completed: boolean;
}

export interface TrainingCalendarData {
  plan: CalendarPlan | null;
  days: CalendarPlanDay[];
  exercisesByDay: Record<string, CalendarExercise[]>;
  /** Map keyed by `${planDayId}|${dateISO}` -> log status. */
  statusByKey: Record<string, CalendarLogStatus>;
  /** Map keyed by `${planDayId}|${dateISO}` -> sets registrados de esa sesión. */
  setsByKey: Record<string, LoggedSessionSet[]>;
}

/**
 * All data needed to render the training calendar for a student: the active
 * workout plan, its scheduled split days (mapped to weekdays), the exercises
 * per day (for the detail panel) and the student's dated session logs. Null-safe:
 * with no active plan, returns plan = null and empty collections.
 */
export async function getTrainingCalendarData(studentId: string): Promise<TrainingCalendarData> {
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('workout_plans')
    .select('id, title, split_type, starts_at, weeks')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) {
    return { plan: null, days: [], exercisesByDay: {}, statusByKey: {}, setsByKey: {} };
  }

  const [{ data: days }, { data: logs }] = await Promise.all([
    supabase
      .from('workout_plan_days')
      .select('id, day_number, title, focus, weekday')
      .eq('workout_plan_id', plan.id)
      .order('day_number'),
    supabase
      .from('workout_logs')
      .select('id, workout_plan_day_id, session_date, status')
      .eq('student_id', studentId)
      .not('session_date', 'is', null),
  ]);

  const dayList = days ?? [];
  const dayIds = dayList.map((d) => d.id);

  const { data: planExercises } = dayIds.length
    ? await supabase
        .from('workout_plan_exercises')
        .select('workout_plan_day_id, exercise_id, sets, reps, suggested_weight_kg, sort_order')
        .in('workout_plan_day_id', dayIds)
        .order('sort_order')
    : { data: [] };

  const exerciseIds = [
    ...new Set((planExercises ?? []).map((e) => e.exercise_id).filter(Boolean)),
  ] as string[];
  const { data: exercises } = exerciseIds.length
    ? await supabase.from('exercises').select('id, name').in('id', exerciseIds)
    : { data: [] };
  const exMap = new Map((exercises ?? []).map((e) => [e.id, e.name]));

  const exercisesByDay: Record<string, CalendarExercise[]> = {};
  for (const pe of planExercises ?? []) {
    const arr = exercisesByDay[pe.workout_plan_day_id] ?? [];
    arr.push({
      exercise_id: pe.exercise_id,
      name: pe.exercise_id ? (exMap.get(pe.exercise_id) ?? 'Ejercicio (eliminado)') : 'Ejercicio',
      sets: pe.sets,
      reps: pe.reps,
      suggested_weight_kg: pe.suggested_weight_kg,
    });
    exercisesByDay[pe.workout_plan_day_id] = arr;
  }

  const statusByKey: Record<string, CalendarLogStatus> = {};
  for (const log of logs ?? []) {
    if (!log.session_date || !log.workout_plan_day_id) continue;
    statusByKey[`${log.workout_plan_day_id}|${log.session_date}`] =
      log.status as CalendarLogStatus;
  }

  // Sets de cada sesión registrada, para derivar ✓/✗ por ejercicio.
  const logIdToKey = new Map<string, string>();
  for (const log of logs ?? []) {
    if (!log.session_date || !log.workout_plan_day_id) continue;
    logIdToKey.set(log.id, `${log.workout_plan_day_id}|${log.session_date}`);
  }
  const logIds = [...logIdToKey.keys()];
  const { data: logSets } = logIds.length
    ? await supabase
        .from('workout_log_sets')
        .select('workout_log_id, exercise_id, weight_kg, completed')
        .in('workout_log_id', logIds)
    : { data: [] };

  const setsByKey: Record<string, LoggedSessionSet[]> = {};
  for (const s of logSets ?? []) {
    const k = logIdToKey.get(s.workout_log_id);
    if (!k) continue;
    const arr = setsByKey[k] ?? [];
    arr.push({ exercise_id: s.exercise_id, weight_kg: s.weight_kg, completed: s.completed });
    setsByKey[k] = arr;
  }

  return {
    plan: {
      id: plan.id,
      title: plan.title,
      split_type: plan.split_type,
      starts_at: plan.starts_at,
      weeks: plan.weeks,
    },
    days: dayList.map((d) => ({
      id: d.id,
      day_number: d.day_number,
      title: d.title,
      focus: d.focus,
      weekday: d.weekday,
    })),
    exercisesByDay,
    statusByKey,
    setsByKey,
  };
}
