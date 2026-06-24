'use client';

import { useEffect, useRef } from 'react';
import { Check, Dumbbell, Flame } from 'lucide-react';

/* ===========================================================================
   CinematicReveal — "Tu día se arma mientras bajas"
   ---------------------------------------------------------------------------
   Pieza central de la landing v2: una sección scroll-scrubbed (efecto tipo
   Apple AirPods) donde el "día" de la alumna se construye conforme bajas.

   Mecánica (robusta, cross-browser, sin dependencias):
   - Sección externa alta (≈300vh desktop / menos en móvil). Contenedor interno
     `sticky top-0 h-screen` que queda pinned mientras se scrollea.
   - Un único bucle rAF calcula `progress` (0→1) = cuánto ha avanzado el viewport
     a través de la sección, y lo escribe como CSS var `--p` en el contenedor
     pinned. La escena lee `--p` por `calc()` en estilos inline → el navegador
     interpola transform/opacity/stroke-dashoffset sin re-render de React.
   - Un IntersectionObserver activa/desactiva el listener de scroll: solo corre
     mientras la sección es visible. Listener + observer se limpian al desmontar.

   Estado FINAL por defecto (SSR / sin JS / reduced-motion):
   - `--p` arranca en `1` (inline en el marcado). El JS solo lo baja a 0 una vez
     que confirma que hay movimiento permitido y la sección es visible. Así, sin
     JS o con `prefers-reduced-motion: reduce`, se ve el teléfono ya armado, sin
     scrubbing, con el contenido visible — nunca oculto detrás de JS.

   Solo se animan transform / opacity / stroke-dashoffset; `will-change` acotado
   a las capas animadas; un solo rAF.
   =========================================================================== */

/** clamp tipado a [0,1]. */
function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/* --- Tramos de progreso (bandas). Cada elemento mapea el `--p` global a un
   local 0→1 vía calc() inline: clamp((p - start) / (end - start)). ----------- */
const BANDS = {
  phone: { start: 0.0, end: 0.2 },
  ring: { start: 0.2, end: 0.45 },
  line: { start: 0.45, end: 0.65 },
  cal: { start: 0.65, end: 0.85 },
  done: { start: 0.85, end: 1.0 },
} as const;

/** CSS `calc()` que da el progreso local (0→1) de una banda a partir de `--p`.
   Se clampa con min()/max() para que quede en [0,1] sin saltos. */
function band(b: { start: number; end: number }): string {
  const span = b.end - b.start;
  return `clamp(0, calc((var(--p) - ${b.start}) / ${span}), 1)`;
}

/* Geometría del anillo "Entrenamiento" (misma convención que GoalProgressRing /
   PreviewPeek: r, circ, rotate(-90), strokeLinecap round). El anillo llega a 75%. */
const RING_R = 52;
const RING_CIRC = 2 * Math.PI * RING_R;
const RING_TARGET = 0.75; // 75%
// dashoffset final (a 75%) y de partida (vacío = circ).
const RING_OFFSET_FULL = RING_CIRC * (1 - RING_TARGET);

/* Línea de peso (descendente, coherente con una meta de bajada). Se calcula el
   path a longitud fija para usar stroke-dashoffset y "dibujarla". */
const LINE_W = 232;
const LINE_H = 88;
const LINE_KGS = [74.0, 73.5, 73.2, 72.6, 72.1, 71.5, 71.2];
const LINE_LO = Math.min(...LINE_KGS, 70.5);
const LINE_HI = Math.max(...LINE_KGS);
const LINE_SPAN = LINE_HI - LINE_LO || 1;
const LINE_PADX = 8;
const LINE_PADY = 12;
const lineX = (i: number): number =>
  LINE_PADX + (i * (LINE_W - 2 * LINE_PADX)) / (LINE_KGS.length - 1);
const lineY = (kg: number): number =>
  LINE_PADY + (1 - (kg - LINE_LO) / LINE_SPAN) * (LINE_H - 2 * LINE_PADY);
const LINE_PATH = LINE_KGS.map(
  (kg, i) => `${i === 0 ? 'M' : 'L'} ${lineX(i).toFixed(1)} ${lineY(kg).toFixed(1)}`,
).join(' ');
// Longitud aproximada del polilínea (suma de segmentos) para el dash.
const LINE_LEN = (() => {
  let total = 0;
  for (let i = 1; i < LINE_KGS.length; i++) {
    const a = LINE_KGS[i - 1];
    const b = LINE_KGS[i];
    if (a === undefined || b === undefined) continue;
    const dx = lineX(i) - lineX(i - 1);
    const dy = lineY(b) - lineY(a);
    total += Math.hypot(dx, dy);
  }
  return Math.ceil(total) + 4;
})();

/* Días de la semana para los ✓ escalonados. */
const WEEK_DAYS = [
  { d: 'L', on: true },
  { d: 'M', on: true },
  { d: 'X', on: false },
  { d: 'J', on: true },
  { d: 'V', on: true },
] as const;

/* Macros que se llenan en la banda del calendario. */
const MACROS = [
  { label: 'Proteína', pct: 85, color: 'var(--color-primary)' },
  { label: 'Carbos', pct: 72, color: 'var(--color-info)' },
  { label: 'Grasas', pct: 64, color: 'var(--color-warning)' },
] as const;

/* Captions de scrollytelling, sincronizadas a las bandas. Solo la de la banda
   actual queda prominente (opacidad/escala mayores). */
const CAPTIONS = [
  {
    band: BANDS.ring,
    title: 'Sabes qué entrenar hoy',
    body: 'Tu plan del día, con series, reps y el peso sugerido. Sin pensar de más.',
  },
  {
    band: BANDS.line,
    title: 'Ves tu progreso real',
    body: 'Peso, medidas y fotos. La línea baja y lo notas semana a semana.',
  },
  {
    band: BANDS.cal,
    title: 'Tu coach te acompaña',
    body: 'Revisa lo que registras, ajusta tu plan y te mantiene en rumbo.',
  },
  {
    band: BANDS.done,
    title: 'Constancia que se nota',
    body: 'Cada día claro. Eso es lo que construye resultados de verdad.',
  },
] as const;

export function CinematicReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;

    // Respeta reduced-motion: dejamos el estado final estático (--p = 1).
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    let rafId = 0;
    let ticking = false;
    let active = false;

    const compute = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // Distancia "scrubbable" = alto de la sección menos el alto pinned (vh).
      // progress = cuánto del recorrido pinned se ha consumido.
      const scrubbable = rect.height - vh;
      const progress = scrubbable > 0 ? clamp01(-rect.top / scrubbable) : rect.top <= 0 ? 1 : 0;
      pin.style.setProperty('--p', progress.toFixed(4));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(compute);
    };

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && !active) {
          active = true;
          window.addEventListener('scroll', onScroll, { passive: true });
          window.addEventListener('resize', onScroll, { passive: true });
          compute(); // posición inicial al entrar
        } else if (!entry.isIntersecting && active) {
          active = false;
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        }
      },
      { threshold: 0 },
    );
    io.observe(section);

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="cinematic-title"
      className="relative h-[260vh] sm:h-[300vh]"
    >
      {/* Contenedor pinned. `--p` arranca en 1 → estado final por defecto
          (SSR / sin JS / reduced-motion). El JS lo baja a 0 al activar. */}
      <div
        ref={pinRef}
        className="efm-cinematic sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-4 sm:px-6"
        style={{ ['--p' as string]: '1' }}
      >
        {/* Glow escarlata de fondo: aparece con el teléfono y respira sutil. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[58vmin] w-[58vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--color-primary) 26%, transparent), transparent 68%)',
            filter: 'blur(48px)',
            opacity: `calc(0.35 + 0.65 * ${band(BANDS.phone)})`,
          }}
        />

        <h2 id="cinematic-title" className="sr-only">
          Tu día se arma mientras bajas
        </h2>

        <div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
          {/* Captions (scrollytelling). En lg van a la izquierda; en móvil debajo. */}
          <ol className="order-2 space-y-3 lg:order-1 lg:space-y-5">
            {CAPTIONS.map((c) => {
              const local = band(c.band);
              return (
                <li
                  key={c.title}
                  className="efm-cine-cap rounded-2xl border border-hairline bg-surface/60 p-4 backdrop-blur-sm sm:p-5"
                  style={{
                    // Prominencia ligada a la banda: entra desde abajo + se realza.
                    opacity: `calc(0.32 + 0.68 * ${local})`,
                    transform: `translateY(calc((1 - ${local}) * 14px))`,
                    borderColor: `color-mix(in oklab, var(--color-primary) calc(${local} * 45%), var(--color-hairline))`,
                  }}
                >
                  <h3
                    className="font-display text-lg font-bold text-foreground sm:text-xl"
                    style={{ color: `color-mix(in oklab, var(--color-primary) calc(${local} * 100%), var(--color-foreground))` }}
                  >
                    {c.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{c.body}</p>
                </li>
              );
            })}
          </ol>

          {/* Teléfono on-brand. Entra (escala/fade/rotateY) y arma su contenido. */}
          <div
            className="efm-cine-phone order-1 mx-auto lg:order-2"
            style={{
              opacity: band(BANDS.phone),
              transform: `perspective(1200px) rotateY(calc((1 - ${band(BANDS.phone)}) * -10deg)) scale(calc(0.92 + 0.08 * ${band(BANDS.phone)}))`,
            }}
          >
            <PhoneScene />
          </div>
        </div>

        {/* Hint de scroll: visible al inicio, se desvanece al avanzar. */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-center"
          style={{ opacity: `calc(1 - ${band({ start: 0.02, end: 0.12 })})` }}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
            Baja para ver tu día
          </span>
          <div className="mx-auto mt-2 flex h-7 w-4 items-start justify-center rounded-full border border-faint/60 p-1">
            <span className="efm-cine-dot block size-1 rounded-full bg-faint" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   La pantalla del teléfono. Estructura fiel a la app ("Hoy"): cabecera EVEFIT,
   "Hola, Camila", anillo de Entrenamiento, línea de peso, semana + macros, y el
   estado final "Tu día, claro". Todo se revela por bandas vía `--p`.
   --------------------------------------------------------------------------- */
function PhoneScene() {
  return (
    <div className="relative w-[270px] shrink-0 sm:w-[300px]">
      {/* Marco del dispositivo. */}
      <div className="relative overflow-hidden rounded-[2.4rem] border border-border bg-elevated p-3 shadow-2xl ring-1 ring-black/40">
        {/* Notch. */}
        <div
          aria-hidden
          className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-canvas"
        />
        {/* Pantalla. */}
        <div className="relative h-[540px] overflow-hidden rounded-[2rem] bg-canvas px-4 pb-4 pt-8">
          {/* Cabecera. */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">
              EVEFIT / METHOD
            </span>
            <span
              aria-hidden
              className="size-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"
            />
          </div>
          <p className="mt-3 font-display text-xl font-bold text-foreground">Hola, Camila</p>
          <p className="text-xs text-muted">Esto es lo que te toca hoy.</p>

          {/* (1) Anillo de Entrenamiento — se llena 0→75% en su banda. */}
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-hairline bg-surface px-4 py-3">
            <div className="relative size-[72px] shrink-0">
              <svg width="72" height="72" viewBox="0 0 128 128" aria-hidden>
                <circle cx="64" cy="64" r={RING_R} fill="none" stroke="var(--color-hairline)" strokeWidth="11" />
                <circle
                  cx="64"
                  cy="64"
                  r={RING_R}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="11"
                  strokeLinecap="round"
                  transform="rotate(-90 64 64)"
                  strokeDasharray={RING_CIRC}
                  style={{
                    // De vacío (circ) → 75% (RING_OFFSET_FULL) según la banda del anillo.
                    strokeDashoffset: `calc(${RING_CIRC} - (${RING_CIRC - RING_OFFSET_FULL}) * ${band(BANDS.ring)})`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Dumbbell
                  className="size-5 text-primary"
                  aria-hidden
                  style={{ opacity: band({ start: 0.3, end: 0.45 }) }}
                />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Entrenamiento</p>
              <p className="truncate text-xs text-muted">Tren superior · 6 ejercicios</p>
              <span
                className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                style={{ opacity: band({ start: 0.34, end: 0.45 }) }}
              >
                <Flame className="size-2.5" aria-hidden /> 75% · racha 6 días
              </span>
            </div>
          </div>

          {/* (2) Línea de peso — se dibuja (stroke-dashoffset) en su banda. */}
          <div className="mt-3 rounded-2xl border border-hairline bg-surface px-4 py-3">
            <div className="flex items-baseline justify-between">
              <p className="text-xs text-muted">Progreso de peso</p>
              <p
                className="tabular text-xs font-semibold text-foreground"
                style={{ opacity: band({ start: 0.5, end: 0.65 }) }}
              >
                71.2 kg
              </p>
            </div>
            <svg
              width="100%"
              viewBox={`0 0 ${LINE_W} ${LINE_H}`}
              className="mt-1"
              role="img"
              aria-label="Evolución de peso descendente"
            >
              {/* Meta (línea punteada) — aparece con la línea. */}
              <line
                x1={LINE_PADX}
                x2={LINE_W - LINE_PADX}
                y1={lineY(70.5)}
                y2={lineY(70.5)}
                stroke="var(--color-primary)"
                strokeWidth="1"
                strokeDasharray="4 3"
                style={{ opacity: `calc(0.5 * ${band(BANDS.line)})` }}
              />
              <path
                d={LINE_PATH}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={LINE_LEN}
                style={{ strokeDashoffset: `calc(${LINE_LEN} * (1 - ${band(BANDS.line)}))` }}
              />
            </svg>
          </div>

          {/* (3) Semana (✓ escalonados) + macros (se llenan) en su banda. */}
          <div className="mt-3 rounded-2xl border border-hairline bg-surface px-4 py-3">
            <p className="text-xs text-muted">Tu semana</p>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {WEEK_DAYS.map((x, i) => {
                // Stagger: cada día entra en una sub-ventana de la banda cal.
                const t0 = 0.65 + (i * 0.16) / WEEK_DAYS.length;
                const local = band({ start: t0, end: t0 + 0.05 });
                return (
                  <div
                    key={x.d}
                    className="flex flex-col items-center gap-1"
                    style={{
                      opacity: local,
                      transform: `scale(calc(0.6 + 0.4 * ${local}))`,
                    }}
                  >
                    <span className="text-[9px] font-medium uppercase text-faint">{x.d}</span>
                    <span
                      className={[
                        'flex size-7 items-center justify-center rounded-lg border text-[10px] font-semibold',
                        x.on
                          ? 'border-primary/40 bg-primary/12 text-primary'
                          : 'border-hairline bg-canvas text-faint',
                      ].join(' ')}
                    >
                      {x.on ? <Check className="size-3.5" aria-hidden /> : '·'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 space-y-2">
              {MACROS.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted">{m.label}</span>
                    <span
                      className="tabular font-medium text-foreground"
                      style={{ opacity: band(BANDS.cal) }}
                    >
                      {m.pct}%
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-hairline">
                    <div
                      className="h-full origin-left rounded-full"
                      style={{
                        width: `${m.pct}%`,
                        background: m.color,
                        transform: `scaleX(${band(BANDS.cal)})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* (4) Overlay final "Tu día, claro" — se funde encima al cerrar. */}
        <div
          className="pointer-events-none absolute inset-3 flex flex-col items-center justify-end rounded-[2rem] pb-8"
          style={{
            opacity: band(BANDS.done),
            background:
              'linear-gradient(to top, color-mix(in oklab, var(--color-canvas) 92%, transparent) 18%, transparent 60%)',
          }}
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/12 px-3 py-1 text-[11px] font-semibold text-primary"
            style={{
              transform: `translateY(calc((1 - ${band(BANDS.done)}) * 10px))`,
            }}
          >
            <Check className="size-3.5" aria-hidden /> Tu día, claro
          </span>
          <p
            className="mt-2 px-6 text-center font-display text-base font-bold text-foreground"
            style={{ transform: `translateY(calc((1 - ${band(BANDS.done)}) * 10px))` }}
          >
            Todo en un solo lugar.
          </p>
        </div>
      </div>
    </div>
  );
}
