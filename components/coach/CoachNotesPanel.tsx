'use client';

import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';
import { addCoachNote, deleteCoachNote } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { SubmitButton, Textarea } from '@/components/common';
import { formatDate } from '@/lib/utils/date';
import type { CoachNote } from '@/types/database';

export function CoachNotesPanel({ studentId, notes }: { studentId: string; notes: CoachNote[] }) {
  const [state, action] = useActionState(addCoachNote, initialActionState);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-2">
        <input type="hidden" name="student_id" value={studentId} />
        <Textarea name="note" placeholder="Nota privada sobre la alumna…" rows={3} required />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <SubmitButton size="sm">Agregar nota</SubmitButton>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-faint">Aún no hay notas.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-md border border-hairline bg-canvas/40 p-3"
            >
              <div className="min-w-0">
                <p className="whitespace-pre-wrap text-sm text-foreground">{n.note}</p>
                <p className="mt-1 text-xs text-faint">{formatDate(n.created_at)}</p>
              </div>
              <form action={deleteCoachNote.bind(null, n.id, studentId)}>
                <button type="submit" className="text-faint transition-colors hover:text-danger" aria-label="Eliminar nota">
                  <Trash2 className="size-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
