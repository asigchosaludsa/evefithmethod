import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { daysAgoISO } from '@/lib/utils/date';
import type { MealType, ReviewStatus, WorkoutLogStatus } from '@/types/app';

export type CoachActivityKind = 'workout' | 'meal' | 'weight';

export interface CoachActivityItem {
  kind: CoachActivityKind;
  id: string;
  /** ISO timestamp used to sort the merged feed, newest first. */
  at: string;
  /** Owning student (for linking + labelling the feed). */
  studentId: string;
  studentName: string;
  workoutStatus?: WorkoutLogStatus;
  mealType?: MealType;
  reviewStatus?: ReviewStatus;
  weightKg?: number;
}

/** Active student ids for a coach (single batched lookup). */
async function activeStudentIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('coach_students')
    .select('student_id')
    .eq('coach_id', coachId)
    .eq('status', 'active');
  return (data ?? []).map((l) => l.student_id);
}

/**
 * Merged "actividad reciente" feed across *all* of a coach's active students:
 * the most recent workout sessions, meals and weight entries combined and
 * sorted newest-first, each tagged with the owning student.
 *
 * Batched: 1 lookup for the active links + 1 names query + 3 log queries, each
 * filtered by `student_id IN (...)`. No per-student fan-out.
 */
export async function getCoachRecentActivity(
  coachId: string,
  limit = 12,
): Promise<CoachActivityItem[]> {
  const supabase = await createClient();
  const ids = await activeStudentIds(supabase, coachId);
  if (ids.length === 0) return [];

  const [{ data: profiles }, { data: workouts }, { data: meals }, { data: weights }] =
    await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', ids),
      supabase
        .from('workout_logs')
        .select('id, student_id, logged_at, status')
        .in('student_id', ids)
        .order('logged_at', { ascending: false })
        .limit(limit),
      supabase
        .from('food_logs')
        .select('id, student_id, logged_at, meal_type, coach_review_status')
        .in('student_id', ids)
        .order('logged_at', { ascending: false })
        .limit(limit),
      supabase
        .from('weight_entries')
        .select('id, student_id, recorded_at, weight_kg')
        .in('student_id', ids)
        .order('recorded_at', { ascending: false })
        .limit(limit),
    ]);

  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? 'Alumna']));
  const items: CoachActivityItem[] = [];

  for (const w of workouts ?? []) {
    items.push({
      kind: 'workout',
      id: w.id,
      at: w.logged_at,
      studentId: w.student_id,
      studentName: nameOf.get(w.student_id) ?? 'Alumna',
      workoutStatus: w.status,
    });
  }
  for (const m of meals ?? []) {
    items.push({
      kind: 'meal',
      id: m.id,
      at: m.logged_at,
      studentId: m.student_id,
      studentName: nameOf.get(m.student_id) ?? 'Alumna',
      mealType: m.meal_type,
      reviewStatus: m.coach_review_status,
    });
  }
  for (const e of weights ?? []) {
    items.push({
      kind: 'weight',
      id: e.id,
      at: e.recorded_at,
      studentId: e.student_id,
      studentName: nameOf.get(e.student_id) ?? 'Alumna',
      weightKg: e.weight_kg,
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export interface ActivityDayBucket {
  /** YYYY-MM-DD */
  dateISO: string;
  workouts: number;
  meals: number;
}

/**
 * Per-day counts of registros (entrenos + comidas) across the coach's active
 * students over the last `days` days (inclusive of today). Powers the dashboard
 * mini-chart. Batched: 1 links lookup + 2 count-by-date queries (IN filter).
 */
export async function getCoachActivityByDay(
  coachId: string,
  days = 14,
): Promise<ActivityDayBucket[]> {
  const supabase = await createClient();

  // Build the ordered date window first so empty days still render.
  const window: string[] = [];
  for (let i = days - 1; i >= 0; i--) window.push(daysAgoISO(i));
  const startISO = window[0]!;

  const ids = await activeStudentIds(supabase, coachId);
  const empty = (): ActivityDayBucket[] =>
    window.map((dateISO) => ({ dateISO, workouts: 0, meals: 0 }));
  if (ids.length === 0) return empty();

  const [{ data: workouts }, { data: meals }] = await Promise.all([
    supabase
      .from('workout_logs')
      .select('logged_at')
      .in('student_id', ids)
      .gte('logged_at', `${startISO}T00:00:00`),
    supabase
      .from('food_logs')
      .select('logged_at')
      .in('student_id', ids)
      .gte('logged_at', `${startISO}T00:00:00`),
  ]);

  const buckets = new Map<string, ActivityDayBucket>(
    window.map((dateISO) => [dateISO, { dateISO, workouts: 0, meals: 0 }]),
  );
  for (const w of workouts ?? []) {
    const b = buckets.get(w.logged_at.slice(0, 10));
    if (b) b.workouts += 1;
  }
  for (const m of meals ?? []) {
    const b = buckets.get(m.logged_at.slice(0, 10));
    if (b) b.meals += 1;
  }
  return window.map((dateISO) => buckets.get(dateISO)!);
}
