import { requireStudent } from '@/lib/auth/roles';
import { AppShell } from '@/components/navigation/AppShell';
import { DemoBanner } from '@/components/student/DemoBanner';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStudent();
  return (
    <AppShell
      variant="student"
      user={{ name: profile.full_name ?? 'Alumna', email: profile.email ?? '', roleLabel: 'Alumna' }}
      demoBanner={profile.is_demo ? <DemoBanner /> : undefined}
    >
      {children}
    </AppShell>
  );
}
