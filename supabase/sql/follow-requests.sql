-- ============================================================================
--  THESMALLBOOK · PRIVATE ACCOUNTS + FOLLOW REQUESTS
--  supabase/sql/follow-requests.sql
--
--  Run this ONCE in Supabase → SQL Editor → New query → paste → Run.
--  It is idempotent: running it twice changes nothing and breaks nothing.
--
--  WHY THIS FILE CANNOT CONTRADICT THE APP
--  ---------------------------------------------------------------------------
--  Everything below was written against the schema that is actually live:
--
--    public.profiles  : id, name, avatar_url, bio, is_public, links, progress, updated_at
--    public.follows   : follower_id, author_id, created_at          (NO id column)
--    public.posts     : id, author_id, author_name, author_avatar, title, body,
--                       cover_url, audio_url, tags, kind, subtitle, no_download, created_at
--
--  So this file:
--    • adds columns with IF NOT EXISTS  → the ones the app already uses are no-ops
--    • never renames or drops an existing column
--    • keeps `follows(follower_id, author_id)` exactly as the client writes it
--    • does NOT require the app to write `last_seen` — presence keeps riding the
--      existing `links` column, and last_seen is here only if you want it later
--
--  THE APP WORKS EITHER WAY
--  ---------------------------------------------------------------------------
--  Without this SQL the app uses its offline handshake (each side writes only
--  into its own profile row — safe, but slow to settle and easy to double up).
--  With this SQL, js/community.js detects `follow_requests` on first use and
--  switches to the server automatically. Nothing in the UI changes.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1 · the columns the client already reads and writes
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists is_public boolean not null default true;
alter table public.profiles add column if not exists prefs     jsonb   not null default '{}'::jsonb;
-- optional, not used by the UI today (presence rides `links`), safe to keep:
alter table public.profiles add column if not exists last_seen timestamptz;

comment on column public.profiles.is_public is
  'false = private account. Shown in People with a lock; strangers must request to follow.';
comment on column public.profiles.prefs is
  'Free-form client settings (theme, sounds). Never contains secrets.';


-- ---------------------------------------------------------------------------
-- 2 · follows: one row per relationship, never two, never to yourself
-- ---------------------------------------------------------------------------
-- a. clean up any duplicates that the links-era handshake may have created
delete from public.follows f
 using public.follows g
 where f.ctid < g.ctid
   and f.follower_id = g.follower_id
   and f.author_id  = g.author_id;

-- b. no self-follows
alter table public.follows drop constraint if exists follows_no_self;
alter table public.follows add  constraint follows_no_self check (follower_id <> author_id);

-- c. and no duplicates ever again (this is the constraint the app relies on)
create unique index if not exists follows_one_per_pair
  on public.follows (follower_id, author_id);

create index if not exists follows_by_author   on public.follows (author_id);
create index if not exists follows_by_follower on public.follows (follower_id);


-- ---------------------------------------------------------------------------
-- 3 · the request table
-- ---------------------------------------------------------------------------
create table if not exists public.follow_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users (id) on delete cascade,
  target_id     uuid not null references auth.users (id) on delete cascade,
  status        text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  constraint follow_requests_no_self check (requester_id <> target_id)
);

-- one row per direction, forever: re-requesting updates that same row
create unique index if not exists follow_requests_pair
  on public.follow_requests (requester_id, target_id);
create index if not exists follow_requests_inbox
  on public.follow_requests (target_id) where status = 'pending';
create index if not exists follow_requests_sent
  on public.follow_requests (requester_id) where status = 'pending';

comment on table public.follow_requests is
  'A private account only gains a follower once its owner accepts. Declined rows stay as history.';


-- ⚠️  HEADS-UP ON EXISTING POLICIES
-- PostgreSQL ORs permissive policies together: if your project already has a
-- policy on `follows` under a different name, it stays in force alongside the
-- ones below. To see what is already there, run this on its own first:
--
--   select tablename, policyname, cmd, qual from pg_policies
--    where schemaname = 'public' and tablename in ('follows','profiles');
--
-- The policies below are named tsb_* so they are easy to spot and safe to
-- drop later without touching yours.

-- ---------------------------------------------------------------------------
-- 4 · row level security — strictest thing that still lets the app work
-- ---------------------------------------------------------------------------
alter table public.follow_requests enable row level security;

drop policy if exists tsb_requests_read on public.follow_requests;
drop policy if exists follow_requests_read on public.follow_requests;
create policy tsb_requests_read on public.follow_requests
  for select using (auth.uid() = requester_id or auth.uid() = target_id);

-- Nobody inserts or updates this table directly: a client could otherwise
-- claim a request came from somebody else. All writes go through the
-- SECURITY DEFINER functions below, which set the identity from auth.uid().
drop policy if exists tsb_requests_write on public.follow_requests;
drop policy if exists follow_requests_write on public.follow_requests;
create policy tsb_requests_write on public.follow_requests
  for all using (false) with check (false);

-- follows: you may always see who follows whom, but you can only ever write
-- a row whose follower is YOU.
alter table public.follows enable row level security;

drop policy if exists tsb_follows_read on public.follows;
drop policy if exists follows_read on public.follows;
create policy tsb_follows_read on public.follows for select using (true);

drop policy if exists tsb_follows_insert on public.follows;
drop policy if exists follows_insert_self on public.follows;
create policy tsb_follows_insert on public.follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists tsb_follows_delete on public.follows;
drop policy if exists follows_delete_self on public.follows;
create policy tsb_follows_delete on public.follows
  for delete using (auth.uid() = follower_id);


-- ---------------------------------------------------------------------------
-- 4b · table privileges.
-- RLS decides WHICH ROWS a role may touch; GRANT decides whether the role may
-- touch the table at all. Supabase normally ships both, but a project that was
-- set up by hand (or a table created by an earlier migration) can be missing
-- the grant, and then every query fails with "permission denied for table".
-- Idempotent, and guarded so it never fails on a project without the roles.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant usage  on schema public to anon;
    grant select on public.profiles, public.follows to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema public to authenticated;
    grant select, insert, update on public.profiles to authenticated;
    grant select, insert, delete on public.follows to authenticated;
    grant select on public.follow_requests   to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant all on public.profiles, public.follows, public.follow_requests to service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5 · the three calls the app makes
--     request_follow(target)            -> 'following' | 'requested' | 'accepted'
--     respond_follow_request(target, ok)-> 'accepted'  | 'declined'
--     cancel_follow_request(target)     -> 'cancelled'
-- ---------------------------------------------------------------------------
create or replace function public.request_follow(target uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me      uuid := auth.uid();
  is_pub  boolean;
  mutual  boolean := false;
begin
  if me is null then raise exception 'not signed in'; end if;
  if me = target then return 'self'; end if;

  select is_public into is_pub from public.profiles where id = target;
  if is_pub is null then return 'no-user'; end if;

  -- a public account: follow immediately, no ceremony
  if is_pub then
    insert into public.follows (follower_id, author_id)
      values (me, target)
      on conflict do nothing;
    update public.follow_requests set status = 'accepted', responded_at = now()
      where requester_id = me and target_id = target and status = 'pending';
    return 'following';
  end if;

  -- they already asked me? then this is a mutual yes — connect both ways
  select exists (
    select 1 from public.follow_requests
    where requester_id = target and target_id = me and status = 'pending'
  ) into mutual;

  if mutual then
    update public.follow_requests set status = 'accepted', responded_at = now()
      where requester_id = target and target_id = me and status = 'pending';
    insert into public.follows (follower_id, author_id)
      values (me, target), (target, me)
      on conflict do nothing;
    return 'accepted';
  end if;

  -- a private account: leave a request they can accept from any device
  insert into public.follow_requests (requester_id, target_id, status, created_at, responded_at)
    values (me, target, 'pending', now(), null)
    on conflict (requester_id, target_id)
    do update set status = 'pending', created_at = now(), responded_at = null;

  return 'requested';
end;
$$;

create or replace function public.respond_follow_request(target uuid, accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  hit int;
begin
  if me is null then raise exception 'not signed in'; end if;

  update public.follow_requests
     set status = case when accept then 'accepted' else 'declined' end,
         responded_at = now()
   where requester_id = target and target_id = me and status = 'pending';
  get diagnostics hit = row_count;
  if hit = 0 then return 'nothing-to-do'; end if;

  if accept then
    insert into public.follows (follower_id, author_id)
      values (target, me)
      on conflict do nothing;
    return 'accepted';
  end if;
  return 'declined';
end;
$$;

create or replace function public.cancel_follow_request(target uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  update public.follow_requests
     set status = 'cancelled', responded_at = now()
   where requester_id = me and target_id = target and status = 'pending';
  return 'cancelled';
end;
$$;

create or replace function public.unfollow(target uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from public.follows where follower_id = me and author_id = target;
  -- wiping a relationship also clears any stale request in that direction
  update public.follow_requests set status = 'cancelled', responded_at = now()
    where requester_id = me and target_id = target and status = 'pending';
  return 'unfollowed';
end;
$$;

-- only signed-in users may call them, and only as themselves
revoke all on function public.request_follow(uuid)          from public;
revoke all on function public.respond_follow_request(uuid, boolean) from public;
revoke all on function public.cancel_follow_request(uuid)    from public;
revoke all on function public.unfollow(uuid)                 from public;
grant execute on function public.request_follow(uuid)          to authenticated;
grant execute on function public.respond_follow_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_follow_request(uuid)    to authenticated;
grant execute on function public.unfollow(uuid)                 to authenticated;


-- ---------------------------------------------------------------------------
-- 6 · who is waiting on me, in one call (handy for the bell badge)
-- ---------------------------------------------------------------------------
-- a view, not a function: it runs with the caller's rights, so the RLS
-- policy above already restricts it to the rows that belong to you.
create or replace view public.my_follow_requests as
  select r.id as request_id, r.requester_id,
         coalesce(p.name, 'A reader') as name, p.avatar_url,
         r.created_at
    from public.follow_requests r
    left join public.profiles p on p.id = r.requester_id
   where r.target_id = auth.uid() and r.status = 'pending';


-- the inbox view is created above; grant it now that it exists
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.my_follow_requests to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.my_follow_requests to service_role;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 7 · keep updated_at honest, and mirror last_seen if you ever want it
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- 8 · verify (run these two lines on their own to check it worked)
-- ---------------------------------------------------------------------------
-- select * from public.my_follow_requests();
-- select count(*) as pending_for_me from public.follow_requests where target_id = auth.uid() and status = 'pending';
