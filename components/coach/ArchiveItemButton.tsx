'use client';

import { ConfirmDialog, Button } from '@/components/common';
import { archiveExercise, restoreExercise } from '@/lib/coach/actions';
import { archiveContentPost, restoreContentPost } from '@/lib/coach/content-actions';

export interface ArchiveItemButtonProps {
  id: string;
  kind: 'exercise' | 'content';
  archived: boolean;
}

export function ArchiveItemButton({ id, kind, archived }: ArchiveItemButtonProps) {
  if (archived) {
    const restore = kind === 'exercise' ? restoreExercise : restoreContentPost;
    return (
      <Button variant="outline" size="sm" onClick={() => restore(id)}>
        Restaurar
      </Button>
    );
  }

  const archive = kind === 'exercise' ? archiveExercise : archiveContentPost;
  const description =
    kind === 'exercise'
      ? 'El ejercicio se ocultará de la biblioteca activa. Podrás restaurarlo cuando quieras.'
      : 'El tip se ocultará de la lista activa. Podrás restaurarlo cuando quieras.';

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          Archivar
        </Button>
      }
      title={kind === 'exercise' ? 'Archivar ejercicio' : 'Archivar tip'}
      description={description}
      confirmLabel="Archivar"
      onConfirm={() => archive(id)}
    />
  );
}
