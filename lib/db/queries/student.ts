import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { calculateMealTotals } from '@/domain/nutrition/calculations';
import type { Macros } from '@/types/app';
import type { NutritionPlan, WorkoutPlan } from '@/types/database';
import { todayISO } from '@/lib/utils/date';

/** The student's current active coach id (or null). */
export async function getStudentCoachId(studentId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('coach_students')
    .select('coach_id')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.coach_id ?? null;
}

/** Sum of macros consumed by the student on a given ISO date (default today). */
export async function getConsumedMacros(studentId: string, date = todayISO()): Promise<Macros> {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from('food_logs')
    .select('id')
    .eq('student_id', studentId)
    .gte('logged_at', `${date}T00:00:00`)
    .lte('logged_at', `${date}T23:59:59`);

  const ids = (logs ?? []).map((l) => l.id);
  if (ids.length === 0) return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

  const { data: items } = await supabase
    .from('food_log_items')
    .select('calories, protein_g, carbs_g, fat_g')
    .in('food_log_id', ids);

  return calculateMealTotals(
    (items ?? []).map((i) => ({
      calories: i.calories,
      protein_g: i.protein_g,
      carbs_g: i.carbs_g,
      fat_g: i.fat_g,
    })),
  );
}

export interface CoachNoteForStudent {
  id: string;
  note: string;
  created_at: string;
}

export interface StudentToday {
  activeNutritionPlan: NutritionPlan | null;
  activeWorkoutPlan: WorkoutPlan | null;
  consumed: Macros;
  lastWeightKg: number | null;
  assignedTip: { id: string; postId: string; title: string; summary: string | null } | null;
  coachNotes: CoachNoteForStudent[];
  loggedFoodToday: boolean;
}

export async function getStudentToday(studentId: string): Promise<StudentToday> {
  const supabase = await createClient();

  const [
    { data: nutritionPlan },
    { data: workoutPlan },
    consumed,
    { data: weight },
    { data: assignments },
    { data: notes },
    { data: todayLogs },
  ] = await Promise.all([
      supabase
        .from('nutrition_plans')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('workout_plans')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      getConsumedMacros(studentId),
      supabase
        .from('weight_entries')
        .select('weight_kg')
        .eq('student_id', studentId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('content_assignments')
        .select('id, content_post_id, read_at')
        .eq('student_id', studentId)
        .order('assigned_at', { ascending: false })
        .limit(5),
      // Notas del coach marcadas como visibles para la alumna (is_private=false).
      supabase
        .from('coach_notes')
        .select('id, note, created_at')
        .eq('student_id', studentId)
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(5),
      // ¿Registró alguna comida hoy? (para el aviso "sin comida hoy").
      supabase
        .from('food_logs')
        .select('id')
        .eq('student_id', studentId)
        .gte('logged_at', `${todayISO()}T00:00:00`)
        .lte('logged_at', `${todayISO()}T23:59:59`)
        .limit(1),
    ]);

  // Resolve the first assigned tip whose post is published.
  let assignedTip: StudentToday['assignedTip'] = null;
  const postIds = (assignments ?? []).map((a) => a.content_post_id);
  if (postIds.length > 0) {
    const { data: posts } = await supabase
      .from('content_posts')
      .select('id, title, summary, status')
      .in('id', postIds)
      .eq('status', 'published');
    const postMap = new Map((posts ?? []).map((p) => [p.id, p]));
    for (const a of assignments ?? []) {
      const post = postMap.get(a.content_post_id);
      if (post) {
        assignedTip = { id: a.id, postId: post.id, title: post.title, summary: post.summary };
        break;
      }
    }
  }

  return {
    activeNutritionPlan: nutritionPlan ?? null,
    activeWorkoutPlan: workoutPlan ?? null,
    consumed,
    lastWeightKg: weight?.weight_kg ?? null,
    assignedTip,
    coachNotes: (notes ?? []).map((n) => ({ id: n.id, note: n.note, created_at: n.created_at })),
    loggedFoodToday: (todayLogs ?? []).length > 0,
  };
}
