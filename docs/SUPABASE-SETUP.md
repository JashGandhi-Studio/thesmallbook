# Supabase setup — Phase 2 (profiles + avatars)

Run this **once** in your Supabase project → **SQL Editor** → New query → Run.
Project: `wdmxcewmyofihgrheuas`

Until you run it, the app still works — profiles fall back to local-only
storage on the device. Running it makes profiles real, shared and permanent.

---

## 1. Profiles table

```sql
-- ── PROFILES ────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text not null default 'Reader',
  avatar_url   text default '',
  bio          text default '',
  followers    integer not null default 0,
  following    integer not null default 0,
  posts        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- username rules enforced in the DB, not just the UI
alter table public.profiles
  add constraint username_format
  check (username ~ '^[a-z0-9_]{3,20}$');

-- fast lookups for @handle URLs
create index if not exists profiles_username_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- anyone may READ a profile (public profiles, follower counts)
create policy "profiles are public"
  on public.profiles for select
  using (true);

-- you may only create YOUR OWN row
create policy "insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- you may only edit YOUR OWN row
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();
```

### Why counters are locked down
`followers`, `following` and `posts` are in the table but **must never be
written by the browser** — otherwise anyone can set their follower count to a
million. In Phase 4 they become database triggers driven by real rows in the
`follows` / `posts` tables. Until then they stay at 0 and are display-only.

---

## 2. Avatars storage bucket

Dashboard → **Storage** → **New bucket**
- Name: `avatars`
- **Public bucket: ON** (avatars are shown publicly)
- File size limit: `2 MB`
- Allowed MIME types: `image/jpeg, image/png, image/webp`

Then run:

```sql
-- ── AVATAR STORAGE POLICIES ─────────────────────────────────
-- anyone can view avatars
create policy "avatars are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- you may only upload into a folder named after your own user id
create policy "upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

The app uploads to `avatars/<user-id>/avatar-<timestamp>.jpg`, so the folder
check above means **one user can never overwrite another user's photo.**

---

## 3. Verify it works

1. Open the site → **You** tab → sign in with Google
2. You should see your name, an auto-generated `@username`, and stats
3. Tap the avatar → pick a photo → it should upload and persist after reload
4. Tap **Edit profile** → change the username → it should reject taken/reserved
   names live

In Supabase → **Table Editor** → `profiles`, you should see your row.

---

## 4. Security checks worth doing yourself

Paste this in the SQL Editor to confirm RLS is actually on:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'profiles';
-- rowsecurity must be TRUE
```

Then, in the browser console while **signed out**, this must fail:

```js
// should return an empty array or an error — never write
await fetch(SUPABASE_URL + '/rest/v1/profiles', {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'somebody-elses-uuid', username: 'hacker' })
});
```

If that insert ever succeeds, stop and tell me — the policy is wrong.

---

## Coming in later phases
- **Phase 3:** `posts`, `likes`, `saves` + Realtime
- **Phase 4:** `follows`, `comments`, `notifications`, `reports`, moderation
- **Phase 6:** `subscriptions` + the Razorpay webhook Edge Function
