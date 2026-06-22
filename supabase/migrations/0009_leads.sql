-- 0009_leads.sql
-- Public request/lead form ("solicitudes"). A visitor submits interest; the
-- coach reviews leads and converts them into an invitation.
-- Apply IN ORDER, after 0008.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  goal text not null,
  experience_level text,
  age int,
  city text,
  availability text,
  injuries text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'rejected')),
  invitation_id uuid references public.invitations(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists leads_status_created_idx on public.leads (status, created_at desc);

alter table public.leads enable row level security;

-- Only a coach may read/manage leads. Inserts happen exclusively through the
-- server action using the service-role (admin) client after Zod validation and
-- IP rate limiting, so there is intentionally NO public/anon insert policy
-- (no anon write surface on this table).
drop policy if exists leads_coach_select on public.leads;
create policy leads_coach_select on public.leads
  for select using (public.is_coach());

drop policy if exists leads_coach_update on public.leads;
create policy leads_coach_update on public.leads
  for update using (public.is_coach()) with check (public.is_coach());

drop policy if exists leads_coach_delete on public.leads;
create policy leads_coach_delete on public.leads
  for delete using (public.is_coach());
