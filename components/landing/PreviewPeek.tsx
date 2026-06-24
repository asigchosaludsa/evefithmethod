import { Apple, Camera, Check, Dumbbell, Flame, LineChart, X } from 'lucide-react';
import { Reveal } from '@/components/marketing/Reveal';
import { DemoButton } from './DemoButton';

/** Inline style helper to set the stagger step for `.efm-fade-up`. */
function step(n: number): React.CSSProperties {
  return { ['--efm-step' as string]: n };
}

/* ===========================================================================
   "Míralo por dentro" — mini-previews fieles de las pantallas reales de la app.
   Todo es mock estático (sin datos en vivo): valores coherentes, mismos tokens
   de diseño "Acero & Escarlata". Cada preview es una tarjeta compacta.
   =========================================================================== */

/** Marco de tarjeta de preview con cabecera tipo "pantalla de la app". */
function PreviewFrame({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: typeof Dumbbell;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group relative h-full overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-lg transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-20px_color-mix(in_oklab,var(--color-primary)_45%,transparent)] ${className ?? ''}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* --- (a) Sesión completada: anillo escarlata 100% + racha + ✓/✗ -------------- */
function SessionPreview() {
  const C = 2 * Math.PI * 30;
  const lines = [
    { name: 'Sentadilla', done: true },
    { name: 'Press banca', done: true },
    { name: 'Remo con barra', done: true },
    { name: 'Plancha', done: false },
  ];
  return (
    <PreviewFrame title="Entrenamiento" icon={Dumbbell}>
      <div className="flex items-center gap-4">
        <div className="relative size-[68px] shrink-0">
          <svg width="68" height="68" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--color-hairline)" strokeWidth="7" />
            <circle
              cx="36" cy="36" r="30" fill="none" stroke="var(--color-primary)" strokeWidth="7"
              strokeLinecap="round" transform="rotate(-90 36 36)" strokeDasharray={C} strokeDashoffset={0}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Check className="size-6 text-primary" aria-hidden />
          </div>
        </div>
        <div>
          <p className="font-semibold text-foreground">¡Sesión completada!</p>
          <p className="text-xs text-muted">Hoy · Tren superior</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Flame className="size-3" aria-hidden /> Racha de 6 días
          </span>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5">
        {lines.map((l) => (
          <li key={l.name} className="flex items-center gap-2 text-sm">
            {l.done ? <Check className="size-4 text-primary" aria-hidden /> : <X className="size-4 text-faint" aria-hidden />}
            <span className={l.done ? 'text-foreground' : 'text-faint'}>{l.name}</span>
          </li>
        ))}
      </ul>
    </PreviewFrame>
  );
}

/* --- (b) Calendario de la semana con ✓/✗ ------------------------------------- */
function WeekPreview() {
  const days = [
    { d: 'L', state: 'done' as const },
    { d: 'M', state: 'done' as const },
    { d: 'X', state: 'miss' as const },
    { d: 'J', state: 'done' as const },
    { d: 'V', state: 'done' as const },
    { d: 'S', state: 'rest' as const },
    { d: 'D', state: 'today' as const },
  ];
  return (
    <PreviewFrame title="Tu semana" icon={Check}>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((x, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase text-faint">{x.d}</span>
            <span
              className={[
                'flex size-8 items-center justify-center rounded-lg border text-xs font-semibold',
                x.state === 'done' && 'border-primary/40 bg-primary/12 text-primary',
                x.state === 'miss' && 'border-hairline bg-canvas text-faint',
                x.state === 'rest' && 'border-hairline bg-canvas text-muted',
                x.state === 'today' && 'border-primary bg-primary text-on-primary shadow-[0_0_12px_color-mix(in_oklab,var(--color-primary)_60%,transparent)]',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {x.state === 'done' && <Check className="size-4" aria-hidden />}
              {x.state === 'miss' && <X className="size-4" aria-hidden />}
              {x.state === 'rest' && '·'}
              {x.state === 'today' && '★'}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        <span className="font-semibold text-foreground">4 de 5</span> entrenos hechos esta semana
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hairline">
        <div className="h-full rounded-full bg-primary" style={{ width: '80%' }} />
      </div>
    </PreviewFrame>
  );
}

/* --- (c) Dashboard de progreso: anillo de meta + línea de peso --------------- */
function ProgressPreview() {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const pct = 68;
  const offset = circ * (1 - pct / 100);
  // Línea de peso de muestra (descendente, coherente con una meta de bajada).
  const W = 240, H = 76, padX = 6, padY = 10;
  const kgs = [74.0, 73.4, 73.1, 72.5, 72.2, 71.6, 71.2];
  const lo = Math.min(...kgs, 70);
  const hi = Math.max(...kgs);
  const span = hi - lo || 1;
  const x = (i: number) => padX + (i * (W - 2 * padX)) / (kgs.length - 1);
  const y = (kg: number) => padY + (1 - (kg - lo) / span) * (H - 2 * padY);
  const path = kgs.map((kg, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(kg).toFixed(1)}`).join(' ');
  const goalY = y(70);
  return (
    <PreviewFrame title="Progreso" icon={LineChart}>
      <div className="flex items-center gap-4">
        <div className="relative size-[72px] shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-hairline)" strokeWidth="8" />
            <circle
              cx="36" cy="36" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="8" strokeLinecap="round"
              transform="rotate(-90 36 36)" strokeDasharray={circ} strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="tabular text-base font-bold text-foreground">{pct}%</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted">Avance hacia tu meta</p>
          <p className="tabular font-semibold text-foreground">71.2 kg → 70 kg</p>
          <p className="text-xs text-muted">Te faltan 1.2 kg</p>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="mt-3" role="img" aria-label="Evolución de peso">
        <line x1={padX} x2={W - padX} y1={goalY} y2={goalY} stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="4 3" opacity={0.55} />
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {kgs.map((kg, i) => (
          <circle key={i} cx={x(i)} cy={y(kg)} r="2.4" fill="var(--color-primary)" />
        ))}
      </svg>
      <p className="text-xs text-muted">↘ −2.8 kg desde el inicio · línea punteada = meta</p>
    </PreviewFrame>
  );
}

/* --- (d) Día de comidas con macros ------------------------------------------- */
function MealsPreview() {
  const macros = [
    { label: 'Proteína', val: 128, target: 150, color: 'var(--color-primary)' },
    { label: 'Carbos', val: 180, target: 220, color: 'var(--color-info)' },
    { label: 'Grasas', val: 52, target: 60, color: 'var(--color-warning)' },
  ];
  const meals = [
    { name: 'Desayuno', kcal: 420 },
    { name: 'Almuerzo', kcal: 640 },
    { name: 'Snack', kcal: 210 },
  ];
  return (
    <PreviewFrame title="Nutrición" icon={Apple}>
      <div className="flex items-baseline justify-between">
        <p className="tabular text-2xl font-bold text-foreground">
          1 270<span className="ml-1 text-sm font-medium text-muted">/ 1 600 kcal</span>
        </p>
      </div>
      <div className="mt-3 space-y-2.5">
        {macros.map((m) => {
          const pct = Math.min(100, Math.round((m.val / m.target) * 100));
          return (
            <div key={m.label}>
              <div className="flex justify-between text-xs">
                <span className="text-muted">{m.label}</span>
                <span className="tabular font-medium text-foreground">{m.val} / {m.target} g</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hairline">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: m.color }} />
              </div>
            </div>
          );
        })}
      </div>
      <ul className="mt-4 space-y-1.5">
        {meals.map((m) => (
          <li key={m.name} className="flex items-center justify-between rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <Check className="size-3.5 text-success" aria-hidden /> {m.name}
            </span>
            <span className="tabular text-xs text-muted">{m.kcal} kcal</span>
          </li>
        ))}
      </ul>
    </PreviewFrame>
  );
}

/* --- (e) Antes / después ----------------------------------------------------- */
function PhotosPreview() {
  return (
    <PreviewFrame title="Fotos de progreso" icon={Camera}>
      <div className="grid grid-cols-2 gap-3">
        {[
          { tag: 'Antes', wk: 'Semana 1' },
          { tag: 'Ahora', wk: 'Semana 12' },
        ].map((p, i) => (
          <figure key={p.tag} className="relative overflow-hidden rounded-xl border border-hairline bg-canvas">
            <div
              className="aspect-[3/4] w-full"
              style={{
                background:
                  i === 0
                    ? 'linear-gradient(160deg, color-mix(in oklab, var(--color-muted) 18%, var(--color-canvas)), var(--color-canvas))'
                    : 'linear-gradient(160deg, color-mix(in oklab, var(--color-primary) 24%, var(--color-canvas)), var(--color-canvas))',
              }}
            >
              {/* Silueta abstracta para sugerir una foto sin usar una real. */}
              <svg viewBox="0 0 60 80" className="h-full w-full opacity-50" aria-hidden>
                <circle cx="30" cy="22" r="9" fill="color-mix(in oklab, var(--color-foreground) 22%, transparent)" />
                <path d="M14 76c0-12 7-22 16-22s16 10 16 22z" fill="color-mix(in oklab, var(--color-foreground) 22%, transparent)" />
              </svg>
            </div>
            <figcaption className="absolute left-2 top-2 rounded-md bg-canvas/80 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
              {p.tag}
            </figcaption>
            <figcaption className="absolute bottom-2 left-2 text-[10px] text-muted">{p.wk}</figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">Compara tu evolución lado a lado, semana a semana.</p>
    </PreviewFrame>
  );
}

/* --- Panel grande destacado: pantalla "Hoy" completa -------------------------
   "Hola, Camila" con vida: avatar de iniciales, punto "en vivo" pulsando, línea
   de contexto (día + racha) y entrada escalonada de las filas. Todo CSS-only
   (visible por defecto sin JS; `efm-fade-up` solo anima al montar bajo
   no-preference; el bloque global neutraliza todo bajo reduced-motion). */
function FeaturedToday() {
  const rows = [
    { v: 75, label: 'Entrenamiento', color: 'var(--color-primary)', sub: 'Tren superior · 6 ejercicios' },
    { v: 79, label: 'Alimentación', color: 'var(--color-warning)', sub: '1 270 / 1 600 kcal' },
    { v: 40, label: 'Recuperación', color: 'var(--color-success)', sub: '6 h 20 min de sueño' },
  ];
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-elevated p-6 shadow-2xl sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-primary/15 blur-3xl transition-transform duration-500 group-hover:scale-125"
      />
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">EVEFIT / METHOD</span>
        {/* Punto "en vivo": halo que respira (animate-ping, neutralizado por el
            bloque reduced-motion global) detrás de un punto sólido + etiqueta. */}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="relative flex size-2.5">
            <span className="efm-live-ping absolute inline-flex size-full rounded-full bg-primary" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">En vivo</span>
        </span>
      </div>

      {/* Saludo con avatar de iniciales. */}
      <div className="efm-fade-up relative mt-5 flex items-center gap-3" style={step(0)}>
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 font-display text-lg font-bold text-primary shadow-[inset_0_1px_0_color-mix(in_oklab,white_18%,transparent)]"
        >
          C
        </span>
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold leading-tight text-foreground">Hola, Camila</p>
          <p className="text-sm text-muted">Esto es lo que te toca hoy.</p>
        </div>
      </div>

      {/* Línea de contexto: día del programa + racha. */}
      <p className="efm-fade-up relative mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted" style={step(1)}>
        <span className="font-medium text-foreground">Día 12</span>
        <span aria-hidden className="text-faint">·</span>
        <span className="inline-flex items-center gap-1">
          racha <Flame className="size-3.5 text-primary" aria-hidden /> 3
        </span>
        <span aria-hidden className="text-faint">·</span>
        <span>Tren superior hoy</span>
      </p>

      <div className="relative mt-5 grid gap-3">
        {rows.map((r, i) => {
          const dash = 2 * Math.PI * 18;
          const off = dash * (1 - r.v / 100);
          return (
            <div
              key={r.label}
              className="efm-fade-up flex items-center gap-4 rounded-2xl border border-hairline bg-surface px-4 py-3 transition-colors duration-200 group-hover:border-border"
              style={step(i + 2)}
            >
              <div className="relative size-[46px] shrink-0">
                <svg width="46" height="46" viewBox="0 0 46 46">
                  <circle cx="23" cy="23" r="18" fill="none" stroke="var(--color-hairline)" strokeWidth="5" />
                  <circle
                    cx="23" cy="23" r="18" fill="none" stroke={r.color} strokeWidth="5" strokeLinecap="round"
                    transform="rotate(-90 23 23)" strokeDasharray={dash} strokeDashoffset={off}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="tabular text-[11px] font-bold text-foreground">{r.v}%</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{r.label}</p>
                <p className="truncate text-xs text-muted">{r.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Mini-previews ordenadas; el índice alimenta el stagger del scroll-reveal. */
const PREVIEWS = [SessionPreview, ProgressPreview, WeekPreview, MealsPreview, PhotosPreview];

export function PreviewPeek() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal className="mb-10 max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-primary">
          Demo en vivo
        </span>
        <h2 className="mt-4 font-display text-3xl font-bold text-foreground sm:text-4xl">Míralo por dentro</h2>
        <p className="mt-2 text-muted">
          Así se ve tu día como alumna: entrenos, comidas y progreso en un solo lugar. Entra a la demo
          y trastea con datos reales — no se guarda nada.
        </p>
      </Reveal>

      {/* Panel destacado + grid escalonado. El featured ocupa una columna ancha
          en pantallas grandes; las mini-previews se escalonan por índice. */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
        <Reveal className="reveal-zoom sm:col-span-2 lg:col-span-4 lg:row-span-2">
          <FeaturedToday />
        </Reveal>

        {PREVIEWS.map((Preview, i) => (
          <Reveal
            key={i}
            className="reveal-zoom lg:col-span-4"
            style={{ ['--reveal-delay' as string]: `${(i + 1) * 70}ms` }}
          >
            <Preview />
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-10 flex flex-col items-center gap-3 text-center">
        <DemoButton pulse label="Entrar a la demo como alumna" />
        <p className="text-xs text-faint">Sin registro · se borra al salir o a las pocas horas.</p>
      </Reveal>
    </section>
  );
}
