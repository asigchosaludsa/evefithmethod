'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Full-width secondary video band. Mirrors HeroBackgroundVideo's resilient
 * playback: an always-animated Ken Burns poster carries the band even when the
 * OS blocks autoplay (iOS Low Power Mode), and the video fades in on top only
 * once it is genuinely playing (first timeupdate with currentTime > 0).
 * Reduced-motion users get the static poster.
 */
export function SecondaryVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    // Force the muted DOM property (not just the attribute) for iOS autoplay.
    v.muted = true;
    v.defaultMuted = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Respect reduced motion: no playback, the static poster shows.
      v.removeAttribute('autoplay');
      v.pause();
      return;
    }

    // Belt-and-suspenders: some engines need an explicit play() even with the
    // autoplay attribute present. Harmless if autoplay is blocked.
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, []);

  return (
    <section className="relative min-h-[80vh] w-full overflow-hidden">
      {/* Always-animated poster: alive even when video autoplay is blocked. */}
      <div
        aria-hidden
        className="kenburns absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/video_ivifit_poster.jpg)' }}
      />
      {/* Video enhancement: fades in only once it is truly playing. */}
      <video
        ref={ref}
        aria-hidden
        className="absolute inset-0 size-full object-cover transition-opacity duration-1000 ease-out"
        style={{ opacity: playing ? 1 : 0 }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onTimeUpdate={(e) => {
          if (e.currentTarget.currentTime > 0) setPlaying(true);
        }}
      >
        <source src="/video_ivifit.mp4" type="video/mp4" />
      </video>
      {/* Readability + brand wash */}
      <div aria-hidden className="absolute inset-0 bg-canvas/60" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, var(--color-canvas) 0%, color-mix(in oklab, var(--color-canvas) 45%, transparent) 30%, color-mix(in oklab, var(--color-canvas) 45%, transparent) 70%, var(--color-canvas) 100%)',
        }}
      />

      {/* Minimal on-brand overlay headline */}
      <div className="relative mx-auto flex min-h-[80vh] max-w-6xl items-center px-4 sm:px-6">
        <div className="max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted backdrop-blur">
            En movimiento
          </span>
          <h2 className="mt-5 font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
            Entrena con método,
            <br />
            avanza con <span className="text-primary">constancia</span>.
          </h2>
        </div>
      </div>
    </section>
  );
}
