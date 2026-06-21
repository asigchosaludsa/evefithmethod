-- 0006_storage.sql
-- Storage buckets + RLS policies on storage.objects.
-- Path convention: "<owner_uuid>/<filename>" (first folder segment = owner).

insert into storage.buckets (id, name, public)
values
  ('food-photos', 'food-photos', false),
  ('progress-photos', 'progress-photos', false),
  ('exercise-videos', 'exercise-videos', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Helper: first path segment as uuid (the owning user).
-- Used inline below via (storage.foldername(name))[1].

-- =========================== food-photos =========================
create policy "food-photos student rw" on storage.objects for all to authenticated
  using (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'food-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "food-photos coach read" on storage.objects for select to authenticated
  using (
    bucket_id = 'food-photos'
    and public.coach_has_student(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- ========================= progress-photos =======================
create policy "progress-photos student rw" on storage.objects for all to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "progress-photos coach read" on storage.objects for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and public.coach_has_student(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- ========================= exercise-videos =======================
-- Coach owns their folder; their active students can read.
create policy "exercise-videos coach rw" on storage.objects for all to authenticated
  using (
    bucket_id = 'exercise-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'exercise-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "exercise-videos student read" on storage.objects for select to authenticated
  using (
    bucket_id = 'exercise-videos'
    and public.coach_has_student(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- ============================= avatars ===========================
-- Public bucket: anyone can read; users write only their own folder.
create policy "avatars public read" on storage.objects for select to public
  using (bucket_id = 'avatars');
create policy "avatars owner write" on storage.objects for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
