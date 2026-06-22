import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { WorkoutPlan } from '@/types/database';

export interface PlanExerciseRow {
  id: string;
  workout_plan_day_id: string;
  exercise_id: string | null;
  exercise_name: string;
  muscle_group: string | null;
  sort_order: number;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  tempo: string | null;
  suggested_weight_kg: number | null;
  notes: string | null;
}

export interface PlanDay {
  id: string;
  day_number: number;
  title: string;
  focus: string | null;
  exercises: PlanExerciseRow[];
}

export interface WorkoutPlanContent {
  plan: WorkoutPlan;
  days: PlanDay[];
}

/** Full plan content: days with their ordered exercises (incl. exercise names). */
export async function getWorkoutPlanContent(planId: string): Promise<WorkoutPlanContent | null> {
  const supabase = await createClient();
  const { data: plan } = await supabase.from('workout_plans').select('*').eq('id', planId).maybeSingle();
  if (!plan) return null;

  const { data: days } = await supabase
    .from('workout_plan_days')
    .select('*')
    .eq('workout_plan_id', planId)
    .order('day_number');

  const dayIds = (days ?? []).map((d) => d.id);
  const { data: planExercises } = dayIds.length
    ? await supabase
        .from('workout_plan_exercises')
        .select('*')
        .in('workout_plan_day_id', dayIds)
        .order('sort_order')
    : { data: [] };

  const exerciseIds = [...new Set((planExercises ?? []).map((e) => e.exercise_id).filter(Boolean))] as string[];
  const { data: exercises } = exerciseIds.length
    ? await supabase.from('exercises').select('id, name, muscle_group').in('id', exerciseIds)
    : { data: [] };
  const exMap = new Map((exercises ?? []).map((e) => [e.id, e]));

  const byDay = new Map<string, PlanExerciseRow[]>();
  for (const pe of planExercises ?? []) {
    const arr = byDay.get(pe.workout_plan_day_id) ?? [];
    const ex = pe.exercise_id ? exMap.get(pe.exercise_id) : undefined;
    arr.push({
      id: pe.id,
      workout_plan_day_id: pe.workout_plan_day_id,
      exercise_id: pe.exercise_id,
      exercise_name: ex?.name ?? 'Ejercicio',
      muscle_group: ex?.muscle_group ?? null,
      sort_order: pe.sort_order,
      sets: pe.sets,
      reps: pe.reps,
      rest_seconds: pe.rest_seconds,
      tempo: pe.tempo,
      suggested_weight_kg: pe.suggested_weight_kg,
      notes: pe.notes,
    });
    byDay.set(pe.workout_plan_day_id, arr);
  }

  return {
    plan,
    days: (days ?? []).map((d) => ({
      id: d.id,
      day_number: d.day_number,
      title: d.title,
      focus: d.focus,
      exercises: byDay.get(d.id) ?? [],
    })),
  };
}

/** Active plan content for a student (used in the student workout view). */
export async function getActiveWorkoutPlanContent(studentId: string): Promise<WorkoutPlanContent | null> {
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from('workout_plans')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;
  return getWorkoutPlanContent(plan.id);
}
