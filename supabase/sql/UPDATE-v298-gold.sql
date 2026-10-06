-- ============================================================
-- THE SMALL BOOK · SQL UPDATE v4 (v298) · GOLD GOES SERVER-SIDE
-- Run ONCE in the Supabase SQL editor (Project → SQL editor).
-- After this: Gold cannot be forged from the browser. The site
-- can only READ its own membership row; every write happens
-- server-side in the two edge functions (redeem-gold,
-- razorpay-webhook).
-- ============================================================

-- 1) THE MEMBERSHIP TABLE: one row per Gold account
create table if not exists public.gold_members (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  plan         text not null default 'gold-yearly',
  activated_at timestamptz not null default now(),
  expires_at   timestamptz not null
);

alter table public.gold_members enable row level security;

-- ONE policy: a signed-in reader can read ONLY their own row.
-- No client insert/update/delete policies exist at all.
drop policy if exists "read own gold" on public.gold_members;
create policy "read own gold"
  on public.gold_members for select
  using (auth.uid() = user_id);

-- 2) SINGLE-USE ACTIVATION CODES (the manual UPI/WhatsApp flow).
--    The founder creates codes here; buyers redeem them through
--    the redeem-gold edge function, never in the browser.
create table if not exists public.gold_codes (
  code       text primary key,
  used       boolean not null default false,
  used_by    uuid,
  used_at    timestamptz,
  expires_at timestamptz
);

alter table public.gold_codes enable row level security;
-- no policies: clients get nothing; the service role writes it.

-- To mint a code after you have verified a ₹999 payment by UPI:
--   insert into public.gold_codes (code, expires_at)
--   values ('TSB-XXXX-XXXX', now() + interval '90 days');
-- (pick your own four-and-four; one row per buyer, single use.)

-- 3) WEBHOOK IDEMPOTENCY: a replayed Razorpay event does nothing twice
create table if not exists public.gold_paid_events (
  event_id   text primary key,
  seen_at    timestamptz not null default now()
);

alter table public.gold_paid_events enable row level security;
-- no policies: only the webhook (service role) touches this.

-- 4) EMAIL → ACCOUNT MAPPING for the webhook: Razorpay tells us
--    the payer's email; this maps it to the TSB account.
alter table public.profiles add column if not exists email text;
update public.profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id and p.email is null;
-- (the SQL editor can read auth.users; the browser never can.)
-- New accounts: run this update once a month, or add a trigger later.

-- Done. Next steps (see docs/PAYWALL-SETUP.md):
--   supabase functions deploy redeem-gold
--   supabase functions deploy razorpay-webhook
--   supabase secrets set RAZORPAY_WEBHOOK_SECRET=...
