'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { sendEmail } from '@/lib/email/send';
import { renderEmail } from '@/lib/email/render';
import type { ActionState } from '@/lib/auth/action-state';
import { coachNoteSchema, contentPostSchema, exerciseSchema, planExerciseItemSchema } from '@/lib/validators/coach';
import { nutritionPlanSchema } from '@/domain/nutrition/schemas';
import { workoutPlanSchema } from '@/domain/workouts/schemas';
import { resolveSplitDays } from '@/domain/workouts/splits';

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? 'Revisa los datos ingresados.';
}

// Bounds for the numeric fields of a plan exercise (defense against negatives / NaN / huge values).
const planExerciseNumbersSchema = z.object({
  sets: z.number().int('Las series deben ser un número entero').min(1, 'Mínimo 1 serie').max(20, 'Máximo 20 series'),
  rest_seconds: z
    .number()
    .int('El descanso debe ser un número entero')
    .min(0, 'El descanso no puede ser negativo')
    .max(3600, 'El descanso máximo es 3600 segundos')
    .nullable(),
  suggested_weight_kg: z
    .number()
    .min(0, 'El peso no puede ser negativo')
    .max(1000, 'El peso máximo es 1000 kg')
    .nullable(),
});

// ---- Coach notes ----
export async function addCoachNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const parsed = coachNoteSchema.safeParse({
    student_id: formData.get('student_id'),
    note: formData.get('note'),
    category: formData.get('category') || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  await assertCoachOwnsStudent(coach.id, parsed.data.student_id);

  const supabase = await createClient();
  const { error } = await supabase.from('coach_notes').insert({
    coach_id: coach.id,
    student_id: parsed.data.student_id,
    note: parsed.data.note,
    category: parsed.data.category ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/coach/students/${parsed.data.student_id}`);
  return { success: 'Nota guardada' };
}

export async function deleteCoachNote(noteId: string, studentId: string): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  await supabase.from('coach_notes').delete().eq('id', noteId).eq('coach_id', coach.id);
  revalidatePath(`/coach/students/${studentId}`);
}

// ---- Food log review ----
export async function reviewFoodLog(
  foodLogId: string,
  status: 'reviewed' | 'flagged' | 'pending',
): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  await supabase
    .from('food_logs')
    .update({ coach_review_status: status })
    .eq('id', foodLogId)
    .eq('coach_id', coach.id);
  revalidatePath('/coach', 'layout');
}

export async function resolveAlert(alertId: string): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  await supabase
    .from('alerts')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('coach_id', coach.id);
  revalidatePath('/coach');
}

// ---- Student relationship ----
// "Desvincular" (unlink): reversible removal. Sets the coach<->student link to
// cancelled so the student leaves the coach's active list and loses access via
// the relationship, but ALL of the student's data (logs, plans, progress) is
// preserved. Re-inviting re-links them.
export async function unlinkStudent(studentId: string): Promise<void> {
  const coach = await requireCoach();
  await assertCoachOwnsStudent(coach.id, studentId);
  const supabase = await createClient();

  // Build a recap and send the "vuelve pronto" email before unlinking
  // (admin client: reads the student's email/name/stats regardless of RLS).
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', studentId)
    .maybeSingle();
  const { data: link } = await admin
    .from('coach_students')
    .select('created_at')
    .eq('coach_id', coach.id)
    .eq('student_id', studentId)
    .maybeSingle();
  const { count: entrenos } = await admin
    .from('workout_logs')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId);
  const semanas = link?.created_at
    ? Math.max(1, Math.round((Date.now() - new Date(link.created_at).getTime()) / 604_800_000))
    : 1;

  if (profile?.email) {
    const tpl = await renderEmail('unlink', {
      nombre: profile.full_name ?? '',
      semanas: String(semanas),
      entrenos: String(entrenos ?? 0),
    });
    if (tpl) await sendEmail({ to: profile.email, subject: tpl.subject, html: tpl.html });
  }

  await supabase
    .from('coach_students')
    .update({ status: 'cancelled' })
    .eq('coach_id', coach.id)
    .eq('student_id', studentId);
  revalidatePath('/coach/students');
  redirect('/coach/students');
}

// ---- Plan archiving (reversible) ----
export async function archiveNutritionPlan(planId: string, studentId: string): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  await supabase
    .from('nutrition_plans')
    .update({ status: 'archived' })
    .eq('id', planId)
    .eq('coach_id', coach.id);
  revalidatePath(`/coach/students/${studentId}/nutrition`);
}

export async function restoreNutritionPlan(planId: string, studentId: string): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  await supabase
    .from('nutrition_plans')
    .update({ status: 'active' })
    .eq('id', planId)
    .eq('coach_id', coach.id);
  revalidatePath(`/coach/students/${studentId}/nutrition`);
}

export async function archiveWorkoutPlan(planId: string, studentId: string): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  await supabase
    .from('workout_plans')
    .update({ status: 'archived' })
    .eq('id', planId)
    .eq('coach_id', coach.id);
  revalidatePath(`/coach/students/${studentId}/workouts`);
}

export async function restoreWorkoutPlan(planId: string, studentId: string): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  await supabase
    .from('workout_plans')
    .update({ status: 'active' })
    .eq('id', planId)
    .eq('coach_id', coach.id);
  revalidatePath(`/coach/students/${studentId}/workouts`);
}

// ---- Nutrition plan ----
export async function createNutritionPlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const parsed = nutritionPlanSchema.safeParse({
    student_id: formData.get('student_id'),
    title: formData.get('title'),
    calories_target: formData.get('calories_target') || undefined,
    protein_target_g: formData.get('protein_target_g') || undefined,
    carbs_target_g: formData.get('carbs_target_g') || undefined,
    fat_target_g: formData.get('fat_target_g') || undefined,
    meals_per_day: formData.get('meals_per_day') || undefined,
    notes: formData.get('notes') || undefined,
    status: formData.get('status') || 'active',
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  await assertCoachOwnsStudent(coach.id, parsed.data.student_id);

  const supabase = await createClient();
  const { error } = await supabase.from('nutrition_plans').insert({
    coach_id: coach.id,
    student_id: parsed.data.student_id,
    title: parsed.data.title,
    calories_target: parsed.data.calories_target ?? null,
    protein_target_g: parsed.data.protein_target_g ?? null,
    carbs_target_g: parsed.data.carbs_target_g ?? null,
    fat_target_g: parsed.data.fat_target_g ?? null,
    meals_per_day: parsed.data.meals_per_day ?? null,
    notes: parsed.data.notes ?? null,
    status: parsed.data.status,
  });
  if (error) return { error: error.message };
  revalidatePath(`/coach/students/${parsed.data.student_id}/nutrition`);
  redirect(`/coach/students/${parsed.data.student_id}/nutrition`);
}

// ---- Workout plan ----
export async function createWorkoutPlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const parsed = workoutPlanSchema.safeParse({
    student_id: formData.get('student_id'),
    title: formData.get('title'),
    focus: formData.get('focus') || undefined,
    level: formData.get('level') || undefined,
    split_type: formData.get('split_type') || undefined,
    estimated_duration_minutes: formData.get('estimated_duration_minutes') || undefined,
    status: formData.get('status') || 'active',
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  await assertCoachOwnsStudent(coach.id, parsed.data.student_id);

  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from('workout_plans')
    .insert({
      coach_id: coach.id,
      student_id: parsed.data.student_id,
      title: parsed.data.title,
      focus: parsed.data.focus ?? null,
      level: parsed.data.level ?? null,
      split_type: parsed.data.split_type ?? null,
      estimated_duration_minutes: parsed.data.estimated_duration_minutes ?? null,
      status: parsed.data.status,
    })
    .select('id')
    .single();
  if (error || !plan) return { error: error?.message ?? 'No se pudo crear el plan' };

  // Generar días desde la plantilla del split (excepto personalizado).
  if (parsed.data.split_type) {
    const days = resolveSplitDays(parsed.data.split_type);
    if (days.length > 0) {
      await supabase.from('workout_plan_days').insert(
        days.map((d) => ({
          workout_plan_id: plan.id,
          day_number: d.day_number,
          title: d.title,
          focus: d.focus,
        })),
      );
    }
  }

  revalidatePath(`/coach/students/${parsed.data.student_id}/workouts`);
  redirect(`/coach/students/${parsed.data.student_id}/workouts`);
}

// ---- Exercises ----
export async function createExercise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const parsed = exerciseSchema.safeParse({
    name: formData.get('name'),
    muscle_group: formData.get('muscle_group') || undefined,
    equipment: formData.get('equipment') || undefined,
    difficulty: formData.get('difficulty') || undefined,
    movement_pattern: formData.get('movement_pattern') || undefined,
    description: formData.get('description') || undefined,
    instructions: formData.get('instructions') || undefined,
    common_mistakes: formData.get('common_mistakes') || undefined,
    video_url: formData.get('video_url') || undefined,
    thumbnail_url: formData.get('thumbnail_url') || undefined,
    status: formData.get('status') || 'published',
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from('exercises').insert({
    coach_id: coach.id,
    name: parsed.data.name,
    muscle_group: parsed.data.muscle_group ?? null,
    equipment: parsed.data.equipment ?? null,
    difficulty: parsed.data.difficulty ?? null,
    movement_pattern: parsed.data.movement_pattern ?? null,
    description: parsed.data.description ?? null,
    instructions: parsed.data.instructions ?? null,
    common_mistakes: parsed.data.common_mistakes ?? null,
    video_url: parsed.data.video_url || null,
    thumbnail_url: parsed.data.thumbnail_url || null,
    status: parsed.data.status,
  });
  if (error) return { error: error.message };
  revalidatePath('/coach/exercises');
  redirect('/coach/exercises');
}

export async function updateExercise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const id = String(formData.get('id') ?? '');
  if (!id) return { error: 'Ejercicio no encontrado' };
  const parsed = exerciseSchema.safeParse({
    name: formData.get('name'),
    muscle_group: formData.get('muscle_group') || undefined,
    equipment: formData.get('equipment') || undefined,
    difficulty: formData.get('difficulty') || undefined,
    movement_pattern: formData.get('movement_pattern') || undefined,
    description: formData.get('description') || undefined,
    instructions: formData.get('instructions') || undefined,
    common_mistakes: formData.get('common_mistakes') || undefined,
    video_url: formData.get('video_url') || undefined,
    thumbnail_url: formData.get('thumbnail_url') || undefined,
    status: formData.get('status') || 'published',
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  // Una sola coach: puede editar sus ejercicios y los globales (coach_id null).
  const { error } = await supabase
    .from('exercises')
    .update({
      name: parsed.data.name,
      muscle_group: parsed.data.muscle_group ?? null,
      equipment: parsed.data.equipment ?? null,
      difficulty: parsed.data.difficulty ?? null,
      movement_pattern: parsed.data.movement_pattern ?? null,
      description: parsed.data.description ?? null,
      instructions: parsed.data.instructions ?? null,
      common_mistakes: parsed.data.common_mistakes ?? null,
      video_url: parsed.data.video_url || null,
      thumbnail_url: parsed.data.thumbnail_url || null,
      status: parsed.data.status,
    })
    .eq('id', id)
    .or(`coach_id.eq.${coach.id},is_global.eq.true`);
  if (error) return { error: error.message };
  revalidatePath('/coach/exercises');
  redirect(`/coach/exercises/${id}`);
}

export async function archiveExercise(exerciseId: string): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  await supabase
    .from('exercises')
    .update({ status: 'archived' })
    .eq('id', exerciseId)
    .eq('coach_id', coach.id);
  revalidatePath('/coach/exercises');
}

export async function restoreExercise(exerciseId: string): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  await supabase
    .from('exercises')
    .update({ status: 'published' })
    .eq('id', exerciseId)
    .eq('coach_id', coach.id);
  revalidatePath('/coach/exercises');
}

// ---- Content ----
export async function createContentPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const parsed = contentPostSchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category') || undefined,
    summary: formData.get('summary') || undefined,
    body: formData.get('body') || undefined,
    status: formData.get('status') || 'published',
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from('content_posts').insert({
    coach_id: coach.id,
    title: parsed.data.title,
    category: parsed.data.category ?? null,
    summary: parsed.data.summary ?? null,
    body: parsed.data.body ?? null,
    status: parsed.data.status,
    published_at: parsed.data.status === 'published' ? new Date().toISOString() : null,
  });
  if (error) return { error: error.message };
  revalidatePath('/coach/content');
  redirect('/coach/content');
}

// ---- Settings ----
export async function updateCoachSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const fullName = String(formData.get('full_name') ?? '').trim();
  if (fullName.length < 2) return { error: 'Ingresa tu nombre completo' };
  const businessName = String(formData.get('business_name') ?? '').trim() || null;
  const bio = String(formData.get('bio') ?? '').trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', coach.id);
  if (error) return { error: error.message };
  await supabase
    .from('coach_profiles')
    .upsert({ user_id: coach.id, business_name: businessName, bio }, { onConflict: 'user_id' });

  revalidatePath('/coach/settings');
  return { success: 'Cambios guardados' };
}

// ---- Workout plan builder (days + exercises) ----
export async function addWorkoutDay(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const planId = String(formData.get('workout_plan_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const focus = String(formData.get('focus') ?? '').trim() || null;
  if (!planId || title.length < 1) return { error: 'Escribe el título del día' };

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from('workout_plans')
    .select('id, coach_id')
    .eq('id', planId)
    .maybeSingle();
  if (!plan || plan.coach_id !== coach.id) return { error: 'Plan no encontrado' };

  const { data: last } = await supabase
    .from('workout_plan_days')
    .select('day_number')
    .eq('workout_plan_id', planId)
    .order('day_number', { ascending: false })
    .limit(1);
  const nextNumber = (last?.[0]?.day_number ?? 0) + 1;

  const { error } = await supabase
    .from('workout_plan_days')
    .insert({ workout_plan_id: planId, day_number: nextNumber, title, focus });
  if (error) return { error: error.message };
  revalidatePath(`/coach/workouts/plans/${planId}`);
  return { success: 'Día agregado' };
}

export async function deleteWorkoutDay(dayId: string, planId: string): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from('workout_plans')
    .select('coach_id')
    .eq('id', planId)
    .maybeSingle();
  if (!plan || plan.coach_id !== coach.id) return;
  await supabase
    .from('workout_plan_days')
    .delete()
    .eq('id', dayId)
    .eq('workout_plan_id', planId);
  revalidatePath(`/coach/workouts/plans/${planId}`);
}

export async function addPlanExercise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const dayId = String(formData.get('workout_plan_day_id') ?? '');
  const planId = String(formData.get('workout_plan_id') ?? '');
  const exerciseId = String(formData.get('exercise_id') ?? '') || null;
  if (!dayId || !exerciseId) return { error: 'Selecciona un ejercicio' };

  const supabase = await createClient();
  const { data: day } = await supabase
    .from('workout_plan_days')
    .select('workout_plan_id')
    .eq('id', dayId)
    .maybeSingle();
  if (!day) return { error: 'Día no encontrado' };
  const { data: plan } = await supabase
    .from('workout_plans')
    .select('coach_id')
    .eq('id', day.workout_plan_id)
    .maybeSingle();
  if (!plan || plan.coach_id !== coach.id) return { error: 'No autorizado' };

  const setsRaw = formData.get('sets');
  const restRaw = formData.get('rest_seconds');
  const weightRaw = formData.get('suggested_weight_kg');
  const numbers = planExerciseNumbersSchema.safeParse({
    sets: setsRaw ? Number(setsRaw) : 3,
    rest_seconds: restRaw ? Number(restRaw) : null,
    suggested_weight_kg: weightRaw ? Number(weightRaw) : null,
  });
  if (!numbers.success) return { error: firstError(numbers.error.issues) };

  const { data: last } = await supabase
    .from('workout_plan_exercises')
    .select('sort_order')
    .eq('workout_plan_day_id', dayId)
    .order('sort_order', { ascending: false })
    .limit(1);
  const sortOrder = (last?.[0]?.sort_order ?? 0) + 1;

  const { error } = await supabase.from('workout_plan_exercises').insert({
    workout_plan_day_id: dayId,
    exercise_id: exerciseId,
    sort_order: sortOrder,
    sets: numbers.data.sets,
    reps: String(formData.get('reps') ?? '10').trim() || '10',
    rest_seconds: numbers.data.rest_seconds,
    tempo: String(formData.get('tempo') ?? '').trim() || null,
    suggested_weight_kg: numbers.data.suggested_weight_kg,
    notes: String(formData.get('notes') ?? '').trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/coach/workouts/plans/${planId}`);
  return { success: 'Ejercicio agregado' };
}

/** Verifica que el día pertenece a un plan de la coach. */
async function assertDayOwnedByCoach(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  dayId: string,
): Promise<boolean> {
  const { data: day } = await supabase
    .from('workout_plan_days')
    .select('workout_plan_id')
    .eq('id', dayId)
    .maybeSingle();
  if (!day) return false;
  const { data: plan } = await supabase
    .from('workout_plans')
    .select('coach_id')
    .eq('id', day.workout_plan_id)
    .maybeSingle();
  return !!plan && plan.coach_id === coachId;
}

export interface AddPlanExercisesInput {
  planId: string;
  dayId: string;
  items: {
    exercise_id: string;
    sets?: number;
    reps?: string;
    rest_seconds?: number | null;
    tempo?: string | null;
    suggested_weight_kg?: number | null;
    notes?: string | null;
  }[];
}

export async function addPlanExercises(input: AddPlanExercisesInput): Promise<ActionState> {
  const coach = await requireCoach();
  if (!input?.dayId || !Array.isArray(input.items) || input.items.length === 0) {
    return { error: 'Selecciona al menos un ejercicio' };
  }
  const supabase = await createClient();
  if (!(await assertDayOwnedByCoach(supabase, coach.id, input.dayId))) {
    return { error: 'No autorizado' };
  }

  const parsedItems: ReturnType<typeof planExerciseItemSchema.parse>[] = [];
  for (const item of input.items) {
    const parsed = planExerciseItemSchema.safeParse(item);
    if (!parsed.success) return { error: firstError(parsed.error.issues) };
    parsedItems.push(parsed.data);
  }

  const { data: last } = await supabase
    .from('workout_plan_exercises')
    .select('sort_order')
    .eq('workout_plan_day_id', input.dayId)
    .order('sort_order', { ascending: false })
    .limit(1);
  let sortOrder = (last?.[0]?.sort_order ?? 0) + 1;

  const rows = parsedItems.map((it) => ({
    workout_plan_day_id: input.dayId,
    exercise_id: it.exercise_id,
    sort_order: sortOrder++,
    sets: it.sets ?? 3,
    reps: it.reps ?? '10',
    rest_seconds: it.rest_seconds ?? null,
    tempo: it.tempo ?? null,
    suggested_weight_kg: it.suggested_weight_kg ?? null,
    notes: it.notes ?? null,
  }));

  const { error } = await supabase.from('workout_plan_exercises').insert(rows);
  if (error) return { error: error.message };
  revalidatePath(`/coach/workouts/plans/${input.planId}`);
  return { success: `${rows.length} ejercicio(s) agregado(s)` };
}

export interface UpdatePlanExerciseInput {
  id: string;
  planId: string;
  sets: number;
  reps: string;
  rest_seconds?: number | null;
  tempo?: string | null;
  suggested_weight_kg?: number | null;
  notes?: string | null;
}

export async function updatePlanExercise(input: UpdatePlanExerciseInput): Promise<ActionState> {
  const coach = await requireCoach();
  const supabase = await createClient();

  const { data: pe } = await supabase
    .from('workout_plan_exercises')
    .select('workout_plan_day_id')
    .eq('id', input.id)
    .maybeSingle();
  if (!pe || !(await assertDayOwnedByCoach(supabase, coach.id, pe.workout_plan_day_id))) {
    return { error: 'No autorizado' };
  }

  const parsed = planExerciseItemSchema
    .pick({ sets: true, reps: true, rest_seconds: true, tempo: true, suggested_weight_kg: true, notes: true })
    .safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const { error } = await supabase
    .from('workout_plan_exercises')
    .update({
      sets: parsed.data.sets ?? 3,
      reps: parsed.data.reps ?? '10',
      rest_seconds: parsed.data.rest_seconds ?? null,
      tempo: parsed.data.tempo ?? null,
      suggested_weight_kg: parsed.data.suggested_weight_kg ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', input.id);
  if (error) return { error: error.message };
  revalidatePath(`/coach/workouts/plans/${input.planId}`);
  return { success: 'Ejercicio actualizado' };
}

export async function deletePlanExercise(id: string, planId: string): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from('workout_plans')
    .select('coach_id')
    .eq('id', planId)
    .maybeSingle();
  if (!plan || plan.coach_id !== coach.id) return;
  const { data: days } = await supabase
    .from('workout_plan_days')
    .select('id')
    .eq('workout_plan_id', planId);
  const dayIds = (days ?? []).map((d) => d.id);
  if (dayIds.length === 0) return;
  await supabase
    .from('workout_plan_exercises')
    .delete()
    .eq('id', id)
    .in('workout_plan_day_id', dayIds);
  revalidatePath(`/coach/workouts/plans/${planId}`);
}
