import { MessageSquareText } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import type { CoachNoteForStudent } from '@/lib/db/queries/student';

/**
 * Muestra las notas que la coach marcó como visibles para la alumna, en su "Hoy".
 * Mantiene el patrón visual de "mensaje de tu coach" (acento escarlata).
 */
export function CoachNotesCard({ notes }: { notes: CoachNoteForStudent[] }) {
  if (notes.length === 0) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <MessageSquareText className="size-4" aria-hidden />
        </div>
        <h3 className="font-display text-base font-semibold text-foreground">Notas de tu coach</h3>
      </div>
      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg border border-hairline bg-canvas/40 p-3">
            <p className="whitespace-pre-wrap text-sm text-foreground">{n.note}</p>
            <p className="mt-1.5 text-xs text-faint">{formatDate(n.created_at)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
