import { redirect } from 'next/navigation';
import type { Profile } from '@/types/database';

export { validateSafeRedirect } from '@/lib/utils/url';

/** Pure: the path a profile should land on. */
export function dashboardPathForProfile(profile: Profile | null): string {
  if (!profile) return '/login';
  // Cuentas con rol asignado (coach/student/admin) siguen su flujo normal.
  if (profile.role === 'coach' || profile.role === 'admin') return '/coach';
  if (profile.role === 'student') {
    // Alumna invitada pero inactiva: sin acceso a la app.
    if (profile.status !== 'active') return '/sin-acceso';
    // Alumna activa que aún no completó el onboarding.
    if (!profile.onboarding_completed) return '/onboarding';
    return '/student/today';
  }
  // Acceso solo por invitación: cualquier usuaria autenticada sin rol
  // (p. ej. un alta por Google que creó un perfil 'pending' con role null)
  // o con cuenta no activa va a la pantalla "sin acceso", no al onboarding.
  return '/sin-acceso';
}

/** Redirect a user to their role-appropriate destination. */
export function redirectUserByRole(profile: Profile | null): never {
  redirect(dashboardPathForProfile(profile));
}
