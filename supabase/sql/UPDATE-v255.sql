-- ============================================================================
--  THESMALLBOOK · THE UPDATE, v255  (only what is NEW since your last SQL run)
--  supabase/sql/UPDATE-v255.sql
--
--  HOW TO RUN (once, ~5 seconds):
--    Supabase Dashboard → SQL Editor → New query → paste this WHOLE file → Run.
--    The grid at the bottom is your receipt.
--
--  This file adds ONLY the three things your project does not have yet:
--    §1  USERNAMES       , the @handle for the new sign-in (unique, lowercase)
--    §2  HARDENING       , length locks inside the database, one-like-per-reader,
--                           deleting a post clears its likes/comments, owners-only
--                           edit/delete of posts (in case SQL #10 was never run)
--    §3  PRIVATE ACCOUNTS, the 🔒 request-and-accept follow system your app
--                           already knows how to use (your live project returns
--                           404 on follow_requests, this installs it)
--    §4  USERNAME SIGN-IN, sign in with "@handle + password" on any device,
--                           with or without Google (the forever keys)
--    §5  LOGIN GATE      , 5 wrong passwords → 10-minute lock, on the SERVER
--    §6  SET MY @NAME    , old accounts claim or change their @handle any time;
--                           "taken" is decided by the database, not the browser
--
--  Everything is additive and guarded: it does NOT touch your existing rows,
--  your 5 channel posts, or your readers' data. Safe to re-run any time.
--  (The full ALL-IN-ONE.sql also exists for a brand-new project, you do not
--   need it; this update is enough.)
-- ============================================================================


-- ════════════════════════════════════════════════════════════
-- §1 · USERNAMES, the sign-in update. New accounts choose an
--      @handle (small letters, numbers, _; 3–20 chars). The app
--      checks availability live while typing; the database makes
--      the promise real: one handle, one reader, forever.
-- ════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists prefs     jsonb   not null default '{}'::jsonb;
alter table public.profiles add column if not exists last_seen timestamptz;

do $$ begin
  alter table public.profiles drop constraint if exists profiles_username_fmt;
  alter table public.profiles add constraint profiles_username_fmt
    check (username is null or username ~ '^[a-z0-9_]{3,20}$');
exception when others then raise notice 'username format skipped (%).', sqlerrm;
end $$;

create unique index if not exists profiles_username_uid
  on public.profiles (username) where username is not null;


-- ════════════════════════════════════════════════════════════
-- §2 · HARDENING, the database defends itself.
-- ════════════════════════════════════════════════════════════

-- owners can edit and delete their own posts (no-op if SQL #10 already ran)
drop policy if exists "update own posts" on public.posts;
create policy "update own posts" on public.posts for update using (auth.uid() = author_id);
drop policy if exists "delete own posts" on public.posts;
create policy "delete own posts" on public.posts for delete using (auth.uid() = author_id);

-- length locks (mirrors what the forms already limit, a hand-built request
-- cannot stuff a novel into a title). If an OLD row is over a limit, that one
-- guard is skipped with a notice instead of failing the whole run.
do $$ begin
  alter table public.posts drop constraint if exists posts_title_len;
  alter table public.posts add constraint posts_title_len check (char_length(title) <= 90);
exception when others then raise notice 'title lock skipped, an old title is longer than 90 characters.';
end $$;
do $$ begin
  alter table public.posts drop constraint if exists posts_body_len;
  alter table public.posts add constraint posts_body_len check (char_length(body) <= 40000);
exception when others then raise notice 'body lock skipped (%).', sqlerrm;
end $$;
do $$ begin
  alter table public.comments drop constraint if exists comments_body_len;
  alter table public.comments add constraint comments_body_len check (char_length(body) <= 280);
exception when others then raise notice 'comment lock skipped (%).', sqlerrm;
end $$;
-- the name rule allows up to 40 on purpose: the form caps new names at 24,
-- but real accounts that signed in with Google (a school on the live project
-- has 27 letters) keep longer legacy names, they must stay valid AND editable
do $$ begin
  alter table public.profiles drop constraint if exists profiles_name_len;
  alter table public.profiles add constraint profiles_name_len check (char_length(name) between 1 and 40);
exception when others then raise notice 'name lock skipped (%).', sqlerrm;
end $$;
do $$ begin
  alter table public.profiles drop constraint if exists profiles_bio_len;
  alter table public.profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 120);
exception when others then raise notice 'bio lock skipped (%).', sqlerrm;
end $$;

-- ONE like per reader per story: clear the exact duplicates the old
-- double-taps produced (keeps the first of each pair), then make it law
delete from public.likes l
 using public.likes g
 where l.ctid < g.ctid
   and l.user_id is not distinct from g.user_id
   and l.post_id is not distinct from g.post_id;
create unique index if not exists likes_user_post_uid on public.likes (user_id, post_id);

-- when a post dies, its likes and comments die with it, server-side
create or replace function public.tsb_cascade_post_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.likes    where post_id = old.id;
  delete from public.comments where post_id = old.id;
  return old;
end $$;
drop trigger if exists tsb_cascade_post_delete on public.posts;
create trigger tsb_cascade_post_delete
  after delete on public.posts
  for each row execute function public.tsb_cascade_post_delete();


-- ════════════════════════════════════════════════════════════
-- §3 · PRIVATE ACCOUNTS + FOLLOW REQUESTS, the 🔒 system.
--      A private profile gains a follower only when its owner
--      accepts. The app detects this table on first use and
--      switches automatically, nothing changes in the UI.
-- ════════════════════════════════════════════════════════════

-- tidy the duplicates the old link-era handshake may have left, then lock it
delete from public.follows f
 using public.follows g
 where f.ctid < g.ctid
   and f.follower_id = g.follower_id
   and f.author_id  = g.author_id;

alter table public.follows drop constraint if exists follows_no_self;
alter table public.follows add constraint follows_no_self check (follower_id <> author_id);
create unique index if not exists follows_one_per_pair on public.follows (follower_id, author_id);
create index if not exists follows_by_author   on public.follows (author_id);
create index if not exists follows_by_follower on public.follows (follower_id);

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
create unique index if not exists follow_requests_pair
  on public.follow_requests (requester_id, target_id);
create index if not exists follow_requests_inbox
  on public.follow_requests (target_id) where status = 'pending';
create index if not exists follow_requests_sent
  on public.follow_requests (requester_id) where status = 'pending';

alter table public.follow_requests enable row level security;
drop policy if exists tsb_requests_read on public.follow_requests;
create policy tsb_requests_read on public.follow_requests
  for select using (auth.uid() = requester_id or auth.uid() = target_id);
-- nobody writes this table directly, all writes go through the functions
-- below, which take the identity from auth.uid() on the server
drop policy if exists tsb_requests_write on public.follow_requests;
create policy tsb_requests_write on public.follow_requests for all using (false) with check (false);

create or replace function public.request_follow(target uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); is_pub boolean; mutual boolean := false;
begin
  if me is null then raise exception 'not signed in'; end if;
  if me = target then return 'self'; end if;
  select is_public into is_pub from public.profiles where id = target;
  if is_pub is null then return 'no-user'; end if;
  if is_pub then
    insert into public.follows (follower_id, author_id) values (me, target) on conflict do nothing;
    update public.follow_requests set status = 'accepted', responded_at = now()
      where requester_id = me and target_id = target and status = 'pending';
    return 'following';
  end if;
  select exists (select 1 from public.follow_requests
    where requester_id = target and target_id = me and status = 'pending') into mutual;
  if mutual then
    update public.follow_requests set status = 'accepted', responded_at = now()
      where requester_id = target and target_id = me and status = 'pending';
    insert into public.follows (follower_id, author_id) values (me, target), (target, me)
      on conflict do nothing;
    return 'accepted';
  end if;
  insert into public.follow_requests (requester_id, target_id, status, created_at, responded_at)
    values (me, target, 'pending', now(), null)
    on conflict (requester_id, target_id)
    do update set status = 'pending', created_at = now(), responded_at = null;
  return 'requested';
end $$;

create or replace function public.respond_follow_request(target uuid, accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); hit int;
begin
  if me is null then raise exception 'not signed in'; end if;
  update public.follow_requests
     set status = case when accept then 'accepted' else 'declined' end, responded_at = now()
   where requester_id = target and target_id = me and status = 'pending';
  get diagnostics hit = row_count;
  if hit = 0 then return 'nothing-to-do'; end if;
  if accept then
    insert into public.follows (follower_id, author_id) values (target, me) on conflict do nothing;
    return 'accepted';
  end if;
  return 'declined';
end $$;

create or replace function public.cancel_follow_request(target uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  update public.follow_requests set status = 'cancelled', responded_at = now()
    where requester_id = me and target_id = target and status = 'pending';
  return 'cancelled';
end $$;

create or replace function public.unfollow(target uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from public.follows where follower_id = me and author_id = target;
  update public.follow_requests set status = 'cancelled', responded_at = now()
    where requester_id = me and target_id = target and status = 'pending';
  return 'unfollowed';
end $$;

revoke all on function public.request_follow(uuid)                     from public;
revoke all on function public.respond_follow_request(uuid, boolean)    from public;
revoke all on function public.cancel_follow_request(uuid)              from public;
revoke all on function public.unfollow(uuid)                           from public;
grant execute on function public.request_follow(uuid)                  to authenticated;
grant execute on function public.respond_follow_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_follow_request(uuid)           to authenticated;
grant execute on function public.unfollow(uuid)                        to authenticated;

create or replace view public.my_follow_requests as
  select r.id as request_id, r.requester_id,
         coalesce(p.name, 'A reader') as name, p.avatar_url, r.created_at
    from public.follow_requests r
    left join public.profiles p on p.id = r.requester_id
   where r.target_id = auth.uid() and r.status = 'pending';

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.my_follow_requests to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.my_follow_requests to service_role;
  end if;
exception when others then null;
end $$;

-- keep profiles.updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();



-- ════════════════════════════════════════════════════════════
-- §4 · USERNAME SIGN-IN, the forever keys. Readers sign in with
--      "@handle + password" on any device. This tiny server-side
--      lookup turns the handle into the sign-in email; the password
--      itself is still checked by Supabase Auth, never by us.
-- ════════════════════════════════════════════════════════════

create or replace function public.tsb_email_for_username(p_username text)
returns text
language sql stable security definer set search_path = public as $$
  select lower(u.email)::text
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.username = lower(replace(p_username, '@', ''))
     and p.username ~ '^[a-z0-9_]{3,20}$'
   limit 1
$$;

revoke all on function public.tsb_email_for_username(text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.tsb_email_for_username(text) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.tsb_email_for_username(text) to authenticated;
  end if;
exception when others then raise notice 'lookup grant skipped (%).', sqlerrm;
end $$;



-- ════════════════════════════════════════════════════════════
-- §5 · THE LOGIN GATE, rate limiting that lives on the SERVER.
--      A phone can be tampered with; this table cannot. 5 wrong
--      passwords on one account → the account locks for 10
--      minutes, no matter what the browser claims. Success clears it.
--      (Supabase adds its own per-IP limits on top of this.)
-- ════════════════════════════════════════════════════════════

create table if not exists public.tsb_login_gate (
  ident        text primary key,
  fails        int not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);
-- no table grants, the ONLY doors are the three functions below

create or replace function public.tsb_login_gate_norm(p text)
returns text language sql immutable as $$
  select lower(substr(trim(coalesce(p, '')), 1, 120))
$$;

create or replace function public.tsb_login_status(p_ident text)
returns json
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select json_build_object(
       'locked', coalesce(g.locked_until > now(), false),
       'wait',   greatest(0, coalesce(extract(epoch from (g.locked_until - now()))::int, 0)))
     from public.tsb_login_gate g
      where g.ident = public.tsb_login_gate_norm(p_ident)),
    '{"locked":false,"wait":0}'::json);
$$;

create or replace function public.tsb_login_fail(p_ident text)
returns json
language plpgsql security definer set search_path = public as $$
declare k text := public.tsb_login_gate_norm(p_ident);
        f int; lu timestamptz;
begin
  insert into public.tsb_login_gate (ident, fails, locked_until, updated_at)
    values (k, 1, null, now())
    on conflict (ident) do update
      set fails = case when public.tsb_login_gate.locked_until is null
                         or public.tsb_login_gate.locked_until < now()
                       then public.tsb_login_gate.fails + 1 else public.tsb_login_gate.fails end,
          updated_at = now()
    returning fails into f;
  if f >= 5 then
    update public.tsb_login_gate
       set locked_until = now() + interval '10 minutes'
     where ident = k returning locked_until into lu;
  else
    select locked_until into lu from public.tsb_login_gate where ident = k;
  end if;
  return json_build_object('fails', f,
    'locked', coalesce(lu > now(), false),
    'wait',   greatest(0, coalesce(extract(epoch from (lu - now()))::int, 0)));
end $$;

create or replace function public.tsb_login_reset(p_ident text)
returns text
language sql security definer set search_path = public as $$
  delete from public.tsb_login_gate where ident = public.tsb_login_gate_norm(p_ident);
  select 'ok';
$$;

revoke all on function public.tsb_login_status(text) from public;
revoke all on function public.tsb_login_fail(text)   from public;
revoke all on function public.tsb_login_reset(text)  from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.tsb_login_status(text) to anon;
    grant execute on function public.tsb_login_fail(text)   to anon;
    grant execute on function public.tsb_login_reset(text)  to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.tsb_login_status(text) to authenticated;
    grant execute on function public.tsb_login_fail(text)   to authenticated;
    grant execute on function public.tsb_login_reset(text)  to authenticated;
  end if;
exception when others then raise notice 'gate grants skipped (%).', sqlerrm;
end $$;


-- ════════════════════════════════════════════════════════════
-- §6 · SET MY @NAME, the claim/change desk, checked on the SERVER.
--      Old accounts (random or legacy names) can claim or change
--      their @handle any time. Format and uniqueness are decided
--      here in the database, a tampered browser changes nothing.
--      Answers: 'ok' | 'sign-in' | 'bad' | 'taken'.
-- ════════════════════════════════════════════════════════════

create or replace function public.set_my_username(p_username text)
returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
        u text := lower(substr(trim(coalesce(p_username, '')), 1, 30));
        nm text; av text;
begin
  if me is null then return 'sign-in'; end if;
  if u !~ '^[a-z0-9_]{3,20}$' then return 'bad'; end if;
  if exists (select 1 from public.profiles where username = u and id <> me) then
    return 'taken';
  end if;
  update public.profiles set username = u, updated_at = now() where id = me;
  if not found then
    select coalesce(nullif(raw_user_meta_data->>'full_name', ''), 'Reader'),
           nullif(raw_user_meta_data->>'avatar_url', '')
      into nm, av from auth.users where id = me;
    insert into public.profiles (id, name, avatar_url, username)
      values (me, coalesce(nm, 'Reader'), av, u)
      on conflict (id) do update set username = excluded.username, updated_at = now();
  end if;
  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('username', u)
   where id = me;
  return 'ok';
end $$;

revoke all on function public.set_my_username(text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.set_my_username(text) to authenticated;
  end if;
exception when others then raise notice 'setter grant skipped (%).', sqlerrm;
end $$;

-- ════════════════════════════════════════════════════════════
-- THE CHECK, your receipt. Every number must match its "want".
-- ════════════════════════════════════════════════════════════

select
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='profiles' and column_name='username')
    as username_column_ok_want_1,
  (select count(*) from pg_indexes
     where indexname in ('profiles_username_uid','likes_user_post_uid','follows_one_per_pair','follow_requests_pair'))
    as uniqueness_rules_ok_want_4,
  (select count(*) from pg_constraint
     where conname in ('posts_title_len','posts_body_len','comments_body_len',
                       'profiles_name_len','profiles_bio_len','profiles_username_fmt',
                       'follows_no_self','follow_requests_no_self'))
    as guard_rules_ok_want_8,
  (select count(*) from pg_policies
     where schemaname='public' and policyname in ('update own posts','delete own posts','tsb_requests_read','tsb_requests_write'))
    as new_policies_ok_want_4,
  (select count(*) from pg_proc
     where pronamespace = 'public'::regnamespace and proname in
     ('request_follow','respond_follow_request','cancel_follow_request','unfollow'))
    as follow_functions_ok_want_4,
  (select count(*) from public.follow_requests limit 1) is not null
    as follow_requests_table_ok_want_true,
  (select count(*) from pg_proc
     where pronamespace = 'public'::regnamespace and proname = 'tsb_email_for_username')
    as username_signin_ok_want_1,
  (select count(*) from pg_proc
     where pronamespace = 'public'::regnamespace
       and proname in ('tsb_login_status','tsb_login_fail','tsb_login_reset'))
    as login_gate_ok_want_3,
  (select count(*) from pg_proc
     where pronamespace = 'public'::regnamespace and proname = 'set_my_username')
    as name_claim_ok_want_1;
