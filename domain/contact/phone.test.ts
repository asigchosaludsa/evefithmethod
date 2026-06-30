import { describe, expect, it } from 'vitest';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  nationalSignificant,
  toWhatsappNumber,
  isValidNational,
  normalizeWhatsappNumber,
  isValidWhatsappNumber,
  countryByDial,
} from './phone';

describe('nationalSignificant', () => {
  it('strips non-digits and leading trunk zeros', () => {
    expect(nationalSignificant('0961029834')).toBe('961029834');
    expect(nationalSignificant('09 6102 9834')).toBe('961029834');
    expect(nationalSignificant('961029834')).toBe('961029834');
    expect(nationalSignificant('')).toBe('');
  });
});

describe('toWhatsappNumber', () => {
  it('combines dial code with national significant number', () => {
    // Ecuador: 0961029834 -> 593961029834
    expect(toWhatsappNumber('593', '0961029834')).toBe('593961029834');
    expect(toWhatsappNumber('57', '3001234567')).toBe('573001234567');
  });
  it('returns empty when no national number', () => {
    expect(toWhatsappNumber('593', '')).toBe('');
  });
});

describe('isValidNational', () => {
  const EC = countryByDial('593')!;
  it('accepts a 10-digit Ecuador mobile', () => {
    expect(isValidNational(EC, '0961029834')).toBe(true);
  });
  it('rejects too short / too long', () => {
    expect(isValidNational(EC, '096102')).toBe(false);
    expect(isValidNational(EC, '09610298349')).toBe(false);
  });
});

describe('normalizeWhatsappNumber', () => {
  it('fixes Mariana case: local Ecuador number -> full international', () => {
    expect(normalizeWhatsappNumber('0961029834')).toBe('593961029834');
  });
  it('keeps a number that already has the country code', () => {
    expect(normalizeWhatsappNumber('593961029834')).toBe('593961029834');
  });
  it('respects an explicit + international number', () => {
    expect(normalizeWhatsappNumber('+1 415 555 1234')).toBe('14155551234');
  });
  it('handles spaces and dashes in local numbers', () => {
    expect(normalizeWhatsappNumber('099-123-4567')).toBe('593991234567');
  });
  it('returns empty for empty input', () => {
    expect(normalizeWhatsappNumber('')).toBe('');
    expect(normalizeWhatsappNumber(null)).toBe('');
  });
});

describe('isValidWhatsappNumber', () => {
  it('accepts a normalized Ecuador number', () => {
    expect(isValidWhatsappNumber('0961029834')).toBe(true);
  });
  it('rejects a bare country code with no national part', () => {
    expect(isValidWhatsappNumber('+593')).toBe(false);
  });
  it('rejects empty', () => {
    expect(isValidWhatsappNumber('')).toBe(false);
  });
});

describe('COUNTRIES data', () => {
  it('has Ecuador as the default and first option', () => {
    expect(DEFAULT_COUNTRY.code).toBe('EC');
    expect(COUNTRIES[0]?.code).toBe('EC');
  });
  it('every country has a unique dial code', () => {
    const dials = COUNTRIES.map((c) => c.dial);
    expect(new Set(dials).size).toBe(dials.length);
  });
});
