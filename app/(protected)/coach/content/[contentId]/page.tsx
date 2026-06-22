import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Badge, PageHeader, SectionHeader } from '@/components/common';
import { AssignContentForm } from '@/components/coach/AssignContentForm';
import { ArchiveItemButton } from '@/components/coach/ArchiveItemButton';

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  const coach = await requireCoach();
  const supabase = await createClient();
  const { data: post } = await supabase.from('content_posts').select('*').eq('id', contentId).single();
  if (!post) notFound();

  // Coach's active students (two-step fetch avoids embedded-join typing).
  const { data: links } = await supabase
    .from('coach_students')
    .select('student_id')
    .eq('coach_id', coach.id)
    .eq('status', 'active');
  const ids = (links ?? []).map((l) => l.student_id);
  const { data: profs } = ids.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', ids)
    : { data: [] };
  const students = (profs ?? []).map((p) => ({ id: p.id, name: p.full_name ?? p.email ?? 'Alumna' }));

  const { data: assignments } = await supabase
    .from('content_assignments')
    .select('student_id, read_at')
    .eq('content_post_id', contentId)
    .eq('coach_id', coach.id);
  const assignedStudentIds = (assignments ?? []).map((a) => a.student_id);
  const readCount = (assignments ?? []).filter((a) => a.read_at).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/coach/content" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Contenido
      </Link>
      <PageHeader
        title={post.title}
        description={post.category ?? undefined}
        actions={<ArchiveItemButton id={post.id} kind="content" archived={post.status === 'archived'} />}
      />
      <Badge tone={post.status === 'published' ? 'success' : 'neutral'}>{post.status}</Badge>
      {post.summary && <p className="text-muted">{post.summary}</p>}
      {post.body && (
        <article className="whitespace-pre-wrap rounded-lg border border-border bg-surface p-5 text-sm leading-relaxed text-foreground">
          {post.body}
        </article>
      )}

      <section className="space-y-3">
        <SectionHeader
          title="Asignar a alumnas"
          actions={
            assignedStudentIds.length > 0 ? (
              <Badge tone="info">
                Leído por {readCount}/{assignedStudentIds.length}
              </Badge>
            ) : undefined
          }
        />
        <AssignContentForm
          contentPostId={contentId}
          students={students}
          assignedStudentIds={assignedStudentIds}
        />
      </section>
    </div>
  );
}
