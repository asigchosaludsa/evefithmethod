'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import type { ActionState } from '@/lib/auth/action-state';

const ALLOWED_SEVERITIES = ['info', 'warning', 'critical', 'success'] as const;
type Severity = (typeof ALLOWED_SEVERITIES)[number];

function isSeverity(value: string): value is Severity {
  return (ALLOWED_SEVERITIES as readonly string[]).includes(value);
}

export async function createManualAlert(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();

  const studentId = String(formData.get('student_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const severityRaw = String(formData.get('severity') ?? 'info').trim() || 'info';

  if (!studentId) return { error: 'Falta la alumna.' };
  if (!title) return { error: 'Escribe un título para la alerta.' };
  if (!isSeverity(severityRaw)) return { error: 'Severidad inválida.' };

  await assertCoachOwnsStudent(coach.id, studentId);

  const supabase = await createClient();
  const { error } = await supabase.from('alerts').insert({
    coach_id: coach.id,
    student_id: studentId,
    type: 'coach',
    severity: severityRaw,
    title,
    message: message || null,
    status: 'open',
    source: 'coach',
  });
  if (error) return { error: error.message };

  revalidatePath(`/coach/students/${studentId}`);
  revalidatePath('/coach');
  return { success: 'Alerta creada' };
}

export async function resolveAlertAction(alertId: string, studentId: string): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  await supabase
    .from('alerts')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('coach_id', coach.id);
  revalidatePath(`/coach/students/${studentId}`);
  revalidatePath('/coach');
}
