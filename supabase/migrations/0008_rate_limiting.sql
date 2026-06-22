-- 0008_rate_limiting.sql
-- Postgres-backed sliding-window rate limiter. Works on Vercel serverless with
-- no external vendor: the application calls check_rate_limit() from the
-- service-role (admin) client, which both counts recent events and records the
-- current one atomically.
-- Apply IN ORDER, after 0007.

-- Event log. One row per allowed attempt, grouped by an opaque `bucket`
-- (e.g. 'login:1.2.3.4'). Old rows are pruned lazily inside the function.
create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_bucket_created_idx
  on public.rate_limit_events (bucket, created_at);

-- RLS enabled with NO policies: regular (anon/authenticated) clients can never
-- read or write this table. Only the service-role client (used by the limiter)
-- bypasses RLS and the SECURITY DEFINER function below.
alter table public.rate_limit_events enable row level security;

-- Sliding-window check. Returns TRUE when the attempt is allowed (and records
-- it), FALSE when the bucket is over the limit (no row inserted).
-- SECURITY DEFINER with a pinned search_path, matching the helper style in 0002.
create or replace function public.check_rate_limit(
  p_bucket text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  -- Optional housekeeping: drop rows for this bucket that fell out of the window.
  delete from public.rate_limit_events
  where bucket = p_bucket
    and created_at <= now() - (p_window_seconds || ' seconds')::interval;

  select count(*) into v_count
  from public.rate_limit_events
  where bucket = p_bucket
    and created_at > now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max then
    return false;  -- denied, do not record the attempt
  end if;

  insert into public.rate_limit_events (bucket, created_at)
  values (p_bucket, now());

  return true;  -- allowed
end;
$$;

-- Only the service-role may invoke the limiter.
revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
