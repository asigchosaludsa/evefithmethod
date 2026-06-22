'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

function parseYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  );
  if (m && m[1]) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return null;
}

/** Lazy YouTube player: shows the thumbnail; loads the iframe only on click. */
export function YouTubeEmbed({ url, title = 'Video de técnica' }: { url: string; title?: string }) {
  const [playing, setPlaying] = useState(false);
  const id = parseYouTubeId(url);

  if (!id) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
        Ver video
      </a>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative block aspect-video w-full overflow-hidden rounded-lg border border-border"
        aria-label={`Reproducir ${title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute inset-0 grid place-items-center bg-canvas/40">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-transform duration-200 group-hover:scale-110">
            <Play className="size-6 translate-x-0.5" fill="currentColor" />
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
      <iframe
        className="size-full"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
