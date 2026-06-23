/**
 * Helpers to build `wa.me` deep links for invitations.
 *
 * No WhatsApp Business API is involved: this only composes a `https://wa.me/...`
 * URL with a prefilled message that the coach taps to send from her own
 * WhatsApp. Nothing is sent automatically.
 */

/**
 * Normalize a phone number into the digits-only, country-coded form that
 * `wa.me` expects (no `+`, spaces or dashes). Returns `''` when there are no
 * digits. Note: `wa.me` requires the country code; we cannot infer it, so the
 * caller is responsible for collecting a number that already includes it.
 */
export function normalizeWhatsappNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/** Compose the friendly Spanish invitation message (name optional). */
export function buildWhatsappInviteMessage(studentName: string | null | undefined, link: string): string {
  const name = (studentName ?? '').trim();
  const greeting = name ? `Hola ${name} 👋` : 'Hola 👋';
  return `${greeting} Te invito a EveFit Method, tu plataforma de entrenamiento y nutrición. Acepta tu invitación aquí: ${link}`;
}

export interface WhatsappInviteHrefInput {
  phone: string | null | undefined;
  studentName?: string | null;
  link: string;
}

/** Mínimo de dígitos de un número válido (código de país + abonado). Evita
 *  abrir wa.me solo con el código de país (p.ej. "593"). */
const MIN_WHATSAPP_DIGITS = 8;

/**
 * Build a ready-to-open `wa.me` href with the invitation message URL-encoded.
 * Returns `null` when the phone is missing or too short (so the UI can disable
 * the button instead of opening an invalid link like wa.me/593).
 */
export function buildWhatsappInviteHref({ phone, studentName, link }: WhatsappInviteHrefInput): string | null {
  const digits = normalizeWhatsappNumber(phone);
  if (digits.length < MIN_WHATSAPP_DIGITS) return null;
  const message = buildWhatsappInviteMessage(studentName, link);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
