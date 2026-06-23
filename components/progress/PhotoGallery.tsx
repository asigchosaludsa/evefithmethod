'use client';

import { useMemo, useRef, useState } from 'react';
import { Columns2, X } from 'lucide-react';
import { Button } from '@/components/common';

export interface GalleryPhoto {
  id: string;
  url: string;
  photoType: string; // 'front' | 'side' | 'back' | 'other'
  recordedAt: string | null; // YYYY-MM-DD
}

type AngleFilter = 'all' | 'front' | 'side' | 'back' | 'other';

const ANGLE_LABEL: Record<string, string> = {
  front: 'Frente',
  side: 'Perfil',
  back: 'Espalda',
  other: 'Otra',
};

const FILTERS: { value: AngleFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'front', label: 'Frente' },
  { value: 'side', label: 'Perfil' },
  { value: 'back', label: 'Espalda' },
  { value: 'other', label: 'Otras' },
];

function parseDate(d: string | null): Date | null {
  if (!d) return null;
  // date column "YYYY-MM-DD" — parse as local to avoid TZ drift on the label.
  const parts = d.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, day] = parts as [number, number, number];
  return new Date(y, m - 1, day);
}

function monthLabel(d: Date): string {
  const s = d.toLocaleDateString('es', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function weeksBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

export function PhotoGallery({
  photos,
  selectable = true,
}: {
  photos: GalleryPhoto[];
  selectable?: boolean;
}) {
  const [angle, setAngle] = useState<AngleFilter>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(
    () => (angle === 'all' ? photos : photos.filter((p) => p.photoType === angle)),
    [photos, angle],
  );

  // Group by month, newest month first; photos already arrive newest-first.
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; sort: number; items: GalleryPhoto[] }>();
    for (const p of filtered) {
      const d = parseDate(p.recordedAt);
      const key = d ? `${d.getFullYear()}-${d.getMonth()}` : 'sin-fecha';
      const label = d ? monthLabel(d) : 'Sin fecha';
      const sort = d ? d.getFullYear() * 12 + d.getMonth() : -1;
      const g = map.get(key);
      if (g) g.items.push(p);
      else map.set(key, { label, sort, items: [p] });
    }
    return Array.from(map.values()).sort((a, b) => b.sort - a.sort);
  }, [filtered]);

  const selectedPhotos = useMemo(
    () => selected.map((id) => photos.find((p) => p.id === id)).filter((p): p is GalleryPhoto => !!p),
    [selected, photos],
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1]!, id]; // keep most recent pair (FIFO)
      return [...prev, id];
    });
  }

  function exitCompare() {
    setCompareMode(false);
    setSelected([]);
  }

  const canCompare = selectable && photos.length >= 2;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por ángulo">
          {FILTERS.map((f) => {
            const active = angle === f.value;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setAngle(f.value)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  active
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-hairline text-muted hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {canCompare &&
          (compareMode ? (
            <Button type="button" variant="ghost" onClick={exitCompare}>
              <X className="size-4" /> Salir de comparar
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setCompareMode(true)}>
              <Columns2 className="size-4" /> Comparar
            </Button>
          ))}
      </div>

      {compareMode && (
        <p className="text-sm text-muted">
          {selectedPhotos.length < 2
            ? `Toca dos fotos para compararlas (${selectedPhotos.length}/2). Mejor del mismo ángulo.`
            : 'Comparación lista. Arrastra el control para ver el antes y el después.'}
        </p>
      )}

      {compareMode && selectedPhotos.length === 2 && (
        <CompareView a={selectedPhotos[0]!} b={selectedPhotos[1]!} />
      )}

      {/* Timeline grouped by month */}
      {filtered.length === 0 ? (
        <p className="text-sm text-faint">No hay fotos para este ángulo.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.label} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h4>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {g.items.map((p) => {
                  const d = parseDate(p.recordedAt);
                  const selIndex = selected.indexOf(p.id);
                  const isSelected = selIndex >= 0;
                  return (
                    <figure key={p.id} className="space-y-1">
                      <button
                        type="button"
                        disabled={!compareMode}
                        onClick={() => compareMode && toggleSelect(p.id)}
                        className={`relative block w-full overflow-hidden rounded-md border transition-all ${
                          compareMode ? 'cursor-pointer' : 'cursor-default'
                        } ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-hairline hover:border-primary/50'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.url}
                          alt={`Foto de progreso (${ANGLE_LABEL[p.photoType] ?? p.photoType})`}
                          loading="lazy"
                          className="aspect-square w-full object-cover"
                        />
                        {isSelected && (
                          <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                            {selIndex === 0 ? 'A' : 'B'}
                          </span>
                        )}
                        {angle === 'all' && (
                          <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1 text-[10px] text-white">
                            {ANGLE_LABEL[p.photoType] ?? p.photoType}
                          </span>
                        )}
                      </button>
                      <figcaption className="text-center text-[11px] text-faint">
                        {d ? dayLabel(d) : 'Sin fecha'}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Dependency-free before/after slider (clip-path based). */
function CompareView({ a, b }: { a: GalleryPhoto; b: GalleryPhoto }) {
  // Order chronologically: "before" = older, "after" = newer.
  const da = parseDate(a.recordedAt);
  const db = parseDate(b.recordedAt);
  let before = a;
  let after = b;
  if (da && db && da.getTime() > db.getTime()) {
    before = b;
    after = a;
  }
  const beforeD = parseDate(before.recordedAt);
  const afterD = parseDate(after.recordedAt);
  const weeks = beforeD && afterD ? weeksBetween(beforeD, afterD) : null;
  const diffAngle = a.photoType !== b.photoType;

  const [pos, setPos] = useState(50); // percent revealed of "after"
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  function setFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }

  function onPointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    setFromClientX(e.clientX);
  }
  function onPointerUp() {
    draggingRef.current = false;
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5));
    if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5));
  }

  return (
    <div className="space-y-2 rounded-lg border border-hairline bg-elevated p-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Antes · {beforeD ? dayLabel(beforeD) : 'Sin fecha'}</span>
        <span>Después · {afterD ? dayLabel(afterD) : 'Sin fecha'}</span>
      </div>

      <div
        ref={containerRef}
        className="relative aspect-square w-full max-w-md mx-auto select-none overflow-hidden rounded-md border border-hairline touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Before (full) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before.url}
          alt="Antes"
          loading="lazy"
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />
        {/* After (clipped to reveal width) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={after.url}
          alt="Después"
          loading="lazy"
          draggable={false}
          className="absolute inset-0 size-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        {/* Divider + handle */}
        <div
          className="absolute inset-y-0 w-0.5 bg-white/80"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Control de comparación antes/después"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={onKeyDown}
          className="absolute top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-hairline bg-black/70 text-white shadow"
          style={{ left: `${pos}%` }}
        >
          <Columns2 className="size-4" />
        </div>
        <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
          Antes
        </span>
        <span className="absolute right-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
          Después
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm">
        {weeks != null && (
          <span className="text-foreground">
            {weeks === 0 ? 'Misma semana' : `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} de diferencia`}
          </span>
        )}
        {diffAngle && (
          <span className="text-warning">Ángulos distintos — compara mejor el mismo ángulo.</span>
        )}
      </div>
    </div>
  );
}
