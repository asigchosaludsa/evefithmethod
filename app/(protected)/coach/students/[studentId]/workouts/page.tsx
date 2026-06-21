import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/common';
import { WorkoutPlanForm } from '@/components/coach/WorkoutPlanForm';
import { formatDate } from '@/lib/utils/date';

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

  return (
    <div className="space-y-6">
      <Link href={`/coach/students/${studentId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver a la alumna
      </Link>
      <PageHeader title="Entrenamientos" description="Planes de entrenamiento de la alumna." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground">Planes</h2>
          {!plans || plans.length === 0 ? (
            <EmptyState title="Sin planes" description="Crea el primer plan de entrenamiento." />
          ) : (
            <ul className="space-y-2">
              {plans.map((p) => (
                <li key={p.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{p.title}</p>
                    <Badge tone={p.status === 'active' ? 'success' : 'neutral'}>{p.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {p.focus ?? 'General'} · {p.level ?? 'Todos los niveles'}
                  </p>
                  <p className="mt-1 text-xs text-faint">Creado {formatDate(p.created_at)}</p>
                </li>
              ))}
            </ul>
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
    </div>
  );
}
