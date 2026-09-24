-- ============================================================
-- THESMALLBOOK · THE ONE SQL UPDATE (case wall + security lints)
-- Paste this whole file into Supabase → SQL Editor → Run. Once.
-- Safe to re-run. Your data is not touched. The app keeps working.
-- ============================================================

-- PART 1 · THE CASE FILE: the public verdict wall
-- (this time with the correct link to profiles.id — the line that
--  errored for you last time is fixed)
create table if not exists public.case_guesses (
  id          uuid primary key default gen_random_uuid(),
  case_id     text not null,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'A reader',
  body        text not null check (char_length(body) between 1 and 4000),
  image_url   text,
  created_at  timestamptz not null default now()
);
create index if not exists case_guesses_case_idx on public.case_guesses (case_id, created_at desc);

alter table public.case_guesses enable row level security;

drop policy if exists "case guesses are public to read" on public.case_guesses;
create policy "case guesses are public to read"
  on public.case_guesses for select using (true);

drop policy if exists "signed-in readers may post a verdict" on public.case_guesses;
create policy "signed-in readers may post a verdict"
  on public.case_guesses for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "authors manage own verdicts" on public.case_guesses;
create policy "authors manage own verdicts"
  on public.case_guesses for update to authenticated
  using (user_id = auth.uid());

-- PART 2 · THE LINTS: the error and the warnings that matter

-- 2a. THE ERROR: the follow-requests view read with the creator's powers.
--     From now it reads as the asking user. The inbox works the same.
alter view public.my_follow_requests set (security_invoker = true);

-- 2b. Two functions with a loose search_path: pinned to public.
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

-- 2c. Six social/account functions: signed-in readers only from now on.
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

-- 2d. The audio bucket could be listed like an open folder. Door closed.
--     Listening is untouched: players open each file's public link directly.
drop policy if exists "tsb-audio public read" on storage.objects;
drop policy if exists "tsb read storage" on storage.objects;
drop policy if exists "public read storage" on storage.objects;

-- PART 3 · the one warning no SQL can fix (do this in the dashboard):
-- Supabase Dashboard → Authentication → Sign In / Providers →
-- turn ON "Leaked password protection". It blocks passwords seen in breaches.
