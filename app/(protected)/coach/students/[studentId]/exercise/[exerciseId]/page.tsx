import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { PageHeader } from '@/components/common';
import { getExerciseHistory } from '@/lib/db/queries/exercise-history';
import { ExerciseProgress } from '@/components/coach/ExerciseProgress';

export default async function StudentExerciseHistoryPage({
  params,
}: {
  params: Promise<{ studentId: string; exerciseId: string }>;
}) {
  const { studentId, exerciseId } = await params;
  const coach = await requireCoach();
  await assertCoachOwnsStudent(coach.id, studentId);

  const history = await getExerciseHistory(studentId, exerciseId);

  return (
    <div className="space-y-6">
      <Link
        href={`/coach/students/${studentId}/workouts`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver a entrenamientos
      </Link>
      <PageHeader title={history.exerciseName} description="Progreso por ejercicio." />
      <ExerciseProgress history={history} />
    </div>
  );
}
