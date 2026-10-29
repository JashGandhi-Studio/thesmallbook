-- ============================================================
-- THE SMALL BOOK · SQL UPDATE v334 · UPI CLAIMS + SECURITY FIXES
-- Run ONCE in the Supabase SQL editor (after v331). Safe to run twice.
-- ============================================================

-- 1) PRIVACY FIX: v298 copied every reader's email into public.profiles,
--    a table anyone can read. Emails never belong there. Remove the column.
--    (Payments now match by order id, so nothing needs it.)
alter table public.profiles drop column if exists email;

-- 2) ADMINS live on the server, never in the app's code.
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.app_admins enable row level security;
-- no policies: only edge functions (service role) can read it.
insert into public.app_admins (user_id)
select id from auth.users
where lower(email) in ('jashgandhicreator07@gmail.com', 'acimotreyothy@gmail.com')
on conflict do nothing;

-- 3) UPI CLAIMS: "I paid, here is my 12-digit UPI reference (UTR)".
--    A claim alone grants nothing. It turns into Gold only when
--    (a) YouPI has already seen that exact credit (upi_credits), or
--    (b) an admin checks the bank app and taps Approve.
create table if not exists public.upi_claims (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  order_id     text,
  plan         text not null,
  amount_paise integer not null,
  utr          text not null unique check (utr ~ '^[0-9]{12}$'),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note         text,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid
);
create index if not exists upi_claims_status_idx on public.upi_claims (status, created_at desc);
create index if not exists upi_claims_user_idx on public.upi_claims (user_id, created_at desc);
alter table public.upi_claims enable row level security;
drop policy if exists "read own claims" on public.upi_claims;
create policy "read own claims" on public.upi_claims for select using (auth.uid() = user_id);
revoke insert, update, delete on public.upi_claims from anon, authenticated;

-- 4) UPI CREDITS the gateway has really seen (signed youpi-webhook only).
create table if not exists public.upi_credits (
  utr          text primary key,
  amount_paise integer not null,
  order_id     text,
  used_by      uuid,
  received_at  timestamptz not null default now()
);
alter table public.upi_credits enable row level security;
-- no policies: server only.

-- 5) ONE way to grant Gold, used by every payment path.
--    - extends a live membership instead of resetting it
--    - a PDF pass never extends or downgrades live full Gold
--    - full Gold bought during a PDF pass starts today (no stacking trick)
--    - the founder row is never touched
create or replace function public.grant_gold(p_user uuid, p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  d        integer;
  stored   text;
  cur_exp  timestamptz;
  cur_plan text;
  live     boolean := false;
  base     timestamptz;
  exp      timestamptz;
begin
  d := case p_plan when 'gold_monthly' then 30 when 'gold_yearly' then 365 when 'pdf_75d' then 75 else 0 end;
  if d = 0 then raise exception 'unknown plan %', p_plan; end if;
  stored := replace(p_plan, '_', '-');
  select expires_at, plan into cur_exp, cur_plan from gold_members where user_id = p_user for update;
  live := coalesce(cur_exp > now(), false);
  if cur_plan = 'founder' then return cur_exp; end if;
  if live and cur_plan <> 'pdf-75d' and p_plan = 'pdf_75d' then return cur_exp; end if;
  if live and not (cur_plan = 'pdf-75d' and p_plan <> 'pdf_75d') then base := cur_exp; else base := now(); end if;
  exp := base + make_interval(days => d);
  insert into gold_members (user_id, plan, activated_at, expires_at)
  values (p_user, stored, now(), exp)
  on conflict (user_id) do update
    set plan = excluded.plan, activated_at = excluded.activated_at, expires_at = excluded.expires_at;
  return exp;
end $$;
revoke all on function public.grant_gold(uuid, text) from public, anon, authenticated;
grant execute on function public.grant_gold(uuid, text) to service_role;

-- 6) Readers can never write their own Gold, orders or codes (belt and braces).
--    (each line is skipped if that table does not exist in your project)
do $$
begin
  if to_regclass('public.gold_members') is not null then
    execute 'revoke insert, update, delete on public.gold_members from anon, authenticated';
  end if;
  if to_regclass('public.gold_orders') is not null then
    execute 'revoke insert, update, delete on public.gold_orders from anon, authenticated';
  end if;
  if to_regclass('public.gold_codes') is not null then
    execute 'revoke all on public.gold_codes from anon, authenticated';
  end if;
  if to_regclass('public.gold_paid_events') is not null then
    execute 'revoke all on public.gold_paid_events from anon, authenticated';
  end if;
end $$;

-- Done. Then deploy (see docs/GOLD-PAYMENTS.md):
--   supabase functions deploy gold-order
--   supabase functions deploy upi-claim
--   supabase functions deploy upi-admin
--   supabase functions deploy youpi-webhook --no-verify-jwt
--   supabase functions deploy razorpay-webhook --no-verify-jwt
--   supabase functions deploy redeem-gold
