'use client';

import { useActionState } from 'react';
import { createExercise } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { FormField, Input, Textarea, SubmitButton } from '@/components/common';

export function ExerciseForm() {
  const [state, action] = useActionState(createExercise, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <FormField label="Nombre" htmlFor="name">
        <Input id="name" name="name" placeholder="Ej: Hip Thrust" required />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Grupo muscular" htmlFor="muscle_group">
          <Input id="muscle_group" name="muscle_group" placeholder="Glúteos" />
        </FormField>
        <FormField label="Equipo" htmlFor="equipment">
          <Input id="equipment" name="equipment" placeholder="Barra" />
        </FormField>
      </div>
      <FormField label="Descripción" htmlFor="description">
        <Textarea id="description" name="description" rows={2} />
      </FormField>
      <FormField label="Instrucciones" htmlFor="instructions">
        <Textarea id="instructions" name="instructions" rows={3} />
      </FormField>
      <FormField label="Errores comunes" htmlFor="common_mistakes">
        <Textarea id="common_mistakes" name="common_mistakes" rows={2} />
      </FormField>
      <FormField label="URL de video" htmlFor="video_url" hint="Opcional — se puede agregar después">
        <Input id="video_url" name="video_url" type="url" placeholder="https://…" />
      </FormField>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton>Guardar ejercicio</SubmitButton>
    </form>
  );
}
