'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog, Button } from '@/components/common';
import { deleteAccount } from '@/lib/coach/account-actions';

export function DeleteAccountButton({ userId, label }: { userId: string; label: string }) {
  const [error, setError] = React.useState<string | null>(null);

  async function handle() {
    setError(null);
    const res = await deleteAccount(userId);
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="text-right">
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="sm">
            <Trash2 className="size-4" aria-hidden /> Eliminar
          </Button>
        }
        title="Eliminar cuenta"
        description={`Se eliminará la cuenta de ${label} y todos sus datos de forma permanente. El correo quedará libre para volver a solicitar o ser invitada. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar definitivamente"
        destructive
        onConfirm={handle}
      />
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
