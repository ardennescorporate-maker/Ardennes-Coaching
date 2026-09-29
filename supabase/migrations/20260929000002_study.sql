-- Learning content, study data, groups and billing.

-- Helper: standard "own rows" policy set.
create function public.own_rows(t regclass) returns void language plpgsql as $$
begin
  execute format('alter table %s enable row level security', t);
  execute format('create policy "own: select" on %s for select using (user_id = auth.uid())', t);
  execute format('create policy "own: insert" on %s for insert with check (user_id = auth.uid())', t);
  execute format('create policy "own: update" on %s for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  execute format('create policy "own: delete" on %s for delete using (user_id = auth.uid())', t);
end $$;

-- ─── Curricula ──────────────────────────────────────────────────────────────
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  subject text not null unique,
  slug text not null unique,
  system text not null,
  year_level text not null default 'Year 12',
  sort int not null default 0
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses on delete cascade,
  position int not null,
  title text not null,
  description text not null default '',
  unique (course_id, position)
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units on delete cascade,
  course_id uuid not null references public.courses on delete cascade,
  position int not null,
  seq int not null,               -- order within the whole course (0-based)
  title text not null,
  slug text not null,
  unique (unit_id, position),
  unique (course_id, slug),
  unique (course_id, seq)
);
alter table public.courses enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
create policy "courses: readable" on public.courses for select to authenticated using (true);
create policy "units: readable" on public.units for select to authenticated using (true);
create policy "lessons: readable" on public.lessons for select to authenticated using (true);

-- Generated (or built-in) lesson content, shared across students with the same system + language.
create table public.lesson_content (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons on delete cascade,
  system text not null,
  language text not null,
  source text not null check (source in ('builtin', 'ai')),
  content jsonb not null,
  reviewed boolean not null default false,
  created_for uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create index on public.lesson_content (lesson_id, system, language, created_at);
alter table public.lesson_content enable row level security;
create policy "lesson_content: readable" on public.lesson_content for select to authenticated using (true);

create table public.lesson_progress (
  user_id uuid not null references public.profiles on delete cascade,
  lesson_id uuid not null references public.lessons on delete cascade,
  course_id uuid not null references public.courses on delete cascade,
  content_id uuid references public.lesson_content on delete set null,
  stars int not null default 0 check (stars between 0 and 3),
  best_score int not null default 0,
  attempts int not null default 0,
  completed_at timestamptz,
  state jsonb,                    -- autosaved position within the lesson
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
select public.own_rows('public.lesson_progress');
revoke insert, update on public.lesson_progress from authenticated;
grant insert (user_id, lesson_id, course_id, content_id, state), update (content_id, state, updated_at) on public.lesson_progress to authenticated;

-- ─── Study sessions (verified study XP) ─────────────────────────────────────
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  subject text not null,
  minutes int not null check (minutes between 1 and 240),
  kind text not null check (kind in ('evidence', 'focus', 'ai_task')),
  evidence_path text,
  file_hash text,
  verified boolean not null default false,
  flagged boolean not null default false,
  flag_reason text,
  review_status text check (review_status in ('pending', 'approved', 'rejected')),
  day date not null,
  created_at timestamptz not null default now()
);
create index on public.study_sessions (user_id, day);
create unique index study_sessions_hash on public.study_sessions (user_id, file_hash) where file_hash is not null;
create index study_sessions_hash_global on public.study_sessions (file_hash) where file_hash is not null;
alter table public.study_sessions enable row level security;
create policy "study_sessions: read own" on public.study_sessions for select using (user_id = auth.uid());
revoke insert, update, delete on public.study_sessions from anon, authenticated;

-- ─── Planner ────────────────────────────────────────────────────────────────
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  subject text not null,
  date date not null,
  created_at timestamptz not null default now()
);
create index on public.exams (user_id, date);
select public.own_rows('public.exams');

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  task text not null check (char_length(task) between 1 and 160),
  subject text not null,
  due date not null,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.homework (user_id, due);
select public.own_rows('public.homework');

create table public.revision_timelines (
  user_id uuid primary key references public.profiles on delete cascade,
  content jsonb not null,
  created_at timestamptz not null default now()
);
select public.own_rows('public.revision_timelines');
revoke insert, update on public.revision_timelines from authenticated;

-- ─── Exam papers ────────────────────────────────────────────────────────────
create table public.papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  config jsonb not null,
  paper jsonb not null,
  answers jsonb not null default '{}',
  result jsonb,
  score int,
  max_score int,
  pct int,
  band text,
  status text not null default 'in_progress' check (status in ('in_progress', 'marking', 'marked')),
  is_sample boolean not null default false,
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.papers (user_id, created_at desc);
alter table public.papers enable row level security;
create policy "papers: read own" on public.papers for select using (user_id = auth.uid());
create policy "papers: autosave own" on public.papers for update using (user_id = auth.uid() and status = 'in_progress') with check (user_id = auth.uid());
revoke insert, update, delete on public.papers from anon, authenticated;
grant update (answers) on public.papers to authenticated;

create table public.weak_topics (
  user_id uuid not null references public.profiles on delete cascade,
  subject text not null,
  topic text not null,
  misses int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject, topic)
);
select public.own_rows('public.weak_topics');

-- ─── Flashcards ─────────────────────────────────────────────────────────────
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  subject text not null,
  created_at timestamptz not null default now()
);
select public.own_rows('public.decks');

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  q text not null check (char_length(q) between 1 and 500),
  a text not null check (char_length(a) between 1 and 500),
  box int not null default 1 check (box between 1 and 5),
  due date not null default current_date,
  created_at timestamptz not null default now()
);
create index on public.cards (user_id, due);
create index on public.cards (deck_id);
select public.own_rows('public.cards');

-- ─── Notes ──────────────────────────────────────────────────────────────────
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  subject text not null,
  body text not null default '' check (char_length(body) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select public.own_rows('public.notes');
create trigger notes_touch before update on public.notes for each row execute function public.touch_updated_at();

-- ─── Tutor ──────────────────────────────────────────────────────────────────
create table public.tutor_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  subject text not null,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tutor_chats (user_id, updated_at desc);
select public.own_rows('public.tutor_chats');

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.tutor_chats on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  rating int check (rating in (-1, 1)),
  created_at timestamptz not null default now()
);
create index on public.tutor_messages (chat_id, created_at);
alter table public.tutor_messages enable row level security;
create policy "tutor_messages: read own" on public.tutor_messages for select using (user_id = auth.uid());
create policy "tutor_messages: delete own" on public.tutor_messages for delete using (user_id = auth.uid());
revoke insert, update on public.tutor_messages from anon, authenticated;

-- ─── Groups ─────────────────────────────────────────────────────────────────
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  type text not null check (type in ('Friend group', 'Private study group', 'Class group', 'Competition team')),
  code text not null unique,
  goal_hours int not null default 20 check (goal_hours between 1 and 500),
  created_by uuid references public.profiles on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on public.group_members (user_id);

create function public.is_group_member(p_group uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = p_group and user_id = auth.uid())
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
create policy "groups: members read" on public.groups for select using (public.is_group_member(id));
create policy "group_members: members read" on public.group_members for select using (public.is_group_member(group_id));
create policy "group_members: leave" on public.group_members for delete using (user_id = auth.uid());
revoke insert, update on public.groups, public.group_members from anon, authenticated;

create table public.group_announcements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid references public.profiles on delete set null,
  body text not null check (char_length(body) between 1 and 500),
  hidden boolean not null default false,
  reports int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.group_announcements (group_id, created_at desc);
alter table public.group_announcements enable row level security;
create policy "group_announcements: members read" on public.group_announcements for select using (public.is_group_member(group_id) and not hidden);
revoke insert, update, delete on public.group_announcements from anon, authenticated;

create table public.announcement_reports (
  announcement_id uuid not null references public.group_announcements on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);
alter table public.announcement_reports enable row level security;

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  kind text not null default 'papers',
  title text not null,
  starts_on date not null,
  ends_on date not null,
  winner_id uuid references public.profiles on delete set null,
  settled_at timestamptz,
  unique (group_id, starts_on, kind)
);
alter table public.challenges enable row level security;
create policy "challenges: members read" on public.challenges for select using (public.is_group_member(group_id));

-- Demo classmates for the demo group (dev/demo only; never real accounts).
create table public.demo_students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  username text not null,
  avatar_colour text not null,
  xp int not null,
  week_xp int not null,
  streak int not null,
  week_minutes int not null default 0,
  week_papers int not null default 0
);
alter table public.demo_students enable row level security;
create policy "demo_students: members read" on public.demo_students for select using (public.is_group_member(group_id));

-- ─── Billing and push ──────────────────────────────────────────────────────
create table public.subscriptions (
  user_id uuid primary key references public.profiles on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "subscriptions: read own" on public.subscriptions for select using (user_id = auth.uid());
revoke insert, update, delete on public.subscriptions from anon, authenticated;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);
select public.own_rows('public.push_subscriptions');

drop function public.own_rows(regclass);
