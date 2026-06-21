import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Card, CardBody, CardHeader, CardTitle, PageHeader } from '@/components/common';
import { CoachSettingsForm } from '@/components/coach/CoachSettingsForm';

export const metadata = { title: 'Ajustes' };

export default async function CoachSettingsPage() {
  const coach = await requireCoach();
  const supabase = await createClient();
  const { data: cp } = await supabase
    .from('coach_profiles')
    .select('business_name, bio')
    .eq('user_id', coach.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Ajustes" description="Tu cuenta y tu marca." />
      <Card>
        <CardHeader>
          <CardTitle>Perfil de coach</CardTitle>
        </CardHeader>
        <CardBody>
          <CoachSettingsForm
            defaults={{
              full_name: coach.full_name ?? '',
              business_name: cp?.business_name ?? '',
              bio: cp?.bio ?? '',
            }}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cuenta</CardTitle>
        </CardHeader>
        <CardBody className="space-y-1 text-sm">
          <p className="text-muted">
            Email: <span className="text-foreground">{coach.email}</span>
          </p>
          <p className="text-muted">
            Rol: <span className="text-foreground">Coach</span>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
