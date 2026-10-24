-- v3: digital informed consent + in-app Tool 1 (Student Engagement Questionnaire) responses. Idempotent; run after schema.sql and schema-v2-console.sql.
create table if not exists public.consents (
  id bigserial primary key,
  user_id uuid not null default auth.uid(),
  student_code text not null,
  decision text not null check (decision in ('agree','decline')),
  ai_logs boolean not null default false,
  version text not null,
  at timestamptz not null default now()
);
create index if not exists consents_code_idx on public.consents(student_code, at desc);
create table if not exists public.survey_responses (
  student_code text not null,
  timepoint text not null check (timepoint in ('T0','T1','T2')),
  instrument text not null default 'SEQ',
  user_id uuid not null default auth.uid(),
  session_id text,
  items jsonb not null default '{}'::jsonb,
  n_answered int not null default 0,
  completed boolean not null default false,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_code, timepoint, instrument)
);
alter table public.consents enable row level security;
alter table public.survey_responses enable row level security;
drop policy if exists cons_own_ins on public.consents; drop policy if exists cons_read on public.consents;
create policy cons_own_ins on public.consents for insert with check (student_code = public.my_code() and user_id = auth.uid());
create policy cons_read on public.consents for select using (student_code = public.my_code() or public.is_facilitator());
drop policy if exists sr_sel on public.survey_responses; drop policy if exists sr_ins on public.survey_responses; drop policy if exists sr_upd on public.survey_responses;
create policy sr_sel on public.survey_responses for select using (student_code = public.my_code() or public.is_facilitator());
create policy sr_ins on public.survey_responses for insert with check (student_code = public.my_code() and user_id = auth.uid());
-- students may edit a draft but not a submitted questionnaire
create policy sr_upd on public.survey_responses for update using (student_code = public.my_code() and not completed) with check (student_code = public.my_code() and user_id = auth.uid());
-- consent decision is mirrored to profiles.consent (used by the consent-filtered research exports)
create or replace function public.record_consent(p_decision text, p_ai boolean, p_version text) returns public.consents
language plpgsql security definer set search_path=public as $$
declare c public.consents; code text := public.my_code();
begin
  if code is null then raise exception 'no student code'; end if;
  if p_decision not in ('agree','decline') then raise exception 'bad decision'; end if;
  insert into public.consents(user_id,student_code,decision,ai_logs,version) values (auth.uid(),code,p_decision,coalesce(p_ai,false),p_version) returning * into c;
  update public.profiles set consent = (p_decision='agree') where user_id = auth.uid();
  return c;
end $$;
revoke all on function public.record_consent(text,boolean,text) from public;
grant execute on function public.record_consent(text,boolean,text) to authenticated;
grant select, insert on public.consents to authenticated; grant usage on sequence public.consents_id_seq to authenticated;
grant select, insert, update on public.survey_responses to authenticated;

-- v3.1 explicit consent: new accounts start as not consented until they agree in-app
alter table public.profiles alter column consent set default false;
