-- StudyPilot core schema.
-- Conventions: every user-owned table has user_id → profiles(id) and RLS "own rows only".
-- Columns that affect scoring or access (xp, streak, role, beta, plan) are only writable
-- through security-definer functions called by the server with the service role.

create extension if not exists pgcrypto with schema extensions;

-- ─── Config ─────────────────────────────────────────────────────────────────
create table public.admin_emails (
  email text primary key
);
alter table public.admin_emails enable row level security;

-- ─── Beta codes ─────────────────────────────────────────────────────────────
create table public.beta_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(code) between 4 and 32),
  max_uses int not null check (max_uses between 1 and 500),
  uses int not null default 0 check (uses >= 0),
  active boolean not null default true,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
alter table public.beta_codes enable row level security;

-- ─── Profiles ───────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  username text unique check (username ~ '^[A-Za-z0-9._]{3,20}$'),
  avatar_colour text not null default '#2F7BF5',
  avatar_url text,
  year_level text,
  country text,
  system text,
  subjects text[] not null default '{}',
  goal text check (char_length(goal) <= 120),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  language text not null default 'en' check (language in ('en', 'es', 'zh', 'vi', 'hi')),
  timezone text not null default 'Australia/Sydney',
  -- scoring (protected)
  xp int not null default 0,
  streak int not null default 0,
  last_study_date date,
  study_minutes int not null default 0,
  questions_answered int not null default 0,
  papers_completed int not null default 0,
  -- access (protected)
  role text not null default 'student' check (role in ('student', 'admin')),
  plan text not null default 'free' check (plan in ('free', 'premium', 'premium_exam')),
  beta_code_id uuid references public.beta_codes on delete set null,
  beta_joined_at timestamptz,
  beta_removed_at timestamptz,
  is_demo boolean not null default false,
  -- user choices
  launch_plan text check (launch_plan in ('free', 'premium', 'premium_exam')),
  onboarded_at timestamptz,
  privacy jsonb not null default '{"publicProfile": true, "showOnLeaderboards": true, "activity": "everyone", "friendRequests": "everyone"}',
  notif_prefs jsonb not null default '{"study": true, "motivation": true, "competition": true, "ai": true, "frequency": "normal", "reminderTime": "16:30", "quietStart": "22:00", "quietEnd": "07:00", "inApp": true, "push": false, "email": false}',
  plan_hours jsonb not null default '{"mon": 2, "tue": 2, "wed": 2, "thu": 2, "fri": 1.5, "sat": 3, "sun": 2.5}',
  weak_topics_seen int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_ci on public.profiles (lower(username));
alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles for select using (id = auth.uid());
create policy "profiles: update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Only safe columns are updatable by the user themselves.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, avatar_colour, avatar_url, year_level, country, system, subjects, goal, theme, language, timezone,
              launch_plan, privacy, notif_prefs, plan_hours) on public.profiles to authenticated;

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Create a profile for every new auth user; allow-listed emails become admins.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email,
          case when exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email)) then 'admin' else 'student' end)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Keep profile email in sync (used only by admins; never exposed to other students).
create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end $$;
create trigger on_auth_user_email after update of email on auth.users for each row execute function public.handle_user_email_change();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create function public.has_beta() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select beta_joined_at is not null and beta_removed_at is null from public.profiles where id = auth.uid()), false)
$$;

-- Public view: the only profile fields other students may see.
create view public.public_profiles with (security_barrier) as
select p.id, p.username, p.avatar_colour, p.avatar_url, p.xp, p.streak, p.last_study_date,
       (p.beta_joined_at is not null and p.beta_removed_at is null) as is_beta,
       coalesce((p.privacy ->> 'publicProfile')::boolean, true) as public_profile,
       coalesce((p.privacy ->> 'showOnLeaderboards')::boolean, true) as on_leaderboards
from public.profiles p
where p.username is not null;
grant select on public.public_profiles to authenticated;

-- ─── Login history ──────────────────────────────────────────────────────────
create table public.login_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  at timestamptz not null default now(),
  method text not null,
  device text,
  ip text
);
create index on public.login_history (user_id, at desc);
alter table public.login_history enable row level security;
create policy "login_history: read own" on public.login_history for select using (user_id = auth.uid());
revoke insert, update, delete on public.login_history from anon, authenticated;

-- ─── Rate limiting ──────────────────────────────────────────────────────────
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null
);
alter table public.rate_limits enable row level security;

-- Returns true if the call is allowed (and counts it), false if over the limit.
create function public.rate_limit_hit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.rate_limits;
begin
  insert into public.rate_limits as rl (key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.count + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning * into r;
  return r.count <= p_max;
end $$;

-- ─── Beta code redemption ───────────────────────────────────────────────────
create table public.beta_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  code text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index on public.beta_code_attempts (user_id, at desc);
alter table public.beta_code_attempts enable row level security;

-- ─── Notifications ──────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  category text not null check (category in ('study', 'motivation', 'competition', 'ai', 'beta')),
  title text not null,
  body text,
  href text,
  dedupe_key text,
  read_at timestamptz,
  emailed_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);
create unique index notifications_dedupe on public.notifications (user_id, dedupe_key) where dedupe_key is not null;
alter table public.notifications enable row level security;
create policy "notifications: read own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: mark own read" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, delete, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create function public.notify(p_user uuid, p_category text, p_title text, p_body text default null,
                              p_href text default null, p_dedupe text default null)
returns void language plpgsql security definer set search_path = public as $$
declare prefs jsonb;
begin
  select notif_prefs into prefs from public.profiles where id = p_user;
  -- Category switched off (beta messages always go through).
  if p_category <> 'beta' and coalesce((prefs ->> p_category)::boolean, true) = false then return; end if;
  insert into public.notifications (user_id, category, title, body, href, dedupe_key)
  values (p_user, p_category, p_title, p_body, p_href, p_dedupe)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end $$;

-- ─── Achievements ───────────────────────────────────────────────────────────
create table public.achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null,
  beta_only boolean not null default false,
  sort int not null
);
alter table public.achievements enable row level security;
create policy "achievements: readable" on public.achievements for select using (true);

create table public.user_achievements (
  user_id uuid not null references public.profiles on delete cascade,
  achievement_id text not null references public.achievements on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
alter table public.user_achievements enable row level security;
create policy "user_achievements: read own" on public.user_achievements for select using (user_id = auth.uid());
revoke insert, update, delete on public.user_achievements from anon, authenticated;

-- Returns true when newly unlocked.
create function public.grant_achievement(p_user uuid, p_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare a public.achievements;
begin
  insert into public.user_achievements (user_id, achievement_id) values (p_user, p_id) on conflict do nothing;
  if not found then return false; end if;
  select * into a from public.achievements where id = p_id;
  perform public.notify(p_user, 'motivation', 'Badge unlocked: ' || a.title, a.description, '/profile', 'ach:' || p_id);
  return true;
end $$;

-- ─── XP ─────────────────────────────────────────────────────────────────────
create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  amount int not null check (amount between 0 and 1000),
  reason text not null,
  ref text,
  day date not null,
  created_at timestamptz not null default now()
);
create index on public.xp_events (user_id, day);
create unique index xp_events_once on public.xp_events (user_id, reason, ref) where ref is not null;
alter table public.xp_events enable row level security;
create policy "xp_events: read own" on public.xp_events for select using (user_id = auth.uid());
revoke insert, update, delete on public.xp_events from anon, authenticated;

create function public.level_for(p_xp int) returns int language sql immutable as $$
  select floor(sqrt(greatest(p_xp, 0) / 40.0))::int + 1
$$;

-- Awards XP once per (reason, ref) when ref is given. Updates streak for study actions,
-- fires level-up, streak and XP milestone notifications, and level/streak badges.
create function public.award_xp(p_user uuid, p_amount int, p_reason text, p_ref text default null, p_study boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  today date;
  old_level int;
  new_level int;
  new_streak int;
  new_xp int;
  amt int := least(greatest(coalesce(p_amount, 0), 0), 1000);
begin
  select * into p from public.profiles where id = p_user for update;
  if not found then raise exception 'no profile'; end if;
  today := (now() at time zone p.timezone)::date;

  insert into public.xp_events (user_id, amount, reason, ref, day) values (p_user, amt, p_reason, p_ref, today)
  on conflict (user_id, reason, ref) where ref is not null do nothing;
  if not found then
    return jsonb_build_object('awarded', 0, 'xp', p.xp, 'level', public.level_for(p.xp), 'leveledUp', false, 'streak', p.streak, 'duplicate', true);
  end if;

  new_streak := p.streak;
  if p_study then
    if p.last_study_date is null or p.last_study_date < today - 1 then new_streak := 1;
    elsif p.last_study_date = today - 1 then new_streak := p.streak + 1;
    else new_streak := greatest(p.streak, 1);
    end if;
  end if;

  old_level := public.level_for(p.xp);
  new_xp := p.xp + amt;
  new_level := public.level_for(new_xp);

  update public.profiles set
    xp = new_xp,
    streak = new_streak,
    last_study_date = case when p_study then greatest(coalesce(p.last_study_date, today), today) else p.last_study_date end
  where id = p_user;

  if new_level > old_level then
    perform public.notify(p_user, 'motivation', 'Level ' || new_level || '! You''re flying now.', null, '/profile', 'level:' || new_level);
    if new_level >= 10 then perform public.grant_achievement(p_user, 'cruising_altitude'); end if;
  end if;
  if new_streak <> p.streak and new_streak in (3, 7, 14, 30, 50, 100) then
    perform public.notify(p_user, 'motivation', new_streak || '-day streak! Keep flying.', null, '/home', 'streak:' || new_streak || ':' || today);
  end if;
  if new_streak >= 7 then perform public.grant_achievement(p_user, 'streak_7'); end if;
  if floor(new_xp / 1000) > floor(p.xp / 1000) then
    perform public.notify(p_user, 'motivation', 'You passed ' || (floor(new_xp / 1000) * 1000)::int || ' XP!', null, '/progress', 'xpm:' || floor(new_xp / 1000));
  end if;

  return jsonb_build_object('awarded', amt, 'xp', new_xp, 'level', new_level, 'leveledUp', new_level > old_level,
                            'streak', new_streak, 'duplicate', false);
end $$;

-- ─── Feature visits (admin "most used features") ───────────────────────────
create table public.feature_visits (
  user_id uuid not null references public.profiles on delete cascade,
  feature text not null,
  day date not null,
  count int not null default 1,
  primary key (user_id, feature, day)
);
alter table public.feature_visits enable row level security;

-- ─── AI usage ───────────────────────────────────────────────────────────────
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles on delete set null,
  kind text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.ai_usage (user_id, created_at desc);
create index on public.ai_usage (created_at desc);
alter table public.ai_usage enable row level security;

-- ─── Beta feedback and announcements ────────────────────────────────────────
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete set null,
  category text not null check (category in ('Bug report', 'Feature request', 'AI accuracy', 'User experience', 'Performance issue', 'Practice paper')),
  rating int check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 4000),
  context jsonb,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Critical')),
  status text not null default 'New' check (status in ('New', 'Reviewing', 'Planned', 'Fixed', 'Won''t fix')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.feedback (user_id, created_at desc);
alter table public.feedback enable row level security;
create policy "feedback: read own" on public.feedback for select using (user_id = auth.uid());
revoke insert, update, delete on public.feedback from anon, authenticated;
create trigger feedback_touch before update on public.feedback for each row execute function public.touch_updated_at();

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 1000),
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "announcements: beta users read" on public.announcements for select using (public.has_beta() or public.is_admin());

-- ─── Beta redemption function (needs notifications + achievements) ─────────
create function public.redeem_beta_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  c public.beta_codes;
  norm text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  fails int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;

  select count(*) into fails from public.beta_code_attempts
  where user_id = uid and not ok and at > now() - interval '10 minutes';
  if fails >= 8 then return jsonb_build_object('ok', false, 'error', 'locked'); end if;

  select * into c from public.beta_codes where code = norm for update;
  if not found then
    insert into public.beta_code_attempts (user_id, code, ok) values (uid, left(norm, 40), false);
    return jsonb_build_object('ok', false, 'error', 'invalid', 'remaining', 7 - fails);
  end if;
  if not c.active then
    insert into public.beta_code_attempts (user_id, code, ok) values (uid, norm, false);
    return jsonb_build_object('ok', false, 'error', 'disabled');
  end if;
  -- Already joined through this code (e.g. retry): succeed without using another seat.
  if exists (select 1 from public.profiles where id = uid and beta_code_id = c.id and beta_removed_at is null and beta_joined_at is not null) then
    return jsonb_build_object('ok', true);
  end if;
  if c.uses >= c.max_uses then
    insert into public.beta_code_attempts (user_id, code, ok) values (uid, norm, false);
    return jsonb_build_object('ok', false, 'error', 'used_up');
  end if;

  update public.beta_codes set uses = uses + 1 where id = c.id;
  update public.profiles set beta_code_id = c.id, beta_joined_at = now(), beta_removed_at = null, plan = 'premium_exam'
  where id = uid;
  insert into public.beta_code_attempts (user_id, code, ok) values (uid, norm, true);
  perform public.grant_achievement(uid, 'beta_pioneer');
  perform public.notify(uid, 'beta', 'Welcome to the StudyPilot beta!',
    'Every feature is unlocked and free. Tell us what you think in Beta Feedback.', '/feedback', 'beta:welcome');
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.redeem_beta_code(text) from public, anon;
grant execute on function public.redeem_beta_code(text) to authenticated;

-- Lock down internal functions: only the server (service role) may call them.
revoke execute on function public.award_xp(uuid, int, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.grant_achievement(uuid, text) from public, anon, authenticated;
revoke execute on function public.notify(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.award_xp(uuid, int, text, text, boolean) to service_role;
grant execute on function public.grant_achievement(uuid, text) to service_role;
grant execute on function public.notify(uuid, text, text, text, text, text) to service_role;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
