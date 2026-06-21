/**
 * Centralized, lazily-validated environment access.
 * Values are read on call (not at import) so that static builds without env
 * configured do not throw — only code paths that actually need Supabase do.
 */

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing env NEXT_PUBLIC_SUPABASE_URL');
  }
  return url;
}

/** Public anon/publishable key — safe in the browser. Accepts new or legacy name. */
export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      'Missing env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)',
    );
  }
  return key;
}

/** Server-only secret key. Throws if called in a context without it set. */
export function getSupabaseSecretKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error('Missing env SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)');
  }
  return key;
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? 'http://localhost:3000';
