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
          <span aria-hidden className="size-2.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
        </div>

        <p className="mt-4 font-display text-xl font-bold text-foreground">Hola, Camila</p>
        <p className="text-xs text-muted">Tu método de hoy</p>

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
