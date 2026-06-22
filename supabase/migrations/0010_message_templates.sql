-- 0010_message_templates.sql
-- Coach-editable message templates. The branded shell/design stays in code
-- (locked); these rows hold the editable TEXT blocks + on/off toggle, with
-- {{variables}} substituted at send time. Apply IN ORDER, after 0009.

create table if not exists public.message_templates (
  key text primary key,
  channel text not null check (channel in ('email', 'whatsapp')),
  enabled boolean not null default true,
  subject text,
  heading text,
  body text,
  cta_label text,
  cta_target text,
  updated_at timestamptz not null default now()
);

alter table public.message_templates enable row level security;

-- Only the coach may read/edit templates. Rows are seeded below (no app insert).
drop policy if exists message_templates_coach_select on public.message_templates;
create policy message_templates_coach_select on public.message_templates
  for select using (public.is_coach());

drop policy if exists message_templates_coach_update on public.message_templates;
create policy message_templates_coach_update on public.message_templates
  for update using (public.is_coach()) with check (public.is_coach());

drop trigger if exists set_message_templates_updated_at on public.message_templates;
create trigger set_message_templates_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

-- Seed one row per template key. Content is left NULL so the engine uses its
-- built-in default; the coach edits override it. Channel + enabled are fixed.
insert into public.message_templates (key, channel) values
  ('invitation', 'email'),
  ('welcome', 'email'),
  ('plan_ready', 'email'),
  ('unlink', 'email'),
  ('weekly_summary', 'email'),
  ('lead_notification', 'email'),
  ('wa_welcome', 'whatsapp')
on conflict (key) do nothing;
