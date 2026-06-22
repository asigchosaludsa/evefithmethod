import 'server-only';

const KEY = process.env.RESEND_API_KEY;
const FROM = 'EveFit Method <no-reply@evefitmethod.com>';

/**
 * Send a transactional email via Resend. Fails SOFT: returns false on any error
 * (missing key, network, API error) so the calling flow is never broken by a
 * mail failure. Auth emails (recovery/confirm) are sent by Supabase itself;
 * this is for app-driven emails (invitation, welcome).
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  /** Optional file attachments. `content` is a base64-encoded string. */
  attachments?: { filename: string; content: string }[];
}): Promise<boolean> {
  if (!KEY) return false;
  try {
    const body: Record<string, unknown> = {
      from: FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    };
    if (params.attachments && params.attachments.length > 0) {
      body.attachments = params.attachments;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
