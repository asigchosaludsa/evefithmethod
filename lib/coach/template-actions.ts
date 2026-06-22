'use server';

import { revalidatePath } from 'next/cache';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { renderEmail, type TemplateKey, DEFAULTS } from '@/lib/email/render';
import type { ActionState } from '@/lib/auth/action-state';

function isTemplateKey(value: string): value is TemplateKey {
  return Object.prototype.hasOwnProperty.call(DEFAULTS, value);
}

/** Normalize a text field: trim, and store NULL when empty so defaults reapply. */
function clean(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

/**
 * Save a single template's editable text. RLS scopes the UPDATE to the coach.
 * Empty fields are stored as NULL so the on-brand default reapplies for them.
 */
export async function saveTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();

  const key = formData.get('key');
  if (typeof key !== 'string' || !isTemplateKey(key)) {
    return { error: 'Plantilla no valida.' };
  }

  const enabled = formData.get('enabled') === 'on';
  const subject = clean(formData.get('subject'));
  const heading = clean(formData.get('heading'));
  const body = clean(formData.get('body'));
  const cta_label = clean(formData.get('cta_label'));

  const supabase = await createClient();
  const { error } = await supabase
    .from('message_templates')
    .update({ enabled, subject, heading, body, cta_label })
    .eq('key', key);

  if (error) return { error: error.message };

  revalidatePath('/coach/plantillas');
  return { success: 'Plantilla guardada.' };
}

/** Sample variables used to render a realistic preview test email. */
function sampleVars(coachName: string, site: string): Record<string, string> {
  return {
    nombre: coachName || 'Demo',
    link: `${site}/accept-invitation?token=DEMO`,
    semanas: '8 semanas',
    entrenos: '4',
    adherencia: '85%',
    racha: '7 dias',
    objetivo: 'Ganar musculo',
    email: 'demo@correo.com',
    telefono: '+593 99 999 9999',
  };
}

export type SendTestResult = { ok: true } | { ok: false; error: string };

/** Send a sample render of an email template to the coach's own inbox. */
export async function sendTemplateTest(key: string): Promise<SendTestResult> {
  const coach = await requireCoach();

  if (!isTemplateKey(key)) return { ok: false, error: 'Plantilla no valida.' };
  if (DEFAULTS[key].channel !== 'email') {
    return { ok: false, error: 'Solo las plantillas de email tienen prueba.' };
  }
  if (!coach.email) return { ok: false, error: 'Tu cuenta no tiene email.' };

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://evefitmethod.com').replace(/\/$/, '');
  const vars = sampleVars(coach.full_name ?? 'Demo', site);

  const tpl = await renderEmail(key, vars);
  if (!tpl) {
    return { ok: false, error: 'La plantilla esta desactivada. Actívala para enviar una prueba.' };
  }

  const sent = await sendEmail({
    to: coach.email,
    subject: `[Prueba] ${tpl.subject}`,
    html: tpl.html,
  });

  return sent ? { ok: true } : { ok: false, error: 'No se pudo enviar (revisa la configuracion de correo).' };
}
