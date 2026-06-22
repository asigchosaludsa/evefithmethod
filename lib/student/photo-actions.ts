'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireStudent } from '@/lib/auth/roles';
import { getStudentCoachId } from '@/lib/db/queries/student';
import type { PhotoType } from '@/types/app';

/** Save a progress-photo row after the client uploaded the file to Storage. */
export async function saveProgressPhoto(input: {
  path: string;
  photoType: PhotoType;
}): Promise<{ error?: string }> {
  const student = await requireStudent();
  if (!input.path.startsWith(`${student.id}/`)) {
    return { error: 'Ruta de foto inválida.' };
  }
  const coachId = await getStudentCoachId(student.id);
  const supabase = await createClient();
  const { error } = await supabase.from('progress_photos').insert({
    student_id: student.id,
    coach_id: coachId,
    photo_path: input.path,
    photo_type: input.photoType,
    visibility: 'student_and_coach',
  });
  if (error) return { error: error.message };
  revalidatePath('/student/progress');
  return {};
}

/** Save the public avatar URL on the user's profile (any role). */
export async function updateAvatar(publicUrl: string): Promise<{ error?: string }> {
  const profile = await requireAuth();

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(publicUrl);
  } catch {
    return { error: 'URL de avatar inválida.' };
  }
  if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.supabase.co')) {
    return { error: 'URL de avatar inválida.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
  if (error) return { error: error.message };
  revalidatePath('/student/profile');
  revalidatePath('/coach/settings');
  return {};
}
