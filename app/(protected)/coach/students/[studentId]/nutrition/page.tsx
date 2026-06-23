import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/common';
import { NutritionPlanForm } from '@/components/coach/NutritionPlanForm';
import { FoodLogReviewList } from '@/components/coach/FoodLogReviewList';
import { MacroLegend } from '@/components/nutrition/MacroLine';
import { ArchivePlanButton } from '@/components/coach/ArchivePlanButton';
import { getStudentNutritionDay, getStudentNutritionRange } from '@/lib/db/queries/student-nutrition';
import { calculateMacroProgress } from '@/domain/nutrition/calculations';
import { formatDate, todayISO } from '@/lib/utils/date';
import { NutritionCalendar } from '@/components/nutrition/NutritionCalendar';
import { NutritionAdherenceChart, type AdherencePoint } from '@/components/nutrition/NutritionAdherenceChart';
import { addDaysISO } from '@/domain/workouts/calendar';

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
  const activePlans = (plans ?? []).filter((p) => p.status !== 'archived');
  const archivedPlans = (plans ?? []).filter((p) => p.status === 'archived');

  const endISO = todayISO();
  const startISO = addDaysISO(endISO, -27);
  const range = await getStudentNutritionRange(studentId, startISO, endISO);
  const points: AdherencePoint[] = [];
  for (let d = startISO; d <= endISO; d = addDaysISO(d, 1)) {
    points.push({ dateISO: d, calories: range.byDate[d]?.consumed.calories ?? 0 });
  }

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
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="tabular text-sm text-foreground">
                <span className="font-semibold">{day.consumed.calories}</span>
                <span className="text-muted"> / {day.target.calories ?? '—'} kcal</span>
                {day.target.calories ? <span className="text-faint"> · {calProgress.pct}%</span> : null}
              </p>
              <p className="tabular text-sm">
                <span className="text-info">
                  P {day.consumed.protein_g}/{day.target.protein_g ?? '—'}
                </span>
                <span className="mx-1.5 text-faint">·</span>
                <span className="text-warning">
                  C {day.consumed.carbs_g}/{day.target.carbs_g ?? '—'}
                </span>
                <span className="mx-1.5 text-faint">·</span>
                <span className="text-success">
                  G {day.consumed.fat_g}/{day.target.fat_g ?? '—'}
                </span>
              </p>
            </div>
            <MacroLegend />
          </div>
          <FoodLogReviewList meals={day.meals} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendario de adherencia</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <NutritionCalendar
            byDate={range.byDate}
            target={{ calories: range.target.calories }}
            todayISO={endISO}
          />
          <NutritionAdherenceChart points={points} target={range.target.calories} />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground">Planes</h2>
          {activePlans.length === 0 ? (
            <EmptyState title="Sin planes" description="Crea el primer plan nutricional." />
          ) : (
            <ul className="space-y-2">
              {activePlans.map((p) => (
                <li key={p.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{p.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge tone={p.status === 'active' ? 'success' : 'neutral'}>{p.status}</Badge>
                      <ArchivePlanButton planId={p.id} studentId={studentId} kind="nutrition" archived={false} />
                    </div>
                  </div>
                  <p className="mt-1 text-sm">
                    <span className="text-muted">{p.calories_target ?? '—'} kcal</span>
                    <span className="mx-1.5 text-faint">·</span>
                    <span className="text-info">P {p.protein_target_g ?? '—'}</span>
                    <span className="mx-1.5 text-faint">·</span>
                    <span className="text-warning">C {p.carbs_target_g ?? '—'}</span>
                    <span className="mx-1.5 text-faint">·</span>
                    <span className="text-success">G {p.fat_target_g ?? '—'}</span>
                  </p>
                  <p className="mt-1 text-xs text-faint">Creado {formatDate(p.created_at)}</p>
                </li>
              ))}
            </ul>
          )}

          {archivedPlans.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-faint">Archivados</h3>
              <ul className="space-y-2">
                {archivedPlans.map((p) => (
                  <li key={p.id} className="rounded-lg border border-border bg-surface/50 p-4 opacity-70">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-muted">{p.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{p.status}</Badge>
                        <ArchivePlanButton planId={p.id} studentId={studentId} kind="nutrition" archived />
                      </div>
                    </div>
                    <p className="mt-1 text-sm">
                      <span className="text-muted">{p.calories_target ?? '—'} kcal</span>
                      <span className="mx-1.5 text-faint">·</span>
                      <span className="text-info">P {p.protein_target_g ?? '—'}</span>
                      <span className="mx-1.5 text-faint">·</span>
                      <span className="text-warning">C {p.carbs_target_g ?? '—'}</span>
                      <span className="mx-1.5 text-faint">·</span>
                      <span className="text-success">G {p.fat_target_g ?? '—'}</span>
                    </p>
                    <p className="mt-1 text-xs text-faint">Creado {formatDate(p.created_at)}</p>
                  </li>
                ))}
              </ul>
            </div>
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
