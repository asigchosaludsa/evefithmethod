'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * One-shot scroll reveal: fades/slides its children in ONCE when they enter the
 * viewport, then stays. Not scroll-scrubbed (no jitter on scroll up/down).
 * Defaults to visible under reduced-motion. CSS lives in globals.css ([data-reveal]).
 */
export function Reveal({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced motion is handled by CSS ([data-reveal] hidden state is gated
    // behind a no-preference media query), so no special-casing needed here.
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal data-shown={shown} className={className} style={style}>
      {children}
    </div>
  );
}
