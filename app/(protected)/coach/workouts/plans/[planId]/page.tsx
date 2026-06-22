import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Dumbbell, Trash2 } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { getWorkoutPlanContent } from '@/lib/db/queries/workout-plan';
import { deleteWorkoutDay } from '@/lib/coach/actions';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/common';
import { AddWorkoutDayForm } from '@/components/coach/AddWorkoutDayForm';
import { ExerciseCatalogPicker, type CatalogExercise } from '@/components/coach/ExerciseCatalogPicker';
import { PlanExerciseRow } from '@/components/coach/PlanExerciseRow';
import { SPLIT_TEMPLATES, splitLabel } from '@/lib/constants/splits';

export default async function WorkoutPlanBuilderPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const coach = await requireCoach();
  const content = await getWorkoutPlanContent(planId);
  if (!content || content.plan.coach_id !== coach.id) notFound();

  const supabase = await createClient();
  const { data: library } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, equipment, difficulty, movement_pattern, thumbnail_url')
    .or(`coach_id.eq.${coach.id},is_global.eq.true`)
    .neq('status', 'archived')
    .order('name');
  const exercises = (library ?? []) as CatalogExercise[];

  // Pre-filtro por enfoque del día: re-resolver la plantilla del split por day_number.
  const splitType = content.plan.split_type;
  const template =
    splitType && splitType !== 'personalizado'
      ? SPLIT_TEMPLATES[splitType as keyof typeof SPLIT_TEMPLATES]
      : null;
  const splitName = splitLabel(splitType);

  return (
    <div className="space-y-6">
      <Link
        href={`/coach/students/${content.plan.student_id}/workouts`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>

      <PageHeader
        title={content.plan.title}
        description={[splitName, content.plan.focus, content.plan.level].filter(Boolean).join(' · ') || 'Plan de entrenamiento'}
        actions={<Badge tone={content.plan.status === 'active' ? 'success' : 'neutral'}>{content.plan.status}</Badge>}
      />

      {exercises.length === 0 && (
        <p className="rounded-md border border-warning/25 bg-warning/5 p-3 text-sm text-foreground">
          No tienes ejercicios en tu biblioteca todavía.{' '}
          <Link href="/coach/exercises/new" className="text-primary hover:underline">
            Crea uno
          </Link>{' '}
          para poder asignarlo a los días.
        </p>
      )}

      {content.days.length === 0 ? (
        <EmptyState title="Sin días aún" description="Agrega el primer día del plan abajo." icon={Dumbbell} />
      ) : (
        <div className="space-y-4">
          {content.days.map((day) => {
            const prefill = [...(template?.days[day.day_number - 1]?.muscleGroups ?? [])];
            return (
              <Card key={day.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>
                      Día {day.day_number}: {day.title}
                      {day.focus && <span className="ml-2 text-sm font-normal text-muted">· {day.focus}</span>}
                    </CardTitle>
                    <form action={deleteWorkoutDay.bind(null, day.id, planId)}>
                      <button type="submit" className="text-faint hover:text-danger" aria-label="Eliminar día">
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  {day.exercises.length === 0 ? (
                    <p className="text-sm text-faint">Sin ejercicios en este día.</p>
                  ) : (
                    <ul className="divide-y divide-hairline">
                      {day.exercises.map((ex) => (
                        <PlanExerciseRow key={ex.id} ex={ex} planId={planId} />
                      ))}
                    </ul>
                  )}
                  <ExerciseCatalogPicker
                    planId={planId}
                    dayId={day.id}
                    exercises={exercises}
                    prefillMuscleGroups={prefill}
                  />
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Agregar día</CardTitle>
        </CardHeader>
        <CardBody>
          <AddWorkoutDayForm planId={planId} />
        </CardBody>
      </Card>
    </div>
  );
}
