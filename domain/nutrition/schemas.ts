import { z } from 'zod';

export const nutritionPlanSchema = z.object({
  student_id: z.uuid(),
  title: z.string().min(1, 'El título es requerido'),
  calories_target: z.coerce.number().int().positive().nullable().optional(),
  protein_target_g: z.coerce.number().nonnegative().nullable().optional(),
  carbs_target_g: z.coerce.number().nonnegative().nullable().optional(),
  fat_target_g: z.coerce.number().nonnegative().nullable().optional(),
  meals_per_day: z.coerce.number().int().positive().max(12).nullable().optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
});
export type NutritionPlanInput = z.infer<typeof nutritionPlanSchema>;

export const foodLogItemSchema = z.object({
  food_item_id: z.uuid().nullable().optional(),
  unit: z.enum(['g', 'ml', 'unit']).default('g'),
  quantity: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  grams: z.coerce.number().positive('Los gramos deben ser mayores a 0'),
});

export const foodLogSchema = z.object({
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']),
  logged_at: z.string().optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(foodLogItemSchema).min(1, 'Agrega al menos un alimento'),
});
export type FoodLogInput = z.infer<typeof foodLogSchema>;
