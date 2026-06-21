import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { detectMissedWorkouts, detectNoFoodLogs } from '@/domain/alerts/rules';
import type { DomainAlert } from '@/domain/alerts/types';
import { startOfWeekISO, todayISO } from '@/lib/utils/date';

export interface StudentSummary {
  studentId: string;
  name: string;
  email: string;
  goal: string | null;
  currentWeightKg: number | null;
  lastFoodLogAt: string | null;
  lastWorkoutAt: string | null;
  startedAt: string | null;
}

/** Most recent value per key from an ordered (desc) list. */
function lastByStudent(rows: { student_id: string; logged_at: string }[] | null): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows ?? []) {
    if (!map.has(r.student_id)) map.set(r.student_id, r.logged_at);
  }
  return map;
}

export async function getCoachStudents(coachId: string): Promise<StudentSummary[]> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from('coach_students')
    .select('student_id, started_at')
    .eq('coach_id', coachId)
    .eq('status', 'active');

  const ids = (links ?? []).map((l) => l.student_id);
  if (ids.length === 0) return [];

  const [{ data: profiles }, { data: sps }, { data: foodLogs }, { data: workoutLogs }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').in('id', ids),
    supabase.from('student_profiles').select('user_id, goal, current_weight_kg').in('user_id', ids),
    supabase.from('food_logs').select('student_id, logged_at').in('student_id', ids).order('logged_at', { ascending: false }),
    supabase.from('workout_logs').select('student_id, logged_at').in('student_id', ids).order('logged_at', { ascending: false }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const spMap = new Map((sps ?? []).map((s) => [s.user_id, s]));
  const lastFood = lastByStudent(foodLogs);
  const lastWorkout = lastByStudent(workoutLogs);
  const startedMap = new Map((links ?? []).map((l) => [l.student_id, l.started_at]));

  return ids.map((id) => {
    const p = profileMap.get(id);
    const sp = spMap.get(id);
    return {
      studentId: id,
      name: p?.full_name ?? 'Alumna',
      email: p?.email ?? '',
      goal: sp?.goal ?? null,
      currentWeightKg: sp?.current_weight_kg ?? null,
      lastFoodLogAt: lastFood.get(id) ?? null,
      lastWorkoutAt: lastWorkout.get(id) ?? null,
      startedAt: startedMap.get(id) ?? null,
    };
  });
}

export interface CoachDashboard {
  stats: {
    activeStudents: number;
    openAlerts: number;
    pendingReviews: number;
    workoutsThisWeek: number;
  };
  students: StudentSummary[];
  priorities: { student: StudentSummary; alerts: DomainAlert[] }[];
}

export async function getCoachDashboard(coachId: string): Promise<CoachDashboard> {
  const supabase = await createClient();
  const students = await getCoachStudents(coachId);
  const today = todayISO();

  const [openAlerts, pendingReviews, workoutsThisWeek] = await Promise.all([
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('coach_id', coachId).eq('status', 'open'),
    supabase
      .from('food_logs')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .eq('coach_review_status', 'pending'),
    supabase
      .from('workout_logs')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .eq('status', 'completed')
      .gte('logged_at', startOfWeekISO()),
  ]);

  const priorities = students
    .map((student) => {
      const alerts: DomainAlert[] = [];
      const noFood = detectNoFoodLogs({ lastFoodLogAt: student.lastFoodLogAt }, today, 3);
      if (noFood) alerts.push(noFood);
      const missed = detectMissedWorkouts({ lastWorkoutAt: student.lastWorkoutAt }, today, 7);
      if (missed) alerts.push(missed);
      return { student, alerts };
    })
    .filter((p) => p.alerts.length > 0);

  return {
    stats: {
      activeStudents: students.length,
      openAlerts: openAlerts.count ?? 0,
      pendingReviews: pendingReviews.count ?? 0,
      workoutsThisWeek: workoutsThisWeek.count ?? 0,
    },
    students,
    priorities,
  };
}
