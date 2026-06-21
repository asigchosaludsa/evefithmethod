import { requireStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/common';
import { MarkReadButton } from '@/components/student/MarkReadButton';

export const metadata = { title: 'Contenido' };

export default async function StudentContentPage() {
  const profile = await requireStudent();
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from('content_assignments')
    .select('id, content_post_id, read_at')
    .eq('student_id', profile.id)
    .order('assigned_at', { ascending: false });

  const postIds = (assignments ?? []).map((a) => a.content_post_id);
  const { data: posts } = postIds.length
    ? await supabase.from('content_posts').select('*').in('id', postIds).eq('status', 'published')
    : { data: [] };
  const postMap = new Map((posts ?? []).map((p) => [p.id, p]));

  const list = (assignments ?? [])
    .map((a) => ({ assignment: a, post: postMap.get(a.content_post_id) }))
    .filter((x) => x.post);

  return (
    <div className="space-y-6">
      <PageHeader title="Contenido y tips" description="Material que tu coach asignó para ti." />
      {list.length === 0 ? (
        <EmptyState title="Sin contenido aún" description="Tu coach te asignará tips pronto." />
      ) : (
        <div className="space-y-3">
          {list.map(({ assignment, post }) => (
            <Card key={assignment.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{post!.title}</CardTitle>
                  {post!.category && <Badge tone="primary">{post!.category}</Badge>}
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {post!.summary && <p className="text-sm text-muted">{post!.summary}</p>}
                {post!.body && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post!.body}</p>
                )}
                <div className="pt-1">
                  <MarkReadButton assignmentId={assignment.id} read={Boolean(assignment.read_at)} />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
