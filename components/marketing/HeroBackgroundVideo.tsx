'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Premium hero background video. Poster shows instantly (page never blocked);
 * the small (~3MB) compressed clip fades in once it can play. Reduced-motion
 * users get the static poster, no playback.
 *
 * iOS Safari notes:
 * - React does not reliably mirror the `muted` attribute to the muted DOM
 *   *property*, and Safari refuses to autoplay unless the property is true.
 *   We set it imperatively below.
 * - Safari can defer preload and never fire `canplay`, which would leave the
 *   opacity-0 video invisible forever. We reveal on several readiness events
 *   plus a timeout fallback so the hero is never blank.
 */
export function HeroBackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    // Force the muted DOM property (not just the attribute) for iOS autoplay.
    v.muted = true;
    v.defaultMuted = true;

    // Don't autoplay for reduced-motion users; the poster/first frame still
    // shows (revealed by the fallback timeout) without motion.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }

    // Guarantee the reveal even if no readiness event fires (iOS Safari).
    const t = window.setTimeout(() => setShown(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <video
        ref={ref}
        className="size-full object-cover transition-opacity duration-1000 ease-out"
        style={{ opacity: shown ? 1 : 0 }}
        src="/video_fondo.mp4"
        poster="/video_fondo_poster.jpg"
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => setShown(true)}
        onCanPlay={() => setShown(true)}
        onPlaying={() => setShown(true)}
      />
      {/* Readability + brand wash */}
      <div className="absolute inset-0 bg-canvas/72" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in oklab, var(--color-canvas) 35%, transparent) 0%, color-mix(in oklab, var(--color-canvas) 60%, transparent) 55%, var(--color-canvas) 100%)',
        }}
      />
    </div>
  );
}
