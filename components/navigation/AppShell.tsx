'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Apple,
  BookOpen,
  Dumbbell,
  Home,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Menu,
  Settings,
  User,
  Users,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/common';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Nav definitions live INSIDE this client component so the icon components
// never cross the Server -> Client boundary (which RSC forbids).
const COACH_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/coach', icon: LayoutDashboard },
  { label: 'Alumnas', href: '/coach/students', icon: Users },
  { label: 'Nutrición', href: '/coach/nutrition', icon: Apple },
  { label: 'Entrenamientos', href: '/coach/workouts', icon: Dumbbell },
  { label: 'Ejercicios', href: '/coach/exercises', icon: ListChecks },
  { label: 'Contenido', href: '/coach/content', icon: BookOpen },
  { label: 'Ajustes', href: '/coach/settings', icon: Settings },
];

const STUDENT_NAV: NavItem[] = [
  { label: 'Hoy', href: '/student/today', icon: Home },
  { label: 'Nutrición', href: '/student/nutrition', icon: Apple },
  { label: 'Comidas', href: '/student/meals', icon: Utensils },
  { label: 'Entreno', href: '/student/workout', icon: Dumbbell },
  { label: 'Progreso', href: '/student/progress', icon: LineChart },
  { label: 'Contenido', href: '/student/content', icon: BookOpen },
  { label: 'Perfil', href: '/student/profile', icon: User },
];

export interface AppShellUser {
  name: string;
  email: string;
  roleLabel: string;
}

function isActive(pathname: string, href: string): boolean {
  if (href.endsWith('/today') || href === '/coach') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out',
              active ? 'bg-primary/12 text-primary' : 'text-muted hover:bg-elevated hover:text-foreground',
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  items,
  user,
  onNavigate,
}: {
  items: NavItem[];
  user: AppShellUser;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/" className="px-2" onClick={onNavigate}>
        <Logo />
      </Link>
      <NavLinks items={items} onNavigate={onNavigate} />
      <div className="border-t border-hairline pt-3">
        <div className="px-3 pb-2">
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-faint">{user.email}</p>
          <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-primary">
            {user.roleLabel}
          </span>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}

export function AppShell({
  variant,
  user,
  children,
}: {
  variant: 'coach' | 'student';
  user: AppShellUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const items = variant === 'coach' ? COACH_NAV : STUDENT_NAV;

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-hairline bg-surface lg:block">
        <SidebarBody items={items} user={user} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-canvas/90 px-4 backdrop-blur lg:hidden">
        <Link href="/">
          <Logo />
        </Link>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger
            className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-foreground"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-[fade_150ms_ease-out]" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-surface data-[state=open]:animate-[fade_180ms_ease-out]">
              <Dialog.Title className="sr-only">Menú</Dialog.Title>
              <Dialog.Close
                className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
                aria-label="Cerrar menú"
              >
                <X className="size-4" />
              </Dialog.Close>
              <SidebarBody items={items} user={user} onNavigate={() => setOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>

      {/* Main */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
