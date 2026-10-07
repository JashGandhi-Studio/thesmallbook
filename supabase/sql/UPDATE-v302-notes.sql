-- ============================================================
-- THESMALLBOOK · v300 · THE NOTEBOOK (run once, safe to re-run)
-- One snippet, three jobs:
--   1. tsb_notes        : every note follows its account to every device
--   2. tsb_note_states  : last-opened note + drafts (continue writing)
--   3. tsb-note-media   : photos and voice notes live in Storage,
--                         not as base64 in a 5 MB localStorage
-- Client sync is per-user (RLS: own rows only), offline-first:
-- localStorage stays the cache, Supabase is the home copy.
-- ============================================================

-- 1) NOTES ------------------------------------------------------------
create table if not exists public.tsb_notes (
  id           text primary key,                 -- client uuid (offline-first)
  user_id      uuid not null references auth.users(id) on delete cascade,
  book_id      text,
  book_title   text,
  lesson_idx   int,
  lesson_title text,
  title        text not null default '',
  body         text not null default '',
  tags         text[] not null default '{}',
  media        jsonb not null default '[]',       -- [{type:'image'|'audio', url, path, local}]
  deleted      boolean not null default false,    -- tombstone, propagates removes
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.tsb_notes enable row level security;

drop policy if exists "notes own rows all" on public.tsb_notes;
create policy "notes own rows all"
  on public.tsb_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists tsb_notes_user_updated on public.tsb_notes (user_id, updated_at desc);

-- 2) NOTE STATES (continue-writing pointer, per device is fine but
--    storing it server-side means the notebook opens where you left it everywhere)
create table if not exists public.tsb_note_states (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  last_note text,
  prompt_at date,
  updated_at timestamptz not null default now()
);

alter table public.tsb_note_states enable row level security;

drop policy if exists "note states own row" on public.tsb_note_states;
create policy "note states own row"
  on public.tsb_note_states for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) STORAGE BUCKET for note photos + voice notes ----------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tsb-note-media', 'tsb-note-media', true, 10485760,
        array['image/jpeg','image/png','image/webp','audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-m4a'])
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-m4a'];

drop policy if exists "note media own folder all" on storage.objects;
create policy "note media own folder all"
  on storage.objects for all
  using (bucket_id = 'tsb-note-media' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'tsb-note-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- done. the reader's notebook now: syncs across devices, keeps media in
-- Storage, and never silently dies at 5 MB.
