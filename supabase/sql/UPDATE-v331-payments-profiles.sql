-- ============================================================
-- THE SMALL BOOK · SQL UPDATE v331 · REAL PAYMENTS + PROFILES
-- Run ONCE in the Supabase SQL editor. Safe to run twice.
-- ============================================================

-- 1) ORDERS: the server prices every purchase here (gold-order),
--    the gateway webhook marks it paid (youpi-webhook).
create table if not exists public.gold_orders (
  order_id     text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  plan         text not null,
  amount_paise integer not null,
  status       text not null default 'pending',
  utr          text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
alter table public.gold_orders enable row level security;
drop policy if exists "read own orders" on public.gold_orders;
create policy "read own orders" on public.gold_orders for select using (auth.uid() = user_id);
-- no insert/update policies: only the edge functions (service role) write.

-- 2) THE FOUNDER IS GOLD THE HONEST WAY: a real row, not a browser check.
--    (Runs once; edit the email if yours differs.)
insert into public.gold_members (user_id, plan, activated_at, expires_at)
select id, 'founder', now(), now() + interval '50 years'
from auth.users where lower(email) in ('acimotreyothy@gmail.com', 'jashgandhicreator07@gmail.com')
on conflict (user_id) do update set plan = 'founder', expires_at = now() + interval '50 years';

-- 3) PROFILES: age and a unique username are required to enter the app.
-- age is NOT stored here: profiles are public, so the birth year stays
-- private inside the account (auth user metadata), visible only to its owner.
alter table public.profiles drop column if exists birth_year;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists profile_done_at timestamptz;
-- username format and uniqueness already exist (usernames-v253.sql:
-- ^[a-z0-9_]{3,20}$ and a unique index), so nothing more is needed here.

-- 4) "Is this username free?" without exposing anyone's profile row.
create or replace function public.username_available(u text)
returns boolean language sql security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(u));
$$;
grant execute on function public.username_available(text) to anon, authenticated;
