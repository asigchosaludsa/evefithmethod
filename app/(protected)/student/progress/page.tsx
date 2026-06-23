import { requireStudent } from '@/lib/auth/roles';
import { getStudentProgressDashboard } from '@/lib/db/queries/progress-dashboard';
import { getProgressPhotos } from '@/lib/db/queries/progress-photos';
import { goalProgressPct, remainingToGoal } from '@/domain/progress/goals';
import { Card, CardBody, CardHeader, CardTitle, PageHeader } from '@/components/common';
import { GoalProgressRing } from '@/components/progress/GoalProgressRing';
import { WeightTrendChart } from '@/components/progress/WeightTrendChart';
import { MeasurementDeltas } from '@/components/progress/MeasurementDeltas';
import { TrainingSummaryCard } from '@/components/progress/TrainingSummaryCard';
import { NutritionAdherenceSummary } from '@/components/progress/NutritionAdherenceSummary';
import { GoalWeightForm, MeasurementForm, WeightForm } from '@/components/student/ProgressForms';
import { ProgressPhotoUpload } from '@/components/student/ProgressPhotoUpload';
import { PhotoGallery } from '@/components/progress/PhotoGallery';

export const metadata = { title: 'Mi progreso' };

export default async function StudentProgressPage() {
  const profile = await requireStudent();
  const todayISO = new Date().toISOString().slice(0, 10);

  const [dash, photos] = await Promise.all([
    getStudentProgressDashboard(profile.id, todayISO),
    getProgressPhotos(profile.id),
  ]);

  const pct = goalProgressPct(dash.weight.firstKg, dash.weight.currentKg, dash.weight.goalKg);
  const remaining = remainingToGoal(dash.weight.currentKg, dash.weight.goalKg);

  return (
    <div className="space-y-6">
      <PageHeader title="Mi progreso" description="Tu evolución de peso, medidas, entrenamiento y nutrición." />

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
        <CardBody className="space-y-4">
          <ProgressPhotoUpload userId={profile.id} />
          {photos.length === 0 ? (
            <p className="text-sm text-faint">Aún no has subido fotos.</p>
          ) : (
            <PhotoGallery photos={photos} />
          )}
        </CardBody>
      </Card>

      {/* Formularios */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Fijar meta de peso</CardTitle>
          </CardHeader>
          <CardBody>
            <GoalWeightForm current={dash.weight.goalKg} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Registrar peso</CardTitle>
          </CardHeader>
          <CardBody>
            <WeightForm />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Registrar medidas</CardTitle>
          </CardHeader>
          <CardBody>
            <MeasurementForm />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
