-- TCS-Sim v2: Facilitator Console. Apply after schema.sql. Idempotent.
alter table public.profiles add column if not exists disabled boolean not null default false;
alter table public.profiles add column if not exists last_seen_at timestamptz;

-- environment settings (readable by every signed-in user, writable by facilitators)
create table if not exists public.app_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now(), updated_by uuid default auth.uid());
-- server-only secrets (LLM key etc.): no policies → only the service role (Edge Functions) can read
create table if not exists public.private_settings (key text primary key, value jsonb not null, updated_at timestamptz default now());
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(), title text not null, body text not null default '',
  audience text not null default 'all',          -- 'all' or a team code, e.g. 'T03'
  level text not null default 'info' check (level in ('info','warn','urgent')),
  starts_at timestamptz not null default now(), ends_at timestamptz,
  created_by uuid default auth.uid(), created_at timestamptz not null default now());
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(), team_code text not null, cycle int not null check (cycle between 0 and 2),
  scenario text, starts_at timestamptz not null, ends_at timestamptz, location text, note text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now());
create table if not exists public.student_notes (
  id uuid primary key default gen_random_uuid(), student_code text not null, note text not null,
  flag text check (flag in ('none','at_risk','follow_up','resolved')) default 'none',
  created_by uuid default auth.uid(), author text, created_at timestamptz not null default now());
create table if not exists public.audit_log (
  id bigint generated always as identity primary key, at timestamptz not null default now(),
  actor uuid default auth.uid(), actor_username text, action text not null, target text, details jsonb default '{}');
create table if not exists public.session_commands (
  id bigint generated always as identity primary key, session_id text not null references public.sessions(id) on delete cascade,
  cmd text not null check (cmd in ('hint','pause','resume','stop','dp')), created_by uuid default auth.uid(),
  created_at timestamptz not null default now(), done_at timestamptz);

alter table public.app_settings enable row level security;
alter table public.private_settings enable row level security;
alter table public.announcements enable row level security;
alter table public.schedules enable row level security;
alter table public.student_notes enable row level security;
alter table public.audit_log enable row level security;
alter table public.session_commands enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public' and tablename in
   ('app_settings','announcements','schedules','student_notes','audit_log','session_commands','reflections')
  loop execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename); end loop; end $$;

create policy settings_read on public.app_settings for select using (auth.uid() is not null);
create policy settings_fac on public.app_settings for all using (public.is_facilitator()) with check (public.is_facilitator());
create policy ann_read on public.announcements for select using (public.is_facilitator() or
  ((audience = 'all' or audience = public.my_team()) and starts_at <= now() and (ends_at is null or ends_at > now())));
create policy ann_fac on public.announcements for all using (public.is_facilitator()) with check (public.is_facilitator());
create policy sch_read on public.schedules for select using (public.is_facilitator() or team_code = public.my_team());
create policy sch_fac on public.schedules for all using (public.is_facilitator()) with check (public.is_facilitator());
create policy notes_fac on public.student_notes for all using (public.is_facilitator()) with check (public.is_facilitator());
create policy audit_read on public.audit_log for select using (public.is_facilitator());
create policy audit_insert on public.audit_log for insert with check (public.is_facilitator() and actor = auth.uid());
-- (no update/delete policy on audit_log → append-only for clients)
create policy cmd_fac on public.session_commands for all using (public.is_facilitator()) with check (public.is_facilitator());
create policy cmd_team_read on public.session_commands for select using (exists(select 1 from public.sessions s where s.id = session_id and s.team_code = public.my_team()));
create policy cmd_team_done on public.session_commands for update using (exists(select 1 from public.sessions s where s.id = session_id and s.team_code = public.my_team()))
  with check (exists(select 1 from public.sessions s where s.id = session_id and s.team_code = public.my_team()));
-- reflections: owner always; facilitators only for students who consented (privacy)
create policy rf_own on public.reflections for all using (student_code = public.my_code()) with check (student_code = public.my_code());
create policy rf_fac_consented on public.reflections for select using (public.is_facilitator() and exists(
  select 1 from public.profiles p where p.student_code = reflections.student_code and p.consent));

-- presence: users stamp their own last_seen_at
create or replace function public.touch_seen() returns void language sql security definer set search_path = public as
$$ update public.profiles set last_seen_at = now() where user_id = auth.uid() $$;
-- disabled accounts cannot use data (belt-and-braces with the auth ban set by the Edge Function)
create or replace function public.is_facilitator() returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.profiles where user_id = auth.uid() and role = 'facilitator' and not disabled) $$;
create or replace function public.my_code() returns text language sql stable security definer set search_path = public as
$$ select student_code from public.profiles where user_id = auth.uid() and not disabled $$;
create or replace function public.my_team() returns text language sql stable security definer set search_path = public as
$$ select team_code from public.profiles where user_id = auth.uid() and not disabled $$;

revoke all on all tables in schema public from anon;
revoke all on public.private_settings from authenticated;
grant select, insert, update, delete on public.app_settings, public.announcements, public.schedules, public.student_notes, public.session_commands to authenticated;
grant select, insert on public.audit_log to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.touch_seen() to authenticated;
revoke execute on function public.touch_seen() from anon;

insert into public.app_settings(key,value) values ('env', '{"currentCycle":1,"mode":"research","modules":{},"scenarios":{},"features":{"tutor":true,"voice":true,"hints":true,"tts":true,"badges":true},"llm":{"enabled":false,"model":"gpt-4o-2024-08-06","temperature":0.6}}'::jsonb)
  on conflict (key) do nothing;
