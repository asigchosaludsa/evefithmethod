import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Badge, Button, EmptyState, PageHeader } from '@/components/common';

export const metadata = { title: 'Ejercicios' };

export default async function CoachExercisesPage() {
  const coach = await requireCoach();
  const supabase = await createClient();
  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .or(`coach_id.eq.${coach.id},is_global.eq.true`)
    .neq('status', 'archived')
    .order('name');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca de ejercicios"
        description="Ejercicios globales y tuyos."
        actions={
          <Button asChild>
            <Link href="/coach/exercises/new">
              <Plus className="size-4" /> Nuevo
            </Link>
          </Button>
        }
      />
      {!exercises || exercises.length === 0 ? (
        <EmptyState title="Sin ejercicios" description="Crea tu primer ejercicio." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((e) => (
            <Link
              key={e.id}
              href={`/coach/exercises/${e.id}`}
              className="rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-elevated"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{e.name}</p>
                {e.is_global && <Badge tone="info">Global</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted">{e.muscle_group ?? 'General'}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
