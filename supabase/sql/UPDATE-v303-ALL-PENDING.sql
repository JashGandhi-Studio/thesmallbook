-- ============================================================================
-- THESMALLBOOK · ONE SQL FOR EVERYTHING PENDING (v303)
-- supabase/sql/UPDATE-v303-ALL-PENDING.sql
--
-- HOW TO RUN
--   Supabase dashboard → SQL Editor → New query → paste this whole file
--   → Run. Takes a few seconds. SAFE TO RE-RUN: every statement is guarded
--   (add column if not exists / drop policy if exists / create if missing),
--   so running it twice changes nothing and breaks nothing. No data is
--   deleted anywhere.
--
-- WHAT IS INSIDE
--   A. Notebook          : tsb_notes + tsb_note_states tables, the
--                          tsb-note-media storage bucket + rules
--   B. Gold membership   : gold_members, gold_codes, gold_paid_events,
--                          server-side redeem/webhook support
--   C. Hardening         : post length limits, owner-only delete/update
--   D. View-only media   : the no_download column posts already try to use
--   E. Private accounts  : follow_requests + accept/decline logic
--
-- Everything the app shipped up to Build 303 runs against the live DB
-- with graceful fallbacks; this file switches those fallbacks off by
-- making the real thing exist.
-- ============================================================================

-- ── A. THE NOTEBOOK (tsb_notes, tsb_note_states, tsb-note-media) ───────────

create table if not exists public.tsb_notes (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  book_id     text,
  lesson_idx  integer,
  lesson_title text,
  title       text not null default '',
  pages       jsonb not null default '[]'::jsonb,
  tags        jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.tsb_notes enable row level security;
drop policy if exists "own notes all" on public.tsb_notes;
create policy "own notes all" on public.tsb_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists tsb_notes_user on public.tsb_notes (user_id, updated_at desc);

create table if not exists public.tsb_note_states (
  note_id    text primary key references public.tsb_notes (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  reading    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.tsb_note_states enable row level security;
drop policy if exists "own note states" on public.tsb_note_states;
create policy "own note states" on public.tsb_note_states
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- media bucket for notebook photos / voice notes (10 MB cap enforced client-side)
insert into storage.buckets (id, name, public)
values ('tsb-note-media', 'tsb-note-media', true)
on conflict (id) do update set public = true;
drop policy if exists "tsb-note-media read" on storage.objects;
create policy "tsb-note-media read" on storage.objects
  for select using (bucket_id = 'tsb-note-media');
drop policy if exists "tsb-note-media write" on storage.objects;
create policy "tsb-note-media write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tsb-note-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "tsb-note-media update" on storage.objects;
create policy "tsb-note-media update" on storage.objects
  for update to authenticated
  using (bucket_id = 'tsb-note-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "tsb-note-media delete" on storage.objects;
create policy "tsb-note-media delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'tsb-note-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── B. GOLD MEMBERSHIP (server-side redeem + webhook receipts) ─────────────

create table if not exists public.gold_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  until      timestamptz not null,
  source     text not null default 'code',
  created_at timestamptz not null default now()
);
alter table public.gold_members enable row level security;
drop policy if exists "read own gold" on public.gold_members;
create policy "read own gold" on public.gold_members
  for select using (auth.uid() = user_id);

create table if not exists public.gold_codes (
  code       text primary key,
  expires_at timestamptz not null,
  used_by    uuid references auth.users (id),
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.gold_codes enable row level security;

create table if not exists public.gold_paid_events (
  event_id   text primary key,
  payload    jsonb,
  created_at timestamptz not null default now()
);
alter table public.gold_paid_events enable row level security;

-- ── C. HARDENING (lengths + owner-only update/delete on posts) ─────────────

alter table public.posts drop constraint if exists posts_title_len;
alter table public.posts add  constraint posts_title_len check (char_length(title) <= 90);
alter table public.posts drop constraint if exists posts_body_len;
alter table public.posts add  constraint posts_body_len check (char_length(body) <= 20000);

drop policy if exists "update own posts" on public.posts;
create policy "update own posts" on public.posts
  for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
drop policy if exists "delete own posts" on public.posts;
create policy "delete own posts" on public.posts
  for delete to authenticated
  using (auth.uid() = author_id);

-- ── D. VIEW-ONLY MEDIA (the no_download column) ────────────────────────────

alter table public.posts add column if not exists no_download boolean not null default true;
alter table public.messages add column if not exists "read" boolean not null default false;

-- ── E. PRIVATE ACCOUNTS + FOLLOW REQUESTS ──────────────────────────────────

create table if not exists public.follow_requests (
  id           bigint generated always as identity primary key,
  requester_id uuid not null references auth.users (id) on delete cascade,
  target_id    uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, target_id)
);
alter table public.follow_requests enable row level security;
drop policy if exists "fr select participant" on public.follow_requests;
create policy "fr select participant" on public.follow_requests
  for select using (auth.uid() = requester_id or auth.uid() = target_id);
drop policy if exists "fr insert requester" on public.follow_requests;
create policy "fr insert requester" on public.follow_requests
  for insert to authenticated with check (auth.uid() = requester_id);
drop policy if exists "fr update target" on public.follow_requests;
create policy "fr update target" on public.follow_requests
  for update to authenticated
  using (auth.uid() = target_id)
  with check (auth.uid() = target_id);
drop policy if exists "fr delete participant" on public.follow_requests;
create policy "fr delete participant" on public.follow_requests
  for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = target_id);

-- accept = write the follow row as the target (security definer keeps RLS honest)
create or replace function public.tsb_accept_follow_request(req_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  req public.follow_requests;
begin
  select * into req from public.follow_requests
   where id = req_id and target_id = auth.uid() and status = 'pending';
  if req is null then return; end if;
  insert into public.follows (follower_id, author_id)
  values (req.requester_id, req.target_id)
  on conflict do nothing;
  update public.follow_requests set status = 'accepted', responded_at = now() where id = req_id;
end $$;

-- ============================================================================
-- END. That is everything pending. Re-run any time; it only fills gaps.
-- ============================================================================
