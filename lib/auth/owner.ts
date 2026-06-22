import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Single-owner model: the one coach (site owner) is identified by email via
 * OWNER_EMAIL. There is no public coach registration; the owner simply signs
 * in (e.g. with Google) and is recognized automatically.
 */
const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? '').trim().toLowerCase();

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!OWNER_EMAIL || !email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL;
}

/**
 * If the authenticated user is the configured owner, ensure their profile is an
 * active coach. Uses the admin client to bypass the role-escalation guard
 * trigger (which blocks non-service-role role changes). No-op for everyone else.
 */
export async function ensureOwnerPromoted(
  userId: string,
  email: string | null | undefined,
): Promise<void> {
  if (!isOwnerEmail(email)) return;
  const admin = createAdminClient();
  await admin
    .from('profiles')
    .update({ role: 'coach', status: 'active', onboarding_completed: true })
    .eq('id', userId);
}
