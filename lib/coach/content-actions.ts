'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireCoach } from '@/lib/auth/roles';
import type { ActionState } from '@/lib/auth/action-state';

/**
 * Assign a content post (tip) to one or more of the coach's active students.
 * Reads `content_post_id` and all `student_ids` from the form. Validates that
 * the post belongs to the coach and that each student is an active link before
 * upserting into content_assignments (no-op on already-assigned students).
 */
export async function assignContentToStudents(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const coach = await requireCoach();

  const contentPostId = String(formData.get('content_post_id') ?? '').trim();
  if (!contentPostId) return { error: 'Falta el contenido a asignar.' };

  const studentIds = formData
    .getAll('student_ids')
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
  if (studentIds.length === 0) return { error: 'Selecciona al menos una alumna.' };

  const supabase = await createClient();

  // The post must belong to this coach.
  const { data: post } = await supabase
    .from('content_posts')
    .select('id')
    .eq('id', contentPostId)
    .eq('coach_id', coach.id)
    .maybeSingle();
  if (!post) return { error: 'Contenido no encontrado.' };

  // Keep only students that are active links for this coach.
  const { data: links } = await supabase
    .from('coach_students')
    .select('student_id')
    .eq('coach_id', coach.id)
    .eq('status', 'active')
    .in('student_id', studentIds);

  const ownedIds = new Set((links ?? []).map((l) => l.student_id));
  const targets = studentIds.filter((id) => ownedIds.has(id));
  if (targets.length === 0) return { error: 'Ninguna alumna válida seleccionada.' };

  const rows = targets.map((studentId) => ({
    content_post_id: contentPostId,
    student_id: studentId,
    coach_id: coach.id,
  }));

  const { error } = await supabase
    .from('content_assignments')
    .upsert(rows, { onConflict: 'content_post_id,student_id' });
  if (error) return { error: error.message };

  revalidatePath(`/coach/content/${contentPostId}`);
  return { success: 'Tip asignado' };
}

/** Remove a single content assignment, then refresh the content page. */
export async function unassignContent(
  assignmentId: string,
  contentPostId: string,
): Promise<void> {
  const coach = await requireCoach();
  const supabase = await createClient();
  await supabase
    .from('content_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('coach_id', coach.id);
  revalidatePath(`/coach/content/${contentPostId}`);
}
