'use client';

import { useRef } from 'react';
import { Dumbbell } from 'lucide-react';
import { ProgressRing } from '@/components/common';

/** Decorative app "Hoy" screen with a subtle 3D tilt-on-pointer + float. */
export function AppMockupHero() {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${px * 9}deg) rotateX(${-py * 9}deg)`;
  }
  function leave() {
    if (ref.current) ref.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
  }

  return (
    <div className="relative mx-auto max-w-[22rem]" style={{ perspective: '1200px' }} onMouseMove={move} onMouseLeave={leave}>
      <div aria-hidden className="absolute -inset-6 rounded-[44px] bg-primary/15 blur-3xl" />
      <div
        ref={ref}
        className="float-slow relative rounded-[28px] border border-border bg-elevated p-5 shadow-2xl"
        style={{ transformStyle: 'preserve-3d', transition: 'transform 0.25s var(--ease-out)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">EVEFIT / METHOD</span>
          <span className="size-7 rounded-full border border-hairline bg-surface" />
        </div>

        <p className="mt-4 font-display text-xl font-bold text-foreground">Hola, Camila</p>
        <p className="text-xs text-muted">Hoy enfócate en tu proteína</p>

        <div className="mt-4 flex items-center gap-4">
          <ProgressRing value={79} size={92} strokeWidth={9}>
            <span className="tabular font-display text-lg font-bold text-foreground">1420</span>
            <span className="text-[10px] text-muted">/1800 kcal</span>
          </ProgressRing>
          <div className="flex-1 space-y-2">
            {[
              { l: 'Proteína', v: 72, c: 'var(--color-info)' },
              { l: 'Carbos', v: 64, c: 'var(--color-warning)' },
              { l: 'Grasas', v: 58, c: 'var(--color-success)' },
            ].map((m) => (
              <div key={m.l}>
                <div className="mb-1 flex justify-between text-[10px] text-muted">
                  <span>{m.l}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full" style={{ width: `${m.v}%`, backgroundColor: m.c }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm text-foreground">
          <Dumbbell className="size-4 text-primary" aria-hidden />
          Entreno de hoy: <b className="font-semibold">Tren inferior</b>
        </div>
        <div className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-on-primary">
          Registrar comida
        </div>
      </div>
    </div>
  );
}
