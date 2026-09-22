# The one SQL file you need to run (2 minutes)

**What it does:** turns private accounts + follow requests into a real server feature, so an
`Accept` works instantly from any device and nobody can double-follow or forge a request.

**Where:** Supabase → your project → **SQL Editor** → **New query** → paste → **Run**.

**File:** `supabase/sql/follow-requests.sql`

---

## 1. Before you run it (optional, 10 seconds)

Want to see what your project already has? Run this on its own first:

```sql
select tablename, policyname, cmd from pg_policies
 where schemaname = 'public' and tablename in ('follows', 'profiles');
```

Nothing surprising there? Go to step 2. If you *do* see policies you wrote yourself, read the
"HEADS-UP ON EXISTING POLICIES" note at the top of the SQL file — PostgreSQL adds permissive
policies together, so an old policy stays in force next to the new ones. The file's own policies
are all named `tsb_*` so they are easy to find and remove later.

## 2. Run it

Paste the whole file and press **Run**. You should see `Success. No rows returned`.

Run it a second time if you like — it is written to be idempotent. Nothing is dropped, nothing is
renamed, and no existing column changes type.

## 3. Check it worked

```sql
-- should list the new table
select table_name from information_schema.tables
 where table_schema = 'public' and table_name = 'follow_requests';

-- should list 5 functions: request_follow, respond_follow_request,
-- cancel_follow_request, unfollow, touch_updated_at
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and proname like '%follow%';

-- your own inbox, right now (empty until somebody asks)
select * from public.my_follow_requests;
```

Then open the app, go to **People**, and follow a private account. It should say
**Requested ⏳** on your side and appear as **Follow requests** for them.

## 4. What changes in the app

**Nothing you have to do.** `js/community.js` checks for the table the first time it needs to make
a request:

- **table present** → requests go through the server (`request_follow`, `respond_follow_request`,
  `cancel_follow_request`). Accepts are instant, from either phone, with no app open on the other side.
- **table missing (you did not run the SQL)** → the app quietly falls back to the original
  handshake: each side writes a note into its own `profiles.links` column. Slower to settle, but
  it still works, so you are never blocked by forgetting this step.

You can see which mode is live from the browser console:

```js
TSB_COMMUNITY.requestsBackend()     // "server" or "links"
```

## 5. Exactly what the SQL touches

| Object | What happens | Risk |
|---|---|---|
| `public.profiles.is_public` | `add column if not exists` — already exists, so no-op | none |
| `public.profiles.prefs` | `add column if not exists` — new, unused by the UI today | none |
| `public.profiles.last_seen` | `add column if not exists` — optional, the app uses `links` for presence | none |
| `public.follows` | de-duplicates identical rows once, then adds a unique index + a no-self-follow check | one-time cleanup |
| `public.follow_requests` | new table + RLS + unique index | new object |
| 4 functions + 1 view | `create or replace`, all `SECURITY DEFINER` | new objects |
| grants to `anon` / `authenticated` / `service_role` | only what the app already does today | none |
| trigger `profiles_touch` | keeps `updated_at` honest | none |

Nothing is dropped except one trigger name that this same file owns, and no data is deleted
except duplicate `follows` rows that were already identical.

## 6. If something goes wrong

- **`permission denied for table follows`** — the grants at section 4b of the file did not run.
  Re-run the file; that section is guarded and idempotent.
- **A request never arrives** — check `select * from public.follow_requests;` as a signed-in user
  (you will only see rows you are part of, that is the RLS working), and confirm the person you
  asked has `is_public = false` in `profiles`.
- **You want to undo it** — every object is named, so:
  ```sql
  drop table if exists public.follow_requests cascade;
  drop view  if exists public.my_follow_requests;
  drop function if exists public.request_follow(uuid);
  drop function if exists public.respond_follow_request(uuid, boolean);
  drop function if exists public.cancel_follow_request(uuid);
  drop function if exists public.unfollow(uuid);
  ```
  The app goes back to the `links` handshake on its own, immediately.

---

*Verified against PostgreSQL 18 (the same engine Supabase runs) — 41 checks covering public
follows, private requests, accept, decline, mutual requests, self-follow, forged writes, RLS
visibility and idempotency. Test: `node tools/test_sql.mjs`.*
