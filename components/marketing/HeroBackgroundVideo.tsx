'use client';

import { useEffect, useRef, useState } from 'react';

type Mode = 'poster' | 'video' | 'webp';

/**
 * Premium hero background, built to stay alive on every browser, including
 * iOS Safari in Low Power Mode (which blocks ALL video autoplay at the OS
 * level, with no web workaround).
 *
 * Three layers, chosen at runtime:
 * 1. Static poster (instant, always present underneath).
 * 2. The <video>, revealed only once it is genuinely playing.
 * 3. An animated WebP fallback: if video autoplay is blocked or never starts
 *    (iOS Low Power Mode), we swap to an animated image, which the browser
 *    plays as an image and is NOT subject to the autoplay policy. So the hero
 *    still moves in Low Power Mode.
 *
 * Freeze fix: iOS pauses background video after a few seconds to save power and
 * does not resume it. We re-issue play() on the `pause` event, when the tab
 * becomes visible again, and on a low-frequency interval, so it never stays
 * frozen.
 */
export function HeroBackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<Mode>('poster');
  const intendPlay = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    // Force the muted DOM property (not just the attribute) for iOS autoplay.
    v.muted = true;
    v.defaultMuted = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.removeAttribute('autoplay');
      v.pause();
      return; // keep the static poster, no motion
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
        intendPlay.current = false; // stop trying to resume a blocked video
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

    // If it has not actually started shortly after mount, autoplay is blocked
    // (iOS Low Power Mode): use the animated image instead.
    const fallbackTimer = window.setTimeout(() => {
      if (!settled && (v.paused || v.currentTime === 0)) goWebp();
    }, 1600);

    // Freeze fix: resume playback whenever it gets paused while it should run.
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
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Animated poster (Ken Burns): alive even before/without playback. */}
      <div
        className="kenburns absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/video_fondo_poster.jpg)' }}
      />
      {/* Animated WebP: motion fallback for browsers that block video autoplay
          (iOS Low Power Mode). It plays as an image, no autoplay policy. */}
      {mode === 'webp' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/video_fondo.webp"
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {/* Video: revealed only once it is truly playing. */}
      <video
        ref={ref}
        className="absolute inset-0 size-full object-cover transition-opacity duration-700 ease-out"
        style={{ opacity: mode === 'video' ? 1 : 0 }}
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
