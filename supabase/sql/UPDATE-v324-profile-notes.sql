-- ============================================================
-- THESMALLBOOK: 🎵 24-HOUR PROFILE NOTES (INSTAGRAM-STYLE)
-- Migration: UPDATE-v324-profile-notes.sql
-- Enables users to post 24-hour thought notes, song notes,
-- and quotes floating above their profile avatar.
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor).
-- ============================================================

-- 1. Create the profile_notes table
create table if not exists public.profile_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  avatar_url text,
  note_text text,
  note_type text not null default 'text' check (note_type in ('text', 'song', 'quote')),
  song_title text,
  song_artist text,
  quote_text text,
  quote_author text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint profile_notes_single_user unique (user_id)
);

-- 2. Performance indexes for 24-hour lookups
create index if not exists idx_profile_notes_active
  on public.profile_notes (expires_at, created_at desc);

create index if not exists idx_profile_notes_user
  on public.profile_notes (user_id);

-- 3. Enable Row-Level Security (RLS)
alter table public.profile_notes enable row level security;

-- 4. Clean RLS Policies:
-- Any reader (guest or authenticated) can view notes that have not expired
create policy "Anyone can read active profile notes"
  on public.profile_notes
  for select
  using (expires_at > now());

-- Authenticated users can insert their own 24h note
create policy "Users can create their own profile note"
  on public.profile_notes
  for insert
  with check (auth.uid() = user_id);

-- Users can update / replace their existing note
create policy "Users can update their own profile note"
  on public.profile_notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their note at any time
create policy "Users can delete their own profile note"
  on public.profile_notes
  for delete
  using (auth.uid() = user_id);

-- 5. Realtime replication (optional - enables live note updates without refreshing)
alter publication supabase_realtime add table public.profile_notes;

-- 6. Helper View: active_profile_notes
create or replace view public.active_profile_notes as
select
  id,
  user_id,
  username,
  avatar_url,
  note_text,
  note_type,
  song_title,
  song_artist,
  quote_text,
  quote_author,
  created_at,
  expires_at,
  round(extract(epoch from (expires_at - now())) / 3600, 1) as hours_left
from public.profile_notes
where expires_at > now()
order by created_at desc;
