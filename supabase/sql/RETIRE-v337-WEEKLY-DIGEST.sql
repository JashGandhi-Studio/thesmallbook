-- TheSmallBook v337: stop the retired weekly email digest safely.
-- Run once ONLY if UPDATE-v336-retention.sql was previously run in Supabase.
-- This preserves records and the old table; it sends no email and drops nothing.
do $$ begin
  perform cron.unschedule('tsb-weekly-digest');
exception when others then
  raise notice 'Weekly digest cron was already absent or pg_cron is unavailable: %', sqlerrm;
end $$;

update public.weekly_digest_subscriptions set enabled = false where enabled is true;
