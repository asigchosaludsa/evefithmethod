import Link from 'next/link';
import {
  Activity,
  Apple,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  Dumbbell,
  LineChart,
  ShieldCheck,
} from 'lucide-react';
import { PublicNav } from '@/components/navigation/PublicNav';
import { Button, Logo } from '@/components/common';

const FEATURES = [
  { icon: Apple, title: 'Nutrición y macros', desc: 'Planes, registro de comidas y cálculo automático de calorías y macros.' },
  { icon: Dumbbell, title: 'Entrenamientos', desc: 'Rutinas con series, reps, descansos y registro de pesos usados.' },
  { icon: LineChart, title: 'Progreso real', desc: 'Peso, medidas y fotos para ver la evolución semana a semana.' },
  { icon: Activity, title: 'Coach Radar', desc: 'Alertas que muestran qué alumna necesita revisión hoy.' },
  { icon: ClipboardList, title: 'Tips y contenido', desc: 'Material educativo asignado a cada alumna según su momento.' },
  { icon: ShieldCheck, title: 'Privado y seguro', desc: 'Cada alumna ve solo lo suyo. Datos protegidos de extremo a extremo.' },
];

const STEPS = [
  { n: '01', title: 'La coach invita', desc: 'Cada alumna entra por invitación y completa su perfil.' },
  { n: '02', title: 'Recibe su plan', desc: 'Nutrición y entrenamiento personalizados, claros para hoy.' },
  { n: '03', title: 'Registra y avanza', desc: 'Comidas, entrenos y progreso. La coach acompaña y ajusta.' },
];

export default function LandingPage() {
  return (
    <>
      <PublicNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(60% 50% at 50% -10%, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 70%)',
            }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-20 text-center sm:px-6 sm:pt-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted">
              Fuerza · Disciplina · Método
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              Tu coaching fitness y nutricional, con <span className="text-primary">método</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
              EveFit Method conecta a la coach con cada alumna. La alumna sabe qué hacer hoy. La coach
              sabe a quién revisar hoy.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">
                  Empezar ahora <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Ya tengo cuenta</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-lg border border-border bg-surface p-6">
                <span className="font-display text-sm font-bold tracking-widest text-primary">{s.n}</span>
                <h3 className="mt-3 font-display text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="mb-8 flex items-center gap-3">
            <CalendarCheck className="size-5 text-primary" aria-hidden />
            <h2 className="font-display text-2xl font-bold text-foreground">Todo en un solo lugar</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border border-border bg-surface p-5">
                <span className="flex size-9 items-center justify-center rounded-md bg-primary/12 text-primary">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-3 font-display text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="rounded-xl border border-primary/25 bg-gradient-to-b from-primary/10 to-transparent p-8 text-center sm:p-12">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Empieza tu método hoy
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Crea tu cuenta o acepta la invitación de tu coach y empieza a ver resultados con
              acompañamiento real.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/register">
                Crear cuenta <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
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
