import { redirect } from 'next/navigation';
import type { Profile } from '@/types/database';

export { validateSafeRedirect } from '@/lib/utils/url';

/** Pure: the path a profile should land on. */
export function dashboardPathForProfile(profile: Profile | null): string {
  if (!profile) return '/login';
  if (profile.status === 'inactive') return '/login?error=account_inactive';
  if (!profile.role || !profile.onboarding_completed) return '/onboarding';
  if (profile.role === 'coach' || profile.role === 'admin') return '/coach';
  if (profile.role === 'student') return '/student/today';
  return '/login';
}

/** Redirect a user to their role-appropriate destination. */
export function redirectUserByRole(profile: Profile | null): never {
  redirect(dashboardPathForProfile(profile));
}
