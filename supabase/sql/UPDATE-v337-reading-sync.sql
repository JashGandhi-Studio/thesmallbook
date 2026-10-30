-- TheSmallBook v337: private, canonical cross-device reading state.
-- It syncs reading work only: lessons, shelf, resume locations, plans,
-- journeys, highlights and streak history. It intentionally excludes device
-- settings such as theme, text size, action bar layout and notification sound.
create table if not exists public.reading_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.reading_state enable row level security;
drop policy if exists "own reading state select" on public.reading_state;
create policy "own reading state select" on public.reading_state for select using (auth.uid() = user_id);
drop policy if exists "own reading state insert" on public.reading_state;
create policy "own reading state insert" on public.reading_state for insert with check (auth.uid() = user_id);
drop policy if exists "own reading state update" on public.reading_state;
create policy "own reading state update" on public.reading_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.reading_state to authenticated;
