'use client';

import * as React from 'react';
import { Check, Copy, Mail, MessageCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/common';
import { convertLeadToInvitation, resendInvitationByEmail } from '@/lib/coach/lead-actions';

interface ConvertLeadButtonProps {
  leadId: string;
  alreadyConverted?: boolean;
}

interface Generated {
  link: string;
  phone: string;
  email: string;
  emailed: boolean;
}

const WHATSAPP_MESSAGE = 'Hola! Este es tu enlace para registrarte en EveFit Method: ';

export function ConvertLeadButton({ leadId, alreadyConverted = false }: ConvertLeadButtonProps) {
  const [isPending, startTransition] = React.useTransition();
  const [generated, setGenerated] = React.useState<Generated | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [resend, setResend] = React.useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  if (alreadyConverted && !generated) {
    return <span className="text-xs font-medium text-faint">Ya convertida</span>;
  }

  function handleConvert() {
    setError(null);
    startTransition(async () => {
      const result = await convertLeadToInvitation(leadId);
      if (result.ok) {
        setGenerated({ link: result.link, phone: result.phone, email: result.email, emailed: result.emailed });
      } else {
        setError(result.error);
      }
    });
  }

  async function handleCopy() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!generated) {
    return (
      <div className="space-y-1">
        <Button size="sm" variant="primary" loading={isPending} onClick={handleConvert}>
          <UserPlus className="size-4" aria-hidden /> Generar invitación
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  const waDigits = (generated.phone ?? '').replace(/\D/g, '');
  const waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(WHATSAPP_MESSAGE + generated.link)}`;

  function handleResend() {
    setResend('sending');
    startTransition(async () => {
      const res = await resendInvitationByEmail(leadId);
      setResend(res.ok ? 'sent' : 'failed');
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-success/25 bg-success/5 p-3">
      <p className="text-xs font-medium text-success">
        {generated.emailed ? 'Invitación enviada por correo ✓' : 'Invitación generada'}
      </p>
      {!generated.emailed && (
        <p className="text-[11px] text-warning">No se pudo enviar el correo automático. Comparte el enlace por WhatsApp o cópialo.</p>
      )}
      <input
        type="text"
        readOnly
        value={generated.link}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full select-all rounded-md border border-border bg-canvas px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
        aria-label="Enlace de invitación"
      />
      <p className="text-[11px] text-faint">Guarda este enlace, no se vuelve a mostrar.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleCopy}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={waHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" aria-hidden /> WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="outline" onClick={handleResend} loading={resend === 'sending'}>
          <Mail className="size-4" aria-hidden />
          {resend === 'sent' ? 'Reenviado ✓' : 'Reenviar por correo'}
        </Button>
      </div>
      {resend === 'failed' && <p className="text-[11px] text-danger">No se pudo reenviar el correo.</p>}
    </div>
  );
}
