-- =============================================================================
-- HitNeet — initial schema
--
-- Read top to bottom: helper functions → tables (with CHECK rules) → triggers
-- → Row Level Security (who can see/change what) → functions the app calls.
--
-- Principles (see docs/05-database-schema.md and docs/decisions/):
--   * Raw answer counts are the source of truth; scores are never stored.
--   * Each test freezes the marking scheme it was saved with (decision 0004).
--   * Role comes from the email, decided here in the database (decision 0003).
--   * Students read/write only their own rows; the admin reads everything and
--     changes only settings + archives tests.
--   * Nothing is hard-deleted from the app; tests are archived.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Keeps updated_at honest on every UPDATE.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

-- Emails that become admin when they sign up. Filled from the Supabase
-- dashboard (SQL editor), never committed to the repo. No RLS policies →
-- not readable through the API by anyone.
create table public.admin_emails (
  email text primary key check (email = lower(email))
);

-- One row per signed-up user (auth.users is managed by Supabase Auth).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role         text not null default 'student' check (role in ('student', 'admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- "Is the person calling right now the admin?"
-- security definer so it can read profiles without tripping over RLS on profiles itself.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- When Supabase Auth creates a user (Google or email sign-up), create their
-- profile. The ROLE IS DECIDED HERE, from admin_emails — never by the browser.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(new.email);
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    v_email,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),       -- our sign-up form
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),  -- Google
      split_part(v_email, '@', 1)
    ), 80),
    case when exists (select 1 from public.admin_emails a where a.email = v_email)
         then 'admin' else 'student' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Shared settings (exactly one row)
-- ---------------------------------------------------------------------------

create table public.settings (
  id                  boolean primary key default true check (id),  -- forces a single row
  exam_date           date    not null,
  exam_date_confirmed boolean not null default false,
  correct_marks       numeric(4,2) not null check (correct_marks > 0),
  wrong_penalty       numeric(4,2) not null check (wrong_penalty >= 0),
  blank_marks         numeric(4,2) not null default 0,
  pattern_physics     int not null check (pattern_physics > 0),
  pattern_chemistry   int not null check (pattern_chemistry > 0),
  pattern_biology     int not null check (pattern_biology > 0),
  duration_min        int not null check (duration_min between 1 and 600),
  updated_at          timestamptz not null default now()
);

create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Syllabus
-- ---------------------------------------------------------------------------

create table public.chapters (
  id         text primary key,
  subject    text not null check (subject in ('physics', 'chemistry', 'biology')),
  name       text not null,
  sort_order int  not null,
  unique (subject, name)
);

-- ---------------------------------------------------------------------------
-- Tests
-- ---------------------------------------------------------------------------

create table public.tests (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  request_id     text not null,                       -- idempotency key from the app
  name           text not null check (char_length(trim(name)) between 1 and 120),
  test_date      date not null,
  type           text not null check (type in ('full', 'part', 'chapter', 'subject')),
  source         text not null default '' check (char_length(source) <= 80),
  duration_min   int  not null check (duration_min between 1 and 600),
  time_taken_min int  check (time_taken_min between 0 and 600),
  difficulty     smallint check (difficulty between 1 and 5),
  paper_length   smallint check (paper_length between 1 and 5),
  -- Marking-scheme snapshot. Filled by trigger; the app can't set these.
  correct_marks  numeric(4,2) not null,
  wrong_penalty  numeric(4,2) not null,
  blank_marks    numeric(4,2) not null,
  status         text not null default 'submitted' check (status in ('draft', 'submitted', 'archived')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (student_id, request_id),
  unique (id, student_id)   -- lets child tables prove "same student" with a composite FK
);

create index tests_student_date_idx on public.tests (student_id, test_date desc);

-- Freeze today's scheme on insert; keep the original scheme on every update.
create or replace function public.freeze_test_scheme()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select s.correct_marks, s.wrong_penalty, s.blank_marks
      into new.correct_marks, new.wrong_penalty, new.blank_marks
      from public.settings s where s.id;
  else
    new.correct_marks := old.correct_marks;
    new.wrong_penalty := old.wrong_penalty;
    new.blank_marks   := old.blank_marks;
    new.student_id    := old.student_id;   -- a test can never change owner
    new.request_id    := old.request_id;
  end if;
  return new;
end;
$$;

create trigger tests_freeze_scheme before insert or update on public.tests
  for each row execute function public.freeze_test_scheme();

create trigger tests_touch before update on public.tests
  for each row execute function public.touch_updated_at();

-- Raw counts per subject. The rule "counts must add up" lives in the database.
create table public.test_subjects (
  test_id         uuid not null references public.tests (id) on delete cascade,
  subject         text not null check (subject in ('physics', 'chemistry', 'biology')),
  total_questions int  not null check (total_questions between 1 and 500),
  correct         int  not null check (correct >= 0),
  incorrect       int  not null check (incorrect >= 0),
  unattempted     int  not null check (unattempted >= 0),
  primary key (test_id, subject),
  check (correct + incorrect + unattempted = total_questions)
);

-- ---------------------------------------------------------------------------
-- Mistakes
-- ---------------------------------------------------------------------------

create table public.mistakes (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null default auth.uid(),
  test_id          uuid not null,
  request_id       text not null,
  subject          text not null check (subject in ('physics', 'chemistry', 'biology')),
  chapter          text not null check (char_length(chapter) between 1 and 120),
  topic            text not null default '' check (char_length(topic) <= 200),
  question_number  int  check (question_number between 1 and 500),
  category         text not null check (category in ('conceptual', 'silly', 'memory', 'approach', 'time', 'guess', 'misread')),
  lucky_guess      boolean not null default false,
  what_went_wrong  text not null default '' check (char_length(what_went_wrong) <= 2000),
  correct_approach text not null default '' check (char_length(correct_approach) <= 2000),
  confidence       smallint not null check (confidence between 1 and 5),
  status           text not null default 'open' check (status in ('open', 'reviewing', 'resolved')),
  review_date      date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (student_id, request_id),
  -- The test must belong to the same student.
  foreign key (test_id, student_id) references public.tests (id, student_id) on delete cascade
);

create index mistakes_student_idx on public.mistakes (student_id, created_at desc);
create index mistakes_test_idx on public.mistakes (test_id);

create trigger mistakes_touch before update on public.mistakes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Reflections (at most one per test)
-- ---------------------------------------------------------------------------

create table public.reflections (
  test_id            uuid primary key,
  student_id         uuid not null default auth.uid(),
  difficulty         smallint not null check (difficulty between 1 and 5),
  confidence         smallint not null check (confidence between 1 and 5),
  concentration      smallint not null check (concentration between 1 and 5),
  stress             smallint not null check (stress between 1 and 5),
  finished_on_time   boolean  not null,
  time_notes         text not null default '' check (char_length(time_notes) <= 2000),
  subject_notes      jsonb not null default '{"physics":"","chemistry":"","biology":""}'::jsonb,
  silly_mistakes     text not null default '' check (char_length(silly_mistakes) <= 2000),
  guessing           text not null default '' check (char_length(guessing) <= 2000),
  chapters_to_revise text not null default '' check (char_length(chapters_to_revise) <= 2000),
  next_target        int  check (next_target between -720 and 720),
  comments           text not null default '' check (char_length(comments) <= 4000),
  updated_at         timestamptz not null default now(),
  foreign key (test_id, student_id) references public.tests (id, student_id) on delete cascade
);

create trigger reflections_touch before update on public.reflections
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  request_id   text not null,
  title        text not null check (char_length(trim(title)) between 1 and 160),
  description  text not null default '' check (char_length(description) <= 2000),
  subject      text check (subject in ('physics', 'chemistry', 'biology')),
  chapter      text not null default '',
  test_id      uuid references public.tests (id) on delete set null,
  mistake_id   uuid references public.mistakes (id) on delete set null,
  priority     text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status       text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'deferred')),
  due_date     date,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  unique (student_id, request_id)
);

create index tasks_student_idx on public.tasks (student_id);

-- completed_at follows status, so the app can't get it wrong.
create or replace function public.task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_completed_at before insert or update on public.tasks
  for each row execute function public.task_completed_at();

-- =============================================================================
-- Row Level Security
-- With RLS on, a table returns NOTHING unless a policy allows it.
-- Two layers: GRANTs say which kinds of statement a role may run at all;
-- POLICIES then say which rows. Both must allow an action.
-- =============================================================================

revoke all on public.admin_emails from anon, authenticated;
grant select on public.settings, public.chapters to anon, authenticated;
grant update on public.settings to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.tests, public.mistakes, public.reflections, public.tasks to authenticated;
grant select, insert, update, delete on public.test_subjects to authenticated;  -- delete: replacing counts on edit
revoke delete on public.tests, public.mistakes, public.reflections, public.tasks from anon, authenticated;
revoke insert, update, delete on public.settings, public.chapters from anon;
revoke all on public.tests, public.test_subjects, public.mistakes, public.reflections, public.tasks, public.profiles from anon;


alter table public.admin_emails  enable row level security;  -- no policies: hidden
alter table public.profiles      enable row level security;
alter table public.settings      enable row level security;
alter table public.chapters      enable row level security;
alter table public.tests         enable row level security;
alter table public.test_subjects enable row level security;
alter table public.mistakes      enable row level security;
alter table public.reflections   enable row level security;
alter table public.tasks         enable row level security;

-- Profiles: see yourself (admin sees everyone). You may change only your name.
create policy "read own profile or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;  -- role/email can't be changed

-- Settings: anyone can read (exam date isn't secret); only the admin changes them.
create policy "anyone reads settings" on public.settings
  for select to anon, authenticated using (true);
create policy "admin updates settings" on public.settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Chapters: read-only reference data.
create policy "anyone reads chapters" on public.chapters
  for select to anon, authenticated using (true);

-- Tests
create policy "read own tests or admin" on public.tests
  for select to authenticated using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy "student inserts own tests" on public.tests
  for insert to authenticated
  with check (student_id = (select auth.uid()) and not (select public.is_admin()) and status <> 'archived');
create policy "student updates own tests" on public.tests
  for update to authenticated
  using (student_id = (select auth.uid()) and status <> 'archived')   -- archived tests are frozen
  with check (student_id = (select auth.uid()) and status <> 'archived');
-- (Archiving goes through archive_test(), below. There is no DELETE policy.)

-- Test subjects follow their parent test.
create policy "read subjects of visible tests" on public.test_subjects
  for select to authenticated using (exists (
    select 1 from public.tests t
    where t.id = test_id and (t.student_id = (select auth.uid()) or (select public.is_admin()))
  ));
create policy "student writes subjects of own tests" on public.test_subjects
  for all to authenticated
  using (exists (select 1 from public.tests t where t.id = test_id and t.student_id = (select auth.uid())))
  with check (exists (select 1 from public.tests t where t.id = test_id and t.student_id = (select auth.uid())));

-- Mistakes, reflections, tasks: read own (admin reads all); write own only.
create policy "read own mistakes or admin" on public.mistakes
  for select to authenticated using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy "student inserts own mistakes" on public.mistakes
  for insert to authenticated with check (student_id = (select auth.uid()) and not (select public.is_admin()));
create policy "student updates own mistakes" on public.mistakes
  for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

create policy "read own reflections or admin" on public.reflections
  for select to authenticated using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy "student inserts own reflections" on public.reflections
  for insert to authenticated with check (student_id = (select auth.uid()) and not (select public.is_admin()));
create policy "student updates own reflections" on public.reflections
  for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

create policy "read own tasks or admin" on public.tasks
  for select to authenticated using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy "student inserts own tasks" on public.tasks
  for insert to authenticated with check (student_id = (select auth.uid()) and not (select public.is_admin()));
create policy "student updates own tasks" on public.tasks
  for update to authenticated using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

-- =============================================================================
-- Functions the app calls (RPC). A function runs as ONE transaction, so a test
-- and its subject rows are saved together or not at all.
-- =============================================================================

-- Validates and writes the subject rows for a test (used by save_test).
create or replace function public.write_test_subjects(p_test_id uuid, p_subjects jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(p_subjects) <> 'array' or jsonb_array_length(p_subjects) = 0 then
    raise exception 'Add at least one subject.' using errcode = '22023';
  end if;
  delete from public.test_subjects where test_id = p_test_id;
  insert into public.test_subjects (test_id, subject, total_questions, correct, incorrect, unattempted)
  select p_test_id, s ->> 'subject', (s ->> 'totalQuestions')::int, (s ->> 'correct')::int,
         (s ->> 'incorrect')::int, (s ->> 'unattempted')::int
  from jsonb_array_elements(p_subjects) as s;
end;
$$;

-- Create (p_test_id null) or update a test with its subjects, atomically.
-- Create is idempotent: the same request id returns the same test.
-- security invoker → every RLS policy above still applies.
create or replace function public.save_test(p_test_id uuid, p_request_id text, p_input jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_test_id is null then
    select t.id into v_id from public.tests t
      where t.student_id = auth.uid() and t.request_id = p_request_id;
    if v_id is not null then
      return v_id;  -- a retry of a save that already worked
    end if;

    insert into public.tests (request_id, name, test_date, type, source, duration_min,
                              time_taken_min, difficulty, paper_length, status,
                              correct_marks, wrong_penalty, blank_marks)
    values (p_request_id, trim(p_input ->> 'name'), (p_input ->> 'date')::date, p_input ->> 'type',
            coalesce(trim(p_input ->> 'source'), ''), (p_input ->> 'durationMin')::int,
            (p_input ->> 'timeTakenMin')::int, (p_input ->> 'difficulty')::smallint,
            (p_input ->> 'paperLength')::smallint, coalesce(p_input ->> 'status', 'submitted'),
            0, 0, 0)  -- placeholders; the trigger overwrites them with the frozen scheme
    returning id into v_id;
  else
    update public.tests set
      name = trim(p_input ->> 'name'),
      test_date = (p_input ->> 'date')::date,
      type = p_input ->> 'type',
      source = coalesce(trim(p_input ->> 'source'), ''),
      duration_min = (p_input ->> 'durationMin')::int,
      time_taken_min = (p_input ->> 'timeTakenMin')::int,
      difficulty = (p_input ->> 'difficulty')::smallint,
      paper_length = (p_input ->> 'paperLength')::smallint,
      status = coalesce(p_input ->> 'status', 'submitted')
    where id = p_test_id
    returning id into v_id;
    if v_id is null then
      raise exception 'We couldn''t find that test.' using errcode = 'P0002';
    end if;
  end if;

  perform public.write_test_subjects(v_id, p_input -> 'subjects');
  return v_id;
end;
$$;

-- Admin-only: hide a test from lists and charts. Its mistakes and reflection stay.
create or replace function public.archive_test(p_test_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the admin can do this.' using errcode = '42501';
  end if;
  update public.tests set status = 'archived' where id = p_test_id;
  if not found then
    raise exception 'We couldn''t find that test.' using errcode = 'P0002';
  end if;
end;
$$;

-- Admin-only: one row per student for the "All students" page.
create or replace function public.list_students()
returns table (id uuid, name text, email text, joined_at timestamptz, test_count bigint, last_activity timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.display_name, p.email, p.created_at,
         (select count(*) from public.tests t where t.student_id = p.id and t.status = 'submitted'),
         greatest(
           (select max(t.updated_at) from public.tests t where t.student_id = p.id and t.status = 'submitted'),
           (select max(m.updated_at) from public.mistakes m where m.student_id = p.id)
         )
  from public.profiles p
  where p.role = 'student' and public.is_admin()
  order by 6 desc nulls last, p.display_name;
$$;

-- Lock functions down: only signed-in users may call the app's functions.
revoke execute on function public.save_test(uuid, text, jsonb) from public, anon;
revoke execute on function public.write_test_subjects(uuid, jsonb) from public, anon;
revoke execute on function public.archive_test(uuid) from public, anon;
revoke execute on function public.list_students() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.freeze_test_scheme() from public, anon, authenticated;
