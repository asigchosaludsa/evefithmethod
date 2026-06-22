import { z } from 'zod';

export const coachNoteSchema = z.object({
  student_id: z.uuid(),
  note: z.string().min(1, 'Escribe una nota').max(2000),
  category: z.string().max(60).optional(),
});

export const exerciseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(120),
  muscle_group: z.string().max(60).optional(),
  equipment: z.string().max(60).optional(),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(2000).optional(),
  common_mistakes: z.string().max(2000).optional(),
  video_url: z
    .union([
      z.url().refine((u) => /^https?:\/\//i.test(u), 'Debe ser un enlace http(s) válido'),
      z.literal(''),
    ])
    .optional(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
});
export type ExerciseInput = z.infer<typeof exerciseSchema>;

export const contentPostSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(160),
  category: z.string().max(60).optional(),
  summary: z.string().max(300).optional(),
  body: z.string().max(8000).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
});
export type ContentPostInput = z.infer<typeof contentPostSchema>;
