'use client';

import { useEffect, useRef, useState } from 'react';

type Mode = 'poster' | 'video' | 'webp';

/**
 * Full-width secondary video band. Same resilient playback as
 * HeroBackgroundVideo: poster -> video when it truly plays -> animated WebP
 * fallback when autoplay is blocked (iOS Low Power Mode), plus auto-resume so
 * iOS does not leave it frozen. Reduced-motion users get the static poster.
 */
export function SecondaryVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<Mode>('poster');
  const intendPlay = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    v.muted = true;
    v.defaultMuted = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.removeAttribute('autoplay');
      v.pause();
      return;
    }

    intendPlay.current = true;
    let settled = false;
    const goVideo = () => {
      if (!settled) {
        settled = true;
        setMode('video');
      }
    };
    const goWebp = () => {
      if (!settled) {
        settled = true;
        intendPlay.current = false;
        setMode('webp');
      }
    };

    const onTime = () => {
      if (v.currentTime > 0) goVideo();
    };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('playing', goVideo);

    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => goWebp());

    const fallbackTimer = window.setTimeout(() => {
      if (!settled && (v.paused || v.currentTime === 0)) goWebp();
    }, 1600);

    const resume = () => {
      if (intendPlay.current && !document.hidden && v.paused) v.play().catch(() => {});
    };
    v.addEventListener('pause', resume);
    document.addEventListener('visibilitychange', resume);
    const keepAlive = window.setInterval(resume, 2500);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.clearInterval(keepAlive);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('playing', goVideo);
      v.removeEventListener('pause', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);

  return (
    <section className="relative min-h-[80vh] w-full overflow-hidden">
      {/* Always-animated poster: alive even when video autoplay is blocked. */}
      <div
        aria-hidden
        className="kenburns absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/video_ivifit_poster.jpg)' }}
      />
      {/* Animated WebP motion fallback for iOS Low Power Mode (plays as image). */}
      {mode === 'webp' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/video_ivifit.webp"
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {/* Video: revealed only once it is truly playing. */}
      <video
        ref={ref}
        aria-hidden
        className="absolute inset-0 size-full object-cover transition-opacity duration-1000 ease-out"
        style={{ opacity: mode === 'video' ? 1 : 0 }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
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
