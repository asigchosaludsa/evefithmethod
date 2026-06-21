import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, PageHeader } from '@/components/common';
import { ExerciseForm } from '@/components/coach/ExerciseForm';

export const metadata = { title: 'Nuevo ejercicio' };

export default function NewExercisePage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/coach/exercises" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Ejercicios
      </Link>
      <PageHeader title="Nuevo ejercicio" />
      <Card className="p-6">
        <ExerciseForm />
      </Card>
    </div>
  );
}
