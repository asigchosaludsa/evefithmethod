import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { detectMissedWorkouts, detectNoFoodLogs } from '@/domain/alerts/rules';
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

/** A normalized "why review" reason chip for the dashboard. */
export interface AttentionReason {
  /** Stable key for React + dedupe. */
  key: string;
  tone: 'info' | 'warning' | 'danger' | 'success';
  label: string;
}

export interface AttentionItem {
  studentId: string;
  name: string;
  goal: string | null;
  reasons: AttentionReason[];
  /** Higher = more urgent; used to order the list. */
  score: number;
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
    sessionsThisWeek: number;
    pendingReviews: number;
    pendingRequests: number;
    openAlerts: number;
  };
  students: StudentSummary[];
  /** Alumnas que necesitan revisión, ya ordenadas por urgencia (desc). */
  attention: AttentionItem[];
}

/**
 * Everything the coach cockpit needs in one pass. All cross-student lookups are
 * batched (`student_id IN (...)`), never per-student loops:
 *   - active students (1 links + 4 batched in getCoachStudents)
 *   - pending review counts grouped by student (1 query)
 *   - today's food-log presence by student (1 query)
 *   - 4 head/count aggregates (alerts, reviews, sessions this week, leads)
 */
export async function getCoachDashboard(coachId: string): Promise<CoachDashboard> {
  const supabase = await createClient();
  const students = await getCoachStudents(coachId);
  const today = todayISO();
  const ids = students.map((s) => s.studentId);

  const [openAlerts, pendingReviews, sessionsThisWeek, pendingRequests, reviewRows, todayFoodRows] =
    await Promise.all([
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
      // "Solicitudes pendientes" = leads aún sin resolver (ni convertidas ni rechazadas).
      supabase.from('leads').select('id', { count: 'exact', head: true }).in('status', ['new', 'contacted']),
      // Pending reviews per student (one batched query; tallied in memory).
      ids.length
        ? supabase
            .from('food_logs')
            .select('student_id')
            .eq('coach_id', coachId)
            .eq('coach_review_status', 'pending')
            .in('student_id', ids)
        : Promise.resolve({ data: [] as { student_id: string }[] }),
      // Which students logged food *today* (so we can flag "sin comida hoy").
      ids.length
        ? supabase
            .from('food_logs')
            .select('student_id')
            .in('student_id', ids)
            .gte('logged_at', `${today}T00:00:00`)
            .lte('logged_at', `${today}T23:59:59`)
        : Promise.resolve({ data: [] as { student_id: string }[] }),
    ]);

  const pendingByStudent = new Map<string, number>();
  for (const r of reviewRows.data ?? []) {
    pendingByStudent.set(r.student_id, (pendingByStudent.get(r.student_id) ?? 0) + 1);
  }
  const loggedFoodToday = new Set((todayFoodRows.data ?? []).map((r) => r.student_id));

  const attention = students
    .map<AttentionItem>((student) => {
      const reasons: AttentionReason[] = [];
      let score = 0;

      const pending = pendingByStudent.get(student.studentId) ?? 0;
      if (pending > 0) {
        reasons.push({
          key: 'reviews',
          tone: 'info',
          label: pending === 1 ? '1 comida por revisar' : `${pending} comidas por revisar`,
        });
        score += 5 + pending;
      }

      // Reusa las reglas de dominio (mismas que las alertas del sistema).
      const noFood = detectNoFoodLogs({ lastFoodLogAt: student.lastFoodLogAt }, today, 3);
      if (noFood) {
        reasons.push({ key: noFood.type, tone: 'warning', label: 'Sin comida 3+ días' });
        score += 4;
      } else if (!loggedFoodToday.has(student.studentId)) {
        reasons.push({ key: 'no_food_today', tone: 'warning', label: 'Sin comida hoy' });
        score += 2;
      }

      const missed = detectMissedWorkouts({ lastWorkoutAt: student.lastWorkoutAt }, today, 7);
      if (missed) {
        reasons.push({ key: missed.type, tone: 'warning', label: 'Entreno atrasado' });
        score += 3;
      }

      return { studentId: student.studentId, name: student.name, goal: student.goal, reasons, score };
    })
    .filter((a) => a.reasons.length > 0)
    .sort((a, b) => b.score - a.score);

  return {
    stats: {
      activeStudents: students.length,
      sessionsThisWeek: sessionsThisWeek.count ?? 0,
      pendingReviews: pendingReviews.count ?? 0,
      pendingRequests: pendingRequests.count ?? 0,
      openAlerts: openAlerts.count ?? 0,
    },
    students,
    attention,
  };
}
