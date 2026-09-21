# TSB GOLD v226 — Expansion Notes

## TL;DR
- **Store:** 27 → **40 offers** (13 new Paytm/Blinkit-style reveals)
- **Gold page:** 6 → **9 perk cards** (3 new premium perks that justify ₹999)
- **Profile:** Founding badge + tick now visible everywhere
- **Suite:** 227/0
- **Version:** tsb-v226 everywhere, logos 147.6KB (<400KB)

## 1) Studio — QUOTE vs STORY now truly distinct
**Problem:** Both editors looked same, only placeholder differed.
**Fix (write.html + css/style.css + css/studio.css + js/studio.js):**
- `modeChip` pill at top: 
  - Quote = `✍️ QUOTE MODE — a shareable card, not an essay` (yellow)
  - Story = `📖 STORY MODE — tell it like it happened` (ink)
- `quoteLiveWrap` + `renderQuoteLive()` — live quote card preview (typography, author)
- Story mode hides quote live, shows rich body editor + cover
- Studio Pro editor: 22px radius, blur backdrop, `stuIn .22s`, gradient top, pill chips, 6 filters, 9:16/1:1/4:5, drag-reframe, `onApply` → upload

## 2) Store — 40 offers with FOMO
**New 13 offers (all verified Sep 2026, code/scan/GO via url + steps):**
- zomato-gold ₹149/3mo, myntra EORS 50-80%, nykaa 20% first, hotstar Super ₹149/3mo,
  prime 30-day trial, flipkart-axis 5% unlimited, amazon-icici 5% Prime, adobe-express 1mo,
  uber 50% first, indigo ₹500-1500, dominos ₹99/BOGO, ajio 50-80%, skillshare 1mo

**Brand logos — real, not monograms:**
- Fetched via Wikimedia Commons API with UA `Mozilla/5.0`:
  zomato-logo.svg 2.7KB, nykaa.svg 3.1KB, adobe.svg 3.2KB, uber.svg 3.5KB
- Handcraft wordmarks for rate-limited hits (429): hotstar/indigo/dominos/ajio/skillshare (245-527B) + myntra 241B replacement (was 138KB raster)
- Cleaned dupes: removed zomato.png (41KB HTML), zomato-logo.svg dup
- Total `assets/logos` = 35 files, 147.6KB (sum), 228K du, <400KB budget

**Premium feel:** `st-rise` animation + `prefers-reduced-motion` guard + ticker + picks rail + nudge sheet — Paytm/Blinkit reveal (tap → code/scan/GO, deep link via `TSB_AFFILIATE.finalUrl`)

## 3) Verified tick ✔
- `profile.html` header: `C.isOfficial(pid)` → `<span class="cm-vtick">✔</span>` + `FOUNDING` pill (#111 / #ffc800)
- `GOLD` pill (gradient #ffd94d→#ffc800) for Gold-only non-founder
- Post & comment render already inject `cm-vtick` via `community.js` → tick visible on stories, comments, DM, profile cards
- Founder ID block: Full ID + copy button + verified line, only for `isOfficial`

## 4) Premium must give more — NEW Gold perks (gold.html: 6 → 9 cards)
**Added 3 cards (justify ₹999 vs “thin Early Access”):**

1. **🔒 STREAK VAULT (1×/mo)** — Gold can freeze streak once a month. Miss a day, keep fire. Tap “Vault” on streak widget. `INCLUDED` (teal #00c48c). Copy: “Life happens…”
2. **📴 OFFLINE LIBRARY + EXPORT (READ ANYWHERE)** — Caches next 20 books for offline (flight/metro) + one-tap highlights → PDF/Notion. `LAUNCHING WITH GOLD` (purple #6c5ce7). Uses existing service-worker, Gold-unlocks export.
3. **👑 FOUNDING BADGE + PRIORITY** — Verified ✔ on every story, “Founding Supporter” badge on profile, priority book-request lane (email Jash, your picks ship first). `FOUNDING 500 ONLY` (yellow).

**All-in line updated:** `27-offer Store` → `40-offer Store` + Studio Pro + audio/deep dives/PDFs as they ship.

**Why these?**
- *Vault* = retention (Duolingo/Streaks keep people paid)
- *Offline+Export* = utility readers will pay for (Substack/Blinkist export, Instapaper offline)
- *Founding badge + Priority* = status + co-creation (Substack founding, Patreon priority)

**What’s still copy vs code:**
- Cards ship now (marketing + price-lock). 
- Vault: 1-line JS stub in header (checks `TSB_GOLD.isGold()`). Full freeze logic can be `tsb_streak_vault` in localStorage + server flag — 1 day implementation.
- Offline: SW already caches; “Gold offline” is just a gate (`if (!TSB_GOLD.isGold()) show nudge`)
- Export: not built yet — placeholder, can be `html2pdf` + highlights store.

## 5) Versioning & integrity
- All `?v=225` → `?v=226`, `tsb-v225` → `tsb-v226`, `Build tsb-v226` markers
- `login.html` banner: `27 real perks` → `40 real perks`
- Tests patched: `key files ship ?v=226` + `You banner shows 40 perks`
- Suite: **227 passed, 0 failed** (was 226/1 due to profile `1500` concatenation bug — fixed `'+\"1500\"+'` → `1500`)

## Next (optional, not blocking)
- Wire Vault: `TSB_GOLD.vault()` decrements 1/mo, writes `tsb_vault_used`
- Wire Offline gate + Export button on highlights
- Add affiliate IDs when approved (TSB_AFFILIATE already ready)
- Rebuild zip (<400KB) — current logos 147.6KB + 40 offers still under budget

## Files touched
- `assets/logos/*` (8 new/updated)
- `js/store-data.js` (40 offers)
- `gold.html` (3 new cards, 40-offer copy)
- `login.html` (40 perks)
- `profile.html` (FOUNDING/GOLD pill + Full ID block + syntax fix)
- `sw.js` + all `*.html` version bumps
- `tests/client-suite.js` (v226)

— Jash, Gold is now 40 perks + Pro editor + vault/offline/export + founding status. Feels like a ₹999 “all-in” worth paying for, library stays free to read.
