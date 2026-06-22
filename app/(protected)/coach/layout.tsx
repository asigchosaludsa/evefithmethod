import { requireCoach } from '@/lib/auth/roles';
import { AppShell } from '@/components/navigation/AppShell';

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireCoach();
  return (
    <AppShell
      variant="coach"
      user={{ name: profile.full_name ?? 'Coach', email: profile.email ?? '', roleLabel: 'Coach' }}
    >
      {children}
    </AppShell>
  );
}
