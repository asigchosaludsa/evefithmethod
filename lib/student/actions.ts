'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/roles';
import { getStudentCoachId } from '@/lib/db/queries/student';
import { calculateFoodMacros } from '@/domain/nutrition/calculations';
import { foodLogSchema } from '@/domain/nutrition/schemas';
import { toGrams } from '@/domain/nutrition/units';
import { workoutLogSchema } from '@/domain/workouts/schemas';
import { weightEntrySchema, bodyMeasurementSchema } from '@/domain/progress/schemas';
import { upsertWorkoutSession } from '@/lib/workouts/log-session';
import { todayISO } from '@/lib/utils/date';
import type { ActionState } from '@/lib/auth/action-state';
import type { MealType } from '@/types/app';

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? 'Revisa los datos ingresados.';
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resuelve el `logged_at` de una comida a partir de una fecha opcional
 * YYYY-MM-DD elegida por la alumna. Sin fecha → ahora. Con fecha se ancla a
 * mediodía UTC para que caiga dentro del día seleccionado sin importar la zona
 * horaria al hacer los filtros de rango por día. Devuelve error si la fecha es
 * inválida o futura.
 */
function resolveLoggedAt(loggedDate?: string | null): { at: string } | { error: string } {
  if (!loggedDate) return { at: new Date().toISOString() };
  if (!ISO_DATE.test(loggedDate)) return { error: 'Fecha inválida.' };
  if (loggedDate > todayISO()) return { error: 'No puedes registrar comidas en fechas futuras.' };
  const at = new Date(`${loggedDate}T12:00:00.000Z`);
  if (Number.isNaN(at.getTime())) return { error: 'Fecha inválida.' };
  return { at: at.toISOString() };
}

export interface LogFoodInput {
  mealType: MealType;
  notes?: string;
  photoPath?: string | null;
  /** Día de la comida (YYYY-MM-DD). Ausente = hoy. */
  loggedDate?: string;
  items: { foodItemId: string; unit: 'g' | 'ml' | 'unit'; quantity: number }[];
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Valida los items de una comida, resuelve gramos vía `toGrams` y calcula macros
 * por item. Devuelve las filas listas para insertar en `food_log_items` (sin
 * `food_log_id`, que se asigna al insertar). Lógica compartida entre logFood y
 * updateFoodLog para mantener una sola fuente de verdad de la conversión.
 */
async function buildFoodLogItemRows(
  supabase: SupabaseServerClient,
  input: { mealType: MealType; notes?: string; items: LogFoodInput['items'] },
): Promise<
  | { error: string }
  | {
      rows: {
        food_item_id: string;
        unit: 'g' | 'ml' | 'unit';
        quantity: number;
        grams: number;
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
      }[];
    }
> {
  if (!input.items || input.items.length === 0) return { error: 'Agrega al menos un alimento.' };

  const ids = input.items.map((i) => i.foodItemId);
  const { data: foods } = await supabase
    .from('food_items')
    .select('id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, grams_per_unit')
    .in('id', ids);
  const foodMap = new Map((foods ?? []).map((f) => [f.id, f]));

  const itemsWithGrams = input.items.map((i) => {
    const food = foodMap.get(i.foodItemId);
    const gramsPerUnit = food?.grams_per_unit ?? null;
    return { ...i, grams: toGrams(i.quantity, i.unit, gramsPerUnit) };
  });

  const parsed = foodLogSchema.safeParse({
    meal_type: input.mealType,
    notes: input.notes || undefined,
    items: itemsWithGrams.map((i) => ({
      food_item_id: i.foodItemId,
      unit: i.unit,
      quantity: i.quantity,
      grams: i.grams,
    })),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const rows = itemsWithGrams.flatMap((item) => {
    const food = foodMap.get(item.foodItemId);
    if (!food) return [];
    const macros = calculateFoodMacros(food, item.grams);
    return [
      {
        food_item_id: item.foodItemId,
        unit: item.unit,
        quantity: item.quantity,
        grams: item.grams,
        calories: macros.calories,
        protein_g: macros.protein_g,
        carbs_g: macros.carbs_g,
        fat_g: macros.fat_g,
      },
    ];
  });
  return { rows };
}

export async function logFood(input: LogFoodInput): Promise<{ error?: string; success?: boolean }> {
  const student = await requireStudent();

  if (input.photoPath && !input.photoPath.startsWith(`${student.id}/`)) {
    return { error: 'Ruta de foto inválida.' };
  }

  const supabase = await createClient();
  const built = await buildFoodLogItemRows(supabase, {
    mealType: input.mealType,
    notes: input.notes,
    items: input.items,
  });
  if ('error' in built) return { error: built.error };

  const resolved = resolveLoggedAt(input.loggedDate);
  if ('error' in resolved) return { error: resolved.error };

  const coachId = await getStudentCoachId(student.id);
  const { data: log, error: logErr } = await supabase
    .from('food_logs')
    .insert({
      student_id: student.id,
      coach_id: coachId,
      meal_type: input.mealType,
      logged_at: resolved.at,
      notes: input.notes ?? null,
      photo_path: input.photoPath ?? null,
    })
    .select('id')
    .single();
  if (logErr || !log) return { error: logErr?.message ?? 'No se pudo guardar el registro.' };

  if (built.rows.length > 0) {
    await supabase
      .from('food_log_items')
      .insert(built.rows.map((r) => ({ ...r, food_log_id: log.id })));
  }

  revalidatePath('/student/today');
  revalidatePath('/student/meals');
  return { success: true };
}

export interface UpdateFoodLogInput {
  mealType: MealType;
  notes?: string;
  /** Día de la comida (YYYY-MM-DD). Ausente = no cambia la fecha. */
  loggedDate?: string;
  items: { foodItemId: string; unit: 'g' | 'ml' | 'unit'; quantity: number }[];
}

/** Edita una comida ya registrada: actualiza tipo/nota y reemplaza sus items. */
export async function updateFoodLog(
  logId: string,
  input: UpdateFoodLogInput,
): Promise<{ error?: string; success?: boolean }> {
  const student = await requireStudent();
  const supabase = await createClient();

  // Verifica propiedad (RLS ya restringe, pero filtramos explícitamente).
  const { data: existing } = await supabase
    .from('food_logs')
    .select('id')
    .eq('id', logId)
    .eq('student_id', student.id)
    .maybeSingle();
  if (!existing) return { error: 'No se encontró el registro.' };

  const built = await buildFoodLogItemRows(supabase, {
    mealType: input.mealType,
    notes: input.notes,
    items: input.items,
  });
  if ('error' in built) return { error: built.error };

  const updatePayload: { meal_type: MealType; notes: string | null; logged_at?: string } = {
    meal_type: input.mealType,
    notes: input.notes ?? null,
  };
  if (input.loggedDate) {
    const resolved = resolveLoggedAt(input.loggedDate);
    if ('error' in resolved) return { error: resolved.error };
    updatePayload.logged_at = resolved.at;
  }

  const { error: updErr } = await supabase
    .from('food_logs')
    .update(updatePayload)
    .eq('id', logId)
    .eq('student_id', student.id);
  if (updErr) return { error: updErr.message };

  // Reemplaza los items: borra los viejos e inserta los nuevos.
  const { error: delErr } = await supabase.from('food_log_items').delete().eq('food_log_id', logId);
  if (delErr) return { error: delErr.message };

  if (built.rows.length > 0) {
    const { error: insErr } = await supabase
      .from('food_log_items')
      .insert(built.rows.map((r) => ({ ...r, food_log_id: logId })));
    if (insErr) return { error: insErr.message };
  }

  revalidatePath('/student/today');
  revalidatePath('/student/meals');
  return { success: true };
}

/** Elimina una comida registrada (sus items caen por FK on delete cascade). */
export async function deleteFoodLog(logId: string): Promise<{ ok?: true; error?: string }> {
  const student = await requireStudent();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('food_logs')
    .select('id')
    .eq('id', logId)
    .eq('student_id', student.id)
    .maybeSingle();
  if (!existing) return { error: 'No se encontró el registro.' };

  // Borra items primero por si el FK no estuviera en cascade.
  await supabase.from('food_log_items').delete().eq('food_log_id', logId);
  const { error } = await supabase.from('food_logs').delete().eq('id', logId).eq('student_id', student.id);
  if (error) return { error: error.message };

  revalidatePath('/student/today');
  revalidatePath('/student/meals');
  return { ok: true };
}

export interface LogWorkoutInput {
  workoutPlanId?: string | null;
  workoutPlanDayId?: string | null;
  notes?: string;
  perceivedEffort?: number | null;
  sets: { exerciseId?: string | null; setNumber: number; reps?: number | null; weight?: number | null; completed: boolean }[];
}

export async function logWorkout(input: LogWorkoutInput): Promise<{ error?: string; success?: boolean }> {
  const student = await requireStudent();

  const parsed = workoutLogSchema.safeParse({
    workout_plan_id: input.workoutPlanId ?? null,
    workout_plan_day_id: input.workoutPlanDayId ?? null,
    perceived_effort: input.perceivedEffort ?? null,
    notes: input.notes || undefined,
    sets: (input.sets ?? []).map((s) => ({
      exercise_id: s.exerciseId ?? null,
      set_number: s.setNumber,
      reps_completed: s.reps ?? null,
      weight_kg: s.weight ?? null,
      completed: s.completed,
    })),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  const coachId = await getStudentCoachId(student.id);
  const todayISO = new Date().toISOString().slice(0, 10);

  const { error } = await upsertWorkoutSession(supabase, {
    studentId: student.id,
    coachId,
    planId: input.workoutPlanId ?? null,
    planDayId: input.workoutPlanDayId ?? null,
    sessionDateISO: todayISO,
    status: 'completed',
    perceivedEffort: input.perceivedEffort ?? null,
    notes: input.notes ?? null,
    sets: (input.sets ?? []).map((s) => ({
      exerciseId: s.exerciseId ?? null,
      setNumber: s.setNumber,
      reps: s.reps ?? null,
      weight: s.weight ?? null,
      completed: s.completed,
    })),
  });
  if (error) return { error };

  revalidatePath('/student/workout');
  revalidatePath('/student/today');
  return { success: true };
}

export async function addWeight(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireStudent();
  const parsed = weightEntrySchema.safeParse({
    weight_kg: formData.get('weight_kg'),
    recorded_at: formData.get('recorded_at'),
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  const coachId = await getStudentCoachId(student.id);
  const { error } = await supabase.from('weight_entries').insert({
    student_id: student.id,
    coach_id: coachId,
    weight_kg: parsed.data.weight_kg,
    recorded_at: parsed.data.recorded_at,
    notes: parsed.data.notes ?? null,
  });
  if (error) return { error: error.message };

  await supabase.from('student_profiles').update({ current_weight_kg: parsed.data.weight_kg }).eq('user_id', student.id);
  revalidatePath('/student/progress');
  revalidatePath('/student/today');
  return { success: 'Peso registrado' };
}

export async function addMeasurement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireStudent();
  const parsed = bodyMeasurementSchema.safeParse({
    recorded_at: formData.get('recorded_at'),
    waist_cm: formData.get('waist_cm') || undefined,
    hip_cm: formData.get('hip_cm') || undefined,
    chest_cm: formData.get('chest_cm') || undefined,
    thigh_cm: formData.get('thigh_cm') || undefined,
    arm_cm: formData.get('arm_cm') || undefined,
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  const coachId = await getStudentCoachId(student.id);
  const { error } = await supabase.from('body_measurements').insert({
    student_id: student.id,
    coach_id: coachId,
    recorded_at: parsed.data.recorded_at,
    waist_cm: parsed.data.waist_cm ?? null,
    hip_cm: parsed.data.hip_cm ?? null,
    chest_cm: parsed.data.chest_cm ?? null,
    thigh_cm: parsed.data.thigh_cm ?? null,
    arm_cm: parsed.data.arm_cm ?? null,
    notes: parsed.data.notes ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath('/student/progress');
  return { success: 'Medidas registradas' };
}

export async function setGoalWeight(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireStudent();
  const raw = formData.get('goal_weight_kg');
  const value = raw === null || String(raw).trim() === '' ? null : Number(raw);
  if (value !== null && (!Number.isFinite(value) || value <= 0 || value > 500)) {
    return { error: 'Ingresa un peso objetivo válido.' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('student_profiles')
    .upsert({ user_id: student.id, goal_weight_kg: value }, { onConflict: 'user_id' });
  if (error) return { error: error.message };
  revalidatePath('/student/progress');
  return { success: 'Meta actualizada' };
}

export async function markContentRead(assignmentId: string): Promise<void> {
  const student = await requireStudent();
  const supabase = await createClient();
  await supabase
    .from('content_assignments')
    .update({ read_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .eq('student_id', student.id);
  revalidatePath('/student/content');
}

export async function updateStudentProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireStudent();
  const fullName = String(formData.get('full_name') ?? '').trim();
  if (fullName.length < 2) return { error: 'Ingresa tu nombre completo' };
  const goal = String(formData.get('goal') ?? '').trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', student.id);
  if (error) return { error: error.message };
  await supabase.from('student_profiles').upsert({ user_id: student.id, goal }, { onConflict: 'user_id' });
  revalidatePath('/student/profile');
  return { success: 'Perfil actualizado' };
}
