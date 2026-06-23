import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { MealType, ReviewStatus, WorkoutLogStatus } from '@/types/app';

export type RecentActivityKind = 'workout' | 'meal' | 'weight';

export interface RecentActivityItem {
  kind: RecentActivityKind;
  id: string;
  /** ISO timestamp (or date) used to sort the merged feed, newest first. */
  at: string;
  /** Workout session status. */
  workoutStatus?: WorkoutLogStatus;
  /** Meal type + coach review status. */
  mealType?: MealType;
  reviewStatus?: ReviewStatus;
  /** Logged weight, in kg. */
  weightKg?: number;
}

/**
 * Merged "última actividad" feed for one student: most recent workout sessions,
 * meals and weight entries combined and sorted newest-first.
 *
 * Read-only; ownership is enforced by the caller (assertCoachOwnsStudent) and RLS.
 */
export async function getStudentRecentActivity(
  studentId: string,
  limit = 8,
): Promise<RecentActivityItem[]> {
  const supabase = await createClient();

  const [{ data: workouts }, { data: meals }, { data: weights }] = await Promise.all([
    supabase
      .from('workout_logs')
      .select('id, logged_at, status')
      .eq('student_id', studentId)
      .order('logged_at', { ascending: false })
      .limit(limit),
    supabase
      .from('food_logs')
      .select('id, logged_at, meal_type, coach_review_status')
      .eq('student_id', studentId)
      .order('logged_at', { ascending: false })
      .limit(limit),
    supabase
      .from('weight_entries')
      .select('id, recorded_at, weight_kg')
      .eq('student_id', studentId)
      .order('recorded_at', { ascending: false })
      .limit(limit),
  ]);

  const items: RecentActivityItem[] = [];

  for (const w of workouts ?? []) {
    items.push({ kind: 'workout', id: w.id, at: w.logged_at, workoutStatus: w.status });
  }
  for (const m of meals ?? []) {
    items.push({
      kind: 'meal',
      id: m.id,
      at: m.logged_at,
      mealType: m.meal_type,
      reviewStatus: m.coach_review_status,
    });
  }
  for (const e of weights ?? []) {
    items.push({ kind: 'weight', id: e.id, at: e.recorded_at, weightKg: e.weight_kg });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
