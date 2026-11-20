-- ============================================================
-- THESMALLBOOK · Build 419 · run once in Supabase → SQL Editor
-- Safe to re-run: every statement checks before it creates, and
-- every delete is wrapped so a missing table skips, never fails.
--
-- What this does, in plain words:
--   1 · push_log      one row per reader per thing per day, so a
--                     push can be claimed exactly once (push-notify
--                     v419 checks here before it sends anything)
--   2 · notify_prefs  per-reader notification switches on profiles
--   3 · events        the server telemetry rollup (the app flushes
--                     the same event names it logs on-device;
--                     first-party product counts only, no cross-site
--                     tracking, no advertising profile)
--   4 · consents      DPDP consent records, owned by the reader
--   5 · edge_errors   where edge functions leave their failures
--   6 · case_plays    a play belongs to its player now
--   7 · retention     the weekly tidy that ACTUALLY deletes:
--                     expired login/otp gates, dead typing rows,
--                     year-old plays, 90-day telemetry, 180-day
--                     push claims - scheduled with pg_cron
--   8 · realtime      messages + dm_typing join the publication so
--                     the app can listen instead of only polling
-- ============================================================


-- 1 · PUSH LOG: the idempotency ledger -------------------------
create table if not exists public.push_log (
  user_id    uuid not null,
  kind       text not null,
  day        date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, day)
);

alter table public.push_log enable row level security;

drop policy if exists "push_log claim" on public.push_log;
create policy "push_log claim" on public.push_log
  for insert to anon, authenticated with check (true);
drop policy if exists "push_log read own" on public.push_log;
create policy "push_log read own" on public.push_log
  for select to authenticated using (auth.uid() = user_id);
-- rows are dedupe markers (a reader id, a kind like "nudge" or
-- "webhook:likes:<uuid>", a day). Nothing readable leaks from them.

create index if not exists push_log_day_idx on public.push_log (day);


-- 2 · NOTIFICATION PREFERENCES ---------------------------------
alter table public.profiles
  add column if not exists notify_prefs jsonb not null default '{}'::jsonb;
-- shape: {"follows":bool,"dm":bool,"likes":bool,"comments":bool,
--         "stories":bool,"daily":bool}  ·  absent key = send


-- 3 · EVENTS: the server telemetry rollup ----------------------
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid,
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  at         timestamptz not null default now()
);

alter table public.events enable row level security;

drop policy if exists "events append" on public.events;
create policy "events append" on public.events
  for insert to anon, authenticated with check (true);
-- no select policy for clients on purpose: readers can add their
-- own events but never read anyone's. Admin reads happen in the
-- dashboard (service role), which is where the numbers belong.

create index if not exists events_at_idx on public.events (at desc);
create index if not exists events_name_idx on public.events (name, at desc);


-- 4 · CONSENTS (DPDP) -------------------------------------------
create table if not exists public.consents (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  kind       text not null,
  granted    boolean not null,
  source     text not null default 'app',
  at         timestamptz not null default now()
);

alter table public.consents enable row level security;

drop policy if exists "consents read own" on public.consents;
create policy "consents read own" on public.consents
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "consents write own" on public.consents;
create policy "consents write own" on public.consents
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "consents change own" on public.consents;
create policy "consents change own" on public.consents
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists consents_user_idx on public.consents (user_id, at desc);


-- 5 · EDGE ERRORS ------------------------------------------------
create table if not exists public.edge_errors (
  id         bigint generated always as identity primary key,
  fn         text not null,
  message    text not null,
  at         timestamptz not null default now()
);

alter table public.edge_errors enable row level security;

drop policy if exists "edge_errors append" on public.edge_errors;
create policy "edge_errors append" on public.edge_errors
  for insert to anon, authenticated with check (true);
-- read in the dashboard only, like events.


-- 6 · CASE_PLAYS BELONGS TO ITS PLAYER ---------------------------
alter table public.case_plays
  add column if not exists user_id uuid;

alter table public.case_plays enable row level security;

drop policy if exists "signed-in readers may log a play" on public.case_plays;
drop policy if exists "players log their own plays" on public.case_plays;
create policy "players log their own plays" on public.case_plays
  for insert to authenticated with check (auth.uid() = user_id);

-- one play per reader per case (older anonymous rows keep user_id
-- null and are exempt; the retention below retires them at a year)
create unique index if not exists case_plays_owner_case_uidx
  on public.case_plays (user_id, case_id) where user_id is not null;


-- 7 · RETENTION THAT ACTUALLY DELETES ----------------------------
create or replace function public.tsb_retention()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- expired login / otp gates: a gate nobody has touched in a day
  -- has nothing left to protect
  if to_regclass('public.otp_gate') is not null then
    delete from public.otp_gate where last_at < now() - interval '1 day';
  end if;
  if to_regclass('public.tsb_login_gate') is not null then
    delete from public.tsb_login_gate
     where updated_at < now() - interval '1 day'
       and (locked_until is null or locked_until < now());
  end if;
  -- typing rows are an 8-second truth; a minute is generous
  if to_regclass('public.dm_typing') is not null then
    delete from public.dm_typing where at < now() - interval '1 minute';
  end if;
  -- the wall keeps a year of plays
  if to_regclass('public.case_plays') is not null then
    delete from public.case_plays where created_at < now() - interval '1 year';
  end if;
  -- telemetry: 90 days of events is plenty to see a trend
  delete from public.events where at < now() - interval '90 days';
  -- push claims: 180 days covers any audit question worth asking
  delete from public.push_log where day < (now() at time zone 'utc')::date - 180;
  -- edge errors: 90 days
  delete from public.edge_errors where at < now() - interval '90 days';
end $$;

-- run it weekly, Sunday 03:30 UTC (09:00 IST) - pg_cron is optional
-- on some plans; if it is unavailable the function still exists and
-- can be run by hand or from any scheduler.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('tsb-retention');
  perform cron.schedule('tsb-retention', '30 3 * * 0', $cron$ select public.tsb_retention(); $cron$);
  raise notice 'Retention scheduled weekly (Sunday 03:30 UTC).';
exception when others then
  raise notice 'Retention cron skipped: %. Run select public.tsb_retention(); weekly by hand.', sqlerrm;
end $$;


-- 8 · REALTIME: listen instead of only polling -------------------
-- Adding a table twice raises a notice, not an error, so this is
-- safe inside the do-block guard below.
do $$
begin
  alter publication supabase_realtime add table public.messages;
  raise notice 'messages is realtime.';
exception when others then
  raise notice 'messages realtime skipped: %', sqlerrm;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dm_typing;
  raise notice 'dm_typing is realtime.';
exception when others then
  raise notice 'dm_typing realtime skipped: %', sqlerrm;
end $$;

-- ============================================================
-- After running this:
--   · Redeploy supabase/functions/push-notify/index.ts (v419).
--   · Deploy supabase/functions/health-check/index.ts and
--     supabase/functions/account-erase/index.ts (new in 419).
--   · Nothing else changes: every client path degrades quietly
--     until the tables exist.
-- ============================================================
