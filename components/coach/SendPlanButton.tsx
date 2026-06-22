'use client';

import { useState, useTransition } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/common';
import { sendPlanEmail } from '@/lib/coach/plan-email-actions';

export function SendPlanButton({ studentId }: { studentId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await sendPlanEmail(studentId);
      if (res.ok) {
        setResult({ ok: true, message: 'Plan enviado' });
      } else {
        setResult({ ok: false, message: res.error });
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" size="sm" loading={pending} onClick={handleClick}>
        <Mail className="size-4" /> Enviar plan por correo (PDF)
      </Button>
      {result && (
        <span className={`text-xs ${result.ok ? 'text-success' : 'text-danger'}`}>
          {result.message}
        </span>
      )}
    </div>
  );
}
