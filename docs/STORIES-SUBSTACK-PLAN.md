# 📬 Making STORIES a real publishing community (Substack-class)
_TheSmallBook — live plan. Read top to bottom, follow the route you pick._

Today: Stories = community posts saved on-device + optional cloud blob.
Goal: people **post, follow, comment, like, get notified** — like Substack.

There are two good routes. Route A keeps everything inside thesmallbook.in
(recommended). Route B uses Substack itself as the social layer.
Route C = hybrid of both.

---

## ROUTE A — "Substack features, our home" (recommended)
We already have Supabase (Google login + cloud sync). We add 4 tables and
I build the feed UI. You own everything, no monthly fee, no platform risk.

### Step 1 — You, in Supabase Console (~10 min)
1. Open https://supabase.com/dashboard → your project → **SQL Editor**.
2. Paste & RUN this exact script (creates tables + row-level security):

```sql
-- IDEEMPOTENT: safe to re-run any time (fixes "policy already exists")
-- tables (keeps existing data)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  author_name text not null,
  author_avatar text,
  title text not null,
  subtitle text,
  cover_url text,
  body text not null,
  tags text[] default '{}',
  created_at timestamptz default now()
);
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  author_id uuid not null,
  author_name text not null,
  body text not null,
  created_at timestamptz default now()
);
create table if not exists public.likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
create table if not exists public.follows (
  follower_id uuid not null,
  author_id uuid not null,
  created_at timestamptz default now(),
  primary key (follower_id, author_id)
);
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
-- clean slate for policies, then recreate
drop policy if exists "read all"  on public.posts;
drop policy if exists "write own" on public.posts;
drop policy if exists "read all c" on public.comments;
drop policy if exists "write own c" on public.comments;
drop policy if exists "read all l" on public.likes;
drop policy if exists "write own l" on public.likes;
drop policy if exists "del own l"  on public.likes;
drop policy if exists "read all f" on public.follows;
drop policy if exists "write own f" on public.follows;
drop policy if exists "del own f"  on public.follows;
create policy "read all"  on public.posts    for select using (true);
create policy "write own" on public.posts    for insert with check (auth.uid() = author_id);
create policy "read all c" on public.comments for select using (true);
create policy "write own c" on public.comments for insert with check (auth.uid() = author_id);
create policy "read all l" on public.likes   for select using (true);
create policy "write own l" on public.likes   for insert with check (auth.uid() = user_id);
create policy "del own l"  on public.likes   for delete using (auth.uid() = user_id);
create policy "read all f" on public.follows for select using (true);
create policy "write own f" on public.follows for insert with check (auth.uid() = follower_id);
create policy "del own f"  on public.follows for delete using (auth.uid() = follower_id);
```

3. Done. Tell me "tables live" and I ship the UI round:
   - `stories.html` becomes a **feed** (following / all tabs, cover cards, like counts)
   - `story.html` becomes a **post page** (rich text, comments thread, like button, follow author)
   - **Composer sheet**: title, subtitle, cover upload, markdown body, tags
   - **Notifications bell** (new comment / like / follow) via Supabase Realtime
   - Author profiles (`you` window gains "My posts / My followers")

### Step 2 — Moderation & safety (same console)
- Authentication → Providers: keep Google on.
- Add a `reports` table later if needed; for now delete abuse directly in
  Table Editor (you are the moderator).

### Step 3 — Email newsletter (the Substack magic) — optional
- Supabase → Edge Functions, or free Brevo/Mailchimp tier: on new post,
  email followers. I wire the trigger once you pick a mail provider.

---

## ROUTE B — Substack as the community layer
Use Substack's built-in comments/likes/newsletter; the app drives traffic to it.

### Your steps (click-by-click, ~30 min)
1. https://substack.com → **Sign up** with the same Google account as the site.
2. **Create publication** → name: `TheSmallBook` → subdomain `thesmallbook.substack.com`.
3. Dashboard → **Settings → Publication details**: upload the 📕 logo,
   set brand colour `#ffc800`, description = site tagline.
4. **Settings → Domain**: "Use custom domain" → e.g. `read.thesmallbook.in` →
   add the CNAME record Substack shows you in your DNS provider
   (host: `read`, value: `charts.substack.com` or as shown, proxy OFF).
5. **Settings → Comments**: enable → "All subscribers can comment" →
   turn ON likes + recommendations.
6. **Settings → Emails**: welcome email ON (write: "You're in the library…").
7. **Write → New post**: publish the welcome post ("Why TheSmallBook Stories
   is moving here") + pin it.
8. **Grow**: I add a Substack subscribe card + "Discussion happens on
   Substack" band to `stories.html`, plus footer link site-wide.

### Limits to know
- Substack has **no public write API** → app posts can't auto-publish there
  (except "post by email": Settings → Emails → enable, then the app's
  publish flow emails your post address — I can wire that).
- Comments live only on Substack; in-app stories stay read-only previews.

---

## ROUTE C — Hybrid (best of both, most work)
Feed + comments in-app (Route A) **and** a Substack mirror for email reach:
publish in-app → auto-email to your Substack post address → newsletter goes
out; readers comment either place. Do Route A first, add the mirror later.

---

## Comparison
| | Route A (Supabase) | Route B (Substack) | Route C |
|---|---|---|---|
| Cost | €0 (free tier) | €0 | €0 |
| Comments/likes in-app | ✅ | ❌ (on Substack) | ✅ |
| Email newsletter | build later | ✅ instant | ✅ |
| You own the data | ✅ | ⚠️ Substack | ✅ |
| My build time | 1 round | 0 (embed only) | 2 rounds |
| Login reuse (Google) | ✅ same session | separate | ✅ |

**My recommendation: Route A now, add Route B's newsletter later if you want emails.**

---

## Make today's build live first (5 min)
1. Extract `thesmallbook-update.zip` (v186).
2. Upload CONTENTS to the repo (never the zip) — see DEPLOY-GUIDE.md.
3. Verify `thesmallbook.in/sw.js` = `tsb-v186`; reopen tab on phone.
4. Test: Settings → APP DISPLAY SIZE (Default/Big/Bigger), phone with huge
   system font now shows the app at the app's own proper scale.
5. Then pick a route above and say the word — tables SQL is ready to paste.

---

## SQL #2 — COMMUNITY ROUND (run AFTER SQL #1, before deploying v187)
Idempotent — safe to re-run. Adds profiles, voice stories and file storage.

```sql
-- profiles (name / avatar / bio)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Reader',
  avatar_url text,
  bio text default '',
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "read all p" on public.profiles;
drop policy if exists "upsert own p" on public.profiles;
drop policy if exists "update own p" on public.profiles;
create policy "read all p" on public.profiles for select using (true);
create policy "upsert own p" on public.profiles for insert with check (auth.uid() = id);
create policy "update own p" on public.profiles for update using (auth.uid() = id);

-- voice stories + post kind
alter table public.posts add column if not exists audio_url text;
alter table public.posts add column if not exists kind text default 'text';

-- storage buckets (covers / voice / avatars), public read
insert into storage.buckets (id, name, public) values ('tsb-covers', 'tsb-covers', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('tsb-audio', 'tsb-audio', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('tsb-avatars', 'tsb-avatars', true) on conflict (id) do nothing;
drop policy if exists "public read storage" on storage.objects;
drop policy if exists "auth write storage" on storage.objects;
drop policy if exists "auth update own storage" on storage.objects;
drop policy if exists "auth delete own storage" on storage.objects;
create policy "public read storage" on storage.objects for select
  using (bucket_id in ('tsb-covers','tsb-audio','tsb-avatars'));
create policy "auth write storage" on storage.objects for insert
  with check (bucket_id in ('tsb-covers','tsb-audio','tsb-avatars') and auth.role() = 'authenticated');
create policy "auth update own storage" on storage.objects for update
  using (bucket_id in ('tsb-covers','tsb-audio','tsb-avatars') and owner = auth.uid());
create policy "auth delete own storage" on storage.objects for delete
  using (bucket_id in ('tsb-covers','tsb-audio','tsb-avatars') and owner = auth.uid());
```
