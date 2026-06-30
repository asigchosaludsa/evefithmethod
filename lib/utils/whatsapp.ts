/**
 * Helpers to build `wa.me` deep links for invitations.
 *
 * No WhatsApp Business API is involved: this only composes a `https://wa.me/...`
 * URL with a prefilled message that the coach taps to send from her own
 * WhatsApp. Nothing is sent automatically.
 *
 * Phone normalization (country code, trunk-zero handling) lives in the domain
 * layer — see `domain/contact/phone.ts`.
 */

import {
  normalizeWhatsappNumber,
  isValidWhatsappNumber,
} from '@/domain/contact/phone';

// Re-export so existing imports keep working.
export { normalizeWhatsappNumber, isValidWhatsappNumber };

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

/**
 * Build a ready-to-open `wa.me` href with the invitation message URL-encoded.
 * Returns `null` when the phone can't be normalized into a valid international
 * number (so the UI can disable the button instead of opening wa.me/593).
 */
export function buildWhatsappInviteHref({ phone, studentName, link }: WhatsappInviteHrefInput): string | null {
  if (!isValidWhatsappNumber(phone)) return null;
  const digits = normalizeWhatsappNumber(phone);
  const message = buildWhatsappInviteMessage(studentName, link);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
