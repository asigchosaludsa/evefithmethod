import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * `cookies()` is async in Next 15+, so this is an async factory.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component where cookies are read-only.
          // The session is refreshed in middleware, so this is safe to ignore.
        }
      },
    },
  });
}
