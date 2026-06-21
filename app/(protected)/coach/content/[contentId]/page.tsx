import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Badge, PageHeader } from '@/components/common';

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  await requireCoach();
  const supabase = await createClient();
  const { data: post } = await supabase.from('content_posts').select('*').eq('id', contentId).single();
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/coach/content" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Contenido
      </Link>
      <PageHeader title={post.title} description={post.category ?? undefined} />
      <Badge tone={post.status === 'published' ? 'success' : 'neutral'}>{post.status}</Badge>
      {post.summary && <p className="text-muted">{post.summary}</p>}
      {post.body && (
        <article className="whitespace-pre-wrap rounded-lg border border-border bg-surface p-5 text-sm leading-relaxed text-foreground">
          {post.body}
        </article>
      )}
    </div>
  );
}
