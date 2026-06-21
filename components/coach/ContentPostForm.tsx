'use client';

import { useActionState } from 'react';
import { createContentPost } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { CONTENT_CATEGORIES } from '@/types/app';
import { FormField, Input, Textarea, Select, SubmitButton } from '@/components/common';

export function ContentPostForm() {
  const [state, action] = useActionState(createContentPost, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <FormField label="Título" htmlFor="title">
        <Input id="title" name="title" required />
      </FormField>
      <FormField label="Categoría" htmlFor="category">
        <Select id="category" name="category" placeholder="Selecciona una categoría" defaultValue="">
          {CONTENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Resumen" htmlFor="summary" hint="Una línea que aparece en la lista">
        <Input id="summary" name="summary" />
      </FormField>
      <FormField label="Contenido" htmlFor="body">
        <Textarea id="body" name="body" rows={8} />
      </FormField>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton>Publicar tip</SubmitButton>
    </form>
  );
}
