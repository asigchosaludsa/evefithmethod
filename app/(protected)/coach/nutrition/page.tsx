import Link from 'next/link';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Badge, EmptyState, PageHeader } from '@/components/common';
import { formatDate } from '@/lib/utils/date';

export const metadata = { title: 'Nutrición' };

export default async function CoachNutritionPage() {
  const coach = await requireCoach();
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from('nutrition_plans')
    .select('*')
    .eq('coach_id', coach.id)
    .order('created_at', { ascending: false });

  const ids = [...new Set((plans ?? []).map((p) => p.student_id))];
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, full_name').in('id', ids)
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="space-y-6">
      <PageHeader title="Nutrición" description="Todos los planes nutricionales que has creado." />
      {!plans || plans.length === 0 ? (
        <EmptyState
          title="Sin planes nutricionales"
          description="Crea planes desde el perfil de cada alumna."
        />
      ) : (
        <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-border bg-surface">
          {plans.map((p) => (
            <li key={p.id}>
              <Link
                href={`/coach/students/${p.student_id}/nutrition`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-elevated"
              >
                <div>
                  <p className="font-medium text-foreground">{p.title}</p>
                  <p className="text-sm text-muted">
                    {names.get(p.student_id) ?? 'Alumna'} · {p.calories_target ?? '—'} kcal
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-xs text-faint sm:block">{formatDate(p.created_at)}</span>
                  <Badge tone={p.status === 'active' ? 'success' : 'neutral'}>{p.status}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
