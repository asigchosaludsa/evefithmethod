/**
 * Seamless CSS marquee. Two identical groups sit side by side; the track
 * translates by exactly one group width (-50%), so the loop has no seam.
 * Each item carries its own horizontal padding (no flex gap at the seam).
 */
export function Marquee({ items }: { items: string[] }) {
  return (
    <div
      className="relative overflow-hidden border-y border-hairline bg-surface/30 py-4"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
      aria-hidden
    >
      <div className="marquee-track flex">
        {[0, 1].map((group) => (
          <ul key={group} className="flex shrink-0 items-center">
            {items.map((item, i) => (
              <li
                key={`${group}-${i}`}
                className="flex items-center gap-5 whitespace-nowrap px-5 text-sm font-semibold uppercase tracking-[0.18em] text-muted"
              >
                {item}
                <span className="text-primary">✦</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
