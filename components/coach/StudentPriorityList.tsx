import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge, EmptyState } from '@/components/common';
import type { AlertSeverity } from '@/types/app';
import type { CoachDashboard } from '@/lib/db/queries/coach';

const TONE: Record<AlertSeverity, 'info' | 'warning' | 'danger' | 'success'> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
  success: 'success',
};

export function StudentPriorityList({ priorities }: { priorities: CoachDashboard['priorities'] }) {
  if (priorities.length === 0) {
    return (
      <EmptyState
        title="Todo en orden"
        description="Ninguna alumna necesita revisión urgente hoy. ¡Buen trabajo!"
      />
    );
  }

  return (
    <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-border bg-surface">
      {priorities.map(({ student, alerts }) => (
        <li key={student.studentId}>
          <Link
            href={`/coach/students/${student.studentId}`}
            className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-elevated"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{student.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {alerts.map((a) => (
                  <Badge key={a.type} tone={TONE[a.severity]}>
                    {a.title}
                  </Badge>
                ))}
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
