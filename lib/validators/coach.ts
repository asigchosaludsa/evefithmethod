import { z } from 'zod';
import { DIFFICULTIES, EQUIPMENT, MOVEMENT_PATTERN_VALUES, MUSCLE_GROUPS } from '@/lib/constants/exercises';

export const coachNoteSchema = z.object({
  student_id: z.uuid(),
  note: z.string().min(1, 'Escribe una nota').max(2000),
  category: z.string().max(60).optional(),
});

export const exerciseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(120),
  muscle_group: z.enum(MUSCLE_GROUPS).optional(),
  equipment: z.enum(EQUIPMENT).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  movement_pattern: z.enum(MOVEMENT_PATTERN_VALUES).optional(),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(2000).optional(),
  common_mistakes: z.string().max(2000).optional(),
  video_url: z
    .union([
      z.url().refine((u) => /^https?:\/\//i.test(u), 'Debe ser un enlace http(s) válido'),
      z.literal(''),
    ])
    .optional(),
  thumbnail_url: z
    .union([z.url().refine((u) => /^https?:\/\//i.test(u), 'URL inválida'), z.literal('')])
    .optional(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
});
export type ExerciseInput = z.infer<typeof exerciseSchema>;

/** Un ítem de ejercicio dentro de un día (usado en alta singular, en lote y update). */
export const planExerciseItemSchema = z.object({
  exercise_id: z.uuid('Selecciona un ejercicio'),
  sets: z.coerce.number().int('Series entero').min(1, 'Mínimo 1 serie').max(20, 'Máximo 20 series').default(3),
  reps: z.string().trim().min(1).max(20).default('10'),
  rest_seconds: z.coerce.number().int().min(0).max(3600).nullable().optional(),
  tempo: z.string().trim().max(20).nullable().optional(),
  suggested_weight_kg: z.coerce.number().min(0).max(1000).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type PlanExerciseItemInput = z.infer<typeof planExerciseItemSchema>;

export const contentPostSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(160),
  category: z.string().max(60).optional(),
  summary: z.string().max(300).optional(),
  body: z.string().max(8000).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
});
export type ContentPostInput = z.infer<typeof contentPostSchema>;
