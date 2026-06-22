'use client';

import { useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { updatePlanExercise, deletePlanExercise } from '@/lib/coach/actions';
import { Button } from '@/components/common';
import type { PlanExerciseRow as Row } from '@/lib/db/queries/workout-plan';

export function PlanExerciseRow({ ex, planId }: { ex: Row; planId: string }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    sets: String(ex.sets),
    reps: ex.reps,
    suggested_weight_kg: ex.suggested_weight_kg != null ? String(ex.suggested_weight_kg) : '',
    rest_seconds: ex.rest_seconds != null ? String(ex.rest_seconds) : '',
    tempo: ex.tempo ?? '',
    notes: ex.notes ?? '',
  });

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await updatePlanExercise({
        id: ex.id,
        planId,
        sets: form.sets ? Number(form.sets) : 3,
        reps: form.reps || '10',
        suggested_weight_kg: form.suggested_weight_kg ? Number(form.suggested_weight_kg) : null,
        rest_seconds: form.rest_seconds ? Number(form.rest_seconds) : null,
        tempo: form.tempo || null,
        notes: form.notes || null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-3 py-2">
        <div>
          <p className="font-medium text-foreground">{ex.exercise_name}</p>
          <p className="tabular text-sm text-muted">
            {ex.sets} series × {ex.reps} reps
            {ex.rest_seconds ? ` · ${ex.rest_seconds}s desc.` : ''}
            {ex.tempo ? ` · tempo ${ex.tempo}` : ''}
            {ex.suggested_weight_kg ? ` · ${ex.suggested_weight_kg}kg` : ''}
          </p>
          {ex.notes && <p className="text-xs text-faint">{ex.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} className="text-faint hover:text-foreground" aria-label="Editar ejercicio">
            <Pencil className="size-4" />
          </button>
          <form action={deletePlanExercise.bind(null, ex.id, planId)}>
            <button type="submit" className="text-faint hover:text-danger" aria-label="Quitar ejercicio">
              <Trash2 className="size-4" />
            </button>
          </form>
        </div>
      </li>
    );
  }

  return (
    <li className="space-y-2 py-2">
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">{ex.exercise_name}</p>
        <button type="button" onClick={() => setEditing(false)} className="text-faint hover:text-foreground" aria-label="Cancelar">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Field label="Series" type="number" integer value={form.sets} onChange={(v) => setForm({ ...form, sets: v })} />
        <Field label="Reps" value={form.reps} onChange={(v) => setForm({ ...form, reps: v })} />
        <Field label="Peso kg" type="number" value={form.suggested_weight_kg} onChange={(v) => setForm({ ...form, suggested_weight_kg: v })} />
        <Field label="Desc. s" type="number" value={form.rest_seconds} onChange={(v) => setForm({ ...form, rest_seconds: v })} />
        <Field label="Tempo" value={form.tempo} onChange={(v) => setForm({ ...form, tempo: v })} />
        <Field label="Nota" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" size="sm" loading={busy} onClick={save}>
        Guardar
      </Button>
    </li>
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
