import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Badge, Button, EmptyState, PageHeader, SectionHeader } from '@/components/common';
import { ArchiveItemButton } from '@/components/coach/ArchiveItemButton';
import { formatDate } from '@/lib/utils/date';

export const metadata = { title: 'Contenido' };

export default async function CoachContentPage() {
  const coach = await requireCoach();
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from('content_posts')
    .select('*')
    .eq('coach_id', coach.id)
    .order('created_at', { ascending: false });

  const all = posts ?? [];
  const active = all.filter((p) => p.status !== 'archived');
  const archived = all.filter((p) => p.status === 'archived');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contenido y tips"
        description="Material educativo para tus alumnas."
        actions={
          <Button asChild>
            <Link href="/coach/content/new">
              <Plus className="size-4" /> Nuevo tip
            </Link>
          </Button>
        }
      />

      {active.length === 0 ? (
        <EmptyState illustration="tips" title="Sin contenido" description="Crea tu primer tip." />
      ) : (
        <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-border bg-surface">
          {active.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-elevated">
              <Link href={`/coach/content/${p.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{p.title}</p>
                  <p className="truncate text-sm text-muted">{p.category ?? 'Sin categoría'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-xs text-faint sm:block">{formatDate(p.created_at)}</span>
                  <Badge tone={p.status === 'published' ? 'success' : 'neutral'}>{p.status}</Badge>
                </div>
              </Link>
              <ArchiveItemButton id={p.id} kind="content" archived={false} />
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="space-y-3 opacity-70">
          <SectionHeader title="Archivados" description="Ocultos de la lista activa." />
          <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-dashed border-border bg-surface/60">
            {archived.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link href={`/coach/content/${p.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-muted">{p.title}</p>
                    <p className="truncate text-sm text-faint">{p.category ?? 'Sin categoría'}</p>
                  </div>
                  <span className="hidden text-xs text-faint sm:block">{formatDate(p.created_at)}</span>
                </Link>
                <ArchiveItemButton id={p.id} kind="content" archived={true} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
