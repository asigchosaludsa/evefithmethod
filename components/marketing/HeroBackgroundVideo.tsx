'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Premium hero background, designed so the hero is ALWAYS alive, including on
 * iOS Low Power Mode (which blocks all video autoplay at the OS level, with no
 * web workaround).
 *
 * Two layers:
 * 1. An always-animated Ken Burns poster (CSS transform). CSS transforms keep
 *    running in Low Power Mode, so the majority of mobile users (often on
 *    battery saver) still get cinematic motion.
 * 2. The video, on top, which fades in ONLY once it is genuinely playing
 *    (first timeupdate with currentTime > 0). When autoplay is blocked the
 *    video never reveals and the animated poster carries the hero. This also
 *    fixes the earlier iOS Safari bug (canplay was unreliable).
 *
 * The clip is encoded for maximum compatibility: H.264 Main@3.1, 720x1280,
 * yuv420p, faststart, no audio (~1.6MB).
 */
export function HeroBackgroundVideo() {
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
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Always-animated poster: alive even when video autoplay is blocked. */}
      <div
        className="kenburns absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/video_fondo_poster.jpg)' }}
      />
      {/* Video enhancement: fades in only once it is truly playing. */}
      <video
        ref={ref}
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
        <source src="/video_fondo.mp4" type="video/mp4" />
      </video>
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
