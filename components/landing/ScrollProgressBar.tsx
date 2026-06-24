'use client';

import { useEffect, useRef, useState } from 'react';

/* ===========================================================================
   ScrollProgressBar — barra delgada escarlata arriba que se llena con el scroll.
   ---------------------------------------------------------------------------
   SOLO landing pública (se monta en app/page.tsx). NO se confunde con la
   RouteProgress de la app (esa vive en AppShell, otro árbol; indica transición
   de ruta, no scroll). z-index propio y distinto para no chocar.

   - Client, scroll rAF-throttled. NO re-renderiza React por frame: escribe la
     CSS var `--sp` (0→1) y aplica `transform: scaleX(var(--sp))` (origen
     izquierda). Listener de scroll/resize limpiado al desmontar.
   - prefers-reduced-motion: reduce → no renderiza nada (sin barra que crezca).
     Sin JS no aparece (no es contenido, es un realce) — sin pérdida de info.
   - Solo transform; will-change acotado a la barra.
   =========================================================================== */
export function ScrollProgressBar() {
  const [enabled, setEnabled] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: no-preference)');
    const apply = () => setEnabled(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const bar = barRef.current;
    if (!bar) return;

    let rafId = 0;
    let ticking = false;

    const compute = () => {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? doc.scrollTop / max : 0;
      const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
      bar.style.setProperty('--sp', clamped.toFixed(4));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(compute);
    };

    compute(); // posición inicial (p. ej. recarga a media página)
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5"
    >
      <div
        ref={barRef}
        className="h-full origin-left bg-primary shadow-[0_0_8px_var(--color-primary)]"
        style={{
          ['--sp' as string]: '0',
          transform: 'scaleX(var(--sp))',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
