'use client';

import * as React from 'react';
import { useActionState, useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Badge,
  FormField,
  Input,
  Textarea,
  Button,
  SubmitButton,
} from '@/components/common';
import { initialActionState } from '@/lib/auth/action-state';
import { saveTemplate, sendTemplateTest } from '@/lib/coach/template-actions';

export interface TemplateEditorDefaults {
  enabled: boolean;
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
}

export function TemplateEditor({
  templateKey,
  label,
  description,
  variables,
  channel,
  defaults,
}: {
  templateKey: string;
  label: string;
  description: string;
  variables: string[];
  channel: 'email' | 'whatsapp';
  defaults: TemplateEditorDefaults;
}) {
  const [state, action] = useActionState(saveTemplate, initialActionState);
  const [enabled, setEnabled] = useState(defaults.enabled);

  const [pending, startTransition] = useTransition();
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isEmail = channel === 'email';

  function handleTest() {
    setTestMsg(null);
    startTransition(async () => {
      const res = await sendTemplateTest(templateKey);
      setTestMsg(
        res.ok
          ? { ok: true, text: 'Prueba enviada a tu correo.' }
          : { ok: false, text: res.error },
      );
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle>{label}</CardTitle>
            <Badge tone={isEmail ? 'info' : 'success'}>{isEmail ? 'Email' : 'WhatsApp'}</Badge>
          </div>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </CardHeader>
      <CardBody>
        <form action={action} className="space-y-4">
          <input type="hidden" name="key" value={templateKey} />

          {/* Enabled toggle. A hidden value is not needed: an unchecked box
              simply omits the field, which the action reads as disabled. */}
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="size-4 rounded border-border bg-surface text-primary accent-primary"
            />
            <span className="font-medium text-foreground">
              {enabled ? 'Activa' : 'Desactivada'}
            </span>
            <span className="text-faint">
              {isEmail ? 'Si la desactivas, no se envia el correo.' : 'Si la desactivas, no se envia el mensaje.'}
            </span>
          </label>

          {isEmail && (
            <FormField label="Asunto" htmlFor={`${templateKey}-subject`}>
              <Input
                id={`${templateKey}-subject`}
                name="subject"
                defaultValue={defaults.subject}
              />
            </FormField>
          )}

          <FormField
            label={isEmail ? 'Titular' : 'Titulo interno'}
            htmlFor={`${templateKey}-heading`}
          >
            <Input
              id={`${templateKey}-heading`}
              name="heading"
              defaultValue={defaults.heading}
            />
          </FormField>

          <FormField
            label="Texto"
            htmlFor={`${templateKey}-body`}
            hint="Es el cuerpo principal del mensaje. Separa los parrafos con una linea en blanco."
          >
            <Textarea
              id={`${templateKey}-body`}
              name="body"
              rows={7}
              defaultValue={defaults.body}
            />
          </FormField>

          {isEmail && (
            <FormField
              label="Texto del boton"
              htmlFor={`${templateKey}-cta`}
              hint="El destino del boton es fijo y no se edita."
            >
              <Input
                id={`${templateKey}-cta`}
                name="cta_label"
                defaultValue={defaults.ctaLabel}
              />
            </FormField>
          )}

          {/* Available merge variables. */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Variables disponibles</p>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <code
                  key={v}
                  className="rounded bg-elevated px-1.5 py-0.5 text-xs text-muted"
                >
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
            <p className="text-xs text-faint">
              Escribelas tal cual y se reemplazan al enviar. El diseno es fijo: solo cambias el texto.
            </p>
          </div>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.success && <p className="text-sm text-success">{state.success}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton>Guardar</SubmitButton>
            {isEmail && (
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                loading={pending}
              >
                <Send className="size-4" aria-hidden />
                Enviar prueba a mi correo
              </Button>
            )}
            {testMsg && (
              <span className={testMsg.ok ? 'text-sm text-success' : 'text-sm text-danger'}>
                {testMsg.text}
              </span>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
