'use client';

import { Check } from 'lucide-react';
import { markContentRead } from '@/lib/student/actions';
import { Button } from '@/components/common';

export function MarkReadButton({ assignmentId, read }: { assignmentId: string; read: boolean }) {
  if (read) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <Check className="size-3.5" /> Leído
      </span>
    );
  }
  return (
    <form action={markContentRead.bind(null, assignmentId)}>
      <Button type="submit" variant="ghost" size="sm">
        Marcar como leído
      </Button>
    </form>
  );
}
