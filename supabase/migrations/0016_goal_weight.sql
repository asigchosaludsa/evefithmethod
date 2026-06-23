-- 0016_goal_weight.sql
alter table public.student_profiles add column if not exists goal_weight_kg numeric;
