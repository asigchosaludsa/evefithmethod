import { requireStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { getStudentCoachId } from '@/lib/db/queries/student';
import { getActiveWorkoutPlanContent } from '@/lib/db/queries/workout-plan';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/common';
import { WorkoutLogForm } from '@/components/student/WorkoutLogForm';
import { formatDateTime } from '@/lib/utils/date';

export const metadata = { title: 'Mi entrenamiento' };

export default async function StudentWorkoutPage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const coachId = await getStudentCoachId(profile.id);

  const [content, { data: exercises }, { data: recent }] = await Promise.all([
    getActiveWorkoutPlanContent(profile.id),
    supabase
      .from('exercises')
      .select('id, name')
      .or(`is_global.eq.true${coachId ? `,coach_id.eq.${coachId}` : ''}`)
      .neq('status', 'archived')
      .order('name'),
    supabase
      .from('workout_logs')
      .select('id, logged_at, perceived_effort')
      .eq('student_id', profile.id)
      .order('logged_at', { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Mi entrenamiento" description="Tu plan asignado y registro de hoy." />

      {/* Assigned plan */}
      {content ? (
        <Card>
          <CardHeader>
            <CardTitle>{content.plan.title}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-muted">
              {content.plan.focus ?? 'Sesión'} · {content.plan.level ?? 'Todos los niveles'}
              {content.plan.estimated_duration_minutes ? ` · ${content.plan.estimated_duration_minutes} min` : ''}
            </p>
            {content.days.length === 0 ? (
              <p className="text-sm text-faint">Tu coach está armando los ejercicios de este plan.</p>
            ) : (
              <div className="space-y-4">
                {content.days.map((day) => (
                  <div key={day.id} className="rounded-md border border-hairline bg-canvas/40 p-3">
                    <p className="font-display font-semibold text-foreground">
                      Día {day.day_number}: {day.title}
                      {day.focus && <span className="ml-2 text-sm font-normal text-muted">· {day.focus}</span>}
                    </p>
                    {day.exercises.length === 0 ? (
                      <p className="mt-1 text-sm text-faint">Sin ejercicios aún.</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-hairline">
                        {day.exercises.map((ex) => (
                          <li key={ex.id} className="py-2">
                            <p className="font-medium text-foreground">{ex.exercise_name}</p>
                            <p className="tabular text-sm text-muted">
                              {ex.sets} series × {ex.reps} reps
                              {ex.rest_seconds ? ` · ${ex.rest_seconds}s desc.` : ''}
                              {ex.suggested_weight_kg ? ` · sugerido ${ex.suggested_weight_kg}kg` : ''}
                            </p>
                            {ex.notes && <p className="text-xs text-faint">{ex.notes}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <EmptyState title="Sin plan activo" description="Tu coach asignará tu plan pronto. Puedes registrar igual lo que entrenes." />
      )}

      {/* Log */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar entrenamiento</CardTitle>
        </CardHeader>
        <CardBody>
          <WorkoutLogForm exercises={exercises ?? []} workoutPlanId={content?.plan.id ?? null} />
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
