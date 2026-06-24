import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/common';
import { DemoButton } from '@/components/landing/DemoButton';
import { WordRotator } from './WordRotator';
import { AppMockupHero } from './AppMockupHero';
import { HeroBackgroundVideo } from './HeroBackgroundVideo';
import { CursorGlow } from '@/components/landing/CursorGlow';
import { MagneticButton } from '@/components/landing/MagneticButton';

const WORDS = ['método.', 'fuerza.', 'disciplina.', 'constancia.'];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Living background: premium video (poster-first) + scarlet glow + grid.
          Nota: este contenedor es `absolute inset-0` sobre la <section>, así que
          CursorGlow (que mide su `parentElement`) obtiene coords relativas al hero. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <HeroBackgroundVideo />
        <div
          className="aurora absolute left-1/2 top-[-22%] h-[55vh] w-[55vh] -translate-x-1/2 rounded-full opacity-70 mix-blend-screen"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--color-primary) 40%, transparent), transparent 64%)',
            filter: 'blur(36px)',
          }}
        />
        {/* Glow escarlata que sigue al cursor (desktop/hover only, reduced-motion → nada). */}
        <CursorGlow />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent 75%)',
          }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-2 lg:pt-28">
        <div>
          <span
            className="hero-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted backdrop-blur"
            style={{ '--i': 0 } as React.CSSProperties}
          >
            Fuerza · Disciplina · Método
          </span>
          <h1
            className="hero-rise mt-6 font-display text-[clamp(2.6rem,7vw,5rem)] font-extrabold leading-[1.02] tracking-tight text-foreground"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            Tu coaching fitness para entrenar
            <br />
            con{' '}
            <WordRotator words={WORDS} className="relative align-bottom text-primary" />
          </h1>
          <p
            className="hero-rise mt-5 max-w-md text-base text-muted sm:text-lg"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            La coach arma tu plan. Tú sabes qué hacer hoy; ella sabe qué revisar. Acompañamiento
            real, método eficaz, resultados garantizados.
          </p>
          <div
            className="hero-rise mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            style={{ '--i': 3 } as React.CSSProperties}
          >
            <MagneticButton>
              <Button asChild size="lg" className="btn-sheen btn-cta-glow">
                <Link href="/solicitud">
                  Empieza ya <ArrowRight className="size-4" />
                </Link>
              </Button>
            </MagneticButton>
            <DemoButton size="lg" />
          </div>
          <p
            className="hero-rise mt-3 text-sm text-muted"
            style={{ '--i': 4 } as React.CSSProperties}
          >
            ¿Ya eres alumna?{' '}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Ingresa aquí
            </Link>
          </p>
        </div>

        <div className="hero-rise" style={{ '--i': 2 } as React.CSSProperties}>
          <AppMockupHero />
        </div>
      </div>
    </section>
  );
}
