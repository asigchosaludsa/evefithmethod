import { Apple, BookOpen, Dumbbell, Home, LineChart, User } from 'lucide-react';
import { requireStudent } from '@/lib/auth/roles';
import { AppShell, type NavItem } from '@/components/navigation/AppShell';

const NAV: NavItem[] = [
  { label: 'Hoy', href: '/student/today', icon: Home },
  { label: 'Comidas', href: '/student/meals', icon: Apple },
  { label: 'Entreno', href: '/student/workout', icon: Dumbbell },
  { label: 'Progreso', href: '/student/progress', icon: LineChart },
  { label: 'Contenido', href: '/student/content', icon: BookOpen },
  { label: 'Perfil', href: '/student/profile', icon: User },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStudent();
  return (
    <AppShell
      items={NAV}
      user={{ name: profile.full_name ?? 'Alumna', email: profile.email ?? '', roleLabel: 'Alumna' }}
    >
      {children}
    </AppShell>
  );
}
