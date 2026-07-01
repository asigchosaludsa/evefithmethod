'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/roles';

export interface NewFood {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  grams_per_unit: number | null;
  unit_label: string | null;
}

// Los topes se aplican a los valores YA guardados (por 100 g). En modo "por
// unidad" se guarda per_100g = totales de la porción con grams_per_unit=100, así
// que un alimento entero (ej. sándwich ~700 kcal) sigue dentro de rango.
const schema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.').max(120, 'El nombre es demasiado largo.'),
  calories: z.coerce.number().min(0, 'Las calorías no pueden ser negativas.').max(5000, 'Las calorías son demasiado altas.'),
  protein: z.coerce.number().min(0, 'La proteína no puede ser negativa.').max(1000, 'La proteína es demasiado alta.'),
  carbs: z.coerce.number().min(0, 'Los carbohidratos no pueden ser negativos.').max(1000, 'Los carbohidratos son demasiado altos.'),
  fat: z.coerce.number().min(0, 'Las grasas no pueden ser negativas.').max(1000, 'Las grasas son demasiado altas.'),
  grams_per_unit: z.coerce.number().positive().max(5000).nullable().optional(),
  unit_label: z.string().max(40).nullable().optional(),
});

export async function createCustomFood(input: {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  gramsPerUnit?: number | null;
  unitLabel?: string | null;
}): Promise<{ food?: NewFood; error?: string }> {
  const student = await requireStudent();

  const parsed = schema.safeParse({
    name: input.name,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    grams_per_unit: input.gramsPerUnit,
    unit_label: input.unitLabel,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? 'Datos inválidos.' };
  }

  const { name, calories, protein, carbs, fat } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('food_items')
    .insert({
      name,
      calories_per_100g: calories,
      protein_per_100g: protein,
      carbs_per_100g: carbs,
      fat_per_100g: fat,
      grams_per_unit: parsed.data.grams_per_unit ?? null,
      unit_label: parsed.data.unit_label ?? null,
      source: 'custom',
      created_by: student.id,
      is_public: false,
    })
    .select('id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, grams_per_unit, unit_label')
    .single();

  if (error || !data) {
    return { error: error?.message ?? 'No se pudo crear el alimento.' };
  }

  revalidatePath('/student/meals/new');
  return { food: data };
}

/**
 * Edita un alimento personalizado creado por la propia alumna (source='custom').
 * No permite editar alimentos públicos ni de Open Food Facts (compartidos).
 */
export async function updateCustomFood(
  foodId: string,
  input: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    gramsPerUnit?: number | null;
    unitLabel?: string | null;
  },
): Promise<{ food?: NewFood; error?: string }> {
  const student = await requireStudent();

  const parsed = schema.safeParse({
    name: input.name,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    grams_per_unit: input.gramsPerUnit,
    unit_label: input.unitLabel,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const supabase = await createClient();

  // Solo alimentos propios y personalizados son editables.
  const { data: existing } = await supabase
    .from('food_items')
    .select('id, source, created_by')
    .eq('id', foodId)
    .maybeSingle();
  if (!existing) return { error: 'No se encontró el alimento.' };
  if (existing.created_by !== student.id || existing.source !== 'custom') {
    return { error: 'Solo puedes editar los alimentos que tú creaste.' };
  }

  const { data, error } = await supabase
    .from('food_items')
    .update({
      name: parsed.data.name,
      calories_per_100g: parsed.data.calories,
      protein_per_100g: parsed.data.protein,
      carbs_per_100g: parsed.data.carbs,
      fat_per_100g: parsed.data.fat,
      grams_per_unit: parsed.data.grams_per_unit ?? null,
      unit_label: parsed.data.unit_label ?? null,
    })
    .eq('id', foodId)
    .eq('created_by', student.id)
    .select('id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, grams_per_unit, unit_label')
    .single();

  if (error || !data) return { error: error?.message ?? 'No se pudo actualizar el alimento.' };

  revalidatePath('/student/meals/new');
  return { food: data };
}

/**
 * Elimina un alimento personalizado propio (source='custom'). Los registros
 * pasados no se rompen: `food_log_items.food_item_id` es ON DELETE SET NULL, así
 * que las comidas ya guardadas conservan sus macros (solo pierden el enlace al
 * nombre). No permite borrar alimentos públicos ni de Open Food Facts.
 */
export async function deleteCustomFood(foodId: string): Promise<{ ok?: true; error?: string }> {
  const student = await requireStudent();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('food_items')
    .select('id, source, created_by')
    .eq('id', foodId)
    .maybeSingle();
  if (!existing) return { error: 'No se encontró el alimento.' };
  if (existing.created_by !== student.id || existing.source !== 'custom') {
    return { error: 'Solo puedes eliminar los alimentos que tú creaste.' };
  }

  const { error } = await supabase
    .from('food_items')
    .delete()
    .eq('id', foodId)
    .eq('created_by', student.id);
  if (error) return { error: error.message };

  revalidatePath('/student/meals/new');
  return { ok: true };
}
