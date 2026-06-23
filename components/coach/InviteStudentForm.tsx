'use client';

import { useActionState, useState } from 'react';
import { Check, Copy, Mail, MessageCircle, UserPlus } from 'lucide-react';
import { inviteStudentAction, type InviteState } from '@/lib/auth/invitation-actions';
import { Button, FormField, Input, Textarea, SubmitButton } from '@/components/common';
import { buildWhatsappInviteHref } from '@/lib/utils/whatsapp';

const initial: InviteState = {};

type Channel = 'email' | 'whatsapp';

export function InviteStudentForm() {
  const [state, action] = useActionState(inviteStudentAction, initial);
  const [copied, setCopied] = useState(false);
  const [channel, setChannel] = useState<Channel>('email');
  const [phone, setPhone] = useState('+593 ');

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (state.link) {
    const waHref = buildWhatsappInviteHref({ phone, studentName: state.studentName, link: state.link });
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-success/25 bg-success/5 p-4">
          <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-medium text-foreground">Invitación creada</p>
            <p className="text-sm text-muted">
              {state.channel === 'whatsapp'
                ? 'Abre WhatsApp para enviar el mensaje con el enlace, o copia el enlace abajo.'
                : 'Comparte este enlace con tu alumna. Caduca según la expiración que elegiste.'}
            </p>
          </div>
        </div>

        {state.channel === 'whatsapp' && (
          <div className="space-y-3 rounded-lg border border-border bg-elevated/40 p-4">
            <FormField
              label="Número de WhatsApp"
              htmlFor="wa_phone"
              hint="Con código de país. Ej: +593 99 123 4567"
            >
              <Input
                id="wa_phone"
                name="wa_phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+593 99 123 4567"
              />
            </FormField>
            <Button type="button" variant="primary" className="w-full" asChild={waHref !== null} disabled={waHref === null}>
              {waHref !== null ? (
                <a href={waHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" aria-hidden /> Abrir WhatsApp
                </a>
              ) : (
                <>
                  <MessageCircle className="size-4" aria-hidden /> Abrir WhatsApp
                </>
              )}
            </Button>
            {waHref === null && (
              <p className="text-xs text-warning">Ingresa un número de WhatsApp válido con código de país.</p>
            )}
          </div>
        )}

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Enlace de invitación (no se vuelve a mostrar)</p>
          <div className="flex items-center gap-2">
            <Input readOnly value={state.link} className="font-mono text-xs" />
            <Button type="button" variant="secondary" onClick={() => copy(state.link!)}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormField label="Canal de invitación" htmlFor="channel">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Canal de invitación">
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              channel === 'email'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted hover:border-muted/40'
            }`}
          >
            <input
              type="radio"
              name="channel"
              value="email"
              checked={channel === 'email'}
              onChange={() => setChannel('email')}
              className="sr-only"
            />
            <Mail className="size-4" aria-hidden /> Correo
          </label>
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              channel === 'whatsapp'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted hover:border-muted/40'
            }`}
          >
            <input
              type="radio"
              name="channel"
              value="whatsapp"
              checked={channel === 'whatsapp'}
              onChange={() => setChannel('whatsapp')}
              className="sr-only"
            />
            <MessageCircle className="size-4" aria-hidden /> WhatsApp
          </label>
        </div>
      </FormField>
      <FormField label="Nombre de la alumna" htmlFor="student_name">
        <Input id="student_name" name="student_name" required />
      </FormField>
      <FormField
        label="Email"
        htmlFor="email"
        hint={channel === 'whatsapp' ? 'Necesario para crear la cuenta, aunque invites por WhatsApp.' : undefined}
      >
        <Input id="email" name="email" type="email" required />
      </FormField>
      {channel === 'whatsapp' && (
        <FormField
          label="Número de WhatsApp"
          htmlFor="phone"
          hint="Opcional ahora — podrás ajustarlo antes de abrir WhatsApp. Con código de país."
        >
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+593 99 123 4567"
          />
        </FormField>
      )}
      <FormField label="Objetivo" htmlFor="goal" hint="Opcional — ej: recomposición corporal">
        <Input id="goal" name="goal" />
      </FormField>
      <FormField label="Mensaje" htmlFor="message" hint="Opcional">
        <Textarea id="message" name="message" rows={3} />
      </FormField>
      <FormField label="Expira en (días)" htmlFor="expires_in_days">
        <Input id="expires_in_days" name="expires_in_days" type="number" defaultValue={7} min={1} max={60} />
      </FormField>
      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton>
        <UserPlus className="size-4" /> Crear invitación
      </SubmitButton>
    </form>
  );
}
