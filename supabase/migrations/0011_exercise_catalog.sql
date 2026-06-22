-- 0011_exercise_catalog.sql
-- Categorías de ejercicio (difficulty, movement_pattern), normalización de seeds,
-- split_type en planes, e índice único de globales. + bucket exercise-images.

-- 1) Columnas nuevas en exercises
alter table public.exercises
  add column if not exists difficulty text
    check (difficulty in ('principiante','intermedio','avanzado'));
alter table public.exercises
  add column if not exists movement_pattern text
    check (movement_pattern in ('empuje','traccion','dominante_cadera','dominante_rodilla','core'));

-- 2) Normalizar los 10 ejercicios ya sembrados a valores canónicos
update public.exercises set muscle_group = 'Femoral' where muscle_group = 'Femorales';
update public.exercises set equipment = 'Mancuernas' where equipment = 'Mancuerna';

update public.exercises set difficulty = 'intermedio', movement_pattern = 'dominante_cadera' where name = 'Hip Thrust';
update public.exercises set difficulty = 'principiante', movement_pattern = 'dominante_rodilla' where name = 'Sentadilla Goblet';
update public.exercises set difficulty = 'intermedio', movement_pattern = 'dominante_cadera' where name = 'Peso Muerto Rumano';
update public.exercises set difficulty = 'principiante', movement_pattern = 'dominante_rodilla' where name = 'Prensa';
update public.exercises set difficulty = 'principiante', movement_pattern = 'traccion' where name = 'Remo con Mancuerna';
update public.exercises set difficulty = 'intermedio', movement_pattern = 'empuje' where name = 'Press de Hombro';
update public.exercises set difficulty = 'principiante', movement_pattern = 'traccion' where name = 'Jalón al Pecho';
update public.exercises set difficulty = 'principiante', movement_pattern = 'dominante_rodilla' where name = 'Curl Femoral';
update public.exercises set difficulty = 'principiante', movement_pattern = 'dominante_cadera' where name = 'Abducción de Cadera';
update public.exercises set difficulty = 'principiante', movement_pattern = 'core' where name = 'Plancha';

-- 3) Índice único de globales por nombre (case-insensitive) para deduplicar seeds
create unique index if not exists exercises_global_name_uidx
  on public.exercises (lower(name)) where is_global;

-- 4) split_type en workout_plans
alter table public.workout_plans
  add column if not exists split_type text
    check (split_type in (
      'cuerpo_completo','torso_pierna','ppl','ppl_doble','bro_split','torso_extremidades',
      'ppl_ul','arnold','phul','phat','ppl_arnold','personalizado'
    ));

-- 5) Bucket público para imágenes de ejercicio (lectura pública, escritura del dueño)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-images', 'exercise-images', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "exercise-images public read" on storage.objects;
create policy "exercise-images public read" on storage.objects for select to public
  using (bucket_id = 'exercise-images');
drop policy if exists "exercise-images owner write" on storage.objects;
create policy "exercise-images owner write" on storage.objects for all to authenticated
  using (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
