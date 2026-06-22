'use client';

import { UserMinus } from 'lucide-react';
import { ConfirmDialog, Button } from '@/components/common';
import { unlinkStudent } from '@/lib/coach/actions';

export function UnlinkStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          <UserMinus className="size-4" /> Desvincular
        </Button>
      }
      title="Desvincular alumna"
      description={`${studentName} saldrá de tu lista y perderá el acceso por esta relación. Su historial se conserva y puedes volver a invitarla. ¿Continuar?`}
      confirmLabel="Desvincular"
      destructive
      onConfirm={() => unlinkStudent(studentId)}
    />
  );
}
