import { z } from 'zod';

export const weightEntrySchema = z.object({
  weight_kg: z.coerce.number().positive('El peso debe ser mayor a 0').max(500),
  recorded_at: z.string().min(1, 'La fecha es requerida'),
  notes: z.string().max(500).optional(),
});
export type WeightEntryFormInput = z.infer<typeof weightEntrySchema>;

export const bodyMeasurementSchema = z.object({
  recorded_at: z.string().min(1, 'La fecha es requerida'),
  waist_cm: z.coerce.number().positive().max(300).nullable().optional(),
  hip_cm: z.coerce.number().positive().max(300).nullable().optional(),
  chest_cm: z.coerce.number().positive().max(300).nullable().optional(),
  thigh_cm: z.coerce.number().positive().max(200).nullable().optional(),
  arm_cm: z.coerce.number().positive().max(150).nullable().optional(),
  notes: z.string().max(500).optional(),
});
export type BodyMeasurementInput = z.infer<typeof bodyMeasurementSchema>;
