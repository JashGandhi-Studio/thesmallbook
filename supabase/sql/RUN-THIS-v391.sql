-- ══════════════════════════════════════════════════════════════════
-- RUN-THIS-v391.sql   TheSmallBook   the five functions the app calls
--
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to run twice, safe to run on a project that already has some of it.
--
-- Why it exists: the app asks the database five questions, and on this
-- project three of them had never been created, because their SQL sat in
-- update files (v331, v349) that were written after ALL-IN-ONE.sql.
-- The reader-visible result was an @username sign-in that could never work
-- and a one-time-code screen that could never be sent.
--
--   username_available(u)        is this @handle free?
--   tsb_email_for_username(p)    @handle -> email, for sign-in
--   set_my_username(p)           claim a handle (signed-in readers only)
--   tsb_otp_gate(p)              may I email a code? {allowed, wait, left}
--   tsb_otp_reset(p)             forget this identifier's rate limit
-- ══════════════════════════════════════════════════════════════════

-- 1. the rate-limit ledger the two otp functions need ---------------
create table if not exists public.otp_gate (
  ident      text primary key,
  n          int  not null default 0,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now()
);

alter table public.otp_gate enable row level security;
-- no policies on purpose: only the security-definer functions may touch it.


-- 2. the five functions ---------------------------------------------
-- is this handle free?  (v331)

create or replace function public.username_available(u text)
returns boolean language sql security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(u));
$$;

-- @handle -> email, so a reader can sign in with a username  (v255)

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

-- claim a handle; signed-in readers only  (v255)

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

-- may I send a code?  returns {allowed, wait, left}  (v349)

create or replace function public.tsb_otp_gate(p_ident text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k        text := lower(trim(coalesce(p_ident, '')));
  COOL     constant int := 60;      -- seconds between requests
  PER_HOUR constant int := 6;       -- requests allowed in an hour
  row_     public.otp_gate;
  gap      int;
begin
  if k = '' or position('@' in k) = 0 then
    return jsonb_build_object('allowed', false, 'wait', 0, 'left', 0);
  end if;

  select * into row_ from public.otp_gate where ident = k;

  if row_.ident is null then
    insert into public.otp_gate (ident, n, first_at, last_at)
    values (k, 1, now(), now())
    on conflict (ident) do update set n = 1, first_at = now(), last_at = now();
    return jsonb_build_object('allowed', true, 'wait', 0, 'left', PER_HOUR - 1);
  end if;

  -- hour has rolled over: start a fresh window
  if now() - row_.first_at > interval '1 hour' then
    update public.otp_gate set n = 1, first_at = now(), last_at = now() where ident = k;
    return jsonb_build_object('allowed', true, 'wait', 0, 'left', PER_HOUR - 1);
  end if;

  -- too many in this hour: refuse, and say roughly how long
  if row_.n >= PER_HOUR then
    return jsonb_build_object(
      'allowed', false,
      'wait', greatest(1, ceil(extract(epoch from (row_.first_at + interval '1 hour' - now()))))::int,
      'left', 0);
  end if;

  -- the 60-second breath between two requests
  gap := greatest(0, ceil(extract(epoch from (now() - row_.last_at))))::int;
  if gap < COOL then
    return jsonb_build_object('allowed', false, 'wait', COOL - gap, 'left', PER_HOUR - row_.n);
  end if;

  update public.otp_gate set n = n + 1, last_at = now() where ident = k;
  return jsonb_build_object('allowed', true, 'wait', 0, 'left', PER_HOUR - row_.n - 0);
end;
$$;

-- forget this identifier's rate limit  (v349)

create or replace function public.tsb_otp_reset(p_ident text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.otp_gate where ident = lower(trim(coalesce(p_ident, '')));
end;
$$;

-- 3. who may call them ----------------------------------------------
-- Every grant is guarded: a fresh project without the anon or
-- authenticated roles must not stop the rest of this file from running.
revoke all on function public.username_available(text)       from public;
revoke all on function public.tsb_email_for_username(text)   from public;
revoke all on function public.set_my_username(text)          from public;
revoke all on function public.tsb_otp_gate(text)             from public;
revoke all on function public.tsb_otp_reset(text)            from public;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.username_available(text)     to anon;
    grant execute on function public.tsb_email_for_username(text) to anon;
    grant execute on function public.tsb_otp_gate(text)           to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.username_available(text)     to authenticated;
    grant execute on function public.tsb_email_for_username(text) to authenticated;
    grant execute on function public.set_my_username(text)        to authenticated;
    grant execute on function public.tsb_otp_gate(text)           to authenticated;
    grant execute on function public.tsb_otp_reset(text)          to authenticated;
  end if;
exception when others then raise notice 'role grants skipped (%).', sqlerrm;
end $$;


-- 4. your receipt: all five names must be listed ---------------------
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace
   and p.proname in ('username_available','tsb_email_for_username',
                     'set_my_username','tsb_otp_gate','tsb_otp_reset')
 order by 1;
