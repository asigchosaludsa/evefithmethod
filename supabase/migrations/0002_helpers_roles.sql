-- 0002_helpers_roles.sql
-- RLS helper functions (SECURITY DEFINER so they bypass RLS internally and
-- never cause recursive policy evaluation) + shared utility triggers.

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
