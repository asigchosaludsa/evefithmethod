'use client';

import { useActionState, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { compressImage, uploadInfoFor } from '@/lib/utils/compress-image';
import { createExercise, updateExercise } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  EQUIPMENT,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
} from '@/lib/constants/exercises';
import { Button, FormField, Input, Select, Textarea, SubmitButton } from '@/components/common';
import type { Exercise } from '@/types/database';

export function ExerciseForm({ coachId, exercise }: { coachId: string; exercise?: Exercise }) {
  const isEdit = !!exercise;
  const [state, action] = useActionState(isEdit ? updateExercise : createExercise, initialActionState);
  const fileRef = useRef<HTMLInputElement>(null);
  const [thumb, setThumb] = useState<string>(exercise?.thumbnail_url ?? '');
  const [busy, setBusy] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError(null);
    setBusy(true);
    try {
      const blob = await compressImage(file);
      const info = uploadInfoFor(blob);
      if (!info) {
        setImgError('No pudimos procesar la imagen. Intenta con una foto JPG, PNG o WEBP.');
        return;
      }
      if (blob.size > 5 * 1024 * 1024) {
        setImgError('La imagen es demasiado grande (máx 5MB).');
        return;
      }
      const supabase = createClient();
      const path = `${coachId}/${crypto.randomUUID()}.${info.ext}`;
      const { error } = await supabase.storage
        .from('exercise-images')
        .upload(path, blob, { contentType: info.contentType, upsert: false });
      if (error) {
        setImgError(error.message);
        return;
      }
      const { data } = supabase.storage.from('exercise-images').getPublicUrl(path);
      setThumb(`${data.publicUrl}?v=${Date.now()}`);
    } catch {
      setImgError('No se pudo subir la imagen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={action} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={exercise.id} />}
      <input type="hidden" name="thumbnail_url" value={thumb} />

      <FormField label="Nombre" htmlFor="name">
        <Input id="name" name="name" placeholder="Ej: Hip Thrust" defaultValue={exercise?.name ?? ''} required />
      </FormField>

      {/* Imagen */}
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-elevated">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-xs text-faint">Sin imagen</span>
          )}
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => fileRef.current?.click()}>
            <Camera className="size-4" /> Subir imagen
          </Button>
          {imgError && <p className="mt-1 text-sm text-danger">{imgError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Grupo muscular" htmlFor="muscle_group">
          <Select id="muscle_group" name="muscle_group" placeholder="Elegir…" defaultValue={exercise?.muscle_group ?? ''}>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Equipo" htmlFor="equipment">
          <Select id="equipment" name="equipment" placeholder="Elegir…" defaultValue={exercise?.equipment ?? ''}>
            {EQUIPMENT.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Dificultad" htmlFor="difficulty">
          <Select id="difficulty" name="difficulty" placeholder="Elegir…" defaultValue={exercise?.difficulty ?? ''}>
            {DIFFICULTIES.map((level) => (
              <option key={level} value={level}>
                {DIFFICULTY_LABEL[level]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Patrón" htmlFor="movement_pattern">
          <Select
            id="movement_pattern"
            name="movement_pattern"
            placeholder="Elegir…"
            defaultValue={exercise?.movement_pattern ?? ''}
          >
            {MOVEMENT_PATTERNS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Descripción" htmlFor="description">
        <Textarea id="description" name="description" rows={2} defaultValue={exercise?.description ?? ''} />
      </FormField>
      <FormField label="Instrucciones" htmlFor="instructions">
        <Textarea id="instructions" name="instructions" rows={3} defaultValue={exercise?.instructions ?? ''} />
      </FormField>
      <FormField label="Errores comunes" htmlFor="common_mistakes">
        <Textarea id="common_mistakes" name="common_mistakes" rows={2} defaultValue={exercise?.common_mistakes ?? ''} />
      </FormField>
      <FormField label="URL de video" htmlFor="video_url" hint="Opcional">
        <Input id="video_url" name="video_url" type="url" placeholder="https://…" defaultValue={exercise?.video_url ?? ''} />
      </FormField>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton>{isEdit ? 'Guardar cambios' : 'Guardar ejercicio'}</SubmitButton>
    </form>
  );
}
