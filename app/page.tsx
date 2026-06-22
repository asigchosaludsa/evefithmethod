import Link from 'next/link';
import { ArrowRight, Dumbbell, Apple, LineChart, Activity, BookOpen } from 'lucide-react';
import { PublicNav } from '@/components/navigation/PublicNav';
import { Button, Logo } from '@/components/common';
import { Hero } from '@/components/marketing/Hero';
import { Marquee } from '@/components/marketing/Marquee';

const STEPS = [
  { n: '1', title: 'La coach te invita', desc: 'Entras por un enlace de invitación y completas tu perfil en minutos.' },
  { n: '2', title: 'Recibes tu plan', desc: 'Entrenamiento y nutrición personalizados, con lo que toca hacer hoy.' },
  { n: '3', title: 'Registras y avanzas', desc: 'Comidas, entrenos y progreso. Tu coach revisa y ajusta contigo.' },
];

export default function LandingPage() {
  return (
    <>
      <PublicNav />

      <main className="flex-1">
        <Hero />

        <Marquee
          items={['Entrenamiento', 'Nutrición', 'Progreso real', 'Coach Radar', 'Por invitación', 'Macros en vivo', 'Constancia']}
        />

        {/* Cómo funciona — genuine 3-step sequence */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="reveal mb-10 max-w-xl">
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Cómo funciona</h2>
            <p className="mt-2 text-muted">Tres pasos, sin complicaciones.</p>
          </div>
          <ol className="relative grid gap-8 sm:grid-cols-3">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent sm:block"
            />
            {STEPS.map((s) => (
              <li key={s.n} className="reveal relative">
                <div className="flex size-10 items-center justify-center rounded-full border border-primary/40 bg-canvas font-display text-lg font-bold text-primary">
                  {s.n}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features — training emphasized, asymmetric (not an identical grid) */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Big: training */}
            <article className="reveal group relative overflow-hidden rounded-2xl border border-border bg-surface p-7 lg:col-span-2 lg:row-span-2">
              <div
                aria-hidden
                className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl transition-transform duration-500 group-hover:scale-150"
              />
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Dumbbell className="size-6" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-2xl font-bold text-foreground">Entrenamiento que se siente tuyo</h3>
              <p className="mt-2 max-w-md text-muted">
                Tu coach arma los días, ejercicios, series, reps y peso sugerido. Tú registras lo que
                hiciste, ves tu progreso por ejercicio y la técnica en video.
              </p>
              <ul className="mt-6 grid gap-2 text-sm text-muted sm:grid-cols-2">
                {['Planes por días', 'Series · reps · descanso', 'Peso usado y volumen', 'Historial por ejercicio'].map(
                  (f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" /> {f}
                    </li>
                  ),
                )}
              </ul>
            </article>

            <FeatureCard icon={Apple} title="Nutrición y macros" desc="Registra comidas y mira calorías y macros en vivo contra tu meta." />
            <FeatureCard icon={LineChart} title="Progreso real" desc="Peso, medidas y fotos para ver la evolución semana a semana." />
            <FeatureCard icon={Activity} title="Coach Radar" desc="Alertas que muestran a quién revisar hoy. Nada se te escapa." />
            <FeatureCard icon={BookOpen} title="Tips y contenido" desc="Material educativo que la coach asigna a cada alumna." />
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="reveal relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-b from-primary/12 to-transparent p-10 text-center sm:p-16">
            <div
              aria-hidden
              className="aurora absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full"
              style={{
                background: 'radial-gradient(circle, color-mix(in oklab, var(--color-primary) 30%, transparent), transparent 65%)',
                filter: 'blur(40px)',
              }}
            />
            <h2 className="relative font-display text-3xl font-bold text-foreground sm:text-4xl">Empieza tu método hoy</h2>
            <p className="relative mx-auto mt-3 max-w-md text-muted">
              Crea tu cuenta o acepta la invitación de tu coach y empieza con acompañamiento real.
            </p>
            <div className="relative mt-7 flex justify-center">
              <Button asChild size="lg">
                <Link href="/register">
                  Crear cuenta <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Logo />
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-faint">
            EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo
            médico, diagnóstico ni tratamiento profesional. Consulta con un profesional de salud antes de
            iniciar cambios importantes en alimentación o entrenamiento.
          </p>
          <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            <Link href="/login" className="hover:text-foreground">Iniciar sesión</Link>
            <Link href="/register" className="hover:text-foreground">Crear cuenta</Link>
            <Link href="/terms" className="hover:text-foreground">Términos</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacidad</Link>
            <Link href="/disclaimer" className="hover:text-foreground">Aviso de salud</Link>
          </nav>
          <p className="mt-6 text-xs text-faint">© {new Date().getFullYear()} EveFit Method</p>
        </div>
      </footer>
    </>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Dumbbell;
  title: string;
  desc: string;
}) {
  return (
    <article className="reveal rounded-2xl border border-border bg-surface p-6 transition-colors duration-200 hover:border-muted/40">
      <span className="flex size-10 items-center justify-center rounded-lg bg-elevated text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted">{desc}</p>
    </article>
  );
}
