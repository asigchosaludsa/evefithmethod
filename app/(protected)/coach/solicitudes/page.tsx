import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader } from '@/components/common';
import { LeadList } from '@/components/coach/LeadList';

export const metadata = { title: 'Solicitudes' };

export default async function CoachSolicitudesPage() {
  await requireCoach();
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  const items = leads ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes"
        description="Personas interesadas que llenaron el formulario."
      />

      {items.length === 0 ? (
        <EmptyState
          illustration="students"
          title="Aún no hay solicitudes"
          description="Cuando alguien complete el formulario público, aparecerá aquí."
        />
      ) : (
        <LeadList leads={items} />
      )}
    </div>
  );
}
