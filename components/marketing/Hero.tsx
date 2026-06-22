'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/common';
import { AppMockupHero } from './AppMockupHero';
import { HeroBackgroundVideo } from './HeroBackgroundVideo';

const WORDS = ['método', 'fuerza', 'disciplina', 'constancia'];

export function Hero() {
  const [i, setI] = useState(0);
  const [on, setOn] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setOn(false);
      setTimeout(() => {
        setI((p) => (p + 1) % WORDS.length);
        setOn(true);
      }, 260);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Living background: premium video (poster-first) + scarlet glow + grid */}
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
            style={{ '--i': 1, textWrap: 'balance' } as React.CSSProperties}
          >
            Tu coaching fitness,
            <br />
            con{' '}
            <span className="relative text-primary">
              <span
                aria-live="polite"
                style={{
                  display: 'inline-block',
                  transition: 'opacity .26s var(--ease-out), transform .26s var(--ease-out)',
                  opacity: on ? 1 : 0,
                  transform: on ? 'translateY(0)' : 'translateY(0.25em)',
                }}
              >
                {WORDS[i] ?? WORDS[0]}
              </span>
            </span>
            .
          </h1>
          <p
            className="hero-rise mt-5 max-w-md text-base text-muted sm:text-lg"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            La coach arma tu plan de entrenamiento y nutrición. Tú sabes qué hacer hoy; ella sabe a
            quién revisar. Acompañamiento real, por invitación.
          </p>
          <div
            className="hero-rise mt-8 flex flex-col gap-3 sm:flex-row"
            style={{ '--i': 3 } as React.CSSProperties}
          >
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

        <div className="hero-rise" style={{ '--i': 2 } as React.CSSProperties}>
          <AppMockupHero />
        </div>
      </div>
    </section>
  );
}
