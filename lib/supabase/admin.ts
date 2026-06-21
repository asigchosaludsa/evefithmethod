import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabaseSecretKey, getSupabaseUrl } from '@/lib/env';

/**
 * Privileged Supabase client using the service-role/secret key.
 * SERVER ONLY. Bypasses RLS — use sparingly and only in trusted server code
 * (e.g. invitation acceptance). The `server-only` import makes any accidental
 * client-side import a build error.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
