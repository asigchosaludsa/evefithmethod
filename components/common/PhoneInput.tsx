'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  toWhatsappNumber,
  isValidNational,
} from '@/domain/contact/phone';

export interface PhoneInputProps {
  /** Name of the hidden field that posts the international digits (no `+`). */
  name: string;
  /** Mark the national field as required (blocks native submit when empty). */
  required?: boolean;
  /** Initial dialing code (defaults to Ecuador). */
  defaultDial?: string;
  /** Initial national number (digits, may include trunk 0). */
  defaultNational?: string;
  /** Notified on every change with the combined number + validity. */
  onChange?: (intlDigits: string, valid: boolean) => void;
  id?: string;
}

/**
 * Country picker + national-number field. Posts the combined international
 * number (digits only, no `+`) through a hidden input named `name`, ready for
 * `wa.me`. Enforces the per-country digit count via native validation and an
 * inline hint.
 */
export function PhoneInput({
  name,
  required,
  defaultDial = DEFAULT_COUNTRY.dial,
  defaultNational = '',
  onChange,
  id,
}: PhoneInputProps) {
  const [dial, setDial] = React.useState(defaultDial);
  const [national, setNational] = React.useState(defaultNational.replace(/\D/g, ''));

  const country = COUNTRIES.find((c) => c.dial === dial) ?? DEFAULT_COUNTRY;
  const intl = toWhatsappNumber(dial, national);
  const valid = isValidNational(country, national);
  const showError = national.length > 0 && !valid;

  function emit(nextDial: string, nextNational: string) {
    const c = COUNTRIES.find((x) => x.dial === nextDial) ?? DEFAULT_COUNTRY;
    onChange?.(toWhatsappNumber(nextDial, nextNational), isValidNational(c, nextNational));
  }

  // Emit once on mount so parents can gate buttons from the prefilled value.
  React.useEffect(() => {
    emit(dial, national);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative shrink-0">
          <select
            aria-label="Código de país"
            value={dial}
            onChange={(e) => {
              setDial(e.target.value);
              emit(e.target.value, national);
            }}
            className={cn(
              'h-10 appearance-none rounded-md border border-border bg-surface pl-3 pr-8 text-sm text-foreground',
              'transition-colors duration-150 ease-out focus:border-primary focus:outline-none',
            )}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.dial}>
                {c.flag} +{c.dial}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-faint"
            aria-hidden
          />
        </div>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          value={national}
          pattern={`\\d{${country.nationalLen}}`}
          title={`Ingresa ${country.nationalLen} dígitos${country.code === 'EC' ? ' (ej: 0961234567)' : ''}.`}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, country.nationalLen);
            setNational(v);
            emit(dial, v);
          }}
          placeholder={country.code === 'EC' ? '0961234567' : `${country.nationalLen} dígitos`}
          className={cn(
            'h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground',
            'transition-colors duration-150 ease-out focus:border-primary focus:outline-none',
            showError && 'border-warning',
          )}
        />
      </div>
      {/* Posts the combined international number (digits only) for the server. */}
      <input type="hidden" name={name} value={intl} />
      {showError && (
        <p className="text-xs text-warning">
          {country.code === 'EC'
            ? 'Ingresa los 10 dígitos de tu celular (ej: 0961234567).'
            : `Ingresa los ${country.nationalLen} dígitos del número.`}
        </p>
      )}
    </div>
  );
}
