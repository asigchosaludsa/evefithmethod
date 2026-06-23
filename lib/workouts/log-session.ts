// lib/workouts/log-session.ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SessionSetInput {
  exerciseId: string | null;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  completed: boolean;
}

export interface UpsertSessionArgs {
  studentId: string;
  coachId: string | null;
  planId: string | null;
  planDayId: string | null;
  sessionDateISO: string; // YYYY-MM-DD
  status: 'completed' | 'skipped';
  perceivedEffort?: number | null;
  notes?: string | null;
  sets: SessionSetInput[];
}

/**
 * Única vía de escritura de una sesión de entrenamiento. Garantiza una sola fila
 * en workout_logs por (student_id, workout_plan_day_id, session_date) y reemplaza
 * sus sets. El llamador DEBE haber autorizado antes (alumna dueña o coach dueña).
 * Funciona igual con el cliente RLS (alumna) o el admin (coach).
 */
export async function upsertWorkoutSession(
  db: SupabaseClient,
  args: UpsertSessionArgs,
): Promise<{ error?: string }> {
  let logId: string | null = null;

  // Solo deduplicamos cuando hay día de plan (las sesiones ad-hoc sin día no se
  // colapsan; el índice único parcial no aplica a planDayId nulo de todos modos).
  if (args.planDayId) {
    const { data: existing } = await db
      .from('workout_logs')
      .select('id')
      .eq('student_id', args.studentId)
      .eq('workout_plan_day_id', args.planDayId)
      .eq('session_date', args.sessionDateISO)
      .maybeSingle();
    if (existing) logId = existing.id;
  }

  if (logId) {
    const { error } = await db
      .from('workout_logs')
      .update({
        status: args.status,
        logged_at: new Date().toISOString(),
        perceived_effort: args.perceivedEffort ?? null,
        notes: args.notes ?? null,
        coach_id: args.coachId,
        workout_plan_id: args.planId,
      })
      .eq('id', logId);
    if (error) return { error: error.message };
    await db.from('workout_log_sets').delete().eq('workout_log_id', logId);
  } else {
    const { data: created, error } = await db
      .from('workout_logs')
      .insert({
        student_id: args.studentId,
        coach_id: args.coachId,
        workout_plan_id: args.planId,
        workout_plan_day_id: args.planDayId,
        session_date: args.sessionDateISO,
        logged_at: new Date().toISOString(),
        status: args.status,
        perceived_effort: args.perceivedEffort ?? null,
        notes: args.notes ?? null,
      })
      .select('id')
      .single();
    if (error || !created) return { error: error?.message ?? 'No se pudo guardar la sesión.' };
    logId = created.id;
  }

  const rows = args.sets.map((s) => ({
    workout_log_id: logId,
    exercise_id: s.exerciseId,
    set_number: s.setNumber,
    reps_completed: s.reps,
    weight_kg: s.weight,
    completed: s.completed,
  }));
  if (rows.length > 0) {
    const { error } = await db.from('workout_log_sets').insert(rows);
    if (error) return { error: error.message };
  }
  return {};
}
