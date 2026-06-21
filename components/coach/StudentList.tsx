import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/common';
import { formatDate } from '@/lib/utils/date';
import type { StudentSummary } from '@/lib/db/queries/coach';

export function StudentList({ students }: { students: StudentSummary[] }) {
  return (
    <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-border bg-surface">
      {students.map((s) => (
        <li key={s.studentId}>
          <Link
            href={`/coach/students/${s.studentId}`}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-elevated"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-elevated font-display text-sm font-semibold text-foreground">
              {s.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{s.name}</p>
              <p className="truncate text-sm text-muted">{s.goal ?? 'Sin objetivo definido'}</p>
            </div>
            <div className="hidden text-right text-xs text-muted sm:block">
              <p>Última comida: {formatDate(s.lastFoodLogAt)}</p>
              <p>Último entreno: {formatDate(s.lastWorkoutAt)}</p>
            </div>
            <div className="hidden w-20 text-right sm:block">
              {s.currentWeightKg ? (
                <Badge tone="neutral">{s.currentWeightKg} kg</Badge>
              ) : (
                <span className="text-xs text-faint">—</span>
              )}
            </div>
            <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
