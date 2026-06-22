'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Premium hero background video. Poster shows instantly (page never blocked);
 * the small (~3MB) compressed clip fades in once it can play. Reduced-motion
 * users get the static poster, no playback.
 */
export function HeroBackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Don't autoplay for reduced-motion users; onCanPlay still reveals the
    // (paused) first frame so the poster/still shows without motion.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.play().catch(() => {});
    }
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
        onCanPlay={() => setShown(true)}
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
