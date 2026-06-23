import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { getTrainingCalendarData } from '@/lib/db/queries/training-calendar';
import { PageHeader } from '@/components/common';
import { TrainingCalendar } from '@/components/workouts/TrainingCalendar';

export const metadata = { title: 'Calendario' };

export default async function CoachStudentCalendarPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const coach = await requireCoach();
  await assertCoachOwnsStudent(coach.id, studentId);

  const data = await getTrainingCalendarData(studentId);
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Link
        href={`/coach/students/${studentId}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Alumna
      </Link>

      <PageHeader
        title="Calendario"
        description={data.plan ? data.plan.title : 'Calendario de entrenamiento'}
      />

      <TrainingCalendar
        studentId={studentId}
        plan={data.plan}
        days={data.days}
        exercisesByDay={data.exercisesByDay}
        statusByKey={data.statusByKey}
        setsByKey={data.setsByKey}
        canEdit
        todayISO={todayISO}
      />
    </div>
  );
}
