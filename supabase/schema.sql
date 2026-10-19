-- TCS-Sim · Supabase schema with strict Row Level Security
-- Run once in Supabase → SQL Editor (or `supabase db push`). Idempotent where practical.
-- No personal names are stored: only anonymised usernames/codes (s01…s80 → S01…S80, T01…T16).

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_.-]{2,32}$'),
  role text not null default 'student' check (role in ('student','facilitator')),
  student_code text unique,
  team_code text,
  consent boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

-- helper functions (security definer so policies can read profiles without recursion)
create or replace function public.is_facilitator() returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.profiles where user_id = auth.uid() and role = 'facilitator') $$;
create or replace function public.my_code() returns text language sql stable security definer set search_path = public as
$$ select student_code from public.profiles where user_id = auth.uid() $$;
create or replace function public.my_team() returns text language sql stable security definer set search_path = public as
$$ select team_code from public.profiles where user_id = auth.uid() $$;
-- students may only clear their own must_change_password flag (called after a successful password change)
create or replace function public.mark_password_changed() returns void language sql security definer set search_path = public as
$$ update public.profiles set must_change_password = false where user_id = auth.uid() $$;

-- ---------- simulation sessions (team-owned) ----------
create table if not exists public.sessions (
  id text primary key,
  team_code text not null,
  cycle int not null check (cycle between 0 and 2),
  scenario text not null,
  mode text not null check (mode in ('research','practice')),
  engine text, model text, status text, device text,
  members text[] not null default '{}',
  data jsonb not null,               -- full session object (log, trust curve, decisions, debrief …)
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.logs (
  session_id text references public.sessions(id) on delete cascade,
  i int not null, t_ms int, kind text, who text, to_whom text, text text, codes text[], trust numeric,
  primary key (session_id, i)
);
create table if not exists public.decisions (
  session_id text references public.sessions(id) on delete cascade,
  dp text not null, opt text, leininger text, quality int, recorded_by text, justification text, words int, revisions int default 0,
  updated_at timestamptz not null default now(),
  primary key (session_id, dp)
);
-- ---------- facilitator-only measures ----------
create table if not exists public.observations (
  id text primary key,
  session_id text references public.sessions(id) on delete set null,
  student_code text not null, team_code text, cycle int, scenario text, phase text, observer text,
  items jsonb not null, note text, ts timestamptz default now(), device text
);
create table if not exists public.external_measures (
  id bigint generated always as identity primary key,
  student_code text not null, timepoint text, measure text, value text,
  created_at timestamptz not null default now()
);
-- ---------- student-owned learning data ----------
create table if not exists public.module_progress (
  student_code text not null, module text not null, seen int[] not null default '{}', done boolean default false,
  updated_at timestamptz not null default now(), primary key (student_code, module)
);
create table if not exists public.quiz_results (
  student_code text not null, module text not null, best int, last int, n int,
  updated_at timestamptz not null default now(), primary key (student_code, module)
);
create table if not exists public.reflections (
  id text primary key, student_code text not null, session_id text, scenario text, text text not null,
  at timestamptz not null default now()
);
create table if not exists public.review_state (   -- spaced-repetition boxes & badges
  student_code text primary key, review jsonb default '{}', badges text[] default '{}', updated_at timestamptz default now()
);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.logs enable row level security;
alter table public.decisions enable row level security;
alter table public.observations enable row level security;
alter table public.external_measures enable row level security;
alter table public.module_progress enable row level security;
alter table public.quiz_results enable row level security;
alter table public.reflections enable row level security;
alter table public.review_state enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public' and tablename in
    ('profiles','sessions','logs','decisions','observations','external_measures','module_progress','quiz_results','reflections','review_state')
  loop execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename); end loop; end $$;

-- profiles: own row or facilitator; only facilitators edit (students use mark_password_changed())
create policy profiles_read on public.profiles for select using (user_id = auth.uid() or public.is_facilitator());
create policy profiles_fac_write on public.profiles for all using (public.is_facilitator()) with check (public.is_facilitator());

-- sessions: members of the owning team, or facilitators
create policy sessions_read on public.sessions for select using (public.is_facilitator() or team_code = public.my_team());
create policy sessions_insert on public.sessions for insert with check (public.is_facilitator() or team_code = public.my_team());
create policy sessions_update on public.sessions for update using (public.is_facilitator() or team_code = public.my_team())
  with check (public.is_facilitator() or team_code = public.my_team());
create policy sessions_delete on public.sessions for delete using (public.is_facilitator());

-- logs & decisions follow their session
create policy logs_rw on public.logs for all
  using (public.is_facilitator() or exists(select 1 from public.sessions s where s.id = session_id and s.team_code = public.my_team()))
  with check (public.is_facilitator() or exists(select 1 from public.sessions s where s.id = session_id and s.team_code = public.my_team()));
create policy decisions_rw on public.decisions for all
  using (public.is_facilitator() or exists(select 1 from public.sessions s where s.id = session_id and s.team_code = public.my_team()))
  with check (public.is_facilitator() or exists(select 1 from public.sessions s where s.id = session_id and s.team_code = public.my_team()));

-- research measures: facilitators only
create policy obs_fac on public.observations for all using (public.is_facilitator()) with check (public.is_facilitator());
create policy ext_fac on public.external_measures for all using (public.is_facilitator()) with check (public.is_facilitator());

-- learning data: the student's own rows, facilitators read all
create policy mp_own on public.module_progress for all using (student_code = public.my_code() or public.is_facilitator()) with check (student_code = public.my_code() or public.is_facilitator());
create policy qr_own on public.quiz_results for all using (student_code = public.my_code() or public.is_facilitator()) with check (student_code = public.my_code() or public.is_facilitator());
create policy rf_own on public.reflections for all using (student_code = public.my_code() or public.is_facilitator()) with check (student_code = public.my_code() or public.is_facilitator());
create policy rv_own on public.review_state for all using (student_code = public.my_code() or public.is_facilitator()) with check (student_code = public.my_code() or public.is_facilitator());

-- privileges (anon gets nothing; everything requires login)
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_facilitator(), public.my_code(), public.my_team(), public.mark_password_changed() to authenticated;
revoke execute on function public.mark_password_changed() from anon;

create index if not exists sessions_team_idx on public.sessions(team_code);
create index if not exists obs_student_idx on public.observations(student_code);
