'use server';

import { revalidatePath } from 'next/cache';
import { requireCoach } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOwnerEmail } from '@/lib/auth/owner';
import { cancelInvitation } from '@/lib/db/mutations/invitations';

/**
 * Permanently delete a registered account and all its data. FK is ON DELETE
 * CASCADE from auth.users -> profiles -> every child table, so deleting the
 * auth user removes everything and frees the email for re-registration.
 * Guards against deleting the owner/coach or oneself.
 */
export async function deleteAccount(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const coach = await requireCoach();
    if (userId === coach.id) return { ok: false, error: 'No puedes eliminar tu propia cuenta.' };

    const admin = createAdminClient();
    const { data: target } = await admin
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .maybeSingle();
    if (target && (target.role === 'coach' || target.role === 'admin' || isOwnerEmail(target.email))) {
      return { ok: false, error: 'No se puede eliminar una cuenta de coach.' };
    }

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/coach/cuentas');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo eliminar la cuenta.' };
  }
}

/** Cancel a pending invitation from the accounts center. */
export async function cancelInvitationAdmin(invitationId: string): Promise<void> {
  const coach = await requireCoach();
  await cancelInvitation(invitationId, coach.id);
  revalidatePath('/coach/cuentas');
}
