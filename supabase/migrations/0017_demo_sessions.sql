-- 0017_demo_sessions.sql  (idempotente)
-- Sesiones demo efímeras: marca de perfil demo + función para clonar todos los
-- datos del alumno plantilla a una cuenta desechable, e índice parcial para el
-- cron de limpieza. Aplicar EN ORDEN, después de 0016.

alter table public.profiles add column if not exists is_demo boolean not null default false;
alter table public.profiles add column if not exists demo_expires_at timestamptz;
create index if not exists profiles_demo_expiry_idx on public.profiles (demo_expires_at) where is_demo;

-- Fija un perfil como alumna demo activa. SECURITY DEFINER: corre como el dueño
-- de la función (postgres), por lo que esquiva el trigger prevent_role_escalation
-- (que solo deja pasar el cambio de rol al service_role). Es la única vía por la
-- que un perfil demo obtiene role='student'. No toca ningún otro perfil.
create or replace function public.set_demo_profile(p_id uuid, p_expires timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set
    full_name = 'Tú (demo)',
    role = 'student',
    status = 'active',
    onboarding_completed = true,
    is_demo = true,
    demo_expires_at = p_expires
  where id = p_id;
$$;

-- Clona todos los datos de un estudiante plantilla a new_id (cuenta desechable).
-- SECURITY DEFINER + search_path fijo. No clona progress_photos ni coach_notes.
-- Genera UUIDs nuevos para las PKs y remapea las relaciones (plan/day/log viejos→nuevos).
create or replace function public.clone_demo_student(template_id uuid, new_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into student_profiles (user_id, date_of_birth, age, height_cm, initial_weight_kg, current_weight_kg, goal_weight_kg, goal, training_level, notes)
  select new_id, date_of_birth, age, height_cm, initial_weight_kg, current_weight_kg, goal_weight_kg, goal, training_level, notes
  from student_profiles where user_id = template_id
  on conflict (user_id) do nothing;

  insert into coach_students (coach_id, student_id, status)
  select coach_id, new_id, status from coach_students where student_id = template_id;

  create temp table _np (old uuid, new uuid) on commit drop;
  insert into _np select id, gen_random_uuid() from nutrition_plans where student_id = template_id;
  insert into nutrition_plans (id, coach_id, student_id, title, calories_target, protein_target_g, carbs_target_g, fat_target_g, meals_per_day, notes, status, starts_at, ends_at)
  select m.new, x.coach_id, new_id, x.title, x.calories_target, x.protein_target_g, x.carbs_target_g, x.fat_target_g, x.meals_per_day, x.notes, x.status, x.starts_at, x.ends_at
  from nutrition_plans x join _np m on m.old = x.id where x.student_id = template_id;

  create temp table _wp (old uuid, new uuid) on commit drop;
  insert into _wp select id, gen_random_uuid() from workout_plans where student_id = template_id;
  insert into workout_plans (id, coach_id, student_id, title, focus, level, split_type, estimated_duration_minutes, status, weeks, starts_at, ends_at)
  select m.new, x.coach_id, new_id, x.title, x.focus, x.level, x.split_type, x.estimated_duration_minutes, x.status, x.weeks, x.starts_at, x.ends_at
  from workout_plans x join _wp m on m.old = x.id where x.student_id = template_id;

  create temp table _wpd (old uuid, new uuid) on commit drop;
  insert into _wpd select id, gen_random_uuid() from workout_plan_days where workout_plan_id in (select old from _wp);
  insert into workout_plan_days (id, workout_plan_id, day_number, title, focus, notes, weekday)
  select d.new, wp.new, x.day_number, x.title, x.focus, x.notes, x.weekday
  from workout_plan_days x join _wpd d on d.old = x.id join _wp wp on wp.old = x.workout_plan_id;

  insert into workout_plan_exercises (workout_plan_day_id, exercise_id, sort_order, sets, reps, rest_seconds, tempo, suggested_weight_kg, notes)
  select dm.new, x.exercise_id, x.sort_order, x.sets, x.reps, x.rest_seconds, x.tempo, x.suggested_weight_kg, x.notes
  from workout_plan_exercises x join _wpd dm on dm.old = x.workout_plan_day_id;

  create temp table _wl (old uuid, new uuid) on commit drop;
  insert into _wl select id, gen_random_uuid() from workout_logs where student_id = template_id;
  insert into workout_logs (id, student_id, coach_id, workout_plan_id, workout_plan_day_id, logged_at, status, perceived_effort, notes, session_date)
  select lm.new, new_id, x.coach_id, wp.new, dm.new, x.logged_at, x.status, x.perceived_effort, x.notes, x.session_date
  from workout_logs x join _wl lm on lm.old = x.id
  left join _wp wp on wp.old = x.workout_plan_id
  left join _wpd dm on dm.old = x.workout_plan_day_id
  where x.student_id = template_id;

  insert into workout_log_sets (workout_log_id, exercise_id, set_number, reps_completed, weight_kg, completed, notes)
  select lm.new, x.exercise_id, x.set_number, x.reps_completed, x.weight_kg, x.completed, x.notes
  from workout_log_sets x join _wl lm on lm.old = x.workout_log_id;

  insert into weight_entries (student_id, coach_id, weight_kg, recorded_at, notes)
  select new_id, coach_id, weight_kg, recorded_at, notes from weight_entries where student_id = template_id;

  insert into body_measurements (student_id, coach_id, recorded_at, waist_cm, hip_cm, chest_cm, thigh_cm, arm_cm, notes)
  select new_id, coach_id, recorded_at, waist_cm, hip_cm, chest_cm, thigh_cm, arm_cm, notes from body_measurements where student_id = template_id;

  create temp table _fl (old uuid, new uuid) on commit drop;
  insert into _fl select id, gen_random_uuid() from food_logs where student_id = template_id;
  insert into food_logs (id, student_id, coach_id, nutrition_plan_id, meal_type, logged_at, notes, photo_path, coach_review_status)
  select fm.new, new_id, x.coach_id, npm.new, x.meal_type, x.logged_at, x.notes, null, x.coach_review_status
  from food_logs x join _fl fm on fm.old = x.id
  left join _np npm on npm.old = x.nutrition_plan_id
  where x.student_id = template_id;

  insert into food_log_items (food_log_id, food_item_id, unit, quantity, grams, calories, protein_g, carbs_g, fat_g)
  select fm.new, x.food_item_id, x.unit, x.quantity, x.grams, x.calories, x.protein_g, x.carbs_g, x.fat_g
  from food_log_items x join _fl fm on fm.old = x.food_log_id;

  insert into content_assignments (coach_id, student_id, content_post_id, assigned_at, read_at)
  select coach_id, new_id, content_post_id, assigned_at, read_at from content_assignments where student_id = template_id;
end;
$$;

-- SEGURIDAD: estas funciones SECURITY DEFINER solo deben invocarse desde el
-- servidor con la service-role key (provisión de demo). Si quedaran ejecutables
-- por anon/authenticated, una alumna podría clonar datos de otra a su cuenta o
-- auto-marcarse is_demo (y el cron la borraría). Revocamos el execute público.
revoke execute on function public.set_demo_profile(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.clone_demo_student(uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_demo_profile(uuid, timestamptz) to service_role;
grant execute on function public.clone_demo_student(uuid, uuid) to service_role;
