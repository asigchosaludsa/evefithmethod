'use client';

import { useActionState } from 'react';
import { initialActionState } from '@/lib/auth/action-state';
import { assignContentToStudents } from '@/lib/coach/content-actions';
import { Badge, EmptyState, SubmitButton } from '@/components/common';

interface AssignContentFormProps {
  contentPostId: string;
  students: { id: string; name: string }[];
  assignedStudentIds: string[];
}

export function AssignContentForm({
  contentPostId,
  students,
  assignedStudentIds,
}: AssignContentFormProps) {
  const [state, action] = useActionState(assignContentToStudents, initialActionState);
  const assigned = new Set(assignedStudentIds);

  if (students.length === 0) {
    return (
      <EmptyState
        title="Aún no tienes alumnas"
        description="Cuando tengas alumnas activas podrás asignarles este tip."
      />
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="content_post_id" value={contentPostId} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Asignar a</legend>
        <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-border bg-surface">
          {students.map((student) => {
            const isAssigned = assigned.has(student.id);
            const inputId = `student-${student.id}`;
            return (
              <li key={student.id}>
                <label
                  htmlFor={inputId}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    name="student_ids"
                    value={student.id}
                    defaultChecked={isAssigned}
                    className="size-4 rounded border-border accent-[var(--color-primary)]"
                  />
                  <span className="flex-1 text-sm text-foreground">{student.name}</span>
                  {isAssigned && (
                    <Badge tone="success" className="shrink-0">
                      Asignado
                    </Badge>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}

      <SubmitButton>Asignar</SubmitButton>
    </form>
  );
}
