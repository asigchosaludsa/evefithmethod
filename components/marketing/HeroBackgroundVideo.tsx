'use client';

import { useEffect, useRef } from 'react';

/**
 * Premium hero background video, built for reliable inline autoplay on iOS
 * Safari (which is stricter than iOS Chrome).
 *
 * Why this shape:
 * - The canonical iOS autoplay recipe needs ALL of: the `autoplay` ATTRIBUTE,
 *   `muted`, `playsInline`, `loop`. Relying only on an imperative play() call
 *   is more easily blocked by Safari's autoplay policy.
 * - React does not reliably mirror the `muted` attribute to the muted DOM
 *   *property*; Safari refuses to autoplay unless the property is true, so we
 *   set it imperatively below.
 * - Visibility is NOT gated on JS events. Earlier the video started at
 *   opacity 0 and only revealed onCanPlay, an event iOS Safari may never fire
 *   with deferred preload, leaving the hero blank forever. Now the element is
 *   visible by default (`.bgvideo`); the poster shows instantly even if
 *   autoplay is blocked (e.g. Low Power Mode), and the fade is a pure-CSS
 *   enhancement.
 * - The clip is encoded for maximum compatibility: H.264 Main@3.1, 720x1280,
 *   yuv420p, faststart, no audio (~1.6MB).
 */
export function HeroBackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    // Force the muted DOM property (not just the attribute) for iOS autoplay.
    v.muted = true;
    v.defaultMuted = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Respect reduced motion: stop playback, leave the static poster/frame.
      v.removeAttribute('autoplay');
      v.pause();
      return;
    }

    // Belt-and-suspenders: some engines still need an explicit play() even
    // with the autoplay attribute present.
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <video
        ref={ref}
        className="bgvideo size-full object-cover"
        poster="/video_fondo_poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
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
