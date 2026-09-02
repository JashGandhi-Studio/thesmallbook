# Phase 2 — Chat, Profile & Settings ✅

Self-check: `node tools/qa/check.js` → **122/122 passing**
Parity check: `node tools/qa/ask-parity.js` → **14/14 consistent**

---

## 1. Ask → Chat (same brain, real interface)

You said it plainly: *the ask button is now the chat button, the functioning is
the same.* That's exactly what shipped.

The matching engine was **extracted, not rewritten**, into `js/ask-core.js`:
the same keyword topic matcher, the same lesson scoring (title hit = 3 points,
body hit = 1), the same graveyard search, the same "guarantee an autopsy"
fallback. `tools/qa/ask-parity.js` proves the extracted engine and the resolver
agree on every query type.

What changed is only the presentation:

| Before | Now |
|---|---|
| Floating bubble over the page | Full page at `chat.html` |
| Popup panel, cramped | Message bubbles, avatars, typing indicator |
| Lost on navigation | History persists (40 turns) |
| — | Suggestion chips + contextual follow-ups |
| — | Deep-linkable: `chat.html?q=how+to+focus` |
| — | New-chat button |

Answers still open the exact lesson (`book.html?id=…#lesson-3`) or autopsy.

**The old bubble is retired, not deleted.** `js/ask.js` became a redirect shim,
so any existing "Ask" entry point routes to Chat instead of dead-ending.

## 2. You tab — real profiles

`js/profile.js` + `profile.html`. Signed out, it's a genuine pitch (sync,
streaks, posting, followers) rather than a wall. Signed in you get:

- **Avatar upload** — client-side compressed to 512px JPEG before upload,
  stored at `avatars/<user-id>/…` in Supabase Storage
- **@username** — live availability checking, debounced, with real rules:
  3–20 chars, letters/numbers/underscores, no digit-only names, and a
  **reserved list** (admin, support, thesmallbook, api…) so nobody squats
  anything important
- **Display name + bio**, edited in a bottom sheet
- **Stats** as colour blocks: books finished, lessons read, streak, saved
- Follower/following/posts counters (display-only until Phase 4 — see below)

The **You tab in the bottom bar shows your actual avatar** once signed in,
falling back to your initials, then the generic icon.

> **Deliberate:** counters read from the DB but are never written by the
> browser. If the client could set them, anyone could give themselves a million
> followers. In Phase 4 they become DB triggers driven by real `follows` rows.

**Graceful degradation:** if Supabase is unreachable, profiles fall back to
local-only storage and the UI still works. Avatar uploads fall back to a data
URL. Nothing dead-ends.

## 3. Settings — a real screen

`settings.html` + `js/settings.js`:

- **Theme** — Light / Dark / **Auto**, live preview swatches
- **Text size** — S / M / L / XL with a live preview paragraph
- **Language** — all **26** languages including your Hinglish and Gujlish modes
- **Notifications** — daily reminder, data saver
- **Account** — edit profile, sign in/out
- **Data & privacy** — export everything as JSON, clear local data

Export deliberately **excludes auth tokens**. Clearing local data keeps your
account and theme.

## 4. Supabase — action needed from you

`docs/SUPABASE-SETUP.md` has the SQL. **Until you run it, profiles are
local-only** (the app works, but they don't sync or persist server-side).

It creates the `profiles` table with RLS (anyone can read, you can only write
your own row), a DB-level username format constraint, and the `avatars` bucket
with folder-scoped policies so **one user can never overwrite another's photo**.

The doc includes a security check you should run yourself — an insert that must
fail while signed out. If it ever succeeds, tell me.

---

## On the UI reference

I applied the reference language to the **new** screens (dark canvas, colour
blocks, 24px radii, pill chips, circular ↗ actions, filled-square active tab).
The palette is wired and verified: coral `#FF5A47`, periwinkle `#6C63FF`,
butter `#FFC94D`, mint `#7FE3C4`.

**Being straight with you:** the *existing* pages (home shelf, book reader,
graveyard) still wear the old neo-brutalist skin. They inherit the new tokens,
so they're consistent and theme correctly — but they haven't been redrawn to
match the reference. That's a deliberate sequencing call: Phase 3 rebuilds the
homepage into the infinite feed, which is where that redesign belongs. Doing it
twice would waste the work.

If you'd rather I restyle the existing pages *before* building the feed, say so
and I'll reorder.

---

## What I could NOT verify

The sandbox blocks Playwright's Chromium download, so **there is no real-browser
or visual testing.** jsdom executes the scripts (so behaviour is genuinely
tested — 122 checks), but it cannot catch:

- how things actually *look*
- safe-area behaviour on a real iPhone
- scroll/keyboard interaction on a real device

**Please open the preview on your phone** and check the Chat composer sits above
the bottom bar when the keyboard opens, and that the bar clears the home
indicator. That's the one gap I can't close from here.

Also untested end-to-end: **avatar upload and username uniqueness against a real
Supabase**, because the tables don't exist yet. Run the SQL, then try it.

---

## Next — Phase 3: the infinite home feed
`posts` schema + RLS, infinite scroll, colour-block cards (quotes, lessons,
graveyard, community), like/save from the feed, reader view, Realtime.
This is where the homepage gets fully redrawn to the reference.
