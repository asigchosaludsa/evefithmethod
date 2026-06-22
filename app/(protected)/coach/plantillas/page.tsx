import { requireCoach } from '@/lib/auth/roles';
import { PageHeader } from '@/components/common';
import { getMergedTemplate, type TemplateKey } from '@/lib/email/render';
import { TemplateEditor } from '@/components/coach/TemplateEditor';

export const metadata = { title: 'Plantillas' };

/**
 * Per-key metadata for the editor: a friendly label, a short hint about when
 * the message is sent, and the list of merge variables available to the coach.
 * {{site}} is always available implicitly, so it is not listed.
 */
interface KeyMeta {
  label: string;
  description: string;
  variables: string[];
}

const KEY_META: Record<TemplateKey, KeyMeta> = {
  invitation: {
    label: 'Invitacion',
    description: 'Se envia a la alumna cuando conviertes su solicitud en invitacion.',
    variables: ['nombre', 'link'],
  },
  welcome: {
    label: 'Bienvenida',
    description: 'Se envia a la alumna justo despues de crear su cuenta.',
    variables: ['nombre'],
  },
  plan_ready: {
    label: 'Plan listo',
    description: 'Avisa a la alumna de que su nutricion y entrenamiento ya estan asignados.',
    variables: ['nombre'],
  },
  unlink: {
    label: 'Despedida',
    description: 'Se envia cuando una alumna se desvincula del metodo.',
    variables: ['nombre', 'semanas', 'entrenos'],
  },
  weekly_summary: {
    label: 'Resumen semanal',
    description: 'Resumen de la semana de la alumna en numeros.',
    variables: ['nombre', 'adherencia', 'racha', 'entrenos'],
  },
  lead_notification: {
    label: 'Nueva solicitud',
    description: 'Te llega a ti cuando alguien envia una solicitud nueva.',
    variables: ['nombre', 'objetivo', 'email', 'telefono'],
  },
  wa_welcome: {
    label: 'WhatsApp de bienvenida',
    description: 'Mensaje de WhatsApp con el acceso al portal de la alumna.',
    variables: ['nombre', 'link'],
  },
};

const EMAIL_KEYS: TemplateKey[] = [
  'invitation',
  'welcome',
  'plan_ready',
  'unlink',
  'weekly_summary',
  'lead_notification',
];
const WHATSAPP_KEYS: TemplateKey[] = ['wa_welcome'];

export default async function CoachTemplatesPage() {
  await requireCoach();

  // Merge defaults + stored overrides so the editor shows the real, filled copy.
  const allKeys = [...EMAIL_KEYS, ...WHATSAPP_KEYS];
  const merged = await Promise.all(allKeys.map((key) => getMergedTemplate(key)));
  const byKey = new Map(merged.map((m) => [m.key, m]));

  function renderGroup(keys: TemplateKey[]) {
    return keys.map((key) => {
      const tpl = byKey.get(key);
      if (!tpl) return null;
      const meta = KEY_META[key];
      return (
        <TemplateEditor
          key={key}
          templateKey={key}
          label={meta.label}
          description={meta.description}
          variables={meta.variables}
          channel={tpl.channel}
          defaults={{
            enabled: tpl.enabled,
            subject: tpl.subject,
            heading: tpl.heading,
            body: tpl.body,
            ctaLabel: tpl.ctaLabel,
          }}
        />
      );
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Plantillas"
        description="Edita el texto de los correos y mensajes automaticos. El diseno es fijo; solo cambias las palabras."
      />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">Correos</h2>
        <div className="space-y-5">{renderGroup(EMAIL_KEYS)}</div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">WhatsApp</h2>
        <div className="space-y-5">{renderGroup(WHATSAPP_KEYS)}</div>
      </section>
    </div>
  );
}
