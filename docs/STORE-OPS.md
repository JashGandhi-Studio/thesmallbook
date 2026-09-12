# 🛍️ TSB STORE — OPERATIONS (v224)

## What the store is (and is not)
- **Is:** a curated shelf of *official brand programs* — free trials, new-user
  offers, official deal hubs — with Paytm-style reveal, steps, T&C and a
  disclaimer on every card. Readers feel (correctly) that we hand them real value.
- **Is not:** a scraper of grey coupon codes. Scraped codes die in days and can
  get you legal trouble. Official programs are legal, famous, and *actually work*.

## Unlock rules (in `js/store.js`)
1. 💛 **Gold** — paid plan.
2. ✍️ **Insider** — 3 published stories (`INSIDER_POSTS`), free forever. Grows the community.
3. 👑 **Founder** — either:
   - add your Gmail to `FOUNDER_EMAILS` at the top of `js/store.js` **before deploying**, or
   - set `OFFICIAL_ID` in `js/community.js` to your Supabase user id (you also get the ✔ badge).

## Adding / refreshing an offer (`js/store-data.js`)
Copy one object and edit. Required fields:
`id, brand, cat (books|food|shopping|learning|fun|travel), mono, color, tag,
value, title, desc, code (null unless the brand publishes a standing code),
url (official page only), steps[3], tnc[2-3]`.
Rules:
- **Official URLs only** — never a coupon aggregator.
- `steps` = what the reader taps; `tnc` = who is eligible + who runs it.
- The suite enforces every offer has https url + steps + tnc — you can't ship junk.
- Monthly: tap every offer once; dead ones get deleted or replaced
  (the "report dead offer" WhatsApp link also feeds you this).
- Bump the `verified` string when you do the monthly pass.

## Making it feel premium (already built in)
- First 3 offers open for everyone (the smell of the shop), rest blurred behind unlock.
- Reveal modal = dashed code box + COPY, numbered claim steps, T&C, disclaimer,
  big green partner CTA, dead-offer report link.
- Founder ribbon when founder-signed-in.

## Phase 2 (when you want zero manual work)
- GitHub Action weekly: fetch official deal pages/RSS (Amazon deals, Flipkart
  offers, brand blogs) → open a PR that *suggests* new `store-data.js` entries →
  you approve with one tap. OSINT-assisted, human-verified — the only sane combo.
- Track taps: add `?src=tsb-store` to outbound links later and count clicks in
  the partner's affiliate dashboards (Amazon Associates etc. = extra revenue on
  top — disclose it in the disclaimer when you switch links to affiliate ones).


---

## v224 — redesign notes (logos, picks, offer quality)

### Offer fields added in v224
| field | meaning |
|---|---|
| `logo` | file name inside `assets/logos/` — the **real brand mark**, shipped locally (no runtime calls to any logo CDN). |
| `bg` | tile background behind the logo (`#ffffff` for most; `#000000` for Spotify, `#fc8019` for Swiggy). |
| `worth` | the rupee figure the reader actually saves — must be verifiable (e.g. "Worth ₹169" = KU monthly price). |
| `top` | `true` → appears in the **Editor's picks** rail (keep it to 5–6; the first 3 offers in the array are the free teasers). |

### Adding a logo (2 minutes)
1. Prefer the brand's own SVG mark or a 256–512 px PNG. Sources that worked: `https://unavatar.io/<domain>` (returns the official icon), Wikimedia Commons `Special:FilePath/<File>.svg?width=400`, or the brand's press kit.
2. Save as `assets/logos/<brand>.svg|png`, keep it under 40 KB, and make sure an SVG has **no** `<script>` and no external `href`. The test suite blocks both.
3. Add the file to `sw.js` APP_SHELL so it's precached offline.
4. Logos are shown purely to identify the offer (nominative use) — the page footer and every reveal sheet carry the "logos belong to their owners / not affiliated" line. Never alter a logo's colours.

### Monthly verification — do it from a PHONE
Partner sites (Flipkart, Zepto, Swiggy, redBus, MakeMyTrip, bigbasket) bot-wall datacenter IPs — a server-side link check will show 403/202 challenge pages even though the pages are perfectly live for readers. Open each `url` in the Swiggy/Zepto/Flipkart **app or mobile browser**, confirm the offer text still matches `value` + `worth`, then bump `V` in `js/store-data.js`.

### Sep 2026 price facts baked into copy (re-check monthly)
Kindle Unlimited ₹169/mo · Audible ₹199/mo (Prime: 2 credits, promo) · Storytel ₹149 Select / ₹299 Unlimited, 3–14-day trials · YouTube Premium ₹149 / student ₹89 · Spotify Student ₹59 vs ₹119 · Apple Music ₹139 / student ₹69 · Swiggy One Lite ₹99 / 3 mo · Zepto welcome 25% up to ₹200.

---

## v225 — hidden hubs + affiliate-ready + founder forge (Sep 2026)

### Why hidden hubs?
The 22-offer shelf was “obvious” (Kindle, Audible, Spotify). Hidden hubs are the non-expiring offers readers *already pay for but never claim*:
- **Telecom bundles you already pay for** — Jio ₹749 postpaid already includes Netflix Basic + Prime Lite + Hotstar (MoneyControl/91mobiles verified May 2026). Most readers paying ₹649/yr for Netflix separately don't know their SIM bill covers it.
- **Bank offer walls you already carry** — HDFC SmartBuy (5X–10X points, 130+ vouchers), SBI Card Offers, Axis Grab Deals. They live behind login but the *wall itself* is public and never expires. We link to the wall, not to a dying coupon.

These never die, are fully legal (official pages only), and Bot-walls don't matter because the *hub url* is meant to be opened in the partner app.

### The 5 new offers
| id | brand | wall |
|---|---|---|
| `jio-bundles` | Jio | jio.com/postpaid — ₹749 family plan |
| `airtel-bundles` | Airtel | airtel.in/offers + Thanks app |
| `hdfc-smartbuy` | HDFC SmartBuy | offers.smartbuy.hdfc.bank.in |
| `sbi-offers` | SBI Card | sbicard.com/en/personal/offers.page |
| `axis-grab` | Axis Grab Deals | axisbank.com/grab-deals + grabdeals.axis.bank.in |

Total shelf: **27 offers**, 5 editor’s picks, every category populated.

### Affiliate-ready wiring (EarnKaro / Cuelinks / Amazon Associates)
No code changes needed to switch a link to affiliate later:

1. Join one aggregator — **EarnKaro** (no website needed, ₹10 payout) or **Cuelinks** (75:25 split, auto-link). Amazon Associates (1–12% per category) and Flipkart both work through them.
2. Create tracked links for the partners you actually push (Amazon Books, Flipkart Books are highest intent).
3. Paste into `js/affiliate.js`:

```js
window.TSB_AFFILIATE = {
  "amazon-books": "https://ekaro.in/enkr…",   // your EarnKaro Amazon link
  "flipkart-books": "https://ekaro.in/enkr…",
};
```

The store's sheet CTA (`OPEN AMAZON BOOKS →`) then uses that tracked url automatically and adds a small *“Affiliate link — we may earn a small commission at no extra cost to you”* line. Leave `js/affiliate.js` empty (`{}`) until you join — the clean official urls keep working. **Disclose it**: the per-offer disclaimer covers you.

### Founder forge (Route A, checksummed codes)
`js/gold.js` now checksums every `TSB-XXXX-XXXX`. Random guesses fail; only `TSB_GOLD.forge()` (founder panel in `gold.html` or browser console `TSB_GOLD.forge()`) mints a valid code.
- `gold.html` shows a **👑 FOUNDER — CODE FORGE** panel only when you are signed in as `acimotreyothy@gmail.com` (or OFFICIAL_ID). Tap **FORGE**, copy, WhatsApp to buyer.
- Keep a private sheet: code → buyer name → date → UPI txn ID.
- Existing Gold devices stay unlocked — `isGold()` doesn't re-check old codes.

### Honest premium copy
Human audio, deep dives & PDFs are **in production**. `gold.html` now says:
> *“Rolling out to early members first as each drops. Lock your price now, get each feature the day it ships. Samples above are the exact sound.”*

...with `IN PRODUCTION` badges and a yellow note under the ₹999 panel. No “you get everything instantly” lie, but also no “you won't get it” either.

### Monthly ops (phone-only)
Same as v224 — verify each of the 27 urls from a *phone* (not a server curl). New hubs are “deal walls” so they never 404; just spot-check that the wall still shows a bonus/OTT. Bump `V` and `CACHE_VERSION` together.

