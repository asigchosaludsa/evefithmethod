'use client';

import { ConfirmDialog, Button } from '@/components/common';
import {
  archiveNutritionPlan,
  restoreNutritionPlan,
  archiveWorkoutPlan,
  restoreWorkoutPlan,
} from '@/lib/coach/actions';

export interface ArchivePlanButtonProps {
  planId: string;
  studentId: string;
  kind: 'nutrition' | 'workout';
  archived: boolean;
}

export function ArchivePlanButton({ planId, studentId, kind, archived }: ArchivePlanButtonProps) {
  if (archived) {
    const restore = kind === 'nutrition' ? restoreNutritionPlan : restoreWorkoutPlan;
    return (
      <Button variant="outline" size="sm" onClick={() => restore(planId, studentId)}>
        Restaurar
      </Button>
    );
  }

  const archive = kind === 'nutrition' ? archiveNutritionPlan : archiveWorkoutPlan;
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          Archivar
        </Button>
      }
      title="Archivar plan"
      description="El plan se ocultará de la lista activa. Podrás restaurarlo cuando quieras."
      confirmLabel="Archivar"
      onConfirm={() => archive(planId, studentId)}
    />
  );
}
