'use client';

import { useEffect, useRef, useState } from 'react';

/* ===========================================================================
   CursorGlow — glow escarlata sutil que sigue al cursor dentro del hero.
   ---------------------------------------------------------------------------
   - Solo desktop con puntero fino (hover: hover) and (pointer: fine) y solo si
     NO hay prefers-reduced-motion: reduce. En cualquier otro caso no renderiza
     nada (estático), así que móvil/táctil y reduced-motion quedan limpios.
   - El handler de pointermove está rAF-throttled y NO provoca re-render de
     React: escribe las CSS vars `--mx`/`--my` directamente sobre el elemento.
   - Escucha en el contenedor del hero (su `offsetParent` posicionado): se monta
     dentro de la capa de fondo del Hero, que es `absolute inset-0`. Se mide la
     posición relativa a esa capa. Listener + rAF se limpian al desmontar.
   - Solo pinta opacity/background-position (vía las vars en un radial-gradient);
     `will-change` acotado a la propia capa. Realza la aurora, no la domina.
   =========================================================================== */
export function CursorGlow() {
  // Sin movimiento permitido → no montamos el efecto (queda estático/ausente).
  const [enabled, setEnabled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const apply = () => setEnabled(motionOk.matches && finePointer.matches);
    apply();
    motionOk.addEventListener('change', apply);
    finePointer.addEventListener('change', apply);
    return () => {
      motionOk.removeEventListener('change', apply);
      finePointer.removeEventListener('change', apply);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    // El elemento que recibe el puntero es el contenedor posicionado del hero
    // (la capa de fondo es `absolute inset-0`; su padre es la <section> hero).
    const host = el?.parentElement;
    if (!el || !host) return;

    let rafId = 0;
    let ticking = false;
    let nextX = 0;
    let nextY = 0;

    const paint = () => {
      ticking = false;
      el.style.setProperty('--mx', `${nextX}px`);
      el.style.setProperty('--my', `${nextY}px`);
      el.style.setProperty('--glow-opacity', '1');
    };

    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      nextX = e.clientX - rect.left;
      nextY = e.clientY - rect.top;
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(paint);
    };

    const onLeave = () => {
      el.style.setProperty('--glow-opacity', '0');
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="efm-cursor-glow pointer-events-none absolute inset-0 -z-0 mix-blend-screen"
      style={{
        ['--mx' as string]: '50%',
        ['--my' as string]: '30%',
        ['--glow-opacity' as string]: '0',
        opacity: 'var(--glow-opacity)',
        background:
          'radial-gradient(280px circle at var(--mx) var(--my), color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 70%)',
        transition: 'opacity 320ms var(--ease-out, ease-out)',
        willChange: 'opacity, background',
      }}
    />
  );
}
