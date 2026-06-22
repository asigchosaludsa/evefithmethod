'use client';

import { Search } from 'lucide-react';
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  EQUIPMENT,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
} from '@/lib/constants/exercises';
import type { ExerciseFilters as Filters } from '@/domain/exercises/filter';

type Dim = 'muscleGroups' | 'equipment' | 'difficulty' | 'movementPattern';

export function ExerciseFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  function toggle(dim: Dim, value: string) {
    const current = new Set(filters[dim] ?? []);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    onChange({ ...filters, [dim]: [...current] });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input
          value={filters.query ?? ''}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Buscar ejercicio…"
          className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <ChipRow label="Grupo muscular" values={[...MUSCLE_GROUPS]} active={filters.muscleGroups} onToggle={(v) => toggle('muscleGroups', v)} />
      <ChipRow label="Equipo" values={[...EQUIPMENT]} active={filters.equipment} onToggle={(v) => toggle('equipment', v)} />
      <ChipRow
        label="Dificultad"
        values={[...DIFFICULTIES]}
        labelFor={(v) => DIFFICULTY_LABEL[v as keyof typeof DIFFICULTY_LABEL] ?? v}
        active={filters.difficulty}
        onToggle={(v) => toggle('difficulty', v)}
      />
      <ChipRow
        label="Patrón"
        values={MOVEMENT_PATTERNS.map((m) => m.value)}
        labelFor={(v) => MOVEMENT_PATTERNS.find((m) => m.value === v)?.label ?? v}
        active={filters.movementPattern}
        onToggle={(v) => toggle('movementPattern', v)}
      />
    </div>
  );
}

function ChipRow({
  label,
  values,
  active,
  labelFor,
  onToggle,
}: {
  label: string;
  values: string[];
  active?: string[];
  labelFor?: (v: string) => string;
  onToggle: (v: string) => void;
}) {
  const set = new Set(active ?? []);
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wide text-faint">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => {
          const on = set.has(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => onToggle(v)}
              className={
                on
                  ? 'rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-on-primary'
                  : 'rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-primary/50'
              }
            >
              {labelFor ? labelFor(v) : v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
