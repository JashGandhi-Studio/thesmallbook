# 🚀 TheSmallBook → Real-Time with Supabase (Playbook)

Goal: turn the static PWA into a live community app — **real-time stories, reactions,
chat, uploads and "who's reading now" presence** — without losing the instant,
installable, offline-friendly shell we have today.

Your project already has half the bridge built: `js/config.js` holds
`SUPABASE_URL` + `SUPABASE_ANON_KEY`, and `js/auth.js` already signs users in with
**Google via Supabase Auth (PKCE)** and stores a real Supabase session
(`tsb_auth_session` with `access_token` / `refresh_token`). Everything below plugs
into that.

---

## 0) Architecture in one picture

```
Browser (static PWA on GitHub Pages / thesmallbook.in)
   │  supabase-js v2 (or plain fetch + access_token, like today)
   ▼
Supabase ── Auth (Google OAuth)        ← already live
        ├── Postgres (profiles, stories, reactions, messages)
        │     └── Realtime (postgres_changes / presence / broadcast)
        ├── Storage (avatars, story covers/PDFs)
        └── Edge Functions (moderation, rate-limits, badges)
```

Rules we keep from the current app:
- Shell stays **cache-first** via `sw.js`; only *data* goes network/realtime.
- Every write is **optimistic** (render locally, reconcile on server echo).
- Everything degrades gracefully when keys are missing (like `auth.js` does).

---

## 1) Project setup (10 minutes)

1. supabase.com → your project (region **Mumbai** already chosen).
2. Authentication → Providers → Google: already configured for `thesmallbook.in`.
3. SQL Editor → run the schema below (section 2).
4. Database → Replication → enable Realtime on the new tables (or the
   `alter publication` statements in section 4).
5. Storage → create buckets `avatars` and `story-media` (section 6).
6. Copy nothing new into `config.js` — URL + anon key are already there.

---

## 2) Database schema (run in SQL Editor)

```sql
-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Reader',
  avatar_url text,
  bio text default '',
  streak_best int not null default 0,
  lessons_read int not null default 0,
  created_at timestamptz not null default now()
);

-- auto-create a profile row when a user signs in with Google
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', 'Reader'),
          coalesce(new.raw_user_meta_data->>'avatar_url', null))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- STORIES (community posts) ----------
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) <= 20000),
  book_id text,                 -- optional link into the library
  cover_url text,
  status text not null default 'published',  -- published | flagged | hidden
  created_at timestamptz not null default now()
);
create index if not exists stories_created_idx on public.stories (created_at desc);

-- ---------- REACTIONS (❤️ 🔥 🧠 … per story per user) ----------
create table if not exists public.story_reactions (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id, emoji)
);

-- ---------- CHAT MESSAGES (rooms: 'lobby' + one per book) ----------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'lobby',
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now()
);
create index if not exists chat_room_time_idx on public.chat_messages (room, created_at desc);

-- ---------- REPORTS (community moderation) ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null,           -- 'story' | 'message'
  target_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);
```

### Row Level Security (the whole security model)

```sql
alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.story_reactions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.reports enable row level security;

-- profiles: everyone reads, owner writes
create policy "profiles public read" on public.profiles for select using (true);
create policy "profile own update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- stories: everyone reads published, owners manage theirs
create policy "stories public read" on public.stories
  for select using (status = 'published' or author_id = auth.uid());
create policy "story own insert" on public.stories
  for insert with check (auth.uid() = author_id and status = 'published');
create policy "story own update" on public.stories
  for update using (auth.uid() = author_id);
create policy "story own delete" on public.stories
  for delete using (auth.uid() = author_id);

-- reactions: public read (live counts), signed-in users toggle their own
create policy "reactions public read" on public.story_reactions for select using (true);
create policy "reaction own insert" on public.story_reactions
  for insert with check (auth.uid() = user_id);
create policy "reaction own delete" on public.story_reactions
  for delete using (auth.uid() = user_id);

-- chat: public read, signed-in write
create policy "chat public read" on public.chat_messages for select using (true);
create policy "chat own insert" on public.chat_messages
  for insert with check (auth.uid() = user_id);

-- reports: signed-in users file them; only owner reads theirs
create policy "report own insert" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "report own read" on public.reports
  for select using (auth.uid() = reporter_id);
```

### Rate limiting (stop spam without an Edge Function)

```sql
-- max 1 story per 5 minutes, max 20 messages per minute per user
create or replace function public.assert_rate_limit(kind text, lim int, window_sec int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if kind = 'story' and exists (
      select 1 from public.stories
      where author_id = auth.uid()
        and created_at > now() - make_interval(secs => window_sec))
  then raise exception 'slow down — one story per % seconds', window_sec; end if;
  if kind = 'message' and (
      select count(*) from public.chat_messages
      where user_id = auth.uid()
        and created_at > now() - make_interval(secs => window_sec)) >= lim
  then raise exception 'slow down — message limit reached'; end if;
end; $$;
```
Call it from the client before insert (or wrap inserts in an RPC for hard limits).

---

## 3) Auth bridge — reuse the session you already have

`js/auth.js` stores `{ access_token, refresh_token }` in `tsb_auth_session`.
Hand it to supabase-js once per page and every helper below just works:

```js
// js/realtime.js  (new file — include after config.js + auth.js)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CFG = window.TSB_CONFIG || {};
export const sb = createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false } // auth.js owns tokens
});

export async function adoptSession() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem("tsb_auth_session")); } catch (e) {}
  if (s && s.access_token && s.refresh_token) {
    const { error } = await sb.auth.setSession({
      access_token: s.access_token, refresh_token: s.refresh_token
    });
    if (error) console.warn("session adopt failed", error);
  }
  return sb.auth.getSession();
}
```
(If you prefer zero modules: the same works with plain `fetch` +
`Authorization: Bearer <access_token>` against `/rest/v1/...` — exactly how
`auth.js` syncs progress today. Realtime channels, however, need supabase-js.)

---

## 4) Realtime — the three channel types you'll use

```sql
-- turn on WAL publication for the live tables
alter publication supabase_realtime add table public.stories;
alter publication supabase_realtime add table public.story_reactions;
alter publication supabase_realtime add table public.chat_messages;
```

```js
// ---------- LIVE STORIES FEED (stories.html) ----------
export function liveStories(onNew) {
  return sb.channel("stories-feed")
    .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "stories" },
        (msg) => onNew(msg.new))          // prepend with a slide-in animation
    .subscribe();
}

// ---------- LIVE REACTION COUNTS ----------
export function liveReactions(storyId, onCount) {
  return sb.channel("reactions-" + storyId)
    .on("postgres_changes",
        { event: "*", schema: "public", table: "story_reactions",
          filter: "story_id=eq." + storyId },
        () => recount(storyId).then(onCount))
    .subscribe();
}

// ---------- BOOK CHAT ROOM (book.html?id=X → room "book:X") ----------
export function liveChat(room, onMessage) {
  return sb.channel("chat-" + room, { config: { presence: { key: uid() } } })
    .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages",
          filter: "room=eq." + room },
        (msg) => onMessage(msg.new))
    // "3 readers here right now" — presence, free on the same channel
    .on("presence", { event: "sync" }, (e) => {
      const n = Object.keys(sb.channel("chat-" + room).presenceState() || {}).length;
      document.dispatchEvent(new CustomEvent("tsb-presence", { detail: { room, count: n } }));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") await sb.channel("chat-" + room).track({ since: Date.now() });
    });
}

// ---------- TYPING INDICATOR (broadcast — never touches the DB) ----------
export function typing(room, name) {
  sb.channel("chat-" + room).send({ type: "broadcast", event: "typing", payload: { name } });
}
```

### Optimistic UI pattern (keep the app feeling instant)

1. User taps ❤️ → update the DOM **immediately**, remember a temp id.
2. `await sb.from("story_reactions").upsert({...})`.
3. The realtime echo arrives → reconcile by `(story_id, user_id, emoji)`,
   drop the temp row. On error → roll the DOM back + toast "offline — queued".
4. Offline? Push the mutation into the existing `queueSync` pattern from
   `auth.js` and replay on `window.online`.

---

## 5) Where each piece lands in THIS repo

| Feature | File to touch | How |
|---|---|---|
| Live story feed + post box | `js/stories.js`, `stories.html` | seed list becomes fallback; `liveStories()` prepends server rows; post form → `sb.from('stories').insert()` when signed in |
| Reactions under stories | `js/stories.js` | pill row ❤️🔥🧠; `liveReactions()` per visible card |
| "Readers here now" badge | `js/book.js` hero badges | presence count from the book room channel |
| Book chat tab | `book.html` action bar → new `room.html?id=X` | `liveChat("book:"+id)` |
| Global lobby chat | `chat.html` (add a "Community" tab next to library search) | `liveChat("lobby")` |
| Profile sync (streak, lessons) | `js/prefs.js` + `settings.html` | on `tsb:sync`, upsert `profiles.lessons_read/streak_best` |
| Avatars & covers | `settings.html` / post form | Storage upload (section 6) |
| Sign-in sheet / account | already done this release | `login.html` reads `profiles` for the hero card |

---

## 6) Uploads (Storage) — avatars & story media

Buckets: `avatars` (public read, 1 MB max), `story-media` (public read, 5 MB max).

```sql
-- storage policies (run in SQL editor)
create policy "avatar own upload" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatar public read" on storage.objects for select
  using (bucket_id in ('avatars','story-media'));
create policy "media own upload" on storage.objects for insert
  with check (bucket_id = 'story-media' and auth.uid()::text = (storage.foldername(name))[1]);
```

```js
export async function upload(file, bucket) {
  const uid = sb.auth.getUser().then(r => r.data.user.id);
  const path = `${await uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { data, error } = await sb.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
```
Upload with a progress bar (`XMLHttpRequest` or `resumable`), insert the returned
URL into `stories.cover_url` / `profiles.avatar_url`, show it optimistically from
a local `objectURL` until the server URL resolves.

---

## 7) Moderation & safety (do before opening to the public)

- RLS above = baseline. Never trust the client for `status`.
- `reports` table + a cron/Edge Function that auto-hides a story at ≥3 reports
  (`update stories set status='flagged'`) and emails you.
- Edge Function `moderate` (optional): call OpenAI/Detoxit on new story bodies,
  set `status='hidden'` on toxicity > threshold. Trigger on insert.
- Storage: 5 MB cap, image/pdf MIME allow-list in bucket settings.
- Keep `chat_messages` at 600 chars; render with `textContent`, never `innerHTML`
  (your `ask.js` already escapes — copy that habit).

---

## 8) Offline, service worker & costs

- `sw.js` stays cache-first for shell/covers. Realtime data is **never cached** —
  it's either live or shows the bundled seed with a "reconnecting…" chip.
- Supabase Realtime reconnects automatically; on `REALTIME_DISCONNECTED` show the
  chip, on reconnect re-fetch the last page of each list (idempotent).
- Free tier headroom: ~500 MB DB, 1 GB storage, 200 concurrent realtime clients —
  plenty until you're past a few thousand daily readers; then Pro ($25) lifts it.

---

## 9) Rollout plan (ship in this order)

1. **Week 1 — Profiles:** schema + `adoptSession()`; account page shows cloud
   streak/lessons from `profiles`. Zero UI risk.
2. **Week 2 — Stories live:** post box + live feed + reports. Keep seed stories
   as the offline fallback.
3. **Week 3 — Reactions + presence:** hearts on stories, "reading now" badges.
4. **Week 4 — Chat rooms:** lobby in `chat.html`, per-book rooms from the reader.
5. **Week 5 — Uploads:** avatars + story covers; then PDFs behind TSB GOLD.

Each phase is a separate `CACHE_VERSION` bump in `sw.js` and a separate zip
replace — same workflow as always. Rollback = previous zip + RLS keeps data safe.

---

## 10) Test locally before touching prod

```bash
supabase init && supabase start        # local stack on :54321
supabase db push                       # apply schema above
supabase functions serve               # if you add edge functions
```
Point `config.js` at `http://127.0.0.1:54321` + local anon key while testing,
then flip back to prod keys in the same file when shipping.

---

**TL;DR:** schema + RLS (section 2) → publication on (section 4) →
`js/realtime.js` with `adoptSession()` (section 3) → wire feed/reactions/chat per
the table in section 5 → uploads (6) → moderation (7) → ship weekly (9).
Your Google sign-in, action bar and chat UI are already the front door — this
playbook only adds the live wires behind them.
