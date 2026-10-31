-- ============================================================
-- THESMALLBOOK · v344 · THE ONLY SQL LEFT TO RUN
--
-- Why this is small: the library modes were cut back to one (Compare two
-- books) and that one is composed in the app from the books themselves,
-- so the mode tables planned earlier are not needed. Messages typing is
-- the only thing that still needs a table.
--
-- Run in Supabase -> SQL Editor -> Run. Safe to run any number of times.
-- ============================================================

-- 1 · "is typing..." one row per person, overwritten while they type.
--     Nothing about WHAT anyone typed is stored. The row goes stale on
--     its own after six seconds and the dots disappear.
create table if not exists public.dm_typing (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  peer_id  uuid not null,
  at       timestamptz not null default now()
);

alter table public.dm_typing enable row level security;

drop policy if exists dm_typing_insert on public.dm_typing;
create policy dm_typing_insert on public.dm_typing
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists dm_typing_update on public.dm_typing;
create policy dm_typing_update on public.dm_typing
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists dm_typing_select on public.dm_typing;
create policy dm_typing_select on public.dm_typing
  for select to authenticated
  using (auth.uid() = user_id or auth.uid() = peer_id);

grant select, insert, update on public.dm_typing to authenticated;

create index if not exists dm_typing_peer_idx on public.dm_typing (peer_id, at desc);

-- housekeeping: anything older than an hour is noise
create or replace function public.dm_typing_sweep() returns void
language sql security definer as $$
  delete from public.dm_typing where at < now() - interval '1 hour';
$$;

-- optional, only if pg_cron is enabled:
-- select cron.schedule('dm_typing_sweep', '*/10 * * * *', $$ select public.dm_typing_sweep(); $$);


-- ============================================================
-- 2 · IF you already pasted the earlier modes SQL, this removes it.
--     Nothing in the app reads these tables any more. Uncomment and run.
-- ============================================================
-- drop function if exists public.mode_bundle();
-- drop function if exists public.mode_admin_import(jsonb);
-- drop function if exists public.mode_health();
-- drop table if exists public.mode_week, public.mode_cycle, public.mode_myths,
--   public.mode_scenarios, public.mode_redflags, public.mode_topics, public.mode_defs cascade;
-- drop table if exists public.ask_usage, public.app_flags cascade;
-- drop function if exists public.ask_state();
-- drop function if exists public.ask_take();


-- ============================================================
-- 3 · CHECK IT WORKED (run these two lines after the run)
-- ============================================================
-- select count(*) from public.dm_typing;                                  -- 0, and no error = live
-- select proname from pg_proc where proname = 'dm_typing_sweep';          -- one row
