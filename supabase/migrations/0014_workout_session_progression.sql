-- 0014_workout_session_progression.sql
-- Apoyo a las consultas de progresión por ejercicio y unificación de sesiones.
-- Idempotente: se puede correr más de una vez sin romper.

-- Índice para series de peso máximo por ejercicio (consulta por exercise_id).
create index if not exists workout_log_sets_exercise_idx
  on public.workout_log_sets (exercise_id);

-- Backfill: las sesiones detalladas antiguas se guardaban con session_date = NULL.
-- Si tienen workout_plan_day_id, se les asigna la fecha de logged_at para que el
-- calendario las vea. No toca las que ya tienen session_date, ni las que generarían
-- conflicto con otra fila que ya tiene esa fecha (índice único parcial).
update public.workout_logs wl
set session_date = (wl.logged_at at time zone 'utc')::date
where wl.session_date is null
  and wl.workout_plan_day_id is not null
  and not exists (
    select 1
    from public.workout_logs other
    where other.student_id = wl.student_id
      and other.workout_plan_day_id = wl.workout_plan_day_id
      and other.session_date = (wl.logged_at at time zone 'utc')::date
      and other.id <> wl.id
  );
