'use client';

import { Turnstile } from '@marsidev/react-turnstile';

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Cloudflare Turnstile widget. Rendered inside a <form>, it auto-injects a
 * hidden input named `cf-turnstile-response` carrying the token, which the
 * server action reads. If no site key is configured it renders nothing, so the
 * form keeps working in environments where Turnstile is not set up.
 */
export function TurnstileField() {
  if (!siteKey) return null;
  return (
    <div className="flex justify-center">
      <Turnstile siteKey={siteKey} options={{ theme: 'dark' }} />
    </div>
  );
}
