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
import type { ActionState } from '@/lib/auth/action-state';
import type { MealType } from '@/types/app';

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? 'Revisa los datos ingresados.';
}

export interface LogFoodInput {
  mealType: MealType;
  notes?: string;
  photoPath?: string | null;
  items: { foodItemId: string; unit: 'g' | 'ml' | 'unit'; quantity: number }[];
}

export async function logFood(input: LogFoodInput): Promise<{ error?: string; success?: boolean }> {
  const student = await requireStudent();
  if (!input.items || input.items.length === 0) return { error: 'Agrega al menos un alimento.' };

  const supabasePre = await createClient();
  const ids0 = input.items.map((i) => i.foodItemId);
  const { data: foods0 } = await supabasePre
    .from('food_items')
    .select('id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, grams_per_unit')
    .in('id', ids0);
  const foodMap = new Map((foods0 ?? []).map((f) => [f.id, f]));

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

  if (input.photoPath && !input.photoPath.startsWith(`${student.id}/`)) {
    return { error: 'Ruta de foto inválida.' };
  }

  const supabase = await createClient();
  const coachId = await getStudentCoachId(student.id);
  const { data: log, error: logErr } = await supabase
    .from('food_logs')
    .insert({
      student_id: student.id,
      coach_id: coachId,
      meal_type: input.mealType,
      logged_at: new Date().toISOString(),
      notes: input.notes ?? null,
      photo_path: input.photoPath ?? null,
    })
    .select('id')
    .single();
  if (logErr || !log) return { error: logErr?.message ?? 'No se pudo guardar el registro.' };

  const rows = itemsWithGrams.flatMap((item) => {
    const food = foodMap.get(item.foodItemId);
    if (!food) return [];
    const macros = calculateFoodMacros(food, item.grams);
    return [
      {
        food_log_id: log.id,
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
  if (rows.length > 0) await supabase.from('food_log_items').insert(rows);

  revalidatePath('/student/today');
  revalidatePath('/student/meals');
  return { success: true };
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
