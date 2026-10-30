-- TheSmallBook v336: explicit weekly email consent + Sunday digest scheduler
-- Safe to run repeatedly. It never copies email addresses to public tables.
--
-- Before enabling the cron below:
-- 1. Deploy supabase/functions/weekly-digest/index.ts with Verify JWT OFF.
-- 2. Set function secrets: RESEND_API_KEY, DIGEST_FROM,
--    SUPABASE_SERVICE_ROLE_KEY and CRON_SECRET.
-- 3. Change the URL below only if you use a different Supabase project.
-- 4. Keep CRON_SECRET matching the function secret.

create table if not exists public.weekly_digest_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.weekly_digest_subscriptions enable row level security;

drop policy if exists "read own weekly digest choice" on public.weekly_digest_subscriptions;
create policy "read own weekly digest choice" on public.weekly_digest_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "write own weekly digest choice" on public.weekly_digest_subscriptions;
create policy "write own weekly digest choice" on public.weekly_digest_subscriptions
  for insert with check (auth.uid() = user_id);
drop policy if exists "update own weekly digest choice" on public.weekly_digest_subscriptions;
create policy "update own weekly digest choice" on public.weekly_digest_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.tsb_weekly_digest_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists weekly_digest_subscriptions_updated_at on public.weekly_digest_subscriptions;
create trigger weekly_digest_subscriptions_updated_at
before update on public.weekly_digest_subscriptions
for each row execute function public.tsb_weekly_digest_touch();

-- Sunday 10:00 AM India time is Sunday 04:30 UTC. pg_cron and pg_net are
-- optional on Supabase plans. The consent UI and function work without cron;
-- you can trigger the function manually or from a scheduler until enabled.
do $$
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
  perform cron.unschedule('tsb-weekly-digest');
  perform cron.schedule('tsb-weekly-digest', '30 4 * * 0', $cron$
    select net.http_post(
      url := 'https://wdmxcewmyofihgrheuas.supabase.co/functions/v1/weekly-digest',
      body := '{"type":"weekly"}'::jsonb,
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','tsb-cron-2026')
    );
  $cron$);
  raise notice 'Weekly digest scheduled for Sunday 10:00 AM IST.';
exception when others then
  raise notice 'Weekly digest cron skipped: %. The table and opt-in remain live.', sqlerrm;
end $$;
