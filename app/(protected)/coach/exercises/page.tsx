import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Badge, Button, EmptyState, PageHeader, SectionHeader } from '@/components/common';
import { ArchiveItemButton } from '@/components/coach/ArchiveItemButton';
import { ExerciseLibraryBrowser, type LibraryExercise } from '@/components/coach/ExerciseLibraryBrowser';

export const metadata = { title: 'Ejercicios' };

export default async function CoachExercisesPage() {
  const coach = await requireCoach();
  const supabase = await createClient();
  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .or(`coach_id.eq.${coach.id},is_global.eq.true`)
    .order('name');

  const all = exercises ?? [];
  const active = all.filter((e) => e.status !== 'archived');
  const archived = all.filter((e) => e.status === 'archived');

  return (
    <div className="space-y-8">
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

      {active.length === 0 ? (
        <EmptyState title="Sin ejercicios" description="Crea tu primer ejercicio." />
      ) : (
        <ExerciseLibraryBrowser exercises={active as LibraryExercise[]} />
      )}

      {archived.length > 0 && (
        <section className="space-y-3 opacity-70">
          <SectionHeader title="Archivados" description="Ocultos de la biblioteca activa." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((e) => (
              <div
                key={e.id}
                className="rounded-lg border border-dashed border-border bg-surface/60 p-4"
              >
                <Link href={`/coach/exercises/${e.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-muted">{e.name}</p>
                    {e.is_global && <Badge tone="neutral">Global</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-faint">{e.muscle_group ?? 'General'}</p>
                </Link>
                {e.coach_id === coach.id && (
                  <div className="mt-3 flex justify-end">
                    <ArchiveItemButton id={e.id} kind="exercise" archived={true} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
