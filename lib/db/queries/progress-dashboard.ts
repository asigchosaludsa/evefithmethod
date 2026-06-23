// lib/db/queries/progress-dashboard.ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getTrainingCalendarData } from '@/lib/db/queries/training-calendar';
import { getExerciseProgression } from '@/lib/db/queries/exercise-progression';
import { getStudentNutritionRange } from '@/lib/db/queries/student-nutrition';
import { buildCalendar, addDaysISO } from '@/domain/workouts/calendar';
import { currentStreak, type ScheduledSession } from '@/domain/workouts/streak';
import { dayAdherence } from '@/domain/nutrition/adherence';

export interface WeightPoint { dateISO: string; kg: number; }
export interface MeasurementRow {
  recorded_at: string;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  thigh_cm: number | null;
  arm_cm: number | null;
}
export interface TopProgression { name: string; deltaKg: number; }
export interface NutritionPoint { dateISO: string; calories: number; }

export interface ProgressDashboard {
  weight: { series: WeightPoint[]; currentKg: number | null; firstKg: number | null; goalKg: number | null };
  measurements: { first: MeasurementRow | null; last: MeasurementRow | null };
  training: { sessionsLast30: number; streak: number; topProgressions: TopProgression[] };
  nutrition: { pctDaysOk: number; daysLogged: number; points: NutritionPoint[]; targetCalories: number | null };
}

export async function getStudentProgressDashboard(
  studentId: string,
  todayISO: string,
): Promise<ProgressDashboard> {
  const supabase = await createClient();

  const [{ data: weights }, { data: measures }, { data: sp }] = await Promise.all([
    supabase.from('weight_entries').select('weight_kg, recorded_at').eq('student_id', studentId).order('recorded_at', { ascending: true }),
    supabase.from('body_measurements').select('recorded_at, waist_cm, hip_cm, chest_cm, thigh_cm, arm_cm').eq('student_id', studentId).order('recorded_at', { ascending: true }),
    supabase.from('student_profiles').select('goal_weight_kg').eq('user_id', studentId).maybeSingle(),
  ]);

  const series: WeightPoint[] = (weights ?? []).map((w) => ({ dateISO: w.recorded_at, kg: w.weight_kg }));
  const firstKg = series[0]?.kg ?? null;
  const currentKg = series[series.length - 1]?.kg ?? null;
  const measureRows = (measures ?? []) as MeasurementRow[];

  // Entrenamiento (reusa A).
  const cal = await getTrainingCalendarData(studentId);
  let streak = 0;
  let sessionsLast30 = 0;
  let topProgressions: TopProgression[] = [];
  if (cal.plan) {
    const scheduled: ScheduledSession[] = buildCalendar(
      cal.days, cal.plan.starts_at, cal.plan.weeks, cal.plan.starts_at ?? todayISO, todayISO,
    ).filter((d) => d.planDay).map((d) => ({ dateISO: d.dateISO, planDayId: d.planDay!.id }));
    streak = currentStreak(scheduled, cal.statusByKey, todayISO);

    const since = addDaysISO(todayISO, -30);
    for (const [key, status] of Object.entries(cal.statusByKey)) {
      const dateISO = key.split('|')[1];
      if (status === 'completed' && dateISO && dateISO >= since) sessionsLast30 += 1;
    }

    const exMeta = new Map<string, string>();
    for (const list of Object.values(cal.exercisesByDay)) {
      for (const e of list) if (e.exercise_id) exMeta.set(e.exercise_id, e.name);
    }
    const exIds = [...exMeta.keys()];
    const prog = await getExerciseProgression(studentId, exIds);
    topProgressions = exIds
      .map((id) => {
        const s = prog.seriesByExercise[id] ?? [];
        const first = s[0]?.maxKg ?? 0;
        const last = s[s.length - 1]?.maxKg ?? 0;
        return { name: exMeta.get(id) ?? 'Ejercicio', deltaKg: Math.round((last - first) * 10) / 10 };
      })
      .filter((p) => p.deltaKg > 0)
      .sort((a, b) => b.deltaKg - a.deltaKg)
      .slice(0, 3);
  }

  // Nutrición (reusa B).
  const startISO = addDaysISO(todayISO, -13);
  const range = await getStudentNutritionRange(studentId, startISO, todayISO);
  const points: NutritionPoint[] = [];
  let daysLogged = 0;
  let daysOk = 0;
  let cur = startISO;
  while (cur <= todayISO) {
    const t = range.byDate[cur];
    points.push({ dateISO: cur, calories: t?.consumed.calories ?? 0 });
    if (t?.hasLogs) {
      daysLogged += 1;
      if (dayAdherence(t.consumed.calories, range.target.calories, true) === 'cumplido') daysOk += 1;
    }
    cur = addDaysISO(cur, 1);
  }
  const pctDaysOk = daysLogged > 0 ? Math.round((daysOk / daysLogged) * 100) : 0;

  return {
    weight: { series, currentKg, firstKg, goalKg: sp?.goal_weight_kg ?? null },
    measurements: { first: measureRows[0] ?? null, last: measureRows[measureRows.length - 1] ?? null },
    training: { sessionsLast30, streak, topProgressions },
    nutrition: { pctDaysOk, daysLogged, points, targetCalories: range.target.calories },
  };
}
