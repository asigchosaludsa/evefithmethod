import { requireAuth } from '@/lib/auth/roles';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // Ensure a session exists; role-specific layouts enforce role + onboarding.
  await requireAuth();
  return <>{children}</>;
}
