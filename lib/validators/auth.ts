import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Ingresa tu nombre completo'),
    email: z.email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm_password: z.string(),
    accept_terms: z.literal(true, { message: 'Debes aceptar los términos' }),
    accept_privacy: z.literal(true, { message: 'Debes aceptar la política de privacidad' }),
    accept_disclaimer: z.literal(true, { message: 'Debes aceptar el aviso de salud' }),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email('Email inválido'),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });

export const onboardingSchema = z.object({
  full_name: z.string().min(2, 'Ingresa tu nombre completo'),
  goal: z.string().max(300).optional(),
  date_of_birth: z.string().optional(),
  height_cm: z.coerce.number().positive().max(260).nullable().optional(),
  current_weight_kg: z.coerce.number().positive().max(500).nullable().optional(),
  training_level: z.string().max(100).optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
