-- ============================================================
-- EveFit Method, SETUP PARCIAL (solo migraciones 0001-0006).
-- ATENCION: este archivo esta DESACTUALIZADO y NO incluye 0007-0012
-- (rate limiting, leads, plantillas, catalogo de ejercicios, split_type, etc).
-- Camino canonico: aplica en orden los archivos numerados de migrations/
-- (0001 ... 0012) en el SQL Editor de Supabase, NO este archivo.
-- Ejecuta seed.sql aparte (opcional) despues de crear tu primera coach.
-- ============================================================

-- Permite crear funciones que referencian tablas creadas más abajo.
set check_function_bodies = off;


-- >>>>>>>>>>>>>>>>>>>> supabase/migrations/0001_extensions.sql <<<<<<<<<<<<<<<<<<<<

-- 0001_extensions.sql
-- Required Postgres extensions.

create extension if not exists "pgcrypto";   -- gen_random_uuid(), digest()
create extension if not exists "citext";      -- case-insensitive email (optional use)

-- >>>>>>>>>>>>>>>>>>>> supabase/migrations/0002_helpers_roles.sql <<<<<<<<<<<<<<<<<<<<

-- 0002_helpers_roles.sql
-- RLS helper functions (SECURITY DEFINER so they bypass RLS internally and
-- never cause recursive policy evaluation) + shared utility triggers.

-- These SQL functions reference tables created later (in 0003). Disable body
-- validation so they can be created first; they are valid at call time.
set check_function_bodies = off;

-- Current user's role from their profile.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_coach(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and role = 'coach');
$$;

create or replace function public.is_student(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and role = 'student');
$$;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;

-- True when `coach` has an ACTIVE relationship with `student`.
create or replace function public.coach_has_student(coach uuid, student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.coach_students
    where coach_id = coach and student_id = student and status = 'active'
  );
$$;

-- Generic updated_at maintenance trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Prevent non-service callers from escalating/altering their own role.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.role is distinct from old.role then
      new.role := old.role;  -- silently keep the previous role
    end if;
  end if;
  return new;
end;
$$;

-- >>>>>>>>>>>>>>>>>>>> supabase/migrations/0003_core_tables.sql <<<<<<<<<<<<<<<<<<<<

-- 0003_core_tables.sql
-- All 25 tables, constraints, indexes, and updated_at / role-guard triggers.

-- 1. profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('coach','student','admin')),
  full_name text,
  email text,
  phone text,
  avatar_url text,
  status text not null default 'pending' check (status in ('active','inactive','pending')),
  email_confirmed_at timestamptz,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. coach_profiles
create table if not exists public.coach_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_name text,
  bio text,
  timezone text not null default 'America/Guayaquil',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- 3. student_profiles
create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date_of_birth date,
  age int,
  height_cm numeric,
  initial_weight_kg numeric,
  current_weight_kg numeric,
  goal text,
  training_level text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- 4. coach_students
create table if not exists public.coach_students (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  started_at date default current_date,
  ended_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, student_id)
);

-- 5. invitations
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  role text not null default 'student' check (role in ('student','coach')),
  student_name text,
  goal text,
  message text,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending','accepted','expired','cancelled')),
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. nutrition_plans
create table if not exists public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  calories_target int,
  protein_target_g numeric,
  carbs_target_g numeric,
  fat_target_g numeric,
  meals_per_day int,
  notes text,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. nutrition_plan_food_recommendations
create table if not exists public.nutrition_plan_food_recommendations (
  id uuid primary key default gen_random_uuid(),
  nutrition_plan_id uuid not null references public.nutrition_plans(id) on delete cascade,
  type text not null check (type in ('recommended','limited')),
  food_name text not null,
  notes text,
  created_at timestamptz not null default now()
);

-- 8. food_items
create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  serving_unit text not null default '100g',
  calories_per_100g numeric not null,
  protein_per_100g numeric not null,
  carbs_per_100g numeric not null,
  fat_per_100g numeric not null,
  source text not null default 'manual',
  created_by uuid references public.profiles(id) on delete set null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. food_logs
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  nutrition_plan_id uuid references public.nutrition_plans(id) on delete set null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack','other')),
  logged_at timestamptz not null default now(),
  notes text,
  photo_path text,
  coach_review_status text not null default 'pending' check (coach_review_status in ('pending','reviewed','flagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. food_log_items
create table if not exists public.food_log_items (
  id uuid primary key default gen_random_uuid(),
  food_log_id uuid not null references public.food_logs(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete set null,
  grams numeric not null,
  calories numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  created_at timestamptz not null default now()
);

-- 11. workout_plans
create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  focus text,
  level text,
  estimated_duration_minutes int,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 12. workout_plan_days
create table if not exists public.workout_plan_days (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  day_number int not null,
  title text not null,
  focus text,
  notes text,
  created_at timestamptz not null default now()
);

-- 13. exercises
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  muscle_group text,
  equipment text,
  description text,
  instructions text,
  common_mistakes text,
  video_url text,
  thumbnail_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_global boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 14. workout_plan_exercises
create table if not exists public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_day_id uuid not null references public.workout_plan_days(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  sort_order int not null default 0,
  sets int not null default 3,
  reps text not null default '10',
  rest_seconds int,
  tempo text,
  suggested_weight_kg numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 15. workout_logs
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  workout_plan_id uuid references public.workout_plans(id) on delete set null,
  workout_plan_day_id uuid references public.workout_plan_days(id) on delete set null,
  logged_at timestamptz not null default now(),
  status text not null default 'started' check (status in ('started','completed','skipped')),
  perceived_effort int check (perceived_effort between 1 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 16. workout_log_sets
create table if not exists public.workout_log_sets (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  set_number int not null,
  reps_completed int,
  weight_kg numeric,
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- 17. weight_entries
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  weight_kg numeric not null,
  recorded_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 18. body_measurements
create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  recorded_at date not null default current_date,
  waist_cm numeric,
  hip_cm numeric,
  chest_cm numeric,
  thigh_cm numeric,
  arm_cm numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 19. progress_photos
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  photo_path text not null,
  photo_type text not null default 'other' check (photo_type in ('front','side','back','other')),
  recorded_at date default current_date,
  visibility text not null default 'student_and_coach' check (visibility in ('student_and_coach','coach_only','student_only')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 20. content_posts
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text,
  summary text,
  body text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 21. content_assignments
create table if not exists public.content_assignments (
  id uuid primary key default gen_random_uuid(),
  content_post_id uuid not null references public.content_posts(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (content_post_id, student_id)
);

-- 22. coach_notes
create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  category text,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 23. student_checkins
create table if not exists public.student_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  checkin_date date not null default current_date,
  energy_level int check (energy_level between 1 and 5),
  hunger_level int check (hunger_level between 1 and 5),
  sleep_quality int check (sleep_quality between 1 and 5),
  stress_level int check (stress_level between 1 and 5),
  soreness_level int check (soreness_level between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 24. alerts
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical','success')),
  title text not null,
  message text,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  source text not null default 'system' check (source in ('system','coach')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- 25. auth_events
create table if not exists public.auth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  provider text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes on hot foreign keys / time columns
-- ---------------------------------------------------------------------------
create index if not exists idx_coach_students_coach on public.coach_students(coach_id);
create index if not exists idx_coach_students_student on public.coach_students(student_id);
create index if not exists idx_invitations_coach on public.invitations(coach_id);
create index if not exists idx_invitations_token on public.invitations(token_hash);
create index if not exists idx_nutrition_plans_student on public.nutrition_plans(student_id);
create index if not exists idx_nutrition_plans_coach on public.nutrition_plans(coach_id);
create index if not exists idx_nutrition_recs_plan on public.nutrition_plan_food_recommendations(nutrition_plan_id);
create index if not exists idx_food_logs_student on public.food_logs(student_id);
create index if not exists idx_food_logs_coach on public.food_logs(coach_id);
create index if not exists idx_food_logs_logged_at on public.food_logs(logged_at);
create index if not exists idx_food_log_items_log on public.food_log_items(food_log_id);
create index if not exists idx_workout_plans_student on public.workout_plans(student_id);
create index if not exists idx_workout_plans_coach on public.workout_plans(coach_id);
create index if not exists idx_workout_plan_days_plan on public.workout_plan_days(workout_plan_id);
create index if not exists idx_workout_plan_exercises_day on public.workout_plan_exercises(workout_plan_day_id);
create index if not exists idx_exercises_coach on public.exercises(coach_id);
create index if not exists idx_workout_logs_student on public.workout_logs(student_id);
create index if not exists idx_workout_logs_coach on public.workout_logs(coach_id);
create index if not exists idx_workout_logs_logged_at on public.workout_logs(logged_at);
create index if not exists idx_workout_log_sets_log on public.workout_log_sets(workout_log_id);
create index if not exists idx_weight_entries_student on public.weight_entries(student_id);
create index if not exists idx_weight_entries_recorded on public.weight_entries(recorded_at);
create index if not exists idx_body_measurements_student on public.body_measurements(student_id);
create index if not exists idx_progress_photos_student on public.progress_photos(student_id);
create index if not exists idx_content_posts_coach on public.content_posts(coach_id);
create index if not exists idx_content_assignments_student on public.content_assignments(student_id);
create index if not exists idx_content_assignments_post on public.content_assignments(content_post_id);
create index if not exists idx_coach_notes_coach on public.coach_notes(coach_id);
create index if not exists idx_coach_notes_student on public.coach_notes(student_id);
create index if not exists idx_student_checkins_student on public.student_checkins(student_id);
create index if not exists idx_alerts_coach on public.alerts(coach_id);
create index if not exists idx_alerts_student on public.alerts(student_id);
create index if not exists idx_alerts_status on public.alerts(status);
create index if not exists idx_auth_events_user on public.auth_events(user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (only on tables that have an updated_at column)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'profiles','coach_profiles','student_profiles','coach_students','invitations',
    'nutrition_plans','food_items','food_logs','workout_plans','exercises',
    'workout_plan_exercises','workout_logs','weight_entries','body_measurements',
    'progress_photos','content_posts','coach_notes','student_checkins'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t
    );
  end loop;
end $$;

-- Role escalation guard on profiles.
drop trigger if exists prevent_role_escalation on public.profiles;
create trigger prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- >>>>>>>>>>>>>>>>>>>> supabase/migrations/0004_rls_policies.sql <<<<<<<<<<<<<<<<<<<<

-- 0004_rls_policies.sql
-- Enable RLS on every table and define access policies.
-- Pattern: a broad "<table>_select" policy + a narrower "<table>_modify" (for all)
-- policy for writers. Permissive policies combine with OR, so the broad select
-- always wins for reads. Coach-only tables use a single "for all" policy.

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.coach_students enable row level security;
alter table public.invitations enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.nutrition_plan_food_recommendations enable row level security;
alter table public.food_items enable row level security;
alter table public.food_logs enable row level security;
alter table public.food_log_items enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_days enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_log_sets enable row level security;
alter table public.weight_entries enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.content_posts enable row level security;
alter table public.content_assignments enable row level security;
alter table public.coach_notes enable row level security;
alter table public.student_checkins enable row level security;
alter table public.alerts enable row level security;
alter table public.auth_events enable row level security;

-- ============================ profiles ============================
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.coach_has_student(auth.uid(), id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ======================== coach_profiles =========================
create policy coach_profiles_select on public.coach_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy coach_profiles_modify on public.coach_profiles for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ======================= student_profiles ========================
create policy student_profiles_select on public.student_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.coach_has_student(auth.uid(), user_id));
create policy student_profiles_modify on public.student_profiles for all to authenticated
  using (user_id = auth.uid() or public.coach_has_student(auth.uid(), user_id))
  with check (user_id = auth.uid() or public.coach_has_student(auth.uid(), user_id));

-- ======================== coach_students =========================
create policy coach_students_select on public.coach_students for select to authenticated
  using (coach_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy coach_students_modify on public.coach_students for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ========================== invitations ==========================
create policy invitations_all on public.invitations for all to authenticated
  using (coach_id = auth.uid() or public.is_admin())
  with check (coach_id = auth.uid());

-- ======================== nutrition_plans ========================
create policy nutrition_plans_select on public.nutrition_plans for select to authenticated
  using (coach_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy nutrition_plans_modify on public.nutrition_plans for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ============= nutrition_plan_food_recommendations ===============
create policy nutrition_recs_select on public.nutrition_plan_food_recommendations for select to authenticated
  using (exists (
    select 1 from public.nutrition_plans p
    where p.id = nutrition_plan_id and (p.coach_id = auth.uid() or p.student_id = auth.uid())
  ));
create policy nutrition_recs_modify on public.nutrition_plan_food_recommendations for all to authenticated
  using (exists (select 1 from public.nutrition_plans p where p.id = nutrition_plan_id and p.coach_id = auth.uid()))
  with check (exists (select 1 from public.nutrition_plans p where p.id = nutrition_plan_id and p.coach_id = auth.uid()));

-- =========================== food_items ==========================
create policy food_items_select on public.food_items for select to authenticated
  using (is_public or created_by = auth.uid() or public.is_admin());
create policy food_items_modify on public.food_items for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- =========================== food_logs ===========================
create policy food_logs_select on public.food_logs for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy food_logs_student_modify on public.food_logs for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
create policy food_logs_coach_update on public.food_logs for update to authenticated
  using (public.coach_has_student(auth.uid(), student_id))
  with check (public.coach_has_student(auth.uid(), student_id));

-- ========================= food_log_items ========================
create policy food_log_items_select on public.food_log_items for select to authenticated
  using (exists (
    select 1 from public.food_logs fl
    where fl.id = food_log_id and (fl.student_id = auth.uid() or public.coach_has_student(auth.uid(), fl.student_id))
  ));
create policy food_log_items_modify on public.food_log_items for all to authenticated
  using (exists (select 1 from public.food_logs fl where fl.id = food_log_id and fl.student_id = auth.uid()))
  with check (exists (select 1 from public.food_logs fl where fl.id = food_log_id and fl.student_id = auth.uid()));

-- ========================= workout_plans =========================
create policy workout_plans_select on public.workout_plans for select to authenticated
  using (coach_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy workout_plans_modify on public.workout_plans for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ======================= workout_plan_days =======================
create policy workout_plan_days_select on public.workout_plan_days for select to authenticated
  using (exists (
    select 1 from public.workout_plans p
    where p.id = workout_plan_id and (p.coach_id = auth.uid() or p.student_id = auth.uid())
  ));
create policy workout_plan_days_modify on public.workout_plan_days for all to authenticated
  using (exists (select 1 from public.workout_plans p where p.id = workout_plan_id and p.coach_id = auth.uid()))
  with check (exists (select 1 from public.workout_plans p where p.id = workout_plan_id and p.coach_id = auth.uid()));

-- =========================== exercises ===========================
create policy exercises_select on public.exercises for select to authenticated
  using (
    is_global
    or coach_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.coach_students cs
      where cs.student_id = auth.uid() and cs.coach_id = exercises.coach_id and cs.status = 'active'
    )
  );
create policy exercises_modify on public.exercises for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ===================== workout_plan_exercises ====================
create policy workout_plan_exercises_select on public.workout_plan_exercises for select to authenticated
  using (exists (
    select 1 from public.workout_plan_days d
    join public.workout_plans p on p.id = d.workout_plan_id
    where d.id = workout_plan_day_id and (p.coach_id = auth.uid() or p.student_id = auth.uid())
  ));
create policy workout_plan_exercises_modify on public.workout_plan_exercises for all to authenticated
  using (exists (
    select 1 from public.workout_plan_days d
    join public.workout_plans p on p.id = d.workout_plan_id
    where d.id = workout_plan_day_id and p.coach_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workout_plan_days d
    join public.workout_plans p on p.id = d.workout_plan_id
    where d.id = workout_plan_day_id and p.coach_id = auth.uid()
  ));

-- ========================== workout_logs =========================
create policy workout_logs_select on public.workout_logs for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy workout_logs_student_modify on public.workout_logs for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ======================== workout_log_sets =======================
create policy workout_log_sets_select on public.workout_log_sets for select to authenticated
  using (exists (
    select 1 from public.workout_logs wl
    where wl.id = workout_log_id and (wl.student_id = auth.uid() or public.coach_has_student(auth.uid(), wl.student_id))
  ));
create policy workout_log_sets_modify on public.workout_log_sets for all to authenticated
  using (exists (select 1 from public.workout_logs wl where wl.id = workout_log_id and wl.student_id = auth.uid()))
  with check (exists (select 1 from public.workout_logs wl where wl.id = workout_log_id and wl.student_id = auth.uid()));

-- ===== weight_entries / body_measurements / progress_photos / student_checkins =====
-- student owns; assigned coach can read + write.
create policy weight_entries_select on public.weight_entries for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy weight_entries_modify on public.weight_entries for all to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id))
  with check (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id));

create policy body_measurements_select on public.body_measurements for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy body_measurements_modify on public.body_measurements for all to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id))
  with check (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id));

create policy progress_photos_select on public.progress_photos for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy progress_photos_modify on public.progress_photos for all to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id))
  with check (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id));

create policy student_checkins_select on public.student_checkins for select to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id) or public.is_admin());
create policy student_checkins_modify on public.student_checkins for all to authenticated
  using (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id))
  with check (student_id = auth.uid() or public.coach_has_student(auth.uid(), student_id));

-- ========================= content_posts =========================
create policy content_posts_select on public.content_posts for select to authenticated
  using (
    coach_id = auth.uid()
    or public.is_admin()
    or (status = 'published' and exists (
      select 1 from public.content_assignments ca
      where ca.content_post_id = content_posts.id and ca.student_id = auth.uid()
    ))
  );
create policy content_posts_modify on public.content_posts for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ====================== content_assignments ======================
create policy content_assignments_select on public.content_assignments for select to authenticated
  using (coach_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy content_assignments_coach_modify on public.content_assignments for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
-- student may mark their own assignment as read (read_at).
create policy content_assignments_student_update on public.content_assignments for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- =========================== coach_notes =========================
create policy coach_notes_all on public.coach_notes for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ============================= alerts ============================
create policy alerts_all on public.alerts for all to authenticated
  using (coach_id = auth.uid() or public.is_admin())
  with check (coach_id = auth.uid());

-- ========================== auth_events ==========================
create policy auth_events_select on public.auth_events for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy auth_events_insert on public.auth_events for insert to authenticated
  with check (user_id = auth.uid());

-- >>>>>>>>>>>>>>>>>>>> supabase/migrations/0005_triggers.sql <<<<<<<<<<<<<<<<<<<<

-- 0005_triggers.sql
-- Auto-create a baseline profile when a new auth user is created.
-- Role is intentionally left NULL (resolved later by invitation/onboarding) and
-- never trusted from arbitrary client metadata, preventing role escalation.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status, onboarding_completed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    null,
    'pending',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- >>>>>>>>>>>>>>>>>>>> supabase/migrations/0006_storage.sql <<<<<<<<<<<<<<<<<<<<

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
