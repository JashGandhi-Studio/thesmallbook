# Supabase setup — complete step-by-step guide

Everything here is done in your browser. No terminal, no code.
Total time: **about 20 minutes.**

Project: `wdmxcewmyofihgrheuas.supabase.co`

---

## Why this matters right now

Your project is live and the key works, but **two tables the app needs do
not exist**. Today that causes a real, silent bug:

> A reader writes a community story → the app tries to save it → the save
> fails with a 404 → the error is caught and the story is written to their
> own browser instead. They see it and think it published. **Nobody else
> can ever see it.** If they clear their browser, it is gone forever.

Running Step 2 below fixes that permanently.

| Table | Status | What breaks without it |
|---|---|---|
| `progress` | ✅ exists | — |
| `profiles` | ❌ missing | Names, avatars, usernames cannot save |
| `stories` | ❌ missing | Community posts are invisible to everyone |

---

## Step 1 — Open the SQL editor (2 min)

1. Go to **https://supabase.com/dashboard**
2. Sign in and click your project (`wdmxcewmyofihgrheuas`)
3. In the left sidebar click **SQL Editor** (icon looks like `>_`)
4. Click **+ New query** at the top

You now have an empty box to paste into. Leave this tab open.

---

## Step 2 — Create the tables (5 min)

Copy **everything** in the block below, paste it into the SQL editor, and
click the green **Run** button (or press Ctrl/Cmd + Enter).

It is safe to run more than once — every statement uses `IF NOT EXISTS`.

```sql
-- ============================================================
-- THESMALLBOOK — core schema
-- Safe to re-run. Creates profiles + stories, with row level
-- security so people can only edit their own rows.
-- ============================================================

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  display_name text,
  avatar_url   text,
  bio          text,
  followers    integer not null default 0,
  following    integer not null default 0,
  posts        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- usernames: 3-20 chars, lowercase letters/numbers/underscore
  constraint username_format check (
    username is null or username ~ '^[a-z0-9_]{3,20}$'
  )
);

alter table public.profiles enable row level security;

-- anyone may read profiles (public pages), only you may change yours
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public"
  on public.profiles for select using (true);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ---------- STORIES ----------
create table if not exists public.stories (
  id         text primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  title      text not null,
  author     text,
  body       text,
  cover      text,
  book_id    text,
  date       timestamptz not null default now(),
  approved   boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.stories enable row level security;

drop policy if exists "stories are public" on public.stories;
create policy "stories are public"
  on public.stories for select using (true);

-- only signed-in users may post, and only as themselves
drop policy if exists "signed in may post" on public.stories;
create policy "signed in may post"
  on public.stories for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "edit own story" on public.stories;
create policy "edit own story"
  on public.stories for update using (auth.uid() = user_id);

drop policy if exists "delete own story" on public.stories;
create policy "delete own story"
  on public.stories for delete using (auth.uid() = user_id);

create index if not exists stories_date_idx on public.stories (date desc);

-- ---------- keep updated_at honest ----------
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

-- ---------- create a profile automatically on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**You should see:** `Success. No rows returned.` That is correct — these
statements create things, they do not return data.

---

## Step 3 — Create the avatars bucket (4 min)

1. Left sidebar → **Storage**
2. Click **New bucket**
3. Name: `avatars` (exactly, lowercase)
4. Toggle **Public bucket** → **ON**
5. Click **Save**

Now lock down who can write to it. Go back to **SQL Editor → New query**,
paste this, and **Run**:

```sql
-- anyone can view avatars; you can only write inside your own folder
drop policy if exists "avatars are public" on storage.objects;
create policy "avatars are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "upload own avatar" on storage.objects;
create policy "upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "replace own avatar" on storage.objects;
create policy "replace own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Step 4 — Check Google sign-in settings (5 min)

1. Left sidebar → **Authentication** → **Providers** → **Google**
   Confirm it is **enabled** (it already is).

2. Left sidebar → **Authentication** → **URL Configuration**

   - **Site URL:** `https://thesmallbook.in`
   - **Redirect URLs** — click *Add URL* for each of these:
     ```
     https://thesmallbook.in/login.html
     https://www.thesmallbook.in/login.html
     ```

3. Now open **https://console.cloud.google.com/apis/credentials**
   → click your OAuth client → under **Authorised redirect URIs**, make
   sure these exist:
   ```
   https://wdmxcewmyofihgrheuas.supabase.co/auth/v1/callback
   https://thesmallbook.in/login.html
   https://www.thesmallbook.in/login.html
   ```
   Click **Save**.

> ⚠️ **`login.html` must stay in these lists.** It looks like an old file,
> but it is the registered OAuth callback. The app immediately bounces you
> back to where you started — you never see that page. Removing it breaks
> sign-in entirely.

---

## Step 5 — Verify it worked (3 min)

In **SQL Editor**, run:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

**Expect to see:** `profiles`, `progress`, `stories`.

Then the real test:

1. Open the site, sign in with Google
2. Left sidebar → **Table Editor** → **profiles**
3. **A row should have appeared with your name and avatar.**

If that row is there, everything is wired correctly.

---

## Troubleshooting

**"relation auth.users does not exist"**
You are on the wrong project. Check the project name at the top left.

**"must be owner of table objects"** (Step 3)
Create the bucket through the Storage UI first — the policies need it to
already exist.

**Signed in, but no row in `profiles`**
The signup trigger only fires for *new* signups. For an account that
already existed, sign out and back in, or insert the row manually:
```sql
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data->>'full_name', email)
from auth.users
on conflict (id) do nothing;
```

**Stories still not showing for other people**
Hard-refresh once. Confirm `stories` appears in Step 5's list.

---

## What you do NOT need to do

- **Do not** put any secret key in the site code. The `anon` key already in
  `js/config.js` is meant to be public — row level security is what
  protects your data.
- **Do not** paste a `service_role` key anywhere. It bypasses all security.
- **Do not** delete `login.html`.

---

## After this is done

Tell me it is finished and I will:
- Turn on real profiles (name + avatar in the You panel, synced across devices)
- Make community stories genuinely public
- Wire follows, likes and saves to real tables
