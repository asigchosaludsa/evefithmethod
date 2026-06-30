'use server';

import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { energyInputSchema } from '@/lib/validators/energy';
import { calculateEnergy } from '@/domain/nutrition/energy';
import type { ActionState } from '@/lib/auth/action-state';
import { revalidatePath } from 'next/cache';

export async function assignCalorieTarget(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const coach = await requireCoach();

  const parsed = energyInputSchema.safeParse({
    sex: formData.get('sex'),
    age: formData.get('age'),
    weight_kg: formData.get('weight_kg'),
    height_cm: formData.get('height_cm'),
    bodyfat_pct: formData.get('bodyfat_pct') || undefined,
    activity: formData.get('activity'),
    adjustment_pct: formData.get('adjustment_pct'),
    protein_multiplier: formData.get('protein_multiplier'),
    fat_multiplier: formData.get('fat_multiplier'),
    student_id: formData.get('student_id'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const { student_id, ...energyFields } = parsed.data;
  if (!student_id) return { error: 'Debes seleccionar una alumna para asignar' };

  await assertCoachOwnsStudent(coach.id, student_id);

  // Recalculate server-side — never trust hidden form values for the targets
  const result = calculateEnergy(energyFields as Parameters<typeof calculateEnergy>[0]);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('nutrition_plans')
    .select('id')
    .eq('student_id', student_id)
    .eq('coach_id', coach.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('nutrition_plans')
      .update({
        calories_target: result.target_kcal,
        protein_target_g: result.protein_g,
        carbs_target_g: result.carbs_g,
        fat_target_g: result.fat_g,
      })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('nutrition_plans').insert({
      coach_id: coach.id,
      student_id,
      title: `Plan calculado — ${today}`,
      calories_target: result.target_kcal,
      protein_target_g: result.protein_g,
      carbs_target_g: result.carbs_g,
      fat_target_g: result.fat_g,
      status: 'active',
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/coach/students/${student_id}/nutrition`);
  return { success: '¡Calorías asignadas! El plan de nutrición ha sido actualizado.' };
}
