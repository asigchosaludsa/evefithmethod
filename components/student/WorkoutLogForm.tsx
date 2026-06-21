'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { logWorkout } from '@/lib/student/actions';
import { Button, FormField, Input, Select, Textarea } from '@/components/common';

export interface ExerciseOption {
  id: string;
  name: string;
}

interface SetRow {
  exerciseId: string;
  reps: string;
  weight: string;
  completed: boolean;
}

export function WorkoutLogForm({
  exercises,
  workoutPlanId,
}: {
  exercises: ExerciseOption[];
  workoutPlanId?: string | null;
}) {
  const router = useRouter();
  const [sets, setSets] = useState<SetRow[]>([{ exerciseId: '', reps: '', weight: '', completed: true }]);
  const [effort, setEffort] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(i: number, patch: Partial<SetRow>) {
    setSets((s) => s.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await logWorkout({
        workoutPlanId: workoutPlanId ?? null,
        perceivedEffort: effort ? Number(effort) : null,
        notes: notes || undefined,
        sets: sets.map((s, idx) => ({
          exerciseId: s.exerciseId || null,
          setNumber: idx + 1,
          reps: s.reps ? Number(s.reps) : null,
          weight: s.weight ? Number(s.weight) : null,
          completed: s.completed,
        })),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push('/student/today');
    });
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {sets.map((row, i) => (
          <li key={i} className="rounded-md border border-hairline bg-canvas/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-faint">Serie {i + 1}</span>
              {sets.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSets((s) => s.filter((_, idx) => idx !== i))}
                  className="text-faint hover:text-danger"
                  aria-label="Quitar serie"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <div className="mt-2 space-y-2">
              <Select value={row.exerciseId} onChange={(e) => update(i, { exerciseId: e.target.value })} placeholder="Ejercicio (opcional)">
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Reps"
                  value={row.reps}
                  onChange={(e) => update(i, { reps: e.target.value })}
                  className="h-9"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Peso (kg)"
                  value={row.weight}
                  onChange={(e) => update(i, { weight: e.target.value })}
                  className="h-9"
                />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={row.completed}
                    onChange={(e) => update(i, { completed: e.target.checked })}
                    className="size-4 accent-[var(--color-primary)]"
                  />
                  Hecha
                </label>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setSets((s) => [...s, { exerciseId: '', reps: '', weight: '', completed: true }])}
      >
        <Plus className="size-4" /> Agregar serie
      </Button>

      <FormField label="Esfuerzo percibido (1-10)" htmlFor="effort">
        <Input
          id="effort"
          type="number"
          min={1}
          max={10}
          inputMode="numeric"
          value={effort}
          onChange={(e) => setEffort(e.target.value)}
        />
      </FormField>
      <FormField label="Notas" htmlFor="wnotes" hint="Opcional">
        <Textarea id="wnotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} loading={pending} className="w-full" size="lg">
        Guardar entrenamiento
      </Button>
    </div>
  );
}
