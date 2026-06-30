import { z } from 'zod';

export const energyInputSchema = z.object({
  sex: z.enum(['female', 'male']).default('female'),
  age: z.coerce.number().int().min(14, 'Mínimo 14 años').max(99, 'Máximo 99 años'),
  weight_kg: z.coerce.number().min(30, 'Mínimo 30 kg').max(250, 'Máximo 250 kg'),
  height_cm: z.coerce.number().min(100, 'Mínimo 100 cm').max(220, 'Máximo 220 cm'),
  bodyfat_pct: z.coerce.number().min(5).max(50).optional(),
  activity: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  adjustment_pct: z.coerce
    .number()
    .min(-25, 'Máximo déficit −25%')
    .max(30, 'Máximo superávit +30%'),
  protein_multiplier: z.coerce.number().min(1.6).max(2.2).default(2.0),
  fat_multiplier: z.coerce.number().min(0.8).max(1.0).default(0.9),
  student_id: z.string().uuid().optional(),
});

export type EnergyFormInput = z.infer<typeof energyInputSchema>;
