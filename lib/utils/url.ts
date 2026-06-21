/**
 * Build absolute URLs that are correct per environment.
 * Local:      http://localhost:3000/...
 * Production: https://app.evefitmethod.com/...
 */
export function getURL(path = ''): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '') ||
    'http://localhost:3000';

  if (!url.startsWith('http')) url = `https://${url}`;
  url = url.replace(/\/+$/, '');

  if (!path) return url;
  return `${url}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Validate a `next` redirect param: only allow relative, single-leading-slash
 * paths (no protocol, no `//host`, no backslashes). Prevents open redirects.
 */
export function validateSafeRedirect(next: string | null | undefined, fallback = '/'): string {
  if (!next) return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}
