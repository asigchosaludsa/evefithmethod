'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import type { ActionState } from '@/lib/auth/action-state';
import { leadRequestSchema } from '@/lib/validators/lead';

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? 'Revisa los datos ingresados.';
}

/** Read a FormData field as a string, treating empty/whitespace as undefined. */
function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Public lead-request submission. Validates input, rate-limits by IP, and
 * inserts through the admin client (there is no public RLS insert policy on
 * `leads`). Returns an inline ActionState; the form renders its own success
 * panel, so this never redirects.
 */
export async function submitLeadRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await checkRateLimit('lead', { max: 5, windowSeconds: 3600 }))) {
    return { error: 'Demasiadas solicitudes. Intenta más tarde.' };
  }

  const captchaToken = (formData.get('cf-turnstile-response') as string) || undefined;
  if (!(await verifyTurnstile(captchaToken))) {
    return { error: 'No pudimos verificar que eres humano. Recarga e intenta de nuevo.' };
  }

  const parsed = leadRequestSchema.safeParse({
    full_name: field(formData, 'full_name'),
    email: field(formData, 'email'),
    phone: field(formData, 'phone'),
    goal: field(formData, 'goal'),
    experience_level: field(formData, 'experience_level'),
    age: field(formData, 'age'),
    city: field(formData, 'city'),
    availability: field(formData, 'availability'),
    injuries: field(formData, 'injuries'),
    message: field(formData, 'message'),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const data = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin.from('leads').insert({
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    goal: data.goal,
    experience_level: data.experience_level ?? null,
    age: data.age ?? null,
    city: data.city ?? null,
    availability: data.availability ?? null,
    injuries: data.injuries ?? null,
    message: data.message ?? null,
    status: 'new',
  });
  if (error) return { error: 'No se pudo enviar tu solicitud. Intenta de nuevo.' };

  return { success: 'ok' };
}
