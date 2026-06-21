'use client';

import { useActionState, useState } from 'react';
import { Check, Copy, UserPlus } from 'lucide-react';
import { inviteStudentAction, type InviteState } from '@/lib/auth/invitation-actions';
import { Button, FormField, Input, Textarea, SubmitButton } from '@/components/common';

const initial: InviteState = {};

export function InviteStudentForm() {
  const [state, action] = useActionState(inviteStudentAction, initial);
  const [copied, setCopied] = useState(false);

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
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-success/25 bg-success/5 p-4">
          <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-medium text-foreground">Invitación creada</p>
            <p className="text-sm text-muted">
              Comparte este enlace con tu alumna. Caduca según la expiración que elegiste.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input readOnly value={state.link} className="font-mono text-xs" />
          <Button type="button" variant="secondary" onClick={() => copy(state.link!)}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormField label="Nombre de la alumna" htmlFor="student_name">
        <Input id="student_name" name="student_name" required />
      </FormField>
      <FormField label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required />
      </FormField>
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
