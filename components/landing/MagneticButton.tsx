'use client';

import { useEffect, useRef, useState } from 'react';

/* ===========================================================================
   MagneticButton — atracción magnética sutil hacia el cursor.
   ---------------------------------------------------------------------------
   Envuelve (no reemplaza) un CTA: el <Button asChild><Link/></Button> sigue
   intacto. Este wrapper solo desplaza a su hijo unos pocos px hacia el cursor
   en hover y vuelve a su sitio al salir.

   - Solo desktop con puntero fino y sin prefers-reduced-motion: reduce. En otro
     caso renderiza el contenido sin transform (estático) — móvil/táctil y
     reduced-motion no se mueven.
   - rAF-throttled; NO re-renderiza React por movimiento: escribe `--tx`/`--ty`
     sobre el span interno que aplica translate(); spring-back vía transition.
   - Solo anima transform; `will-change: transform` acotado al span animado y
     solo mientras el efecto está activo. Listeners limpiados al desmontar.
   =========================================================================== */

const MAX_PULL = 6; // px máximos de desplazamiento (sutil).
const STRENGTH = 0.35; // fracción del offset cursor→centro que se aplica.

export function MagneticButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

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
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    let rafId = 0;
    let ticking = false;
    let nextX = 0;
    let nextY = 0;

    const clampPull = (n: number) => (n < -MAX_PULL ? -MAX_PULL : n > MAX_PULL ? MAX_PULL : n);

    const paint = () => {
      ticking = false;
      inner.style.setProperty('--tx', `${nextX.toFixed(2)}px`);
      inner.style.setProperty('--ty', `${nextY.toFixed(2)}px`);
    };

    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      nextX = clampPull((e.clientX - cx) * STRENGTH);
      nextY = clampPull((e.clientY - cy) * STRENGTH);
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(paint);
    };

    const onLeave = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      ticking = false;
      inner.style.setProperty('--tx', '0px');
      inner.style.setProperty('--ty', '0px');
    };

    wrap.addEventListener('pointermove', onMove, { passive: true });
    wrap.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  return (
    <span ref={wrapRef} className={className} style={{ display: 'inline-flex' }}>
      <span
        ref={innerRef}
        style={
          enabled
            ? {
                display: 'inline-flex',
                ['--tx' as string]: '0px',
                ['--ty' as string]: '0px',
                transform: 'translate(var(--tx), var(--ty))',
                transition: 'transform 280ms var(--ease-out, cubic-bezier(0.23,1,0.32,1))',
                willChange: 'transform',
              }
            : { display: 'inline-flex' }
        }
      >
        {children}
      </span>
    </span>
  );
}
