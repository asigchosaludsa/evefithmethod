import Link from 'next/link';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/common';
import type { AttentionItem } from '@/lib/db/queries/coach';

/**
 * "A quién revisar hoy": lista priorizada de alumnas que necesitan atención,
 * cada una con sus motivos como badges de color. Filas enlazan al detalle de la
 * alumna. Se limita a `max` filas y muestra un resumen "+N más" si sobran.
 */
export function AttentionList({
  items,
  max = 6,
}: {
  items: AttentionItem[];
  max?: number;
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success/25 bg-success/8 px-4 py-5 text-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/12 text-success">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-medium text-foreground">Todo en orden</p>
          <p className="text-muted">Ninguna alumna necesita revisión urgente ahora mismo.</p>
        </div>
      </div>
    );
  }

  const shown = items.slice(0, max);
  const remaining = items.length - shown.length;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <ul className="divide-y divide-hairline">
        {shown.map(({ studentId, name, goal, reasons }) => (
          <li key={studentId}>
            <Link
              href={`/coach/students/${studentId}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-elevated"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{name}</p>
                {goal && <p className="truncate text-xs text-faint">{goal}</p>}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {reasons.map((r) => (
                    <Badge key={r.key} tone={r.tone}>
                      {r.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <Link
          href="/coach/students"
          className="block border-t border-hairline px-4 py-2.5 text-center text-xs font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
        >
          +{remaining} alumna{remaining === 1 ? '' : 's'} más por revisar · ver todas
        </Link>
      )}
    </div>
  );
}
