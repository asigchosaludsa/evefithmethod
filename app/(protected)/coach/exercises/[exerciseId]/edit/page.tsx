import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Card, PageHeader } from '@/components/common';
import { ExerciseForm } from '@/components/coach/ExerciseForm';

export const metadata = { title: 'Editar ejercicio' };

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const coach = await requireCoach();
  const supabase = await createClient();
  const { data: exercise } = await supabase.from('exercises').select('*').eq('id', exerciseId).maybeSingle();
  if (!exercise) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href={`/coach/exercises/${exerciseId}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>
      <PageHeader title="Editar ejercicio" />
      <Card className="p-6">
        <ExerciseForm coachId={coach.id} exercise={exercise} />
      </Card>
    </div>
  );
}
