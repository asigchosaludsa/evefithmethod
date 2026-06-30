import { z } from 'zod';

/** Goal options offered on the public lead-request form. */
export const GOAL_OPTIONS = [
  'Bajar grasa',
  'Ganar músculo',
  'Recomposición',
  'Salud general',
  'Otro',
] as const;

/** Experience-level options (optional field). */
export const LEVEL_OPTIONS = ['Principiante', 'Intermedio', 'Avanzado'] as const;

/** Turn '' (empty form value) into undefined so optionals stay optional. */
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const leadRequestSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Ingresa tu nombre completo')
    .max(120, 'El nombre es demasiado largo'),
  email: z.email('Email inválido'),
  // PhoneInput posts the combined international number as digits only
  // (country code + national, no '+'). Ecuador mobiles normalize to 12 digits.
  phone: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Teléfono inválido')
    .min(8, 'Ingresa un número de teléfono válido con código de país')
    .max(15, 'El teléfono es demasiado largo'),
  goal: z.enum(GOAL_OPTIONS, { message: 'Selecciona un objetivo' }),
  experience_level: z.preprocess(
    emptyToUndefined,
    z.enum(LEVEL_OPTIONS, { message: 'Selecciona un nivel válido' }).optional(),
  ),
  age: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ message: 'Edad inválida' })
      .int('Edad inválida')
      .min(14, 'Edad mínima 14')
      .max(100, 'Edad máxima 100')
      .optional(),
  ),
  city: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(80, 'La ciudad es demasiado larga').optional(),
  ),
  availability: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120, 'La disponibilidad es demasiado larga').optional(),
  ),
  injuries: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500, 'El texto es demasiado largo').optional(),
  ),
  message: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(1000, 'El mensaje es demasiado largo').optional(),
  ),
});

export type LeadRequestInput = z.infer<typeof leadRequestSchema>;
