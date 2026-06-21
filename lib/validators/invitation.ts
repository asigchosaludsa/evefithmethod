import { z } from 'zod';

export const inviteStudentSchema = z.object({
  email: z.email('Email inválido'),
  student_name: z.string().min(2, 'Ingresa el nombre').max(120),
  goal: z.string().max(300).optional(),
  message: z.string().max(500).optional(),
  expires_in_days: z.coerce.number().int().min(1).max(60).default(7),
});
export type InviteStudentInput = z.infer<typeof inviteStudentSchema>;

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(10, 'Token inválido'),
    full_name: z.string().min(2, 'Ingresa tu nombre completo'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm_password: z.string(),
    accept_terms: z.literal(true, { message: 'Debes aceptar los términos' }),
    accept_disclaimer: z.literal(true, { message: 'Debes aceptar el aviso de salud' }),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
  });
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
