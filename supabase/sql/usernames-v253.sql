-- ============================================================
-- THESMALLBOOK, SQL #12 (v254) · USERNAMES
-- Additive, re-runnable. Run once in Supabase → SQL Editor.
-- Gives every reader a real handle: @username, lowercase, unique,
-- 3–20 chars of a-z / 0–9 / underscore. Profiles keep working even
-- when username is still empty (older accounts), the app fills it
-- from sign-up metadata the next time the profile is saved.
-- ============================================================

alter table public.profiles add column if not exists username text;

-- the format is law, inside the database (checklist #13)
alter table public.profiles drop constraint if exists profiles_username_fmt;
alter table public.profiles add  constraint profiles_username_fmt
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

-- two readers can never hold the same handle
create unique index if not exists profiles_username_uid
  on public.profiles (username) where username is not null;

-- done. nothing else changes; existing rows are untouched (username stays
-- null until each reader's app writes it once).

-- ⚡ NOTE (v255): this whole file is INCLUDED in supabase/sql/ALL-IN-ONE.sql (section §6).
--    You do NOT need to run it separately, run ALL-IN-ONE.sql once and you are done.
