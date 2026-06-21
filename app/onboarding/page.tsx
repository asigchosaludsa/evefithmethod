import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/roles';
import { dashboardPathForProfile } from '@/lib/auth/redirects';
import { AuthShell } from '@/components/auth/AuthShell';
import { OnboardingForm } from '@/components/auth/OnboardingForm';

export const metadata = { title: 'Completa tu perfil' };

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (profile.onboarding_completed && profile.role) {
    redirect(dashboardPathForProfile(profile));
  }

  return (
    <AuthShell title="Completa tu perfil" subtitle="Cuéntanos un poco sobre ti para empezar">
      <OnboardingForm defaultName={profile.full_name ?? ''} />
    </AuthShell>
  );
}
