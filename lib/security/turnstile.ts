import 'server-only';

const SECRET = process.env.TURNSTILE_SECRET_KEY;
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Server-side Cloudflare Turnstile verification for NON-Supabase endpoints
 * (e.g. the public lead form). Supabase Auth verifies its own captcha tokens
 * internally, so this is only for forms we handle ourselves.
 *
 * Fails OPEN when the secret is not configured (so the form keeps working
 * before Turnstile is set up) and on network errors. Once the secret is set,
 * a missing/invalid token is rejected.
 */
export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  if (!SECRET) return true; // not configured yet: do not block
  if (!token) return false;
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: SECRET, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return true; // network error: fail open, do not lock out legitimate users
  }
}
