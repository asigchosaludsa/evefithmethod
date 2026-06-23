'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Thin scarlet top progress bar shown during client route transitions.
 *
 * Dependency-free. We start the bar when the user clicks an internal link (or
 * navigates back/forward) and finish it once the pathname actually changes,
 * which in the App Router happens after the destination's Server Component has
 * resolved. A small grace timeout guards against clicks that don't navigate.
 *
 * Respects prefers-reduced-motion: when reduced motion is requested we skip the
 * animated growth and just hide the bar (no visible movement).
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = React.useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const start = React.useCallback(() => {
    clearTimers();
    setVisible(true);
    setActive(true);
    // Safety net: if no navigation happens, retract after a while.
    timers.current.push(setTimeout(() => setVisible(false), 8000));
  }, [clearTimers]);

  // Finish the bar whenever the resolved path changes. We schedule the state
  // updates (rather than calling setState synchronously in the effect body) so
  // the bar snaps to full, then retracts, without cascading renders.
  React.useEffect(() => {
    if (!visible) return;
    clearTimers();
    const snap = setTimeout(() => setActive(false), 0); // snap to full
    const hide = setTimeout(() => setVisible(false), 240);
    timers.current.push(snap, hide);
    return () => {
      clearTimeout(snap);
      clearTimeout(hide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Detect navigation intent from clicks on internal links + browser nav.
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');
      if (!href || href.startsWith('#') || (target && target !== '_self')) return;
      // Only internal navigations.
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    function onPopState() {
      start();
    }
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      clearTimers();
    };
  }, [start, clearTimers]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
    >
      <div
        className="h-full origin-left bg-primary shadow-[0_0_8px_var(--color-primary)] transition-transform duration-200 ease-out"
        style={
          active
            ? { animation: 'efm-route-progress 6s ease-out forwards' }
            : { transform: 'scaleX(1)' }
        }
      />
    </div>
  );
}
