-- ============================================================
-- THESMALLBOOK · THE ONE SQL (v285) · run this whole file ONCE.
-- Replaces the earlier version: safe even if you already ran it.
-- What it does, in order:
--   1. Verdicts become PRIVATE: only the writer and the
--      Founder account (acimotreyothy@gmail.com) can read them.
--      Dev tools, other readers, anon: nothing.
--   2. The wall shows only sealed tiles (case_plays).
--   3. Winner-contact email column.
--   4. The Supabase lint fixes (the error + the warnings).
-- Paste into Supabase → SQL Editor → Run. Nothing breaks if
-- some parts already exist: everything is "if missing, create".
-- If Supabase shows "Potential issues detected", press
-- RUN AND ENABLE RLS. The "destructive operations" warning is
-- expected: this file deletes the OLD public-read rules on
-- purpose. No data, tables or rows are removed.
-- ============================================================

-- 1 · THE SEALED PILE ----------------------------------------
create table if not exists public.case_guesses (
  id          uuid primary key default gen_random_uuid(),
  case_id     text not null,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'A reader',
  body        text not null check (char_length(body) between 1 and 4000),
  image_url   text,
  created_at  timestamptz not null default now()
);
alter table public.case_guesses add column if not exists email text;
create index if not exists case_guesses_case_idx on public.case_guesses (case_id, created_at desc);
alter table public.case_guesses enable row level security;

-- the staff list: you, by login email
create table if not exists public.case_staff (
  email text primary key
);
insert into public.case_staff (email)
values ('acimotreyothy@gmail.com')
on conflict (email) do nothing;
-- nobody reads or writes this list through the API: RLS on, zero
-- policies. The check below runs server-side with owner rights.
alter table public.case_staff enable row level security;

create or replace function public.tsb_is_case_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.case_staff s
    where s.email = auth.jwt() ->> 'email'
  );
$$;
revoke execute on function public.tsb_is_case_staff() from public;
revoke execute on function public.tsb_is_case_staff() from anon;
grant execute on function public.tsb_is_case_staff() to authenticated;

drop policy if exists "case guesses are public to read" on public.case_guesses;
drop policy if exists "owner or thesmallbook team read" on public.case_guesses;
create policy "owner or thesmallbook team read"
  on public.case_guesses for select
  using (
    user_id = auth.uid()
    or public.tsb_is_case_staff()
  );

drop policy if exists "signed-in readers may post a verdict" on public.case_guesses;
create policy "signed-in readers may post a verdict"
  on public.case_guesses for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "authors manage own verdicts" on public.case_guesses;
create policy "authors manage own verdicts"
  on public.case_guesses for update to authenticated
  using (user_id = auth.uid());

-- 2 · THE WALL TILES (no words, just who dared) ---------------
create table if not exists public.case_plays (
  id         uuid primary key default gen_random_uuid(),
  case_id    text not null,
  name       text not null default 'A reader',
  created_at timestamptz not null default now()
);
alter table public.case_plays enable row level security;
drop policy if exists "plays are public to read" on public.case_plays;
create policy "plays are public to read" on public.case_plays for select using (true);
drop policy if exists "signed-in readers may log a play" on public.case_plays;
create policy "signed-in readers may log a play"
  on public.case_plays for insert to authenticated with check (true);

-- 3 · THE LINTS (same as before, idempotent) ------------------
alter view public.my_follow_requests set (security_invoker = true);

do $$
declare f record;
begin
  for f in
    select oid::regprocedure as fn
      from pg_proc
     where pronamespace = 'public'::regnamespace
       and proname in ('touch_updated_at', 'tsb_login_gate_norm')
  loop
    execute format('alter function %s set search_path = public', f.fn);
  end loop;
end $$;

do $$
declare f record;
begin
  for f in
    select oid::regprocedure as fn
      from pg_proc
     where pronamespace = 'public'::regnamespace
       and proname in ('set_my_username', 'request_follow', 'cancel_follow_request',
                       'respond_follow_request', 'unfollow', 'tsb_cascade_post_delete')
  loop
    execute format('revoke execute on function %s from public', f.fn);
    execute format('revoke execute on function %s from anon', f.fn);
    execute format('grant execute on function %s to authenticated', f.fn);
  end loop;
end $$;

drop policy if exists "tsb-audio public read" on storage.objects;
drop policy if exists "tsb read storage" on storage.objects;
drop policy if exists "public read storage" on storage.objects;

-- 4 · one dashboard toggle, no SQL:
-- Authentication → Sign In / Providers → Leaked password protection → ON
