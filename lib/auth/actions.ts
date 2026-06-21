'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { Provider } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getURL } from '@/lib/utils/url';
import { dashboardPathForProfile } from '@/lib/auth/redirects';
import type { ActionState } from '@/lib/auth/action-state';
import {
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  registerSchema,
  updatePasswordSchema,
} from '@/lib/validators/auth';

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? 'Revisa los datos ingresados.';
}

export async function signInWithEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'Email o contraseña incorrectos.' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null };
  redirect(dashboardPathForProfile(profile));
}

export async function signUpWithEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
    accept_terms: formData.get('accept_terms') === 'on',
    accept_privacy: formData.get('accept_privacy') === 'on',
    accept_disclaimer: formData.get('accept_disclaimer') === 'on',
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: getURL('/auth/callback'),
      data: { full_name: parsed.data.full_name },
    },
  });
  if (error) return { error: error.message };
  return { success: 'Revisa tu correo para confirmar tu cuenta.' };
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  // Ignore the result to avoid leaking whether the email exists.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: getURL('/update-password'),
  });
  return { success: 'Si el correo existe, te enviamos un enlace para restablecer tu contraseña.' };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirm_password: formData.get('confirm_password'),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null };
  redirect(dashboardPathForProfile(profile));
}

export async function completeOnboarding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const parsed = onboardingSchema.safeParse({
    full_name: formData.get('full_name'),
    goal: formData.get('goal') || undefined,
    date_of_birth: formData.get('date_of_birth') || undefined,
    height_cm: formData.get('height_cm') || undefined,
    current_weight_kg: formData.get('current_weight_kg') || undefined,
    training_level: formData.get('training_level') || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const { data: existing } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  const { error: pErr } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      role: existing?.role ?? 'student',
      status: 'active',
      onboarding_completed: true,
    })
    .eq('id', user.id);
  if (pErr) return { error: pErr.message };

  const role = existing?.role ?? 'student';
  if (role === 'student') {
    await supabase.from('student_profiles').upsert(
      {
        user_id: user.id,
        goal: parsed.data.goal ?? null,
        date_of_birth: parsed.data.date_of_birth ?? null,
        height_cm: parsed.data.height_cm ?? null,
        current_weight_kg: parsed.data.current_weight_kg ?? null,
        training_level: parsed.data.training_level ?? null,
      },
      { onConflict: 'user_id' },
    );
  } else if (role === 'coach') {
    await supabase.from('coach_profiles').upsert({ user_id: user.id }, { onConflict: 'user_id' });
  }

  revalidatePath('/', 'layout');
  redirect(role === 'coach' || role === 'admin' ? '/coach' : '/student/today');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

async function signInWithProvider(provider: Provider): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: getURL('/auth/callback') },
  });
  if (error || !data.url) redirect('/login?error=oauth');
  redirect(data.url);
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithProvider('google');
}

export async function signInWithFacebook(): Promise<void> {
  await signInWithProvider('facebook');
}

export async function signInWithApple(): Promise<void> {
  await signInWithProvider('apple');
}
