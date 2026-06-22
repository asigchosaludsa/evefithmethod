import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface PendingInvitation {
  id: string;
  email: string;
  student_name: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
}

/**
 * All invitations for a coach, newest first. RLS scopes rows to the coach.
 * Includes every status; callers typically surface `pending` ones prominently.
 */
export async function getCoachInvitations(coachId: string): Promise<PendingInvitation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('invitations')
    .select('id, email, student_name, status, expires_at, created_at')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    student_name: row.student_name ?? null,
    status: row.status,
    expires_at: row.expires_at ?? null,
    created_at: row.created_at,
  }));
}
