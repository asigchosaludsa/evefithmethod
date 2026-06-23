import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface ProgressPhotoView {
  id: string;
  url: string;
  photoType: string;
  recordedAt: string | null;
}

/** Progress photos for a student with short-lived signed URLs (private bucket). */
export async function getProgressPhotos(studentId: string): Promise<ProgressPhotoView[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('progress_photos')
    .select('id, photo_path, photo_type, recorded_at')
    .eq('student_id', studentId)
    .order('recorded_at', { ascending: false })
    .limit(120);

  const list = rows ?? [];
  if (list.length === 0) return [];

  const paths = list.map((r) => r.photo_path);
  const { data: signed } = await supabase.storage.from('progress-photos').createSignedUrls(paths, 3600);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const out: ProgressPhotoView[] = [];
  for (const r of list) {
    const url = urlByPath.get(r.photo_path);
    if (url) out.push({ id: r.id, url, photoType: r.photo_type, recordedAt: r.recorded_at });
  }
  return out;
}
