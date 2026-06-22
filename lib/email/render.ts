import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { shell, h1, p, button, escape } from '@/lib/email/templates';

/**
 * Message-template engine.
 *
 * The 7 transactional messages (6 email, 1 WhatsApp) are coach-editable via the
 * `message_templates` table. Each row may override any content field; anything
 * left NULL falls back to the on-brand DEFAULT below. The coach can only edit
 * the TEXT — the email design (shell, button, typography) is fixed and applied
 * here, server-side.
 *
 * Rendering reuses the email-safe block helpers from templates.ts so every
 * message shares the exact same branded "Acero & Escarlata" layout.
 */

export type TemplateKey =
  | 'invitation'
  | 'welcome'
  | 'plan_ready'
  | 'unlink'
  | 'weekly_summary'
  | 'lead_notification'
  | 'wa_welcome';

export type TemplateChannel = 'email' | 'whatsapp';

export interface TemplateDefault {
  channel: TemplateChannel;
  subject?: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaTarget?: string;
}

/**
 * Default copy. Body paragraphs are separated by a blank line; the renderer
 * splits on blank lines into <p> blocks. Tokens like {{nombre}} are substituted
 * at render time. {{site}} is always available (NEXT_PUBLIC_SITE_URL).
 */
export const DEFAULTS: Record<TemplateKey, TemplateDefault> = {
  invitation: {
    channel: 'email',
    subject: 'Tu cupo en EveFit Method esta listo',
    heading: 'Tu cupo esta listo, {{nombre}}',
    body:
      'La coach reviso tu solicitud y te abrio un lugar dentro de EveFit Method. A partir de ahora dejas de improvisar: vas a tener entrenamiento y nutricion pensados para ti, y cada dia sabras exactamente que toca hacer.\n\nPulsa el boton para crear tu cuenta de alumna y empezar tu metodo. El enlace es personal y caduca en 7 dias.',
    ctaLabel: 'Crear mi cuenta',
    ctaTarget: '{{link}}',
  },
  welcome: {
    channel: 'email',
    subject: 'Bienvenida a EveFit Method',
    heading: 'Bienvenida, {{nombre}}',
    body:
      'Tu cuenta ya esta activa y tu metodo arranca hoy. Entrenamiento, nutricion y progreso viven en un solo lugar, y la coach revisa y ajusta contigo en el camino.\n\nTus tres primeros pasos: abre tu pantalla de Hoy y mira tu plan, registra tus comidas y tus entrenamientos, y sube tu progreso para que la coach te guie semana a semana.\n\nNo busques la perfeccion: busca la constancia. De eso se encarga el metodo.',
    ctaLabel: 'Entrar a mi metodo',
    ctaTarget: '{{site}}/student/today',
  },
  plan_ready: {
    channel: 'email',
    subject: 'Tu plan ya esta listo en EveFit Method',
    heading: 'Tu plan esta listo, {{nombre}}',
    body:
      'La coach acaba de dejar tu plan preparado. Ya tienes asignada tu nutricion y tu entrenamiento, hechos a tu medida y a tu objetivo.\n\nEntra a tu pantalla de Hoy para ver que toca, registra lo que vas haciendo y deja que la coach siga afinando contigo. El plan solo funciona si lo sigues: tu pones la constancia, el metodo pone el resto.',
    ctaLabel: 'Ver mi plan',
    ctaTarget: '{{site}}/student/today',
  },
  unlink: {
    channel: 'email',
    subject: 'Gracias por tu esfuerzo en EveFit Method',
    heading: 'Gracias por tu esfuerzo, {{nombre}}',
    body:
      'Tu etapa actual con la coach se cierra aqui, pero tu progreso no se borra: estuviste {{semanas}} dentro del metodo y completaste {{entrenos}} entrenamientos. Eso es tuyo y nadie te lo quita.\n\nLas puertas quedan abiertas. Cuando quieras retomar, tu sitio sigue esperandote. Cuidate y vuelve pronto.',
    ctaLabel: 'Volver a empezar',
    ctaTarget: '{{site}}/solicitud',
  },
  weekly_summary: {
    channel: 'email',
    subject: 'Tu semana en numeros, EveFit Method',
    heading: 'Tu semana en numeros, {{nombre}}',
    body:
      'Asi se ve tu ultima semana: adherencia del {{adherencia}}, una racha de {{racha}} y {{entrenos}} entrenamientos completados. Los numeros no mienten, y los tuyos cuentan una buena historia.\n\nNo se trata de una semana perfecta, sino de muchas semanas seguidas. Sigue sumando, entra a tu progreso y mira hasta donde has llegado.',
    ctaLabel: 'Ver mi progreso',
    ctaTarget: '{{site}}/student/progress',
  },
  lead_notification: {
    channel: 'email',
    subject: 'Nueva solicitud en EveFit Method',
    heading: 'Nueva solicitud de {{nombre}}',
    body:
      'Acabas de recibir una nueva solicitud para entrar al metodo.\n\nObjetivo: {{objetivo}}\nEmail: {{email}}\nTelefono: {{telefono}}\n\nEntra al panel de solicitudes para revisarla y, si encaja, convertirla en una invitacion con un solo clic.',
    ctaLabel: 'Ver solicitudes',
    ctaTarget: '{{site}}/coach/solicitudes',
  },
  wa_welcome: {
    channel: 'whatsapp',
    heading: 'Bienvenida a EveFit Method',
    body:
      'Hola {{nombre}}! Bienvenida a EveFit Method. Este es tu acceso a tu portal: {{link}}',
  },
};

export interface MergedTemplate {
  key: TemplateKey;
  channel: TemplateChannel;
  enabled: boolean;
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaTarget: string;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://evefitmethod.com').replace(/\/$/, '');
}

/**
 * Read the stored row for a key and merge each field with its DEFAULT (the row
 * value wins when non-null). Uses the admin client so it works without a user
 * session (lead-notification, invitation accept). If the row is missing, the
 * pure default is returned (enabled: true).
 */
export async function getMergedTemplate(key: TemplateKey): Promise<MergedTemplate> {
  const def = DEFAULTS[key];
  let row: {
    enabled: boolean;
    subject: string | null;
    heading: string | null;
    body: string | null;
    cta_label: string | null;
    cta_target: string | null;
  } | null = null;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('message_templates')
      .select('enabled, subject, heading, body, cta_label, cta_target')
      .eq('key', key)
      .maybeSingle();
    row = data ?? null;
  } catch {
    // No admin client available (e.g. missing env) -> fall back to pure default.
    row = null;
  }

  return {
    key,
    channel: def.channel,
    enabled: row ? row.enabled : true,
    subject: row?.subject ?? def.subject ?? '',
    heading: row?.heading ?? def.heading,
    body: row?.body ?? def.body,
    ctaLabel: row?.cta_label ?? def.ctaLabel ?? '',
    ctaTarget: row?.cta_target ?? def.ctaTarget ?? '',
  };
}

/**
 * Replace every {{token}} with vars[token] (coerced to string). Unknown tokens
 * resolve to '' so braces never leak into the output. {{site}} is always
 * injected from NEXT_PUBLIC_SITE_URL (caller-supplied site wins if present).
 */
export function substitute(text: string, vars: Record<string, string | number | undefined>): string {
  const all: Record<string, string> = { site: siteUrl() };
  for (const [k, v] of Object.entries(vars)) {
    all[k] = v === undefined || v === null ? '' : String(v);
  }
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, token: string) => all[token] ?? '');
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

/**
 * Render an email template to { subject, html }. Returns null when the template
 * is disabled. Body is split on blank lines into paragraphs. The CTA is only
 * rendered when both a label and a (non-empty) target survive substitution.
 */
export async function renderEmail(
  key: TemplateKey,
  vars: Record<string, string | number | undefined>,
): Promise<RenderedEmail | null> {
  const tpl = await getMergedTemplate(key);
  if (!tpl.enabled) return null;

  const subject = substitute(tpl.subject, vars);
  const heading = substitute(tpl.heading, vars);
  const bodyText = substitute(tpl.body, vars);
  const ctaLabel = substitute(tpl.ctaLabel, vars).trim();
  const ctaHref = substitute(tpl.ctaTarget, vars).trim();

  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    // Preserve single newlines inside a paragraph as <br>.
    .map((para) => p(escape(para).replace(/\n/g, '<br>')));

  const cta = ctaLabel && ctaHref ? button(ctaHref, escape(ctaLabel)) : '';

  const inner = `
    ${h1(escape(heading))}
    ${paragraphs.join('\n')}
    ${cta}
  `;

  return {
    subject,
    html: shell(subject || heading, inner),
  };
}

export interface RenderedWhatsapp {
  text: string;
}

/** Render a WhatsApp template to plain text. Returns null when disabled. */
export async function renderWhatsapp(
  key: TemplateKey,
  vars: Record<string, string | number | undefined>,
): Promise<RenderedWhatsapp | null> {
  const tpl = await getMergedTemplate(key);
  if (!tpl.enabled) return null;
  return { text: substitute(tpl.body, vars) };
}
