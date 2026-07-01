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

export interface MealItemView {
  name: string;
  unit: string | null;
  quantity: number | null;
  grams: number;
  macros: Macros;
}

export interface MealDetail {
  id: string;
  meal_type: string;
  logged_at: string;
  notes: string | null;
  review_status: string;
  photoUrl: string | null;
  items: MealItemView[];
  totals: Macros;
}

export interface StudentMealsDay {
  target: {
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  };
  consumed: Macros;
  meals: MealDetail[];
}

/** Comidas detalladas (items + foto firmada) de un alumno en un día concreto. */
export async function getStudentMealsForDay(
  studentId: string,
  dateISO: string,
): Promise<StudentMealsDay> {
  const supabase = await createClient();

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

  const { data: logs } = await supabase
    .from('food_logs')
    .select('id, meal_type, logged_at, notes, photo_path, coach_review_status')
    .eq('student_id', studentId)
    .gte('logged_at', `${dateISO}T00:00:00`)
    .lte('logged_at', `${dateISO}T23:59:59`)
    .order('logged_at', { ascending: false });

  const logRows = logs ?? [];
  if (logRows.length === 0) {
    return { target, consumed: { ...EMPTY_TOTALS }, meals: [] };
  }

  const logIds = logRows.map((l) => l.id);

  const { data: items } = await supabase
    .from('food_log_items')
    .select('food_log_id, food_item_id, unit, quantity, grams, calories, protein_g, carbs_g, fat_g')
    .in('food_log_id', logIds);

  // Nombres de los alimentos referenciados.
  const foodIds = [...new Set((items ?? []).map((i) => i.food_item_id).filter((x): x is string => !!x))];
  const nameById = new Map<string, string>();
  if (foodIds.length > 0) {
    const { data: foods } = await supabase.from('food_items').select('id, name').in('id', foodIds);
    for (const f of foods ?? []) nameById.set(f.id, f.name);
  }

  // URLs firmadas para las fotos (bucket privado).
  const photoPaths = logRows.map((l) => l.photo_path).filter((p): p is string => !!p);
  const urlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage.from('food-photos').createSignedUrls(photoPaths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  const itemsByLog = new Map<string, MealItemView[]>();
  for (const it of items ?? []) {
    const macros: Macros = {
      calories: it.calories,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
    };
    const view: MealItemView = {
      name: it.food_item_id ? (nameById.get(it.food_item_id) ?? 'Alimento') : 'Alimento',
      unit: it.unit,
      quantity: it.quantity,
      grams: it.grams,
      macros,
    };
    const bucket = itemsByLog.get(it.food_log_id);
    if (bucket) bucket.push(view);
    else itemsByLog.set(it.food_log_id, [view]);
  }

  const meals: MealDetail[] = logRows.map((log) => {
    const lineItems = itemsByLog.get(log.id) ?? [];
    return {
      id: log.id,
      meal_type: log.meal_type,
      logged_at: log.logged_at,
      notes: log.notes,
      review_status: log.coach_review_status,
      photoUrl: log.photo_path ? (urlByPath.get(log.photo_path) ?? null) : null,
      items: lineItems,
      totals: calculateMealTotals(lineItems.map((i) => i.macros)),
    };
  });

  const consumed = calculateMealTotals(meals.flatMap((m) => m.items.map((i) => i.macros)));
  return { target, consumed, meals };
}

export interface FoodLogForEdit {
  id: string;
  meal_type: string;
  logged_at: string;
  notes: string | null;
  lines: {
    foodItemId: string;
    name: string;
    unit: 'g' | 'ml' | 'unit';
    quantity: number;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    grams_per_unit: number | null;
    unit_label: string | null;
  }[];
}

/** Un food_log con sus items y datos del alimento, para precargar el formulario de edición. */
export async function getStudentFoodLogForEdit(
  studentId: string,
  logId: string,
): Promise<FoodLogForEdit | null> {
  const supabase = await createClient();

  const { data: log } = await supabase
    .from('food_logs')
    .select('id, meal_type, logged_at, notes')
    .eq('id', logId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (!log) return null;

  const { data: items } = await supabase
    .from('food_log_items')
    .select('food_item_id, unit, quantity, grams')
    .eq('food_log_id', logId);

  const foodIds = [...new Set((items ?? []).map((i) => i.food_item_id).filter((x): x is string => !!x))];
  const foodById = new Map<
    string,
    {
      name: string;
      calories_per_100g: number;
      protein_per_100g: number;
      carbs_per_100g: number;
      fat_per_100g: number;
      grams_per_unit: number | null;
      unit_label: string | null;
    }
  >();
  if (foodIds.length > 0) {
    const { data: foods } = await supabase
      .from('food_items')
      .select('id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, grams_per_unit, unit_label')
      .in('id', foodIds);
    for (const f of foods ?? []) foodById.set(f.id, f);
  }

  const lines: FoodLogForEdit['lines'] = [];
  for (const it of items ?? []) {
    if (!it.food_item_id) continue;
    const f = foodById.get(it.food_item_id);
    if (!f) continue;
    const unit: 'g' | 'ml' | 'unit' =
      it.unit === 'ml' || it.unit === 'unit' ? it.unit : 'g';
    // Si por datos antiguos no hay quantity, derivamos desde grams (1:1 para g/ml).
    const quantity =
      it.quantity != null ? Number(it.quantity) : unit === 'unit' && f.grams_per_unit ? it.grams / f.grams_per_unit : it.grams;
    lines.push({
      foodItemId: it.food_item_id,
      name: f.name,
      unit,
      quantity,
      calories_per_100g: f.calories_per_100g,
      protein_per_100g: f.protein_per_100g,
      carbs_per_100g: f.carbs_per_100g,
      fat_per_100g: f.fat_per_100g,
      grams_per_unit: f.grams_per_unit,
      unit_label: f.unit_label,
    });
  }

  return { id: log.id, meal_type: log.meal_type, logged_at: log.logged_at, notes: log.notes, lines };
}

export interface NutritionDayTotals {
  consumed: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  hasLogs: boolean;
}

export interface StudentNutritionRange {
  target: {
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  };
  /** dateISO (YYYY-MM-DD) -> totales consumidos ese día. */
  byDate: Record<string, NutritionDayTotals>;
}

/** Totales consumidos por día en un rango [startISO, endISO] + meta del plan activo. */
export async function getStudentNutritionRange(
  studentId: string,
  startISO: string,
  endISO: string,
): Promise<StudentNutritionRange> {
  const supabase = await createClient();

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

  const { data: logs } = await supabase
    .from('food_logs')
    .select('id, logged_at')
    .eq('student_id', studentId)
    .gte('logged_at', `${startISO}T00:00:00`)
    .lte('logged_at', `${endISO}T23:59:59`);

  const logDate = new Map<string, string>();
  for (const l of logs ?? []) logDate.set(l.id, l.logged_at.slice(0, 10));
  const logIds = [...logDate.keys()];

  const byDate: Record<string, NutritionDayTotals> = {};
  if (logIds.length === 0) return { target, byDate };

  const { data: items } = await supabase
    .from('food_log_items')
    .select('food_log_id, calories, protein_g, carbs_g, fat_g')
    .in('food_log_id', logIds);

  for (const it of items ?? []) {
    const dateISO = logDate.get(it.food_log_id);
    if (!dateISO) continue;
    const cur = byDate[dateISO] ?? {
      consumed: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      hasLogs: true,
    };
    cur.consumed.calories += it.calories;
    cur.consumed.protein_g += it.protein_g;
    cur.consumed.carbs_g += it.carbs_g;
    cur.consumed.fat_g += it.fat_g;
    byDate[dateISO] = cur;
  }
  // Días con log pero sin items (raro) igualmente cuentan como con registro.
  for (const dateISO of logDate.values()) {
    if (!byDate[dateISO]) {
      byDate[dateISO] = { consumed: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }, hasLogs: true };
    }
  }
  // Redondeo a 1 decimal.
  for (const k of Object.keys(byDate)) {
    const c = byDate[k]!.consumed;
    c.calories = Math.round(c.calories * 10) / 10;
    c.protein_g = Math.round(c.protein_g * 10) / 10;
    c.carbs_g = Math.round(c.carbs_g * 10) / 10;
    c.fat_g = Math.round(c.fat_g * 10) / 10;
  }
  return { target, byDate };
}
