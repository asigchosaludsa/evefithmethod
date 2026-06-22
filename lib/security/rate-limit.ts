import 'server-only';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Postgres-backed sliding-window rate limiter. SERVER ONLY.
 *
 * Every helper here FAILS OPEN: if the backend is unavailable (e.g. the
 * migration is not applied yet, or Supabase is unreachable) we return `true`
 * (allowed) so the app keeps working and never locks users out. Rate limiting
 * is a defensive layer, not a correctness guarantee.
 */

/** Best-effort client IP from proxy headers. Falls back to 'unknown'. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = h.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Low-level check against the Postgres limiter. Returns `true` when the attempt
 * is allowed. Catches ANY error and returns `true` (fail-open) on purpose.
 */
export async function rateLimit(
  bucket: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    // `check_rate_limit` is declared in the Database Functions type (added with
    // migration 0008). Fail-open if the function is not migrated yet.
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_bucket: bucket,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    // Fail-open on any backend error (e.g. function not yet migrated).
    if (error) return true;
    return data ?? true;
  } catch {
    // Fail-open: never block the happy path when the limiter is unavailable.
    return true;
  }
}

/**
 * Convenience wrapper keyed by IP (default) or an explicit key. Returns `true`
 * when the action is allowed.
 */
export async function checkRateLimit(
  action: string,
  opts: { max: number; windowSeconds: number; key?: string },
): Promise<boolean> {
  const key = opts.key ?? (await getClientIp());
  const bucket = `${action}:${key}`;
  return rateLimit(bucket, opts.max, opts.windowSeconds);
}
