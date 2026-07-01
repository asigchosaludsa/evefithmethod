'use client';

import { useActionState } from 'react';
import { Eye, Lock, Trash2 } from 'lucide-react';
import { addCoachNote, deleteCoachNote } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { Badge, SubmitButton, Textarea } from '@/components/common';
import { formatDate } from '@/lib/utils/date';
import type { CoachNote } from '@/types/database';

export function CoachNotesPanel({ studentId, notes }: { studentId: string; notes: CoachNote[] }) {
  const [state, action] = useActionState(addCoachNote, initialActionState);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-2">
        <input type="hidden" name="student_id" value={studentId} />
        <Textarea name="note" placeholder="Escribe una nota…" rows={3} required />
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" name="visible_to_student" className="mt-0.5 size-4 accent-primary" />
          <span>
            <span className="font-medium text-foreground">Visible para la alumna</span> — aparecerá en su
            pantalla &ldquo;Hoy&rdquo;. Si la dejas sin marcar, es una nota privada tuya.
          </span>
        </label>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.success && <p className="text-sm text-success">{state.success}</p>}
        <SubmitButton size="sm">Agregar nota</SubmitButton>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-faint">Aún no hay notas.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => {
            const visible = n.is_private === false;
            return (
              <li
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-md border border-hairline bg-canvas/40 p-3"
              >
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{n.note}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-faint">{formatDate(n.created_at)}</p>
                    {visible ? (
                      <Badge tone="success">
                        <Eye className="mr-1 inline size-3" aria-hidden /> Visible para la alumna
                      </Badge>
                    ) : (
                      <Badge tone="neutral">
                        <Lock className="mr-1 inline size-3" aria-hidden /> Privada
                      </Badge>
                    )}
                  </div>
                </div>
                <form action={deleteCoachNote.bind(null, n.id, studentId)}>
                  <button type="submit" className="text-faint transition-colors hover:text-danger" aria-label="Eliminar nota">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
