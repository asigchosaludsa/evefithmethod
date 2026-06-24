'use client';

import { useEffect, useState } from 'react';

/**
 * Rotador de palabras SIN salto de layout (cero CLS). Todas las palabras se
 * apilan en la misma celda de un `inline-grid`, así el contenedor siempre mide
 * lo de la palabra más larga y el texto que lo rodea nunca reflowea (ese era el
 * bug al llegar a "disciplina"). La visible hace cross-fade; las demás quedan
 * ocultas (opacity 0 + aria-hidden). Respeta prefers-reduced-motion vía la regla
 * global de globals.css (que neutraliza transiciones).
 */
export function WordRotator({
  words,
  intervalMs = 2600,
  fadeMs = 260,
  className,
}: {
  words: string[];
  intervalMs?: number;
  fadeMs?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (words.length <= 1) return;
    let inner: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      setOn(false);
      inner = setTimeout(() => {
        setI((p) => (p + 1) % words.length);
        setOn(true);
      }, fadeMs);
    }, intervalMs);
    return () => {
      clearInterval(id);
      if (inner) clearTimeout(inner);
    };
  }, [words.length, intervalMs, fadeMs]);

  return (
    <span style={{ display: 'inline-grid' }} className={className} aria-live="polite">
      {words.map((w, idx) => {
        const active = idx === i;
        return (
          <span
            key={w}
            aria-hidden={!active || undefined}
            style={{
              gridArea: '1 / 1',
              textAlign: 'left',
              transition: `opacity ${fadeMs}ms var(--ease-out), transform ${fadeMs}ms var(--ease-out)`,
              opacity: active && on ? 1 : 0,
              transform: active && on ? 'translateY(0)' : 'translateY(0.25em)',
              pointerEvents: active ? undefined : 'none',
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
}
