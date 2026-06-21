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
