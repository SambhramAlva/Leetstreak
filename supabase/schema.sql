-- LeetStreak database schema
-- Run this whole file once in the Supabase SQL editor.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- PROFILES  (1 row per auth user)
-- ============================================================================
create table if not exists profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  username          text unique not null,
  display_name      text,
  avatar_url        text,
  leetcode_username text,                      -- null until they connect LeetCode
  timezone          text not null default 'UTC',
  reminder_hour     smallint not null default 20 check (reminder_hour between 0 and 23),
  reminder_minute   smallint not null default 0 check (reminder_minute between 0 and 59),
  reminder_enabled  boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ============================================================================
-- GROUPS
-- ============================================================================
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique not null,             -- short human-typeable code, e.g. "FOX-482"
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);

create table if not exists group_members (
  group_id  uuid not null references groups(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists idx_group_members_user on group_members(user_id);

-- ============================================================================
-- LEETCODE SOLVES  (source of truth — one row per problem ever solved)
-- ============================================================================
create table if not exists leetcode_solves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title_slug  text not null,
  title       text not null,
  difficulty  text check (difficulty in ('Easy', 'Medium', 'Hard')),
  solved_at   timestamptz not null,
  synced_at   timestamptz not null default now(),
  unique (user_id, title_slug)
);

create index if not exists idx_solves_user_date on leetcode_solves(user_id, solved_at desc);

-- ============================================================================
-- STREAKS  (small cached/derived table, recomputed by the sync function)
-- ============================================================================
create table if not exists streaks (
  user_id         uuid primary key references profiles(id) on delete cascade,
  current_streak  integer not null default 0,
  longest_streak  integer not null default 0,
  last_solved_date date,
  total_solved    integer not null default 0,
  updated_at      timestamptz not null default now()
);

-- ============================================================================
-- PROBLEM OF THE DAY  (per group, per date)
-- ============================================================================
create table if not exists problem_of_the_day (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  date        date not null,
  title_slug  text not null,
  title       text not null,
  url         text not null,
  proposed_by uuid not null references profiles(id),
  created_at  timestamptz not null default now(),
  unique (group_id, date)
);

create table if not exists potd_solves (
  potd_id   uuid not null references problem_of_the_day(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  solved_at timestamptz not null default now(),
  primary key (potd_id, user_id)
);

-- ============================================================================
-- CHAT
-- ============================================================================
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 2000),
  potd_date   date,                              -- which day's POTD this message is under (nullable = general)
  created_at  timestamptz not null default now()
);

create index if not exists idx_messages_group_date on messages(group_id, created_at desc);

-- ============================================================================
-- PUSH TOKENS
-- ============================================================================
create table if not exists push_tokens (
  user_id          uuid not null references profiles(id) on delete cascade,
  expo_push_token  text not null,
  updated_at       timestamptz not null default now(),
  primary key (user_id, expo_push_token)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table leetcode_solves enable row level security;
alter table streaks enable row level security;
alter table problem_of_the_day enable row level security;
alter table potd_solves enable row level security;
alter table messages enable row level security;
alter table push_tokens enable row level security;

-- helper: is the current user a member of a given group?
create or replace function is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- PROFILES: anyone can read basic profile info of people in a shared group;
-- everyone can read/update their own profile.
create policy "profiles: read own" on profiles for select
  using (id = auth.uid());
create policy "profiles: read groupmates" on profiles for select
  using (exists (
    select 1 from group_members gm1
    join group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = profiles.id and gm2.user_id = auth.uid()
  ));
create policy "profiles: update own" on profiles for update
  using (id = auth.uid());
create policy "profiles: insert own" on profiles for insert
  with check (id = auth.uid());

-- GROUPS: members can read their groups; any authenticated user can create one.
create policy "groups: read if member" on groups for select
  using (is_group_member(id));
-- Needed so the app can read back a group right after creating it, before the
-- follow-up group_members insert has happened (createGroup() does INSERT ...
-- RETURNING on `groups`, which needs a matching SELECT policy to succeed).
create policy "groups: read if creator" on groups for select
  using (created_by = auth.uid());
create policy "groups: create" on groups for insert
  with check (created_by = auth.uid());

-- GROUP_MEMBERS: members can see the membership list of their own groups;
-- a user can insert their own membership row (join flow uses the invite code
-- to look up the group id first, via a SECURITY DEFINER RPC — see below).
create policy "members: read if in group" on group_members for select
  using (is_group_member(group_id));
create policy "members: insert self" on group_members for insert
  with check (user_id = auth.uid());

-- LEETCODE_SOLVES: a user can read their own solves, and solves of anyone who
-- shares a group with them (so streak/today cards render for teammates).
create policy "solves: read own or groupmates" on leetcode_solves for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = leetcode_solves.user_id and gm2.user_id = auth.uid()
    )
  );
-- writes only via the service role (Edge Function), never directly from the app.

-- STREAKS: same visibility rule as solves.
create policy "streaks: read own or groupmates" on streaks for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = streaks.user_id and gm2.user_id = auth.uid()
    )
  );

-- PROBLEM_OF_THE_DAY: members can read/propose for their own groups.
create policy "potd: read if member" on problem_of_the_day for select
  using (is_group_member(group_id));
create policy "potd: insert if member" on problem_of_the_day for insert
  with check (is_group_member(group_id) and proposed_by = auth.uid());

-- POTD_SOLVES: members can read; a user can only mark themself as solved.
create policy "potd_solves: read if member" on potd_solves for select
  using (exists (
    select 1 from problem_of_the_day p where p.id = potd_id and is_group_member(p.group_id)
  ));
create policy "potd_solves: insert self" on potd_solves for insert
  with check (user_id = auth.uid());

-- MESSAGES: members can read/write within their own groups.
create policy "messages: read if member" on messages for select
  using (is_group_member(group_id));
create policy "messages: insert if member" on messages for insert
  with check (is_group_member(group_id) and user_id = auth.uid());

-- PUSH_TOKENS: a user manages only their own tokens.
create policy "push_tokens: own" on push_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================================
-- RPC: join a group by invite code (runs as SECURITY DEFINER so a user can
-- look up a group by code without a standing "read all groups" policy).
-- ============================================================================
create or replace function join_group_by_code(code text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g groups;
begin
  select * into g from groups where invite_code = code;
  if g.id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return g;
end;
$$;

-- ============================================================================
-- Scheduling the sync cron with pg_cron (alternative to Dashboard cron UI):
-- ============================================================================
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'sync-leetcode-every-15-min',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://<project-ref>.functions.supabase.co/sync-leetcode',
--     headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
--   );
--   $$
-- );
