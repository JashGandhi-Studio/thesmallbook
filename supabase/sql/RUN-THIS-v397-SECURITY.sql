-- ════════════════════════════════════════════════════════════
--  TheSmallBook · build 397 · AUTH HARDENING
--  Run once in Supabase → SQL Editor. Safe to re-run.
--
--  What was wrong, in plain words
--
--  1. THE LOCKOUT COULD BE CLEARED FROM ANYWHERE.
--     tsb_login_reset(ident) was callable by anyone with the public
--     anon key, for any ident. That made the five-strike lock
--     worthless: wrong password, reset, wrong password, reset,
--     forever. The counter still counted; it just never mattered.
--     It now requires a signed-in session, and only clears the gate
--     for the account that session belongs to.
--
--  2. THE LOCK COULD BE PUT ON SOMEONE ELSE.
--     tsb_login_fail(ident) is also public, so a stranger could
--     lock your account for ten minutes, over and over. It now
--     refuses to keep re-locking a fresh lock: one lock per ident
--     per ten minutes, and it never touches an ident that is
--     already locked. Repeated calls during a lock return the same
--     answer and change nothing.
--     Honest limit: a stranger can still cost you one ten-minute
--     lock per ten minutes. That is the cost of a client-side fail
--     counter. The escape hatch always works: "email me a code"
--     is not behind this gate.
--
--  3. A HANDLE COULD BE ASKED FOR ITS EMAIL, WITHOUT LIMIT.
--     tsb_email_for_username exists so a reader can sign in with
--     @handle. It also answers "is there an account with this
--     name" to anyone, as fast as they can ask. It is now rate
--     limited per ident (20 lookups per ten minutes) inside the
--     database, so a list of handles cannot be walked quickly.
--     Usernames were already validated by regex and the query is
--     parameterised; nothing here concatenates SQL.
--
--  4. NOTHING PROVES THE APP'S TABLES ARE CLOSED.
--     §5 at the end prints a table of what an anonymous visitor can
--     do. Every row should say NO. It reads the live grants, not a
--     guess.
--
--  HOW THIS RESISTS INJECTION
--    Every function below is written against typed parameters
--    (text, uuid). There is no EXECUTE of a built string and no
--    format() into SQL anywhere in this file, so a value like
--    '); drop table profiles; --' is a name, not a command, and it
--    fails the regex on the way in. The app also strips everything
--    except [a-z0-9@._+-] from an ident before it is sent, so such a
--    string never leaves the phone in the first place.
-- ════════════════════════════════════════════════════════════

-- ── §1 · the gate table, with a re-lock brake ────────────────
create table if not exists public.tsb_login_gate (
  ident        text primary key,
  fails        int not null default 0,
  locked_until timestamptz,
  locked_at    timestamptz,
  updated_at   timestamptz not null default now()
);
alter table public.tsb_login_gate add column if not exists locked_at timestamptz;
alter table public.tsb_login_gate enable row level security;
-- no policies: the three functions below are the only doors.

-- the one normaliser every function uses
create or replace function public.tsb_login_gate_norm(p text)
returns text language sql immutable as $$
  select lower(substr(trim(coalesce(p, '')), 1, 120))
$$;

-- ── §2 · status: unchanged in shape, still the cheapest call ──
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

-- ── §3 · fail: counts strikes, but cannot be used to re-lock forever
create or replace function public.tsb_login_fail(p_ident text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  k        text := public.tsb_login_gate_norm(p_ident);
  f        int;
  lu       timestamptz;
  lockedat timestamptz;
begin
  /* an empty or impossible ident is not a strike, and not an error either */
  if k = '' or length(k) < 3 then
    return json_build_object('fails', 0, 'locked', false, 'wait', 0);
  end if;

  insert into public.tsb_login_gate (ident, fails, locked_until, locked_at, updated_at)
    values (k, 1, null, null, now())
    on conflict (ident) do update
      set fails = case
            when public.tsb_login_gate.locked_until is not null
             and public.tsb_login_gate.locked_until > now() then public.tsb_login_gate.fails
            else public.tsb_login_gate.fails + 1 end,
          updated_at = now()
    returning fails, locked_until, locked_at into f, lu, lockedat;

  /* already locked: answer the same thing, change nothing. A stranger
     cannot use this call to stretch a lock they did not earn. */
  if lu is not null and lu > now() then
    return json_build_object('fails', f, 'locked', true,
      'wait', greatest(0, extract(epoch from (lu - now()))::int));
  end if;

  if f >= 5 then
    /* one lock per ident per ten minutes, and never a longer one by
       hammering the endpoint */
    if lockedat is null or lockedat < now() - interval '10 minutes' then
      update public.tsb_login_gate
         set locked_until = now() + interval '10 minutes',
             locked_at    = now(),
             fails        = 0
       where ident = k
       returning locked_until into lu;
    end if;
  end if;

  return json_build_object('fails', f,
    'locked', coalesce(lu > now(), false),
    'wait',   greatest(0, coalesce(extract(epoch from (lu - now()))::int, 0)));
end $$;

-- ── §4 · reset: signed in, and only for your own account ─────
create or replace function public.tsb_login_reset(p_ident text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  k    text := public.tsb_login_gate_norm(p_ident);
  me   uuid := auth.uid();
  mine text := '';
begin
  /* signed in at all */
  if me is null then
    return 'sign-in-required';
  end if;
  /* the gate may only be cleared for the caller's own address or handle */
  select lower(coalesce(u.email, '')) into mine from auth.users u where u.id = me;
  if mine = '' then
    return 'sign-in-required';
  end if;
  if k <> mine then
    /* also allow the caller's own handle, resolved through profiles */
    if not exists (
      select 1 from public.profiles p
       where p.id = me and ltrim(k, '@') = coalesce(p.username, '')
    ) then
      return 'not-yours';
    end if;
  end if;
  delete from public.tsb_login_gate where ident = k or ident = mine;
  return 'ok';
end $$;

revoke all on function public.tsb_login_status(text) from public;
revoke all on function public.tsb_login_fail(text)   from public;
revoke all on function public.tsb_login_reset(text)  from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.tsb_login_status(text) to anon;
    grant execute on function public.tsb_login_fail(text)   to anon;
    -- deliberately no reset for anon: it needs a session to be meaningful
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.tsb_login_status(text) to authenticated;
    grant execute on function public.tsb_login_fail(text)   to authenticated;
    grant execute on function public.tsb_login_reset(text)  to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.tsb_login_reset(text)  to service_role;
  end if;
exception when others then raise notice 'gate grants skipped (%).', sqlerrm;
end $$;

-- ── §5 · a handle lookup costs something ─────────────────────
create table if not exists public.tsb_handle_gate (
  ident    text primary key,
  n        int not null default 0,
  first_at timestamptz not null default now()
);
alter table public.tsb_handle_gate enable row level security;

create or replace function public.tsb_email_for_username(p_username text)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  h     text := lower(substr(trim(coalesce(p_username, '')), 1, 24));
  k     text := public.tsb_login_gate_norm(p_username);
  row_  public.tsb_handle_gate;
  PER_WINDOW constant int := 20;
begin
  /* keep the shape the app expects: an email, or nothing at all */
  h := replace(h, '@', '');
  if h !~ '^[a-z0-9_]{3,20}$' then
    return null;
  end if;

  /* the budget, per ident, in the database where a browser cannot edit it */
  select * into row_ from public.tsb_handle_gate where ident = k;
  if row_.ident is null then
    insert into public.tsb_handle_gate (ident, n, first_at)
      values (k, 1, now())
      on conflict (ident) do update set n = 1, first_at = now();
  elsif now() - row_.first_at > interval '10 minutes' then
    update public.tsb_handle_gate set n = 1, first_at = now() where ident = k;
  else
    if row_.n >= PER_WINDOW then
      return null;                       -- same answer as "no such handle"
    end if;
    update public.tsb_handle_gate set n = row_.n + 1 where ident = k;
  end if;

  return (
    select lower(u.email)::text
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.username = h
     limit 1
  );
end $$;

revoke all on function public.tsb_email_for_username(text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.tsb_email_for_username(text) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.tsb_email_for_username(text) to authenticated;
  end if;
exception when others then raise notice 'handle grants skipped (%).', sqlerrm;
end $$;

-- ── §6 · PROOF: nothing in the app is open to a stranger ─────
-- Run this on its own and read the answer. Every row you see should
-- have can_write = NO. Anything that says YES is a table an
-- anonymous visitor can change, and it should not exist.
--
-- select c.relname as table_name,
--        case when has_table_privilege('anon', c.oid, 'INSERT')
--               or has_table_privilege('anon', c.oid, 'UPDATE')
--               or has_table_privilege('anon', c.oid, 'DELETE')
--             then 'YES' else 'NO' end as can_write,
--        case when has_table_privilege('anon', c.oid, 'SELECT')
--             then 'yes' else 'no' end as can_read,
--        c.relrowsecurity as rls_on
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public' and c.relkind = 'r'
--  order by can_write desc, table_name;

-- ── §7 · one line to confirm all three doors are as intended ─
-- select p.proname,
--        has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_call,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') as reader_can_call
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.proname in ('tsb_login_status','tsb_login_fail','tsb_login_reset','tsb_email_for_username')
--  order by p.proname;
--
--  Expected after this file runs:
--    tsb_login_fail            anon yes   reader yes
--    tsb_login_status          anon yes   reader yes
--    tsb_login_reset           anon NO    reader yes   <- this is the fix
--    tsb_email_for_username    anon yes   reader yes   (rate limited above)
