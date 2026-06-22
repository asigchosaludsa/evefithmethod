import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateInvitationToken, hashToken } from '@/lib/utils/tokens';
import { sendEmail } from '@/lib/email/send';
import { renderEmail } from '@/lib/email/render';

export interface CreateInvitationInput {
  coachId: string;
  email: string;
  studentName: string;
  goal?: string;
  message?: string;
  expiresInDays: number;
}

/** Coach creates an invitation. Returns the raw token (shown once). */
export async function createInvitation(input: CreateInvitationInput): Promise<{ id: string; token: string }> {
  const supabase = await createClient();
  const token = generateInvitationToken();
  const token_hash = hashToken(token);
  const expires_at = new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      coach_id: input.coachId,
      email: input.email.toLowerCase(),
      role: 'student',
      student_name: input.studentName,
      goal: input.goal ?? null,
      message: input.message ?? null,
      token_hash,
      status: 'pending',
      expires_at,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'No se pudo crear la invitación');
  return { id: data.id, token };
}

export type AcceptInvitationResult =
  | { success: true; email: string }
  | { success: false; error: string };

/**
 * Accept an invitation: validate token, create the auth user, set up the
 * student profile and the coach link. Runs with the service-role client.
 */
export async function acceptInvitation(input: {
  token: string;
  password: string;
  fullName: string;
}): Promise<AcceptInvitationResult> {
  const admin = createAdminClient();
  const token_hash = hashToken(input.token);

  const { data: inv } = await admin
    .from('invitations')
    .select('*')
    .eq('token_hash', token_hash)
    .maybeSingle();

  if (!inv || inv.status !== 'pending') {
    return { success: false, error: 'La invitación no es válida o ya fue utilizada.' };
  }
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    await admin.from('invitations').update({ status: 'expired' }).eq('id', inv.id);
    return { success: false, error: 'La invitación expiró. Pídele a tu coach una nueva.' };
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: inv.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (createErr || !created.user) {
    return { success: false, error: createErr?.message ?? 'No se pudo crear la cuenta.' };
  }
  const userId = created.user.id;

  await admin
    .from('profiles')
    .update({ role: 'student', status: 'active', full_name: input.fullName, onboarding_completed: true })
    .eq('id', userId);

  await admin
    .from('student_profiles')
    .upsert({ user_id: userId, goal: inv.goal ?? null }, { onConflict: 'user_id' });

  await admin
    .from('coach_students')
    .upsert(
      { coach_id: inv.coach_id, student_id: userId, status: 'active' },
      { onConflict: 'coach_id,student_id' },
    );

  await admin
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', inv.id);

  // Welcome email (fails soft: never block a successful registration).
  const tpl = await renderEmail('welcome', { nombre: input.fullName });
  if (tpl) await sendEmail({ to: inv.email, subject: tpl.subject, html: tpl.html });

  return { success: true, email: inv.email };
}

/**
 * Accept an invitation for a user who signed in via OAuth (e.g. Google). The
 * auth user already exists; we match a pending invitation by email and wire up
 * the student profile and coach link. No-op (returns false) when there is no
 * matching pending invitation. Runs with the service-role client.
 */
export async function acceptInvitationForOAuthUser(input: {
  userId: string;
  email: string;
}): Promise<boolean> {
  const email = input.email.toLowerCase();
  if (!email) return false;

  const admin = createAdminClient();

  const { data: inv } = await admin
    .from('invitations')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (!inv) return false;
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    await admin.from('invitations').update({ status: 'expired' }).eq('id', inv.id);
    return false;
  }

  // Keep an existing profile name if present; otherwise use the invitation name.
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', input.userId)
    .maybeSingle();
  const fullName = existingProfile?.full_name || inv.student_name;

  await admin
    .from('profiles')
    .update({ role: 'student', status: 'active', full_name: fullName, onboarding_completed: true })
    .eq('id', input.userId);

  await admin
    .from('student_profiles')
    .upsert({ user_id: input.userId, goal: inv.goal ?? null }, { onConflict: 'user_id' });

  await admin
    .from('coach_students')
    .upsert(
      { coach_id: inv.coach_id, student_id: input.userId, status: 'active' },
      { onConflict: 'coach_id,student_id' },
    );

  await admin
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', inv.id);

  // Welcome email (fails soft: never block a successful registration).
  const tpl = await renderEmail('welcome', { nombre: fullName ?? '' });
  if (tpl) await sendEmail({ to: inv.email, subject: tpl.subject, html: tpl.html });

  return true;
}

/** Cancel a pending invitation (coach action). Scoped to the owning coach. */
export async function cancelInvitation(invitationId: string, coachId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)
    .eq('coach_id', coachId);
}
