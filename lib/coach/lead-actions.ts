'use server';

import { revalidatePath } from 'next/cache';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { createInvitation } from '@/lib/db/mutations/invitations';
import { getURL } from '@/lib/utils/url';
import { sendEmail } from '@/lib/email/send';
import { invitationEmail } from '@/lib/email/templates';

export type ConvertLeadResult =
  | { ok: true; link: string; phone: string; email: string; emailed: boolean }
  | { ok: false; error: string };

/** Mark a lead as contacted. RLS scopes the update to the owning coach. */
export async function markLeadContacted(leadId: string): Promise<void> {
  await requireCoach();
  const supabase = await createClient();
  await supabase.from('leads').update({ status: 'contacted' }).eq('id', leadId);
  revalidatePath('/coach/solicitudes');
}

/** Mark a lead as rejected. RLS scopes the update to the owning coach. */
export async function markLeadRejected(leadId: string): Promise<void> {
  await requireCoach();
  const supabase = await createClient();
  await supabase.from('leads').update({ status: 'rejected' }).eq('id', leadId);
  revalidatePath('/coach/solicitudes');
}

/**
 * Convert a lead into a student invitation: create the invitation for this
 * coach + lead email, then stamp the lead as converted with the invitation id.
 * Returns the raw accept link (shown ONCE), plus the lead's phone + email so
 * the UI can offer WhatsApp / email sharing. On any failure returns { ok:false }.
 */
export async function convertLeadToInvitation(leadId: string): Promise<ConvertLeadResult> {
  try {
    const coach = await requireCoach();
    const supabase = await createClient();

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, full_name, email, phone, goal, status')
      .eq('id', leadId)
      .maybeSingle();

    if (leadError) return { ok: false, error: leadError.message };
    if (!lead) return { ok: false, error: 'No se encontró la solicitud.' };
    if (lead.status === 'converted') {
      return { ok: false, error: 'Esta solicitud ya fue convertida.' };
    }

    // createInvitation returns { id, token } where token is the raw, one-time token.
    const { id: invitationId, token } = await createInvitation({
      coachId: coach.id,
      email: lead.email,
      studentName: lead.full_name,
      goal: lead.goal,
      expiresInDays: 7,
    });

    const link = getURL(`/accept-invitation?token=${token}`);

    const { error: updateError } = await supabase
      .from('leads')
      .update({ status: 'converted', invitation_id: invitationId })
      .eq('id', leadId);
    if (updateError) return { ok: false, error: updateError.message };

    // Auto-send the invitation by email (fails soft: WhatsApp/copy still work).
    const tpl = invitationEmail({ name: lead.full_name, acceptUrl: link });
    const emailed = await sendEmail({ to: lead.email, subject: tpl.subject, html: tpl.html });

    revalidatePath('/coach/solicitudes');
    return { ok: true, link, phone: lead.phone, email: lead.email, emailed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo generar la invitación.' };
  }
}
