'use server';

import { revalidatePath } from 'next/cache';
import { requireCoach } from '@/lib/auth/roles';
import { acceptInvitation, cancelInvitation, createInvitation } from '@/lib/db/mutations/invitations';
import { acceptInvitationSchema, inviteStudentSchema } from '@/lib/validators/invitation';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getURL } from '@/lib/utils/url';

export type AcceptState = { error?: string; success?: boolean; email?: string };

export async function acceptInvitationAction(formData: FormData): Promise<AcceptState> {
  const parsed = acceptInvitationSchema.safeParse({
    token: formData.get('token'),
    full_name: formData.get('full_name'),
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
    accept_terms: formData.get('accept_terms') === 'on',
    accept_disclaimer: formData.get('accept_disclaimer') === 'on',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }

  if (!(await checkRateLimit('accept-invite', { max: 10, windowSeconds: 600 }))) {
    return { error: 'Demasiados intentos. Espera un momento e intenta de nuevo.' };
  }

  const res = await acceptInvitation({
    token: parsed.data.token,
    password: parsed.data.password,
    fullName: parsed.data.full_name,
  });
  if (!res.success) return { error: res.error };
  return { success: true, email: res.email };
}

export type InviteState = { error?: string; link?: string };

export async function inviteStudentAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const coach = await requireCoach();
  const parsed = inviteStudentSchema.safeParse({
    email: formData.get('email'),
    student_name: formData.get('student_name'),
    goal: formData.get('goal') || undefined,
    message: formData.get('message') || undefined,
    expires_in_days: formData.get('expires_in_days') || 7,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }

  try {
    const { token } = await createInvitation({
      coachId: coach.id,
      email: parsed.data.email,
      studentName: parsed.data.student_name,
      goal: parsed.data.goal,
      message: parsed.data.message,
      expiresInDays: parsed.data.expires_in_days,
    });
    revalidatePath('/coach/students');
    return { link: getURL(`/accept-invitation?token=${token}`) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo crear la invitación.' };
  }
}

export async function cancelInvitationAction(invitationId: string): Promise<void> {
  const coach = await requireCoach();
  await cancelInvitation(invitationId, coach.id);
  revalidatePath('/coach/students');
  revalidatePath('/coach/students/invite');
}
