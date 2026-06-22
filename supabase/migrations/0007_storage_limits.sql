-- 0007_storage_limits.sql
-- Server-side file size limits + allowed MIME types on the existing buckets.
-- These caps are enforced by Supabase Storage itself and cannot be bypassed,
-- unlike client-side checks (which this complements, not replaces).
-- Idempotent: UPDATE statements can be re-run safely.

-- Images (food-photos, progress-photos, avatars): 5MB, jpg/png/webp.
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('food-photos', 'progress-photos', 'avatars');

-- Videos (exercise-videos): 50MB, mp4/mov.
update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array['video/mp4', 'video/quicktime']
where id = 'exercise-videos';
