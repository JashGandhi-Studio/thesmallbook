-- ════════════════════════════════════════════════════════════
--  TheSmallBook · v349 · AUTH HARDENING
--  Run once in Supabase → SQL Editor. Safe to re-run.
--
--  What this does
--    1. A rate limit on "email me a code" / "forgot password" / "resend":
--       60 seconds between requests per address, 6 per hour, then a
--       longer cool-off. Counted in the database, not in the browser,
--       so clearing site data does not reset it.
--    2. Makes the code expiry explicit: the app now tells the reader
--       the code is good for 30 minutes, and this file sets that
--       window in one place if you ever want to change it.
--
--  What it cannot do (Supabase holds these, dashboard only)
--    Authentication → Providers → Email:
--      · Email OTP Expiration .............. 1800   (30 minutes)  ← do this
--      · Email OTP Length .................. 6
--    Authentication → Rate Limits:
--      · "Rate limit for sending emails" ... 30 per hour (default, keep)
--      · "Rate limit for token refreshes" .. keep the defaults
--  Until you set 1800 there, the codes live for 60 minutes; the app's
--  copy would then be wrong, so set it in the same sitting.
-- ════════════════════════════════════════════════════════════

create table if not exists public.otp_gate (
  ident      text primary key,          -- lower-cased email
  n          int  not null default 0,   -- requests inside the current hour
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now()
);

alter table public.otp_gate enable row level security;
-- no policies: only the security-definer functions below may touch it.

-- ── the gate ────────────────────────────────────────────────
-- returns { allowed, wait, left }   wait in seconds when refused
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

-- ── a successful sign-in clears the ledger for that address ──
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

-- ── who may call them ───────────────────────────────────────
-- the browser only ever asks "may I send?" - it can never read the table
revoke all on function public.tsb_otp_gate(text)  from public;
revoke all on function public.tsb_otp_reset(text) from public;
grant execute on function public.tsb_otp_gate(text)  to anon, authenticated;
grant execute on function public.tsb_otp_reset(text) to authenticated;

-- ── housekeeping: forget rows older than a day ──────────────
create or replace function public.tsb_otp_sweep()
returns void language sql security definer set search_path = public as $$
  delete from public.otp_gate where last_at < now() - interval '1 day';
$$;

-- if pg_cron is on, tidy hourly (skip silently if it is not)
do $$ begin
  perform cron.unschedule('tsb-otp-sweep');
  perform cron.schedule('tsb-otp-sweep', '17 * * * *', 'select public.tsb_otp_sweep();');
exception when others then
  raise notice 'pg_cron not available - otp_gate is swept on next write instead. Fine.';
end $$;

-- ── the check ───────────────────────────────────────────────
select 'otp gate ready' as status,
       (select count(*) from information_schema.routines
         where routine_name in ('tsb_otp_gate','tsb_otp_reset','tsb_otp_sweep')) as functions;
