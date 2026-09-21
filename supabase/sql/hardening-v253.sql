-- ============================================================
-- THESMALLBOOK, SQL #11 (v253) · SECURITY HARDENING
-- Additive, re-runnable. Run in Supabase → SQL Editor, once per project.
-- Pairs with docs/SUPABASE-STEP-BY-STEP.md (SQL #1…#10 stay as they are).
-- ============================================================

-- 1) RE-ASSERT the walls. Every table the app touches, RLS on. Idempotent.
alter table public.profiles  enable row level security;
alter table public.posts     enable row level security;
alter table public.comments  enable row level security;
alter table public.likes     enable row level security;
alter table public.follows   enable row level security;
alter table public.messages  enable row level security;
alter table public.push_nudges enable row level security;

-- 2) INPUT LIMITS, enforced by the database itself (checklist #13).
--    Mirrors the maxlengths the UI already applies, so even a hand-built
--    request cannot stuff a novel into a title. Safe to re-run.
alter table public.posts drop constraint if exists posts_title_len;
alter table public.posts add  constraint posts_title_len check (char_length(title) <= 90);
alter table public.posts drop constraint if exists posts_body_len;
alter table public.posts add  constraint posts_body_len check (char_length(body) <= 40000);
alter table public.comments drop constraint if exists comments_body_len;
alter table public.comments add constraint comments_body_len check (char_length(body) <= 280);
alter table public.profiles drop constraint if exists profiles_name_len;
alter table public.profiles add  constraint profiles_name_len check (char_length(name) between 1 and 24);
alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add  constraint profiles_bio_len check (bio is null or char_length(bio) <= 120);

-- 3) ONE LIKE PER READER PER STORY, the unique index is the law; SQL #1's
--    "write own l" policy already keeps readers inside their own rows.
create unique index if not exists likes_user_post_uid on public.likes (user_id, post_id);

-- 4) NOBODY DELETES SOMEONE ELSE'S STORY, re-assert owner-only deletes
--    (SQL #10 added these; they belong in every fresh project too).
drop policy if exists "delete own posts" on public.posts;
create policy "delete own posts" on public.posts
  for delete using (auth.uid() = author_id);
drop policy if exists "update own posts" on public.posts;
create policy "update own posts" on public.posts
  for update using (auth.uid() = author_id);

-- 5) PASSWORD ACCOUNTS (v253). No schema change is needed: sign-ups arrive
--    through GoTrue with full_name + birth_year in the user's metadata, and
--    the app already promotes full_name → profiles.name on first post.
--    The 13+ age gate runs in the app before any account is created; only
--    the birth YEAR is stored (never the full date), see about#privacy.

-- 6) SIGN-UP / SIGN-IN RATE LIMITS live in Supabase itself:
--    Dashboard → Authentication → Settings → rate limits (email deliveries,
--    token refreshes). The app adds its own polite cooldown on top.

-- Done. Re-run any time; nothing here destroys data.

-- ⚡ NOTE (v255): this whole file is INCLUDED in supabase/sql/ALL-IN-ONE.sql (section §5).
--    You do NOT need to run it separately, run ALL-IN-ONE.sql once and you are done.
