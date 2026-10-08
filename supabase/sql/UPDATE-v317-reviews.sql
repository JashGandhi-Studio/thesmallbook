-- ============================================================================
-- THESMALLBOOK · v317 · THE LIVE REVIEW WALL
-- supabase/sql/UPDATE-v317-reviews.sql
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste → Run.
-- SAFE TO RE-RUN: every statement is guarded; nothing is deleted.
--
-- WHAT IT DOES
--   Creates public.tsb_reviews: every reader's stars + words, readable by
--   everyone (that is the point of a wall), postable by any reader - signed
--   in or not - with honest length/range checks. Home merges these into the
--   ADD YOURS wall on every load.
-- ============================================================================

create table if not exists public.tsb_reviews (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  stars      integer not null check (stars between 1 and 5),
  quote      text not null check (char_length(quote) between 1 and 280),
  who        text not null default 'a reader',
  created_at timestamptz not null default now()
);

alter table public.tsb_reviews enable row level security;

drop policy if exists "reviews are public" on public.tsb_reviews;
create policy "reviews are public" on public.tsb_reviews
  for select using (true);

drop policy if exists "any reader can post one" on public.tsb_reviews;
create policy "any reader can post one" on public.tsb_reviews
  for insert with check (char_length(quote) between 1 and 280 and stars between 1 and 5);

-- index for the wall query (latest first)
create index if not exists tsb_reviews_created_idx on public.tsb_reviews (created_at desc);
