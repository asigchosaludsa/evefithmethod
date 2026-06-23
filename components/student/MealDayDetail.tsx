'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteFoodLog } from '@/lib/student/actions';
import { formatQuantity, type FoodUnit } from '@/domain/nutrition/units';
import { Badge, Button, ConfirmDialog } from '@/components/common';
import type { MealDetail, StudentMealsDay } from '@/lib/db/queries/student-nutrition';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
  other: 'Otro',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

function asFoodUnit(unit: string | null): FoodUnit {
  return unit === 'ml' || unit === 'unit' ? unit : 'g';
}

export function MealDayDetail({ day }: { day: StudentMealsDay }) {
  if (day.meals.length === 0) {
    return (
      <p className="text-sm text-muted">No hay comidas registradas este día.</p>
    );
  }

  const { target, consumed } = day;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-surface p-3">
        <p className="text-xs uppercase tracking-wide text-muted">Total del día</p>
        <p className="tabular mt-1 font-display text-lg font-bold text-foreground">
          {consumed.calories} kcal
          {target.calories != null && target.calories > 0 && (
            <span className="text-sm font-normal text-muted"> / {target.calories} kcal meta</span>
          )}
        </p>
        <p className="tabular text-sm text-muted">
          P {consumed.protein_g}g · C {consumed.carbs_g}g · G {consumed.fat_g}g
        </p>
      </div>

      <ul className="space-y-3">
        {day.meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} />
        ))}
      </ul>
    </div>
  );
}

function MealCard({ meal }: { meal: MealDetail }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteFoodLog(meal.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-medium text-foreground">
            {MEAL_LABELS[meal.meal_type] ?? meal.meal_type}
          </span>
          <span className="ml-2 text-xs text-faint">{formatTime(meal.logged_at)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" aria-label="Editar comida">
            <Link href={`/student/meals/${meal.id}`}>
              <Pencil className="size-4" />
            </Link>
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" aria-label="Eliminar comida" loading={pending}>
                <Trash2 className="size-4 text-danger" />
              </Button>
            }
            title="Eliminar comida"
            description="Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este registro?"
            confirmLabel="Eliminar"
            destructive
            onConfirm={onDelete}
          />
        </div>
      </div>

      {meal.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meal.photoUrl}
          alt=""
          className="mt-3 h-32 w-full rounded-md border border-hairline object-cover"
        />
      )}

      {meal.items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {meal.items.map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-foreground">
                {it.name}
                <span className="ml-1.5 text-xs text-faint">
                  {formatQuantity(it.quantity ?? it.grams, asFoodUnit(it.unit), null)}
                </span>
              </span>
              <span className="tabular shrink-0 text-xs text-muted">{it.macros.calories} kcal</span>
            </li>
          ))}
        </ul>
      )}

      <p className="tabular mt-3 text-xs text-muted">
        {meal.totals.calories} kcal · P {meal.totals.protein_g} · C {meal.totals.carbs_g} · G {meal.totals.fat_g}
      </p>

      {meal.notes && <p className="mt-2 text-xs italic text-faint">{meal.notes}</p>}

      {meal.review_status !== 'pending' && (
        <Badge tone={meal.review_status === 'flagged' ? 'danger' : 'success'} className="mt-2">
          {meal.review_status === 'flagged' ? 'Requiere ajuste' : 'Revisado'}
        </Badge>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </li>
  );
}
