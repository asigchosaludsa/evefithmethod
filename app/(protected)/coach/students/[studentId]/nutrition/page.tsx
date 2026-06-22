import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/common';
import { NutritionPlanForm } from '@/components/coach/NutritionPlanForm';
import { FoodLogReviewList } from '@/components/coach/FoodLogReviewList';
import { getStudentNutritionDay } from '@/lib/db/queries/student-nutrition';
import { calculateMacroProgress } from '@/domain/nutrition/calculations';
import { formatDate, todayISO } from '@/lib/utils/date';

export default async function StudentNutritionPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const coach = await requireCoach();
  await assertCoachOwnsStudent(coach.id, studentId);

  const supabase = await createClient();
  const [{ data: plans }, day] = await Promise.all([
    supabase.from('nutrition_plans').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
    getStudentNutritionDay(studentId, todayISO()),
  ]);
  const calProgress = calculateMacroProgress(day.consumed.calories, day.target.calories ?? 0);

  return (
    <div className="space-y-6">
      <Link href={`/coach/students/${studentId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver a la alumna
      </Link>
      <PageHeader title="Nutrición" description="Planes y registros de comida de la alumna." />

      <Card>
        <CardHeader>
          <CardTitle>Registros de comida (hoy)</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="tabular text-sm text-foreground">
              <span className="font-semibold">{day.consumed.calories}</span>
              <span className="text-muted"> / {day.target.calories ?? '—'} kcal</span>
              {day.target.calories ? <span className="text-faint"> · {calProgress.pct}%</span> : null}
            </p>
            <p className="tabular text-sm text-muted">
              P {day.consumed.protein_g}/{day.target.protein_g ?? '—'} · C {day.consumed.carbs_g}/
              {day.target.carbs_g ?? '—'} · G {day.consumed.fat_g}/{day.target.fat_g ?? '—'}
            </p>
          </div>
          <FoodLogReviewList meals={day.meals} />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground">Planes</h2>
          {!plans || plans.length === 0 ? (
            <EmptyState title="Sin planes" description="Crea el primer plan nutricional." />
          ) : (
            <ul className="space-y-2">
              {plans.map((p) => (
                <li key={p.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{p.title}</p>
                    <Badge tone={p.status === 'active' ? 'success' : 'neutral'}>{p.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {p.calories_target ?? '—'} kcal · P {p.protein_target_g ?? '—'} · C {p.carbs_target_g ?? '—'} · G{' '}
                    {p.fat_target_g ?? '—'}
                  </p>
                  <p className="mt-1 text-xs text-faint">Creado {formatDate(p.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo plan nutricional</CardTitle>
          </CardHeader>
          <CardBody>
            <NutritionPlanForm studentId={studentId} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
