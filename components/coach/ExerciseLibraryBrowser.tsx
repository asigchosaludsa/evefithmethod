'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { filterExercises, type ExerciseFilters as Filters, type FilterableExercise } from '@/domain/exercises/filter';
import { Badge } from '@/components/common';
import { ExerciseFilters } from '@/components/coach/ExerciseFilters';
import { MuscleGroupBadge } from '@/components/workouts/MuscleGroupIcon';

export interface LibraryExercise extends FilterableExercise {
  thumbnail_url: string | null;
  is_global: boolean;
}

export function ExerciseLibraryBrowser({ exercises }: { exercises: LibraryExercise[] }) {
  const [filters, setFilters] = useState<Filters>({});
  const filtered = useMemo(() => filterExercises(exercises, filters), [exercises, filters]);

  return (
    <div className="space-y-4">
      <ExerciseFilters filters={filters} onChange={setFilters} />
      <p className="text-xs text-faint">{filtered.length} ejercicio(s)</p>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-faint">Ningún ejercicio coincide con los filtros.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Link
              key={e.id}
              href={`/coach/exercises/${e.id}`}
              className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-elevated">
                  {e.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.thumbnail_url} alt="" className="size-full object-cover" />
                  ) : (
                    <MuscleGroupBadge
                      muscleGroup={e.muscle_group}
                      className="size-9"
                      iconClassName="size-5"
                      title={e.muscle_group ?? undefined}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-foreground">{e.name}</p>
                    {e.is_global && <Badge tone="info">Global</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {[e.muscle_group, e.equipment].filter(Boolean).join(' · ') || 'General'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
