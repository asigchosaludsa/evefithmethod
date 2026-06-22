'use client';

import { useMemo, useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { filterExercises, type ExerciseFilters as Filters, type FilterableExercise } from '@/domain/exercises/filter';
import { muscleGroupColor } from '@/lib/constants/exercises';
import { addPlanExercises } from '@/lib/coach/actions';
import { Button } from '@/components/common';
import { ExerciseFilters } from '@/components/coach/ExerciseFilters';

export interface CatalogExercise extends FilterableExercise {
  thumbnail_url: string | null;
}

interface ItemConfig {
  sets: string;
  reps: string;
  suggested_weight_kg: string;
  rest_seconds: string;
  tempo: string;
  notes: string;
}

const DEFAULT_CONFIG: ItemConfig = { sets: '3', reps: '10', suggested_weight_kg: '', rest_seconds: '', tempo: '', notes: '' };

export function ExerciseCatalogPicker({
  planId,
  dayId,
  exercises,
  prefillMuscleGroups,
}: {
  planId: string;
  dayId: string;
  exercises: CatalogExercise[];
  prefillMuscleGroups: string[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [filters, setFilters] = useState<Filters>({ muscleGroups: prefillMuscleGroups });
  const [selected, setSelected] = useState<Record<string, ItemConfig>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => filterExercises(exercises, filters), [exercises, filters]);
  const selectedIds = Object.keys(selected);
  const selectedExercises = exercises.filter((e) => selectedIds.includes(e.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = { ...DEFAULT_CONFIG };
      return next;
    });
  }

  function setConfig(id: string, patch: Partial<ItemConfig>) {
    setSelected((prev) => ({ ...prev, [id]: { ...(prev[id] ?? DEFAULT_CONFIG), ...patch } }));
  }

  function reset() {
    setOpen(false);
    setStep(1);
    setSelected({});
    setFilters({ muscleGroups: prefillMuscleGroups });
    setError(null);
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await addPlanExercises({
        planId,
        dayId,
        items: selectedIds.map((id) => {
          const c = selected[id] ?? DEFAULT_CONFIG;
          return {
            exercise_id: id,
            sets: c.sets ? Number(c.sets) : 3,
            reps: c.reps || '10',
            rest_seconds: c.rest_seconds ? Number(c.rest_seconds) : null,
            tempo: c.tempo || null,
            suggested_weight_kg: c.suggested_weight_kg ? Number(c.suggested_weight_kg) : null,
            notes: c.notes || null,
          };
        }),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      reset();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Añadir ejercicios
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 p-0 sm:items-center sm:p-6">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden border border-border bg-canvas sm:h-[90vh] sm:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <p className="font-display text-lg font-semibold text-foreground">
            {step === 1 ? 'Elegir ejercicios' : 'Configurar ejercicios'}
            <span className="ml-2 text-sm font-normal text-primary">{selectedIds.length} elegido(s)</span>
          </p>
          <button type="button" onClick={reset} className="text-faint hover:text-foreground" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 ? (
            <div className="space-y-4">
              <ExerciseFilters filters={filters} onChange={setFilters} />
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-faint">Ningún ejercicio coincide con los filtros.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {filtered.map((e) => {
                    const on = !!selected[e.id];
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggle(e.id)}
                        className={
                          'relative rounded-lg border p-2 text-left transition-colors ' +
                          (on ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-elevated')
                        }
                      >
                        {on && (
                          <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-on-primary">
                            <Check className="size-3" />
                          </span>
                        )}
                        <div className="mb-2 flex h-16 items-center justify-center overflow-hidden rounded-md bg-elevated">
                          {e.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={e.thumbnail_url} alt="" className="size-full object-cover" />
                          ) : (
                            <span
                              className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white"
                              style={{ backgroundColor: muscleGroupColor(e.muscle_group) }}
                            >
                              {(e.muscle_group ?? 'E').slice(0, 1)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-tight text-foreground">{e.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {[e.muscle_group, e.equipment].filter(Boolean).join(' · ')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedExercises.length === 0 ? (
                <p className="py-8 text-center text-sm text-faint">No elegiste ejercicios.</p>
              ) : (
                selectedExercises.map((e) => {
                  const c = selected[e.id] ?? DEFAULT_CONFIG;
                  return (
                    <div key={e.id} className="rounded-lg border border-border bg-surface p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-medium text-foreground">{e.name}</p>
                        <button type="button" onClick={() => toggle(e.id)} className="text-faint hover:text-danger">
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        <Field label="Series" value={c.sets} onChange={(v) => setConfig(e.id, { sets: v })} type="number" integer />
                        <Field label="Reps" value={c.reps} onChange={(v) => setConfig(e.id, { reps: v })} />
                        <Field label="Peso kg" value={c.suggested_weight_kg} onChange={(v) => setConfig(e.id, { suggested_weight_kg: v })} type="number" />
                        <Field label="Desc. s" value={c.rest_seconds} onChange={(v) => setConfig(e.id, { rest_seconds: v })} type="number" />
                        <Field label="Tempo" value={c.tempo} onChange={(v) => setConfig(e.id, { tempo: v })} />
                        <Field label="Nota" value={c.notes} onChange={(v) => setConfig(e.id, { notes: v })} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3">
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="ml-auto flex items-center gap-2">
            {step === 2 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setStep(1)}>
                Atrás
              </Button>
            )}
            {step === 1 ? (
              <Button type="button" size="sm" disabled={selectedIds.length === 0} onClick={() => setStep(2)}>
                Configurar ({selectedIds.length})
              </Button>
            ) : (
              <Button type="button" size="sm" loading={busy} disabled={selectedIds.length === 0} onClick={submit}>
                Añadir {selectedIds.length} al día
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  integer = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  integer?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-faint">{label}</span>
      <input
        type={type}
        inputMode={type === 'number' ? (integer ? 'numeric' : 'decimal') : undefined}
        step={type === 'number' ? (integer ? '1' : '0.1') : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-sm text-foreground focus:border-primary focus:outline-none"
      />
    </label>
  );
}
