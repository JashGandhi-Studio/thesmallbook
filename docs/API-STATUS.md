# API status — checked 2026-09-05

Project: `wdmxcewmyofihgrheuas.supabase.co`

## Verdict

The Supabase project is **alive and the anon key is valid**. The blocker is
that **the database is nearly empty** — two of the three tables the code
talks to do not exist.

## What was tested

| Check | Result |
|---|---|
| Project reachable | ✅ responds |
| Anon key accepted | ✅ authenticates (correctly rejects when omitted) |
| Key role / expiry | ✅ `anon`, valid until **2036-08-08** |
| Google OAuth enabled | ✅ `google: true` |
| Email auth enabled | ✅ (`mailer_autoconfirm: false` → confirmation required) |
| Signups open | ✅ `disable_signup: false` |
| `progress` table | ✅ exists, readable, currently empty (`[]`) |
| `stories` table | ❌ **does not exist** (`PGRST205`) |
| `profiles` table | ❌ **does not exist** (`PGRST205`) |

## Consequences in the running app

- **`js/store.js` silently degrades.** Every story read/write 404s, is caught
  by its `catch`, logs `Cloud load failed, using local:` and falls back to
  localStorage. Community stories therefore look fine to their author and are
  invisible to everyone else. This is a real data-loss path, not cosmetic.
- **Profiles are device-local**, as `docs/SUPABASE-SETUP.md` already notes.
- Nothing is broken server-side — this is purely missing schema.

## Fix

1. Run `docs/SUPABASE-SETUP.md` (creates `profiles` + the avatars bucket).
2. Add a `stories` table matching the `toRow`/`fromRow` mapping in
   `js/store.js`.

## Testing from this sandbox

`curl` to `*.supabase.co` fails with `SSL_ERROR_SYSCALL` / HTTP 000. That is a
**sandbox egress restriction, not a project fault** — `supabase.com`,
`accounts.google.com`, `api.razorpay.com` and `cloudflare.com` all fail
identically, while `api.github.com` succeeds. Verify through `fetch_page`
instead (different network path), passing the key as an `?apikey=` query
param since custom headers aren't available there.
