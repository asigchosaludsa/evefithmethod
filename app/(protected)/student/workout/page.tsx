import { requireStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { getStudentCoachId } from '@/lib/db/queries/student';
import { getActiveWorkoutPlanContent } from '@/lib/db/queries/workout-plan';
import { getTrainingCalendarData } from '@/lib/db/queries/training-calendar';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/common';
import { GuidedWorkoutLogForm } from '@/components/student/GuidedWorkoutLogForm';
import { WorkoutLogForm } from '@/components/student/WorkoutLogForm';
import { TrainingCalendar } from '@/components/workouts/TrainingCalendar';
import { formatDateTime } from '@/lib/utils/date';
import { splitLabel } from '@/lib/constants/splits';

export const metadata = { title: 'Mi entrenamiento' };

export default async function StudentWorkoutPage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const coachId = await getStudentCoachId(profile.id);

  const [content, calendar, { data: exercises }, { data: recent }] = await Promise.all([
    getActiveWorkoutPlanContent(profile.id),
    getTrainingCalendarData(profile.id),
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

  const plannedDays = (content?.days ?? []).filter((d) => d.exercises.length > 0);
  const hasPlan = plannedDays.length > 0;
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi entrenamiento"
        description={
          content
            ? [splitLabel(content.plan.split_type), content.plan.title].filter(Boolean).join(' · ')
            : 'Registra lo que entrenaste.'
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{hasPlan ? 'Tu sesión de hoy' : 'Registrar entrenamiento'}</CardTitle>
        </CardHeader>
        <CardBody>
          {hasPlan ? (
            <GuidedWorkoutLogForm
              workoutPlanId={content?.plan.id ?? null}
              days={plannedDays}
              lastWeightByExercise={{}}
              seriesByExercise={{}}
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">
                Tu coach aún no asignó ejercicios a tu plan. Puedes registrar igual lo que hayas
                entrenado.
              </p>
              <WorkoutLogForm exercises={exercises ?? []} workoutPlanId={content?.plan.id ?? null} />
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendario de entrenamiento</CardTitle>
        </CardHeader>
        <CardBody>
          <TrainingCalendar
            studentId={profile.id}
            plan={calendar.plan}
            days={calendar.days}
            exercisesByDay={calendar.exercisesByDay}
            statusByKey={calendar.statusByKey}
            canEdit
            todayISO={todayISO}
          />
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
