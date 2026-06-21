'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import type { ActionState } from '@/lib/auth/action-state';
import { coachNoteSchema, contentPostSchema, exerciseSchema } from '@/lib/validators/coach';
import { nutritionPlanSchema } from '@/domain/nutrition/schemas';
import { workoutPlanSchema } from '@/domain/workouts/schemas';

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? 'Revisa los datos ingresados.';
}

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
  await requireCoach();
  const supabase = await createClient();
  await supabase.from('coach_notes').delete().eq('id', noteId);
  revalidatePath(`/coach/students/${studentId}`);
}

// ---- Food log review ----
export async function reviewFoodLog(
  foodLogId: string,
  status: 'reviewed' | 'flagged' | 'pending',
): Promise<void> {
  await requireCoach();
  const supabase = await createClient();
  await supabase.from('food_logs').update({ coach_review_status: status }).eq('id', foodLogId);
  revalidatePath('/coach');
}

export async function resolveAlert(alertId: string): Promise<void> {
  await requireCoach();
  const supabase = await createClient();
  await supabase
    .from('alerts')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', alertId);
  revalidatePath('/coach');
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
    estimated_duration_minutes: formData.get('estimated_duration_minutes') || undefined,
    status: formData.get('status') || 'active',
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  await assertCoachOwnsStudent(coach.id, parsed.data.student_id);

  const supabase = await createClient();
  const { error } = await supabase.from('workout_plans').insert({
    coach_id: coach.id,
    student_id: parsed.data.student_id,
    title: parsed.data.title,
    focus: parsed.data.focus ?? null,
    level: parsed.data.level ?? null,
    estimated_duration_minutes: parsed.data.estimated_duration_minutes ?? null,
    status: parsed.data.status,
  });
  if (error) return { error: error.message };
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
    description: formData.get('description') || undefined,
    instructions: formData.get('instructions') || undefined,
    common_mistakes: formData.get('common_mistakes') || undefined,
    video_url: formData.get('video_url') || undefined,
    status: formData.get('status') || 'published',
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from('exercises').insert({
    coach_id: coach.id,
    name: parsed.data.name,
    muscle_group: parsed.data.muscle_group ?? null,
    equipment: parsed.data.equipment ?? null,
    description: parsed.data.description ?? null,
    instructions: parsed.data.instructions ?? null,
    common_mistakes: parsed.data.common_mistakes ?? null,
    video_url: parsed.data.video_url || null,
    status: parsed.data.status,
  });
  if (error) return { error: error.message };
  revalidatePath('/coach/exercises');
  redirect('/coach/exercises');
}

export async function archiveExercise(exerciseId: string): Promise<void> {
  await requireCoach();
  const supabase = await createClient();
  await supabase.from('exercises').update({ status: 'archived' }).eq('id', exerciseId);
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
