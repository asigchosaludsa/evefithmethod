'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

type SessionStatus = 'completed' | 'skipped' | 'clear';

/**
 * Mark a scheduled training day as completed / skipped (or clear it) for a given
 * calendar date. One canonical workout_logs row per (student, plan day,
 * session_date). Authorized for the student (own) or the coach (owns student);
 * the DB write uses the admin client AFTER that authorization.
 */
export async function toggleSessionStatus(input: {
  studentId: string;
  planId: string;
  planDayId: string;
  dateISO: string;
  status: SessionStatus;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: 'No autorizado.' };

  const isCoach = profile.role === 'coach' || profile.role === 'admin';
  if (isCoach) {
    await assertCoachOwnsStudent(profile.id, input.studentId);
  } else if (profile.id !== input.studentId) {
    return { ok: false, error: 'No autorizado.' };
  }

  const admin = createAdminClient();

  // The plan must belong to this student (and gives us the coach_id).
  const { data: plan } = await admin
    .from('workout_plans')
    .select('id, coach_id, student_id')
    .eq('id', input.planId)
    .maybeSingle();
  if (!plan || plan.student_id !== input.studentId) {
    return { ok: false, error: 'Plan no encontrado.' };
  }

  const { data: existing } = await admin
    .from('workout_logs')
    .select('id')
    .eq('student_id', input.studentId)
    .eq('workout_plan_day_id', input.planDayId)
    .eq('session_date', input.dateISO)
    .maybeSingle();

  if (input.status === 'clear') {
    if (existing) await admin.from('workout_logs').delete().eq('id', existing.id);
  } else if (existing) {
    const { error } = await admin
      .from('workout_logs')
      .update({ status: input.status, logged_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.from('workout_logs').insert({
      student_id: input.studentId,
      coach_id: plan.coach_id,
      workout_plan_id: input.planId,
      workout_plan_day_id: input.planDayId,
      session_date: input.dateISO,
      logged_at: new Date().toISOString(),
      status: input.status,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/student/workout');
  revalidatePath('/student/today');
  revalidatePath(`/coach/students/${input.studentId}/calendar`);
  return { ok: true };
}
