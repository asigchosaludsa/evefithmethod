'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Size = 'md' | 'lg';
type Variant = 'solid' | 'outline';

const SIZES: Record<Size, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

const VARIANTS: Record<Variant, string> = {
  // Scarlet-tinted glass: reads as the demo CTA without competing with the
  // solid primary "Empieza ya" next to it.
  solid:
    'border border-primary/45 bg-primary/12 text-foreground hover:bg-primary/18 hover:border-primary/70',
  outline: 'border border-border text-foreground hover:bg-elevated hover:border-muted/40',
};

type Phase = 'idle' | 'loading' | 'error';

export interface DemoButtonProps {
  label?: string;
  size?: Size;
  variant?: Variant;
  className?: string;
  /** Adds the subtle scarlet pulse (use once per viewport, e.g. the previews CTA). */
  pulse?: boolean;
}

/**
 * CTA that drops the visitor straight into a disposable demo student session.
 *
 * Turnstile token handling: the widget renders inline (managed mode) and
 * auto-solves, stashing its token via onSuccess. On click we use the ready
 * token immediately; if it has not arrived yet we flip to a "preparing" state
 * and submit as soon as onSuccess fires (tracked by a pending ref) — so the
 * user never has to click twice. On any failure we reset the widget so the
 * next click gets a fresh token.
 */
export function DemoButton({
  label = 'Echa un vistazo — entra como alumna',
  size = 'lg',
  variant = 'solid',
  className,
  pulse = false,
}: DemoButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const pendingRef = useRef(false);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  const widgetId = useId();

  const start = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/demo/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ captchaToken: token }),
      });
      const json: { ok?: boolean; redirect?: string; error?: string } = await res
        .json()
        .catch(() => ({}));

      if (res.ok && json.ok && json.redirect) {
        // Keep the loading state through the navigation (no flicker back to idle).
        window.location.href = json.redirect;
        return;
      }
      setError(json.error ?? 'No se pudo iniciar la demo. Intenta de nuevo.');
      setPhase('error');
    } catch {
      setError('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
      setPhase('error');
    } finally {
      // The token is single-use; always reset so a retry gets a fresh one.
      tokenRef.current = null;
      turnstileRef.current?.reset();
    }
  }, []);

  const onClick = useCallback(() => {
    if (phase === 'loading') return;
    setError(null);

    // No Turnstile configured (e.g. local without a key): start without a token;
    // the server still rate-limits and will reject if it requires one.
    if (!siteKey) {
      setPhase('loading');
      void start('');
      return;
    }

    const token = tokenRef.current;
    if (token) {
      setPhase('loading');
      void start(token);
    } else {
      // Token not ready yet: show progress and let onSuccess fire the request.
      pendingRef.current = true;
      setPhase('loading');
    }
  }, [phase, start]);

  const onSuccess = useCallback(
    (token: string) => {
      tokenRef.current = token;
      if (pendingRef.current) {
        pendingRef.current = false;
        void start(token);
      }
    },
    [start],
  );

  const onExpire = useCallback(() => {
    tokenRef.current = null;
  }, []);

  const onError = useCallback(() => {
    tokenRef.current = null;
    if (pendingRef.current) {
      pendingRef.current = false;
      setError('No pudimos verificarte. Recarga la página e intenta de nuevo.');
      setPhase('error');
    }
  }, []);

  const loading = phase === 'loading';

  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        aria-busy={loading}
        aria-describedby={error ? `${widgetId}-err` : undefined}
        className={cn(
          'btn-sheen group inline-flex items-center justify-center gap-2 rounded-md font-medium select-none',
          'transition-[transform,background-color,box-shadow,border-color] duration-150 ease-out',
          'active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
          'disabled:cursor-progress disabled:opacity-90',
          SIZES[size],
          VARIANTS[variant],
          pulse && !loading && 'btn-demo-pulse',
        )}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Preparando tu demo…
          </>
        ) : (
          <>
            <Sparkles className="size-4 text-primary transition-transform duration-200 ease-out group-hover:scale-110" aria-hidden />
            {label}
            <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden />
          </>
        )}
      </button>

      {error && (
        <p id={`${widgetId}-err`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {/* Managed Turnstile widget. Invisible/managed challenges render nothing
          visible; if a key is configured it solves in the background and feeds
          the token via onSuccess. Hidden from layout but kept in the DOM. */}
      {siteKey && (
        <div aria-hidden className="sr-only">
          <Turnstile
            ref={turnstileRef}
            siteKey={siteKey}
            options={{ theme: 'dark', size: 'invisible' }}
            onSuccess={onSuccess}
            onExpire={onExpire}
            onError={onError}
          />
        </div>
      )}
    </div>
  );
}
