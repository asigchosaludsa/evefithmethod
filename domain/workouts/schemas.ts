import { z } from 'zod';

export const workoutPlanSchema = z.object({
  student_id: z.uuid(),
  title: z.string().min(1, 'El título es requerido'),
  focus: z.string().max(200).optional(),
  level: z.string().max(100).optional(),
  split_type: z
    .enum([
      'cuerpo_completo',
      'torso_pierna',
      'ppl',
      'ppl_doble',
      'bro_split',
      'torso_extremidades',
      'ppl_ul',
      'arnold',
      'phul',
      'phat',
      'ppl_arnold',
      'personalizado',
    ])
    .optional(),
  estimated_duration_minutes: z.coerce.number().int().positive().max(600).nullable().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  weeks: z.coerce.number().int().min(1).max(52).nullable().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
});
export type WorkoutPlanInput = z.infer<typeof workoutPlanSchema>;

export const workoutLogSetSchema = z.object({
  exercise_id: z.uuid().nullable().optional(),
  set_number: z.coerce.number().int().positive(),
  reps_completed: z.coerce.number().int().nonnegative().nullable().optional(),
  weight_kg: z.coerce.number().nonnegative().nullable().optional(),
  completed: z.boolean().default(false),
});

export const workoutLogSchema = z.object({
  workout_plan_id: z.uuid().nullable().optional(),
  workout_plan_day_id: z.uuid().nullable().optional(),
  status: z.enum(['started', 'completed', 'skipped']).default('completed'),
  perceived_effort: z.coerce.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(1000).optional(),
  sets: z.array(workoutLogSetSchema).default([]),
});
export type WorkoutLogInput = z.infer<typeof workoutLogSchema>;
