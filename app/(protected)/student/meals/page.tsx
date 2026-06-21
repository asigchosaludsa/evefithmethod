import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { calculateMealTotals } from '@/domain/nutrition/calculations';
import { Badge, Button, EmptyState, PageHeader } from '@/components/common';
import { formatDateTime } from '@/lib/utils/date';

export const metadata = { title: 'Mis comidas' };

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
  other: 'Otro',
};

export default async function StudentMealsPage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from('food_logs')
    .select('*')
    .eq('student_id', profile.id)
    .order('logged_at', { ascending: false })
    .limit(20);

  const ids = (logs ?? []).map((l) => l.id);
  const { data: items } = ids.length
    ? await supabase.from('food_log_items').select('food_log_id, calories, protein_g, carbs_g, fat_g').in('food_log_id', ids)
    : { data: [] };

  const byLog = new Map<string, { calories: number; protein_g: number; carbs_g: number; fat_g: number }[]>();
  for (const it of items ?? []) {
    const arr = byLog.get(it.food_log_id) ?? [];
    arr.push(it);
    byLog.set(it.food_log_id, arr);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis comidas"
        description="Tus registros recientes."
        actions={
          <Button asChild>
            <Link href="/student/meals/new">
              <Plus className="size-4" /> Registrar
            </Link>
          </Button>
        }
      />
      {!logs || logs.length === 0 ? (
        <EmptyState
          title="Sin registros aún"
          description="Registra tu primera comida."
          action={
            <Button asChild>
              <Link href="/student/meals/new">
                <Plus className="size-4" /> Registrar comida
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => {
            const totals = calculateMealTotals(byLog.get(log.id) ?? []);
            return (
              <li key={log.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{MEAL_LABELS[log.meal_type] ?? log.meal_type}</span>
                  <span className="text-xs text-faint">{formatDateTime(log.logged_at)}</span>
                </div>
                <p className="tabular mt-1 text-sm text-muted">
                  {totals.calories} kcal · P {totals.protein_g} · C {totals.carbs_g} · G {totals.fat_g}
                </p>
                {log.coach_review_status !== 'pending' && (
                  <Badge tone={log.coach_review_status === 'flagged' ? 'danger' : 'success'} className="mt-2">
                    {log.coach_review_status === 'flagged' ? 'Requiere ajuste' : 'Revisado'}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
