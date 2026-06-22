'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle } from 'lucide-react';
import { logWorkout } from '@/lib/student/actions';
import { Button, FormField, Input, Textarea, YouTubeEmbed } from '@/components/common';
import type { PlanDay } from '@/lib/db/queries/workout-plan';

interface SetState {
  reps: string;
  weight: string;
  completed: boolean;
}
interface ExBlock {
  key: string;
  exerciseId: string | null;
  name: string;
  targetReps: string;
  targetSets: number;
  suggested: number | null;
  rest: number | null;
  videoUrl: string | null;
  sets: SetState[];
}

function buildBlocks(day: PlanDay | undefined): ExBlock[] {
  if (!day) return [];
  return day.exercises.map((ex, bi) => {
    const defaultReps = ex.reps.match(/\d+/)?.[0] ?? '';
    return {
      key: ex.id ?? String(bi),
      exerciseId: ex.exercise_id,
      name: ex.exercise_name,
      targetReps: ex.reps,
      targetSets: ex.sets,
      suggested: ex.suggested_weight_kg,
      rest: ex.rest_seconds,
      videoUrl: ex.video_url,
      sets: Array.from({ length: Math.max(1, ex.sets) }, () => ({
        reps: defaultReps,
        weight: ex.suggested_weight_kg != null ? String(ex.suggested_weight_kg) : '',
        completed: false,
      })),
    };
  });
}

export function GuidedWorkoutLogForm({
  workoutPlanId,
  days,
}: {
  workoutPlanId: string | null;
  days: PlanDay[];
}) {
  const router = useRouter();
  const [dayId, setDayId] = useState(days[0]?.id ?? '');
  const day = useMemo(() => days.find((d) => d.id === dayId), [days, dayId]);
  const [blocks, setBlocks] = useState<ExBlock[]>(() => buildBlocks(days[0]));
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const [effort, setEffort] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function selectDay(id: string) {
    setDayId(id);
    setBlocks(buildBlocks(days.find((d) => d.id === id)));
    setOpenVideo(null);
  }
  function updateSet(bi: number, si: number, patch: Partial<SetState>) {
    setBlocks((bs) => bs.map((b, i) => (i === bi ? { ...b, sets: b.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : b)));
  }

  function submit() {
    setError(null);
    const sets = blocks.flatMap((b) =>
      b.sets.map((s, idx) => ({
        exerciseId: b.exerciseId,
        setNumber: idx + 1,
        reps: s.reps ? Number(s.reps) : null,
        weight: s.weight ? Number(s.weight) : null,
        completed: s.completed,
      })),
    );
    if (sets.length === 0) {
      setError('Este día no tiene ejercicios.');
      return;
    }
    start(async () => {
      const res = await logWorkout({
        workoutPlanId,
        workoutPlanDayId: dayId || null,
        perceivedEffort: effort ? Number(effort) : null,
        notes: notes || undefined,
        sets,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push('/student/today');
    });
  }

  return (
    <div className="space-y-5">
      {days.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => selectDay(d.id)}
              className={
                d.id === dayId
                  ? 'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-on-primary'
                  : 'rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground'
              }
            >
              Día {d.day_number}
            </button>
          ))}
        </div>
      )}

      {day && (
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">{day.title}</span>
          {day.focus ? ` · ${day.focus}` : ''}
        </p>
      )}

      <div className="space-y-4">
        {blocks.map((b, bi) => (
          <div key={b.key} className="rounded-lg border border-hairline bg-canvas/40 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{b.name}</p>
                <p className="tabular text-xs text-muted">
                  Objetivo: {b.targetSets}×{b.targetReps}
                  {b.rest ? ` · ${b.rest}s desc.` : ''}
                  {b.suggested != null ? ` · sug. ${b.suggested}kg` : ''}
                </p>
              </div>
              {b.videoUrl && (
                <button
                  type="button"
                  onClick={() => setOpenVideo(openVideo === b.key ? null : b.key)}
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                >
                  <PlayCircle className="size-4" /> Técnica
                </button>
              )}
            </div>

            {b.videoUrl && openVideo === b.key && (
              <div className="mt-3">
                <YouTubeEmbed url={b.videoUrl} title={`Técnica: ${b.name}`} />
              </div>
            )}

            <div className="mt-3 space-y-2">
              {b.sets.map((s, si) => (
                <div key={si} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-xs text-faint">Serie {si + 1}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    aria-label={`Reps serie ${si + 1}`}
                    placeholder="reps"
                    value={s.reps}
                    onChange={(e) => updateSet(bi, si, { reps: e.target.value })}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    aria-label={`Peso serie ${si + 1}`}
                    placeholder="kg"
                    value={s.weight}
                    onChange={(e) => updateSet(bi, si, { weight: e.target.value })}
                    className="h-9"
                  />
                  <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={s.completed}
                      onChange={(e) => updateSet(bi, si, { completed: e.target.checked })}
                      className="size-4 accent-[var(--color-primary)]"
                    />
                    Hecha
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
        <FormField label="Esfuerzo (1-10)" htmlFor="effort">
          <Input id="effort" type="number" min={1} max={10} inputMode="numeric" value={effort} onChange={(e) => setEffort(e.target.value)} />
        </FormField>
        <FormField label="Notas" htmlFor="wnotes" hint="Opcional">
          <Textarea id="wnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} loading={pending} size="lg" className="w-full">
        Guardar entrenamiento
      </Button>
    </div>
  );
}
