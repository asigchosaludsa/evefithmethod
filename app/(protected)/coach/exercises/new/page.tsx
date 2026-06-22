import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { Card, PageHeader } from '@/components/common';
import { ExerciseForm } from '@/components/coach/ExerciseForm';

export const metadata = { title: 'Nuevo ejercicio' };

export default async function NewExercisePage() {
  const coach = await requireCoach();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/coach/exercises" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Ejercicios
      </Link>
      <PageHeader title="Nuevo ejercicio" />
      <Card className="p-6">
        <ExerciseForm coachId={coach.id} />
      </Card>
    </div>
  );
}
