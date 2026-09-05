# Supabase — do this, then this, then this

No jargon. Just follow the numbers. **About 20 minutes.**

You never write code. You copy a block, paste it, click Run.

---

# PART 1 — Create the tables (8 min)

### 1.1 Open the dashboard
Go to → **https://supabase.com/dashboard**

Sign in with the account you made the project on.

### 1.2 Click your project
You will see a list of projects. Click the one called
**`wdmxcewmyofihgrheuas`** (or whatever you named it).

### 1.3 Open the SQL Editor
Look at the **left sidebar**. Find the icon that looks like `>_`
labelled **SQL Editor**. Click it.

### 1.4 Start a new query
Click the **+ New query** button at the top.

You now have a big empty white box. That's where you paste.

### 1.5 Copy the block below
Click the copy button on this block. Copy **all** of it.

```sql
-- THESMALLBOOK - core tables. Safe to run more than once.

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
  constraint username_format check (
    username is null or username ~ '^[a-z0-9_]{3,20}$'
  )
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public"
  on public.profiles for select using (true);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update using (auth.uid() = id);

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

### 1.6 Paste it into the box
Click inside the white box. Paste.

### 1.7 Click RUN
Green **Run** button, bottom right. (Or press Ctrl+Enter / Cmd+Enter.)

### 1.8 Check what it says
You should see:

> **Success. No rows returned.**

✅ That is correct. It means it worked.
These commands *create* things — they don't hand data back.

❌ If you see red text, skip to **Part 5 — When it goes wrong**.

---

# PART 2 — Create the avatars folder (5 min)

This is where profile pictures get stored.

### 2.1 Click Storage
**Left sidebar** → **Storage**.

### 2.2 New bucket
Click **New bucket**.

### 2.3 Name it exactly
Type: `avatars`

All lowercase. No capitals, no spaces, no "s" missing.

### 2.4 Make it public
Find the **Public bucket** toggle. Turn it **ON**.

> This only means *pictures are viewable*. It does not let strangers
> upload — the next step handles that.

### 2.5 Save
Click **Save**.

### 2.6 Lock down who can upload
Go back to **SQL Editor** → **+ New query**.

Paste this and click **Run**:

```sql
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

Again: **Success. No rows returned.** ✅

---

# PART 3 — Check the sign-in URLs (4 min)

### 3.1 Confirm Google is on
**Left sidebar** → **Authentication** → **Providers** → click **Google**.

It should already say enabled. If not, turn it on.

### 3.2 Set the URLs
**Left sidebar** → **Authentication** → **URL Configuration**.

**Site URL** — type exactly:
```
https://thesmallbook.in
```

**Redirect URLs** — click *Add URL* and add these **two**, one at a time:
```
https://thesmallbook.in/login.html
https://www.thesmallbook.in/login.html
```

Click **Save**.

### 3.3 Match them in Google
Open → **https://console.cloud.google.com/apis/credentials**

Click your OAuth client (the one ending in
`...ov6841eq.apps.googleusercontent.com`).

Under **Authorised redirect URIs**, these **three** must be listed:
```
https://wdmxcewmyofihgrheuas.supabase.co/auth/v1/callback
https://thesmallbook.in/login.html
https://www.thesmallbook.in/login.html
```

Add any that are missing. Click **Save**.

> ### ⚠️ Do not remove `login.html`
> I know it looks like an old file you asked me to get rid of. It is the
> address Google is registered to send people back to. The app now bounces
> you off it instantly — you never see that page. **Delete it from these
> lists and sign-in stops working completely.**

---

# PART 4 — Prove it worked (3 min)

### 4.1 List your tables
**SQL Editor** → **+ New query** → paste → **Run**:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

You should see **three rows**:

| table_name |
|---|
| profiles |
| progress |
| stories |

If all three are there, the database is done. ✅

### 4.2 The real test
1. Open your site
2. Sign in with Google
3. Come back here → **left sidebar** → **Table Editor** → click **profiles**

**A row should be sitting there with your name and your Google picture.**

That row is the proof. If you see it, everything is wired up correctly.

---

# PART 5 — When it goes wrong

**Red error: "relation auth.users does not exist"**
Wrong project. Check the project name at the top-left and switch.

**Red error: "must be owner of table objects"**
You ran Part 2.6 before creating the bucket. Do steps 2.1–2.5 first.

**Red error: "policy already exists"**
Harmless — it means you ran it twice. Already done.

**Signed in, but `profiles` is empty**
The auto-create trigger only fires for *new* sign-ups. Your account already
existed. Run this once to backfill:
```sql
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data->>'full_name', email)
from auth.users
on conflict (id) do nothing;
```

**Sign-in redirects to a blank or error page**
A URL in Part 3 doesn't match. They must be *exact* — `https`, no trailing
slash, and `login.html` present in all of them.

---

# Never do these

- ❌ **Never paste a `service_role` key into the website code.** It bypasses
  every security rule. The `anon` key already in `js/config.js` is the
  correct one and is safe to be public.
- ❌ **Never delete `login.html`.**
- ❌ **Never turn off Row Level Security** on `profiles` or `stories`. Those
  policies are the only thing stopping strangers editing other people's data.

---

# Why this matters

Right now, without these tables:

> Someone writes a story on your site → the app tries to save it → the save
> fails silently → it gets written to *their own browser only*. They see it
> and assume it published. **Nobody else can ever see it.** They clear their
> browser, it's gone.

Part 1 fixes that permanently.

---

# When you're finished

Tell me it's done and I'll switch on:
- Real profiles — name and photo in the You panel, synced across devices
- Community stories that are genuinely public
- Follows, likes and saves backed by real tables
