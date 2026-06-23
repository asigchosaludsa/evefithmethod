import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { getStudentProgressDashboard } from '@/lib/db/queries/progress-dashboard';
import { getProgressPhotos } from '@/lib/db/queries/progress-photos';
import { goalProgressPct, remainingToGoal } from '@/domain/progress/goals';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/common';
import { GoalProgressRing } from '@/components/progress/GoalProgressRing';
import { WeightTrendChart } from '@/components/progress/WeightTrendChart';
import { MeasurementDeltas } from '@/components/progress/MeasurementDeltas';
import { TrainingSummaryCard } from '@/components/progress/TrainingSummaryCard';
import { NutritionAdherenceSummary } from '@/components/progress/NutritionAdherenceSummary';

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const coach = await requireCoach();
  await assertCoachOwnsStudent(coach.id, studentId);

  const todayISO = new Date().toISOString().slice(0, 10);
  const [dash, photos] = await Promise.all([
    getStudentProgressDashboard(studentId, todayISO),
    getProgressPhotos(studentId),
  ]);

  const pct = goalProgressPct(dash.weight.firstKg, dash.weight.currentKg, dash.weight.goalKg);
  const remaining = remainingToGoal(dash.weight.currentKg, dash.weight.goalKg);

  return (
    <div className="space-y-6">
      <Link href={`/coach/students/${studentId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver a la alumna
      </Link>
      <PageHeader title="Progreso" description="Evolución de peso, medidas, entrenamiento y nutrición." />

      {/* Hero: meta + entrenamiento + nutrición */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Meta de peso</CardTitle>
          </CardHeader>
          <CardBody>
            <GoalProgressRing
              pct={pct}
              currentKg={dash.weight.currentKg}
              goalKg={dash.weight.goalKg}
              remainingKg={remaining}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entrenamiento</CardTitle>
          </CardHeader>
          <CardBody>
            <TrainingSummaryCard
              sessionsLast30={dash.training.sessionsLast30}
              streak={dash.training.streak}
              topProgressions={dash.training.topProgressions}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nutrición</CardTitle>
          </CardHeader>
          <CardBody>
            <NutritionAdherenceSummary
              pctDaysOk={dash.nutrition.pctDaysOk}
              daysLogged={dash.nutrition.daysLogged}
              points={dash.nutrition.points}
              targetCalories={dash.nutrition.targetCalories}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolución de peso</CardTitle>
        </CardHeader>
        <CardBody>
          <WeightTrendChart series={dash.weight.series} goalKg={dash.weight.goalKg} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medidas</CardTitle>
        </CardHeader>
        <CardBody>
          <MeasurementDeltas first={dash.measurements.first} last={dash.measurements.last} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos de progreso</CardTitle>
        </CardHeader>
        <CardBody>
          {photos.length === 0 ? (
            <EmptyState title="Sin fotos" description="La alumna aún no subió fotos." />
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.url}
                  alt={`Foto de progreso (${p.photoType})`}
                  loading="lazy"
                  className="aspect-square w-full rounded-md border border-hairline object-cover"
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
