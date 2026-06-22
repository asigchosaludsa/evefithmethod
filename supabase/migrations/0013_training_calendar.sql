-- 0013_training_calendar.sql
-- Training calendar / agenda: map each split day to a weekday, give plans a
-- duration in weeks, and track per-date session completion. Apply IN ORDER,
-- after 0012. Additive and safe.

-- Each split day can be scheduled to a weekday (1=Mon .. 7=Sun); NULL = not scheduled.
alter table public.workout_plan_days
  add column if not exists weekday smallint check (weekday between 1 and 7);

-- Plan duration in weeks (the calendar window is [starts_at, starts_at + weeks*7)).
alter table public.workout_plans
  add column if not exists weeks smallint check (weeks between 1 and 52);

-- The calendar date a workout session is FOR (distinct from logged_at = when
-- it was recorded). Lets the calendar checkboxes upsert one canonical row per
-- planned slot. Existing ad-hoc logs keep session_date NULL.
alter table public.workout_logs
  add column if not exists session_date date;

create unique index if not exists workout_logs_session_uidx
  on public.workout_logs (student_id, workout_plan_day_id, session_date)
  where session_date is not null;
