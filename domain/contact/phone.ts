/**
 * Phone-number helpers for building valid WhatsApp (`wa.me`) links.
 *
 * `wa.me` requires a full international number in digits-only form (country code
 * + national number, no `+`, spaces or dashes) and rejects national trunk
 * prefixes such as Ecuador's leading `0`. These pure functions live in the
 * domain layer so they can be unit-tested and shared by both server actions and
 * client components.
 */

export interface Country {
  /** ISO 3166-1 alpha-2 code (used as a stable key). */
  code: string;
  /** Display name in Spanish. */
  name: string;
  /** International dialing code, digits only (e.g. '593'). */
  dial: string;
  /** Flag emoji for the picker. */
  flag: string;
  /**
   * Number of digits the user types for the national number, INCLUDING any
   * trunk prefix they habitually write (Ecuador mobiles are `09XXXXXXXX` = 10).
   */
  nationalLen: number;
}

/** Default country for new numbers (Ecuador). */
export const DEFAULT_COUNTRY: Country = {
  code: 'EC',
  name: 'Ecuador',
  dial: '593',
  flag: '🇪🇨',
  nationalLen: 10,
};

/** Countries offered in the phone picker. Ecuador first (default). */
export const COUNTRIES: Country[] = [
  DEFAULT_COUNTRY,
  { code: 'CO', name: 'Colombia', dial: '57', flag: '🇨🇴', nationalLen: 10 },
  { code: 'PE', name: 'Perú', dial: '51', flag: '🇵🇪', nationalLen: 9 },
  { code: 'MX', name: 'México', dial: '52', flag: '🇲🇽', nationalLen: 10 },
  { code: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱', nationalLen: 9 },
  { code: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷', nationalLen: 10 },
  { code: 'VE', name: 'Venezuela', dial: '58', flag: '🇻🇪', nationalLen: 10 },
  { code: 'BO', name: 'Bolivia', dial: '591', flag: '🇧🇴', nationalLen: 8 },
  { code: 'US', name: 'Estados Unidos', dial: '1', flag: '🇺🇸', nationalLen: 10 },
  { code: 'ES', name: 'España', dial: '34', flag: '🇪🇸', nationalLen: 9 },
];

/** Min/max digits of a valid international number (E.164 allows up to 15). */
export const MIN_INTL_DIGITS = 8;
export const MAX_INTL_DIGITS = 15;

/** Find a country by its dialing code. */
export function countryByDial(dial: string): Country | undefined {
  return COUNTRIES.find((c) => c.dial === dial);
}

/**
 * National significant number: digits only, with leading trunk zeros removed
 * (e.g. Ecuador `0961029834` → `961029834`).
 */
export function nationalSignificant(national: string | null | undefined): string {
  return (national ?? '').replace(/\D/g, '').replace(/^0+/, '');
}

/**
 * Combine a dialing code + national number into the digits-only international
 * form `wa.me` expects. Returns `''` when there is no national number.
 */
export function toWhatsappNumber(dial: string, national: string | null | undefined): string {
  const ns = nationalSignificant(national);
  return ns ? `${dial}${ns}` : '';
}

/** True when the typed national number has the expected length for the country. */
export function isValidNational(country: Country, national: string | null | undefined): boolean {
  const raw = (national ?? '').replace(/\D/g, '');
  return raw.length === country.nationalLen;
}

/**
 * Normalize an arbitrary stored phone string into the digits-only international
 * form for `wa.me`. Handles:
 *  - already-international values with a leading `+` (kept as-is, digits only),
 *  - values that already start with the default country code,
 *  - local numbers with a trunk `0` (e.g. Ecuador `0961029834` → `593961029834`),
 *  - bare national numbers (prepends the default dialing code).
 *
 * `defaultDial` is the assumed country code when none is present (Ecuador).
 */
export function normalizeWhatsappNumber(
  phone: string | null | undefined,
  defaultDial: string = DEFAULT_COUNTRY.dial,
): string {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  const hadPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // Explicit international (had a +): trust the digits as written.
  if (hadPlus) return digits;

  // Already prefixed with the default country code and long enough to include a
  // national part — leave it alone.
  if (digits.startsWith(defaultDial) && digits.length >= defaultDial.length + 7) {
    return digits;
  }

  // Local number: drop trunk zeros, prepend the default country code.
  const ns = digits.replace(/^0+/, '');
  return `${defaultDial}${ns}`;
}

/** True when the normalized number is a plausible international WhatsApp number. */
export function isValidWhatsappNumber(
  phone: string | null | undefined,
  defaultDial: string = DEFAULT_COUNTRY.dial,
): boolean {
  const digits = normalizeWhatsappNumber(phone, defaultDial);
  return digits.length >= MIN_INTL_DIGITS && digits.length <= MAX_INTL_DIGITS;
}
