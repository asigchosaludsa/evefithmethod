// Pure CSS marquee (no client JS). The track is duplicated for a seamless loop.
export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div
      className="relative overflow-hidden border-y border-hairline bg-surface/30 py-4"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div className="marquee-track flex w-max items-center gap-8">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-8 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            {item}
            <span className="text-primary" aria-hidden>
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
