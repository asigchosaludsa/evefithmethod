import { requireStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { getStudentCoachId } from '@/lib/db/queries/student';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/common';
import { WorkoutLogForm } from '@/components/student/WorkoutLogForm';
import { formatDateTime } from '@/lib/utils/date';

export const metadata = { title: 'Mi entrenamiento' };

export default async function StudentWorkoutPage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const coachId = await getStudentCoachId(profile.id);

  const [{ data: plan }, { data: exercises }, { data: recent }] = await Promise.all([
    supabase
      .from('workout_plans')
      .select('*')
      .eq('student_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('exercises')
      .select('id, name')
      .or(`is_global.eq.true${coachId ? `,coach_id.eq.${coachId}` : ''}`)
      .neq('status', 'archived')
      .order('name'),
    supabase
      .from('workout_logs')
      .select('id, logged_at, status, perceived_effort')
      .eq('student_id', profile.id)
      .order('logged_at', { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Mi entrenamiento" description="Tu plan activo y registro de hoy." />

      <Card>
        <CardHeader>
          <CardTitle>{plan ? plan.title : 'Sin plan activo'}</CardTitle>
        </CardHeader>
        <CardBody>
          {plan ? (
            <p className="text-sm text-muted">
              {plan.focus ?? 'Sesión'} · {plan.level ?? 'Todos los niveles'}
              {plan.estimated_duration_minutes ? ` · ${plan.estimated_duration_minutes} min` : ''}
            </p>
          ) : (
            <p className="text-sm text-muted">Tu coach asignará tu plan pronto. Puedes registrar igual lo que entrenes.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar entrenamiento</CardTitle>
        </CardHeader>
        <CardBody>
          <WorkoutLogForm exercises={exercises ?? []} workoutPlanId={plan?.id ?? null} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entrenamientos recientes</CardTitle>
        </CardHeader>
        <CardBody>
          {!recent || recent.length === 0 ? (
            <EmptyState title="Sin entrenamientos aún" />
          ) : (
            <ul className="divide-y divide-hairline">
              {recent.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground">{formatDateTime(w.logged_at)}</span>
                  <span className="text-muted">{w.perceived_effort ? `RPE ${w.perceived_effort}` : '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
