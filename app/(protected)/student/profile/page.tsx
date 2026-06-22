import Link from 'next/link';
import { requireStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Card, CardBody, CardHeader, CardTitle, PageHeader } from '@/components/common';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { StudentProfileForm } from '@/components/student/StudentProfileForm';
import { AvatarUpload } from '@/components/student/AvatarUpload';

export const metadata = { title: 'Mi perfil' };

export default async function StudentProfilePage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const { data: sp } = await supabase
    .from('student_profiles')
    .select('goal')
    .eq('user_id', profile.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Mi perfil" description="Tus datos y tu cuenta." />

      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <AvatarUpload userId={profile.id} current={profile.avatar_url} name={profile.full_name ?? 'Alumna'} />
          <StudentProfileForm defaults={{ full_name: profile.full_name ?? '', goal: sp?.goal ?? '' }} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuenta</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <p className="text-muted">
            Email: <span className="text-foreground">{profile.email}</span>
          </p>
          <p className="text-muted">
            <Link href="/disclaimer" className="text-primary hover:underline">
              Aviso de salud y fitness
            </Link>
          </p>
          <div className="pt-2">
            <LogoutButton />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
