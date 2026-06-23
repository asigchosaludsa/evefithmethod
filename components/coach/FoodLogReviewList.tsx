import { Check, Flag } from 'lucide-react';
import { reviewFoodLog } from '@/lib/coach/actions';
import { Badge, EmptyState } from '@/components/common';
import { MacroLine } from '@/components/nutrition/MacroLine';
import { formatDateTime } from '@/lib/utils/date';
import type { MealLogSummary } from '@/lib/db/queries/student-nutrition';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
  other: 'Otro',
};

function mealLabel(type: string): string {
  return MEAL_LABELS[type] ?? type;
}

function statusBadge(status: string) {
  if (status === 'reviewed') return <Badge tone="success">Revisado</Badge>;
  if (status === 'flagged') return <Badge tone="danger">Requiere ajuste</Badge>;
  return <Badge tone="neutral">Pendiente</Badge>;
}

const ghostButton =
  'inline-flex items-center gap-1 rounded-md border border-hairline bg-elevated px-2.5 py-1 ' +
  'text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground';

export function FoodLogReviewList({ meals }: { meals: MealLogSummary[] }) {
  if (meals.length === 0) {
    return <EmptyState title="Sin comidas registradas hoy" />;
  }

  return (
    <ul className="space-y-2">
      {meals.map((m) => (
        <li
          key={m.id}
          className="flex flex-col gap-3 rounded-lg border border-hairline bg-canvas/40 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{mealLabel(m.meal_type)}</p>
              {statusBadge(m.review_status)}
            </div>
            <p className="text-xs text-faint">{formatDateTime(m.logged_at)}</p>
            <p className="text-sm">
              <span className="tabular text-muted">{m.totals.calories} kcal</span>
              <span className="mx-1.5 text-faint">·</span>
              <MacroLine macros={m.totals} className="text-sm" />
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <form action={reviewFoodLog.bind(null, m.id, 'reviewed')}>
              <button type="submit" className={ghostButton} aria-label="Marcar como revisado">
                <Check className="size-3.5" aria-hidden /> Revisado
              </button>
            </form>
            <form action={reviewFoodLog.bind(null, m.id, 'flagged')}>
              <button type="submit" className={ghostButton} aria-label="Marcar que requiere ajuste">
                <Flag className="size-3.5" aria-hidden /> Requiere ajuste
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
