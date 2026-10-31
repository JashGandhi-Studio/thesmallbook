-- ============================================================
-- THESMALLBOOK · v344 · "is typing…"
-- One tiny table. Run it once in Supabase → SQL Editor.
-- Safe to re-run: every statement checks before it creates.
--
-- How it works: while you type in a thread, the app upserts ONE row for
-- you (your id, the thread you are in, the time). The other person's app
-- polls the same row every three seconds. If the time is fresher than
-- six seconds, they see three dots. That is all it does — no message is
-- sent, nothing is stored about what you typed, and the row is
-- overwritten every time you type again.
-- ============================================================

create table if not exists public.dm_typing (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  peer_id  uuid not null,
  at       timestamptz not null default now()
);

alter table public.dm_typing enable row level security;

-- You may write only your own row.
drop policy if exists dm_typing_insert on public.dm_typing;
create policy dm_typing_insert on public.dm_typing
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists dm_typing_update on public.dm_typing;
create policy dm_typing_update on public.dm_typing
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- You may read only rows that name YOU as the other side of the thread.
drop policy if exists dm_typing_select on public.dm_typing;
create policy dm_typing_select on public.dm_typing
  for select to authenticated
  using (auth.uid() = user_id or auth.uid() = peer_id);

grant select, insert, update on public.dm_typing to authenticated;

-- Housekeeping: anything older than an hour is noise.
create index if not exists dm_typing_peer_idx on public.dm_typing (peer_id, at desc);

create or replace function public.dm_typing_sweep() returns void
language sql security definer as $$
  delete from public.dm_typing where at < now() - interval '1 hour';
$$;

-- Optional: if pg_cron is on, tidy every ten minutes.
-- select cron.schedule('dm_typing_sweep', '*/10 * * * *', $$ select public.dm_typing_sweep(); $$);
