'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { submitLeadRequest } from '@/lib/leads/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { Button, FormField, Input, Select, Textarea, SubmitButton, PhoneInput } from '@/components/common';
import { GOAL_OPTIONS, LEVEL_OPTIONS } from '@/lib/validators/lead';
import { TurnstileField } from '@/components/auth/TurnstileField';

export function LeadRequestForm() {
  const [state, action] = useActionState(submitLeadRequest, initialActionState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-success/25 bg-success/5 p-6 text-center">
        <CheckCircle2 className="size-7 text-success" aria-hidden />
        <p className="font-display text-lg font-semibold text-foreground">Solicitud enviada</p>
        <p className="text-sm text-muted">
          Recibimos tu solicitud. La coach la revisará y te contactará por WhatsApp o email para los
          siguientes pasos.
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormField label="Nombre completo" htmlFor="full_name" required>
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </FormField>
      <FormField label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>
      <FormField label="Teléfono / WhatsApp" htmlFor="phone" required hint="Elige tu país e ingresa tu número de celular.">
        <PhoneInput id="phone" name="phone" required />
      </FormField>
      <FormField label="Objetivo principal" htmlFor="goal" required>
        <Select id="goal" name="goal" defaultValue="" placeholder="Selecciona tu objetivo" required>
          {GOAL_OPTIONS.map((goal) => (
            <option key={goal} value={goal}>
              {goal}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Nivel de experiencia" htmlFor="experience_level">
        <Select id="experience_level" name="experience_level" defaultValue="" placeholder="Sin especificar">
          {LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Edad" htmlFor="age">
        <Input id="age" name="age" type="number" inputMode="numeric" min={14} max={100} />
      </FormField>
      <FormField label="Ciudad" htmlFor="city">
        <Input id="city" name="city" autoComplete="address-level2" />
      </FormField>
      <FormField label="Disponibilidad semanal" htmlFor="availability" hint="Ej: 4 días, mañanas">
        <Input id="availability" name="availability" />
      </FormField>
      <FormField label="Lesiones o condiciones" htmlFor="injuries">
        <Textarea id="injuries" name="injuries" rows={3} />
      </FormField>
      <FormField label="Mensaje para la coach" htmlFor="message">
        <Textarea id="message" name="message" rows={4} />
      </FormField>

      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <TurnstileField />
      <SubmitButton className="w-full" size="lg">
        Enviar solicitud
      </SubmitButton>
    </form>
  );
}
