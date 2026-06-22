import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { calculateMealTotals } from '@/domain/nutrition/calculations';
import type { Macros } from '@/types/app';

export interface MealLogSummary {
  id: string;
  meal_type: string;
  logged_at: string;
  review_status: string;
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

export interface StudentNutritionDay {
  target: {
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  };
  consumed: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  meals: MealLogSummary[];
}

const EMPTY_TOTALS: Macros = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/** Consumed macros vs. the active plan target for one student on one day. */
export async function getStudentNutritionDay(
  studentId: string,
  dateISO: string,
): Promise<StudentNutritionDay> {
  const supabase = await createClient();

  // Active nutrition plan → macro targets (latest active wins).
  const { data: plan } = await supabase
    .from('nutrition_plans')
    .select('calories_target, protein_target_g, carbs_target_g, fat_target_g')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const target = {
    calories: plan?.calories_target ?? null,
    protein_g: plan?.protein_target_g ?? null,
    carbs_g: plan?.carbs_target_g ?? null,
    fat_g: plan?.fat_target_g ?? null,
  };

  // Food logs for the day (newest first).
  const { data: logs } = await supabase
    .from('food_logs')
    .select('id, meal_type, logged_at, coach_review_status')
    .eq('student_id', studentId)
    .gte('logged_at', `${dateISO}T00:00:00`)
    .lte('logged_at', `${dateISO}T23:59:59`)
    .order('logged_at', { ascending: false });

  const logRows = logs ?? [];
  if (logRows.length === 0) {
    return { target, consumed: { ...EMPTY_TOTALS }, meals: [] };
  }

  const logIds = logRows.map((l) => l.id);

  // Items for every log of the day.
  const { data: items } = await supabase
    .from('food_log_items')
    .select('food_log_id, calories, protein_g, carbs_g, fat_g')
    .in('food_log_id', logIds);

  // Group item macros by their parent log.
  const byLog = new Map<string, Macros[]>();
  for (const item of items ?? []) {
    const bucket = byLog.get(item.food_log_id);
    const macro: Macros = {
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
    };
    if (bucket) bucket.push(macro);
    else byLog.set(item.food_log_id, [macro]);
  }

  const meals: MealLogSummary[] = logRows.map((log) => ({
    id: log.id,
    meal_type: log.meal_type,
    logged_at: log.logged_at,
    review_status: log.coach_review_status,
    totals: calculateMealTotals(byLog.get(log.id) ?? []),
  }));

  // Day total = every item logged that day.
  const allItems: Macros[] = (items ?? []).map((item) => ({
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
  }));
  const consumed = calculateMealTotals(allItems);

  return { target, consumed, meals };
}
