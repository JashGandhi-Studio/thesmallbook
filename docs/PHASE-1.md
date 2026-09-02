# Phase 1 — Foundation ✅

Goal: put the v2 foundation in place **without changing a single feature**, so
nothing can break. Everything here is additive or a bridge.

Self-check: `node tools/qa/check.js` → **76/76 passing**
Local preview: `python3 -m http.server 8000`

---

## 1. Content counts corrected (you flagged this)

The site was still quoting the old numbers in places. Real counts verified
against the source data:

| | Was | Now |
|---|---|---|
| Books | 280 / 240 | **350** |
| Lessons | 1643 / 2170 | **2176** |
| Graveyard entries | 220 | **300** |

Fixed across **660 HTML pages** + `README.md`. A regression test now fails the
build if a stale count ever reappears.

## 2. Data split — 93% smaller first paint

`js/data.js` was a **3.4 MB blocking script** (1242 KB gzipped) on every page
load. Split by `tools/split-data.js` into:

| File | Size (gzip) | Loaded |
|---|---|---|
| `data/books-index.json` | **89 KB** | up front |
| `data/books/<id>.json` × 350 | ~3 KB each | per book, on demand |
| `data/lessons.json` | 699 KB | only for Lesson of the Day |
| `data/search-corpus.json` | 871 KB | only on deep search (≥4 chars) |

**1242 KB → 89 KB before first paint.** The index still carries lesson *titles*,
so shelf search keeps working instantly with no extra fetch.

`js/data-loader.js` exposes `TSB_DATA.ready() / .book(id) / .lessons() / .corpus()`,
caches shards, and repopulates `window.BOOKS` so **existing code is untouched**.

> `js/data.js` is intentionally still in the repo and still wired into the
> pages. Phase 3 swaps the pages over to the loader once the new feed renders
> from it — that way this phase can't regress anything.

## 3. Design tokens — `css/tokens.css`

The v2 language from your reference: dark-first canvas, saturated colour
blocks (coral / periwinkle / butter / mint), 24px radii, layered soft shadows,
heavy caps type.

- Full semantic layer (`--surface-*`, `--text-*`, `--accent`)
- Fluid type scale that can't overflow at 360px
- 4px spacing scale, z-index scale, motion tokens
- **Legacy bridge**: `--bg`, `--ink`, `--yellow`, `--shadow`, `--border` etc. are
  re-exported from tokens, so all 177 KB of `style.css` keeps working unchanged
- Global hard rules: no horizontal scroll, 44px min tap targets, safe-area
  insets, `prefers-reduced-motion` honoured

**Bug fixed:** `--maxw` was used 3× in `style.css` but never defined anywhere —
those rules were silently falling back to `max-width: auto`.

**Dark mode unified:** `style.css` had its own hardcoded `html.dark` palette that
would have fought the tokens. It now inherits the token surfaces, so legacy
chrome and the new shell share one palette.

## 4. Theme engine — `js/theme.js`

Three modes: **light / dark / auto** (auto follows the OS live).

- Pre-paint snippet upgraded on all 660 pages → **no flash**, `auto` included
- Still writes the legacy `'"dark"'` format, so **nobody loses their setting**
- Syncs across tabs, updates `theme-color`, emits `tsb:theme`

## 5. App shell — `js/shell.js` + `css/shell.css`

The bottom action bar from your reference: floating rounded bar, active tab in a
filled mint square, coral **+** FAB.

```
🏠 Home   📖 Read   ➕ Add   💬 Chat   👤 You
```

- Safe-area aware, hides on scroll-down, returns on scroll-up
- Active tab derived from the URL; full a11y (`aria-current`, labelled nav)
- Idempotent — `rebuild()` can't double-render

**SEO protection (the important part):**
- **Crawlers never see the shell** — Googlebot gets the exact page it indexed today
- `books/*.html` and `graveyard/*.html` stay untouched for anonymous visitors
- Signed-in readers get the app chrome on those same pages

`chat.html` and `profile.html` don't exist yet (Phases 4–5) — those two tabs are
wired and will resolve when the pages land.

## 6. Service worker

Bumped to `tsb-v170` so existing installs pull the new files. Precaches the new
CSS/JS + book index, and serves `/data/` shards stale-while-revalidate so new
content arrives without a cache bump.

---

## Self-check coverage (`tools/qa/check.js`)

Runs in jsdom — it *executes* the scripts rather than grepping them.
(The sandbox blocks Playwright's Chromium CDN; this is the substitute.)

- **Static integrity** — all 661 pages: no broken local asset refs, correct
  script/style wiring, `tokens.css` always before `style.css`
- **Data split** — index is lossless vs source, every book has a valid shard,
  every cover exists, ids unique, payload budget enforced
- **Counts** — no stale 280/240/1643/2170/220 anywhere
- **Service worker** — version bumped, new assets precached
- **CSS contract** — every `var()` resolves, braces balanced, mobile hard rules present
- **Runtime** — theme engine (all modes, persistence, legacy migration), shell
  (tab count, active state, a11y, idempotency, **bot guard**, **SEO-page guard**,
  relative paths at depth), data loader (350 books, shard fetch, caching, error handling)

---

## Not done in Phase 1 (by design)

Pages still load `js/data.js`; the loader runs alongside it. Swapping over is
Phase 3, when the feed renders from the new structure. The bar's Chat/You tabs
point at pages that arrive in Phases 4–5.

## Next — Phase 2: Auth & Onboarding
Email OTP, the 7-step onboarding with a real recommender, the 5-minute
crawler-safe gate, and the `profiles` table.
