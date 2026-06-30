'use server';

import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { energyInputSchema } from '@/lib/validators/energy';
import { calculateEnergy, calculateMacros } from '@/domain/nutrition/energy';
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

  // Recalculate server-side from validated energy inputs
  const result = calculateEnergy(energyFields as Parameters<typeof calculateEnergy>[0]);

  // Optional manual calorie override (coach fine-tuned with the result slider)
  const manualKcalRaw = formData.get('manual_kcal');
  const manualKcal = manualKcalRaw ? Number(manualKcalRaw) : null;
  if (manualKcal !== null && (isNaN(manualKcal) || manualKcal < 800 || manualKcal > 6000)) {
    return { error: 'Calorías manuales fuera del rango válido (800–6000 kcal)' };
  }

  const finalKcal = manualKcal ?? result.target_kcal;
  const finalMacros = manualKcal
    ? calculateMacros({
        target_kcal: finalKcal,
        weight_kg: energyFields.weight_kg,
        protein_multiplier: energyFields.protein_multiplier ?? 2.0,
        fat_multiplier: energyFields.fat_multiplier ?? 0.9,
      })
    : result;

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
        calories_target: finalKcal,
        protein_target_g: finalMacros.protein_g,
        carbs_target_g: finalMacros.carbs_g,
        fat_target_g: finalMacros.fat_g,
      })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('nutrition_plans').insert({
      coach_id: coach.id,
      student_id,
      title: `Plan calculado — ${today}`,
      calories_target: finalKcal,
      protein_target_g: finalMacros.protein_g,
      carbs_target_g: finalMacros.carbs_g,
      fat_target_g: finalMacros.fat_g,
      status: 'active',
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/coach/students/${student_id}/nutrition`);
  return { success: '¡Calorías asignadas! El plan de nutrición ha sido actualizado.' };
}
