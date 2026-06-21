import { Apple, BookOpen, Dumbbell, LayoutDashboard, ListChecks, Settings, Users } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { AppShell, type NavItem } from '@/components/navigation/AppShell';

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/coach', icon: LayoutDashboard },
  { label: 'Alumnas', href: '/coach/students', icon: Users },
  { label: 'Nutrición', href: '/coach/nutrition', icon: Apple },
  { label: 'Entrenamientos', href: '/coach/workouts', icon: Dumbbell },
  { label: 'Ejercicios', href: '/coach/exercises', icon: ListChecks },
  { label: 'Contenido', href: '/coach/content', icon: BookOpen },
  { label: 'Ajustes', href: '/coach/settings', icon: Settings },
];

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireCoach();
  return (
    <AppShell
      items={NAV}
      user={{ name: profile.full_name ?? 'Coach', email: profile.email ?? '', roleLabel: 'Coach' }}
    >
      {children}
    </AppShell>
  );
}
