import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';
import type { Role } from '@/types/app';
import { dashboardPathForProfile } from './redirects';

/** The current user's profile, or null if not signed in / no profile. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data ?? null;
}

/** Require a signed-in user with a profile (any onboarding state). */
export async function requireAuth(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  return profile;
}

/** Require a fully onboarded, active profile (else route appropriately). */
export async function requireOnboardedProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (profile.status === 'inactive') redirect('/login?error=account_inactive');
  if (!profile.role || !profile.onboarding_completed) redirect('/onboarding');
  return profile;
}

export async function requireRole(role: Role): Promise<Profile> {
  const profile = await requireOnboardedProfile();
  if (profile.role !== role && profile.role !== 'admin') {
    redirect(dashboardPathForProfile(profile));
  }
  return profile;
}

export async function requireCoach(): Promise<Profile> {
  const profile = await requireOnboardedProfile();
  if (profile.role !== 'coach' && profile.role !== 'admin') {
    redirect(dashboardPathForProfile(profile));
  }
  return profile;
}

export async function requireStudent(): Promise<Profile> {
  return requireRole('student');
}

/** Throw 404 if the coach is not actively linked to the student. */
export async function assertCoachOwnsStudent(coachId: string, studentId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('coach_students')
    .select('id')
    .eq('coach_id', coachId)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .maybeSingle();
  if (!data) notFound();
}
