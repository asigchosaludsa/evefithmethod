import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/common';
import { WorkoutPlanForm } from '@/components/coach/WorkoutPlanForm';
import { ArchivePlanButton } from '@/components/coach/ArchivePlanButton';
import { getLoggedExercises } from '@/lib/db/queries/exercise-history';

export default async function StudentWorkoutsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const coach = await requireCoach();
  await assertCoachOwnsStudent(coach.id, studentId);

  const supabase = await createClient();
  const { data: plans } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  const loggedExercises = await getLoggedExercises(studentId);
  const activePlans = (plans ?? []).filter((p) => p.status !== 'archived');
  const archivedPlans = (plans ?? []).filter((p) => p.status === 'archived');

  return (
    <div className="space-y-6">
      <Link href={`/coach/students/${studentId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver a la alumna
      </Link>
      <PageHeader title="Entrenamientos" description="Planes de entrenamiento de la alumna." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground">Planes</h2>
          {activePlans.length === 0 ? (
            <EmptyState title="Sin planes" description="Crea el primer plan de entrenamiento." />
          ) : (
            <ul className="space-y-2">
              {activePlans.map((p) => (
                <li key={p.id} className="rounded-lg border border-border bg-surface transition-colors hover:bg-elevated">
                  <div className="flex items-start justify-between gap-2 p-4">
                    <Link href={`/coach/workouts/plans/${p.id}`} className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground">{p.title}</p>
                        <Badge tone={p.status === 'active' ? 'success' : 'neutral'}>{p.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {p.focus ?? 'General'} · {p.level ?? 'Todos los niveles'}
                      </p>
                      <p className="mt-1 text-xs text-primary">Agregar días y ejercicios →</p>
                    </Link>
                    <ArchivePlanButton planId={p.id} studentId={studentId} kind="workout" archived={false} />
                  </div>
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-muted">{p.title}</p>
                          <Badge tone="neutral">{p.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {p.focus ?? 'General'} · {p.level ?? 'Todos los niveles'}
                        </p>
                      </div>
                      <ArchivePlanButton planId={p.id} studentId={studentId} kind="workout" archived />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo plan de entrenamiento</CardTitle>
          </CardHeader>
          <CardBody>
            <WorkoutPlanForm studentId={studentId} />
          </CardBody>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Historial por ejercicio</h2>
        {loggedExercises.length === 0 ? (
          <EmptyState title="Sin ejercicios registrados" description="Aparecerán cuando la alumna registre entrenamientos." />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {loggedExercises.map((ex) => (
              <li key={ex.exerciseId}>
                <Link
                  href={`/coach/students/${studentId}/exercise/${ex.exerciseId}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-elevated"
                >
                  <span className="font-medium text-foreground">{ex.name}</span>
                  <Badge tone="neutral">{ex.sessions} sesiones</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
