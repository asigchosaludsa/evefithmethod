import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { archiveExercise } from '@/lib/coach/actions';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, PageHeader } from '@/components/common';

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const coach = await requireCoach();
  const supabase = await createClient();
  const { data: e } = await supabase.from('exercises').select('*').eq('id', exerciseId).single();
  if (!e) notFound();

  const canEdit = e.coach_id === coach.id;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/coach/exercises" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Ejercicios
      </Link>
      <PageHeader
        title={e.name}
        description={[e.muscle_group, e.equipment].filter(Boolean).join(' · ') || undefined}
        actions={
          canEdit && e.status !== 'archived' ? (
            <form action={archiveExercise.bind(null, e.id)}>
              <Button type="submit" variant="outline" size="sm">
                Archivar
              </Button>
            </form>
          ) : undefined
        }
      />
      {e.is_global && <Badge tone="info">Ejercicio global</Badge>}

      {e.description && (
        <Card>
          <CardHeader>
            <CardTitle>Descripción</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-muted">{e.description}</p>
          </CardBody>
        </Card>
      )}
      {e.instructions && (
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-muted">{e.instructions}</p>
          </CardBody>
        </Card>
      )}
      {e.common_mistakes && (
        <Card>
          <CardHeader>
            <CardTitle>Errores comunes</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-muted">{e.common_mistakes}</p>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Video</CardTitle>
        </CardHeader>
        <CardBody>
          {e.video_url ? (
            <a href={e.video_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
              Ver video
            </a>
          ) : (
            <p className="text-sm text-faint">Video pendiente.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
