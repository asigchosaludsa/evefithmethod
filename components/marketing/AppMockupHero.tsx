'use client';

import { useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { ProgressRing } from '@/components/common';

const ROWS = [
  { v: 75, label: 'Entrenamiento', color: 'var(--color-primary)', highlight: true },
  { v: 60, label: 'Alimentación', color: 'var(--color-warning)', highlight: false },
  { v: 40, label: 'Recuperación', color: 'var(--color-success)', highlight: false },
];

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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            <span aria-hidden className="relative flex size-2">
              <span className="efm-live-ping absolute inline-flex size-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            En vivo
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-base font-bold text-primary ring-1 ring-primary/30"
          >
            C
          </span>
          <div className="min-w-0">
            <p className="font-display text-xl font-bold leading-tight text-foreground">Hola, Camila</p>
            <p className="text-[11px] text-muted">
              Día 12 · <span className="font-medium text-primary">racha 🔥 3</span> · tren superior hoy
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {ROWS.map((r) => (
            <div
              key={r.label}
              className={`flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5 ${
                r.highlight ? 'border-primary/50' : 'border-hairline'
              }`}
            >
              <ProgressRing value={r.v} size={40} strokeWidth={5} color={r.color}>
                <span className="tabular text-[10px] font-bold text-foreground">{r.v}%</span>
              </ProgressRing>
              <span className="flex-1 text-sm font-medium text-foreground">{r.label}</span>
              <ChevronRight className="size-4 text-muted" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
