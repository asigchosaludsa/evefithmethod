-- 0018_coach_notes_student_visibility.sql
-- Permite que una nota del coach sea visible para la alumna en su "Hoy".
--
-- Reutiliza la columna existente `coach_notes.is_private` (default TRUE):
--   is_private = true  -> nota privada del coach (comportamiento actual, oculta a la alumna)
--   is_private = false -> nota visible para la alumna
--
-- Todas las notas existentes quedan is_private = true (default), así que NINGUNA
-- nota privada previa se expone. Se agrega una política SELECT para la alumna
-- limitada a sus propias notas visibles. La política existente `coach_notes_all`
-- (coach_id = auth.uid()) se mantiene intacta para el coach.

create policy coach_notes_student_read on public.coach_notes
  for select
  to authenticated
  using (student_id = auth.uid() and is_private = false);
