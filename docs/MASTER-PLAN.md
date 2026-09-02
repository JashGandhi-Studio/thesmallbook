# TheSmallBook — v2 Master Plan
**"Big books. Small reads." → a real, live, social reading app.**

Date: 2026-09-02 · Branch: `arena/01a061f0-thesmallbook`
Decisions locked with you: **Razorpay** · **Supabase (all-in)** · **plan first** · **free to restructure**

---

## 0. Where we are today (audit)

| Thing | Status |
|---|---|
| Stack | Static HTML/CSS/JS, no build step, GitHub Pages → `thesmallbook.in` |
| Content | `js/data.js` = **3.5 MB** single file, ~280 books / 1643 lessons |
| Pre-rendered SEO | **351** `books/*.html` + **220** `graveyard/*.html` — ranked pages, must not break |
| Auth | `js/auth.js` (700 lines) — Supabase PKCE + Google Identity, works, **fully optional/skippable** |
| Backend | Supabase project `wdmxcewmyofihgrheuas` live; only `progress` + `stories` tables |
| Payments | `js/upi.js` — raw UPI deep link to a personal VPA. No verification, no receipts, no subscriptions |
| Onboarding | `js/onboard.js` — 3 questions, then dismissed forever. Result barely used |
| Nav | Top nav bar only. No bottom action bar |
| Ask | Popup modal (`js/ask.js`) over a static Q→A dataset (`ask-data.js`) |
| Social | None. Stories are single-player + email-the-author moderation |
| CSS | One **177 KB** `style.css`, neo-brutalist |

### The five real problems
1. **No revenue rail.** A UPI deep link cannot verify a payment, so nothing can actually be unlocked. Gold is a waitlist, not a product.
2. **Anonymous by default.** Analytics are meaningless and there is no user to attach follows/posts/payments to.
3. **Onboarding is decoration.** Answers don't change the app, so it reads as a survey, not personalization.
4. **No app shell.** It's a website of pages, not an app with a persistent bottom bar.
5. **Nothing is live.** No realtime, no user-generated content at scale, no profiles/followers.

---

## 1. Target architecture

Keep it **static-first** (GitHub Pages stays, SEO stays), add Supabase as the live layer.
No Node server to babysit; all privileged logic goes in Supabase **Edge Functions**.

```
Browser (static, GitHub Pages / thesmallbook.in)
│
├── App shell: bottom bar + client router (Home / Read / Add / Chat / You)
├── SEO pages: books/*.html, graveyard/*.html  (untouched, canonical, indexable)
│
└── Supabase
    ├── Auth        Google + Email OTP  → real accounts
    ├── Postgres    profiles, posts, likes, saves, follows, comments,
    │               chat_threads/messages, subscriptions, events
    ├── Realtime    live feed, likes, follower counts, chat
    ├── Storage     avatars/, post-images/  (public read, owner write)
    └── Edge Fns    razorpay-order · razorpay-webhook · ai-chat · moderate
```

**Why not Next.js:** you'd trade a working, free, well-indexed 571-page SEO surface for a rewrite. Supabase gives every "live" feature you asked for without leaving GitHub Pages. Revisit Next.js only if SSR-personalized feeds become a growth requirement.

### Code restructure (approved)
- Split `data.js` 3.5 MB → `data/books-index.json` (light: id/title/author/cover/category — loads instantly) + `data/books/<id>.json` (lazy, per book). Kills the current multi-second first paint on mobile.
- `css/style.css` → `css/base.css` + `css/shell.css` + `css/feed.css` + `css/reader.css`, with a real design-token layer.
- Introduce a tiny build step (esbuild) **only** for bundling/minifying JS. Output committed so Pages keeps working.

---

## 2. Payments — Razorpay (the actual how)

### Why Razorpay over Stripe for you
UPI is ~75%+ of Indian consumer checkouts; Razorpay does UPI/cards/netbanking/wallets natively, supports ₹ **Subscriptions** with UPI AutoPay, and settles to an Indian bank. Stripe India is card-first and needs a registered entity anyway.

### Prerequisites you must do (I can't — needs your identity)
1. **Sign up** at razorpay.com → Activate account.
2. **KYC**: PAN, bank account + cancelled cheque, address proof. Individual/sole-proprietor is accepted — a Pvt Ltd is *not* required to start.
3. **Business category**: choose *Education* → *Ed-tech / digital content*. Wrong category is the #1 cause of activation delays.
4. Publish **Terms**, **Privacy**, **Refund/Cancellation**, **Contact** pages — Razorpay's review team checks these on your live domain. (I'll build them.)
5. Dashboard → **Settings → API Keys** → generate **Test** keys first (`rzp_test_…` + secret).
6. Dashboard → **Products → Subscriptions** → create Plans: *Gold Monthly ₹149* and *Gold Yearly ₹999*. Note the `plan_id`s.
7. Dashboard → **Settings → Webhooks** → add the Edge Function URL, secret, and subscribe to:
   `payment.captured`, `subscription.charged`, `subscription.activated`, `subscription.cancelled`, `subscription.halted`, `refund.processed`.

### The flow I'll implement
```
1. User taps "Get Gold"
2. Browser → Edge Function `razorpay-order`
       (server-side, holds RAZORPAY_KEY_SECRET, creates order/subscription)
3. Function returns order_id → browser opens Razorpay Checkout.js modal
4. User pays via UPI/card
5. Razorpay → Edge Function `razorpay-webhook` (server-to-server, signed)
6. Function verifies HMAC-SHA256 signature, then writes
       subscriptions.status = 'active' for that user_id
7. Realtime pushes it → UI unlocks Gold instantly. No refresh.
```

**Hard rules I'll follow**
- The **key secret never touches the browser.** Only `rzp_test_…`/`rzp_live_…` public key ID does.
- **Entitlement is granted by the webhook, never by the browser callback.** A client "payment success" handler can be forged; the signed webhook cannot.
- Every webhook verified with HMAC-SHA256 against the webhook secret before any DB write.
- Webhook handler is **idempotent** (Razorpay retries) — dedupe on `razorpay_payment_id`.
- Gold status read from a `subscriptions` table with RLS, not from localStorage.

### Also keeping UPI-direct
Your existing `upi.js` tip jar stays for donations (zero fees). Razorpay handles anything that must *unlock* something.

**Costs:** ~2% + GST per transaction. No setup/monthly fee. Test mode is free and unlimited — everything gets built and verified in test mode before you go live.

---

## 3. Auth gating — "5 free minutes, then sign in"

### The rule
```
Anonymous visitor
  → full access for 5 minutes of ACTIVE reading (timer pauses on blur)
  → also capped at 2 lessons OR 3 posts, whichever comes first
  → then a non-dismissible sheet:
       "Enjoying it? Sign in to save your progress."
       [Continue with Google] [Email me a code]
```

### Non-negotiables so we don't destroy what works
- **Googlebot and crawlers are never gated.** Gate is JS-only and skipped for known crawler UAs; `books/*.html` render fully server-side as they do today. SEO is untouched.
- **Direct deep links from search open the article**, gate starts *after* the read.
- **Existing signed-in users are never re-prompted.** Session detected → gate never initializes.
- **Anonymous progress migrates on sign-in** (already implemented in `auth.js`, I'll extend it to likes/saves) so nobody loses their streak.
- A "Why do I need an account?" link — friction is fine, mystery isn't.

### Analytics you'll finally get
Once identity is real, an `events` table gives: DAU/WAU/MAU, D1/D7/D30 retention, signup funnel conversion, time-to-first-read, book completion rates, share/save/like rates per book, free→Gold conversion — all per real human, not per browser.

### Auth methods
Google (exists, keep) + **Email OTP** (Supabase magic-code — no password to forget, no reset flow to build) + Apple later if you ever ship iOS.

---

## 4. Onboarding — make it feel like an AI is listening

Current: 3 taps → discarded. New: **7 steps, ~45 seconds**, and *every answer changes the app.*

| # | Question | What it actually drives |
|---|---|---|
| 1 | "What brought you here tonight?" (Stuck / Curious / Building / Healing / Winning) | Feed tone + first recommendation set |
| 2 | Pick 3+ from 12 topic tiles (cover art, not emoji) | Feed weighting, category ranking |
| 3 | "How much time do you actually have?" 3 / 10 / 25 min | Default lesson length + daily goal |
| 4 | "When do you read?" morning / commute / lunch / night | Reminder time + theme auto-switch (night → dark) |
| 5 | "Which of these hits hardest?" — 3 real quote cards, pick one | Infers depth: tactical vs philosophical |
| 6 | Language + script (incl. your Hinglish/Gujlish modes) | Whole-app language, saved to profile |
| 7 | "Building your shelf…" — a genuine 2.5s compute pass | Reveal: **"Your 7 books"** with a written *reason* per pick |

**The "AI behind it" feeling — done honestly.** No fake "AI is thinking" spinner over a hardcoded list. A real scoring function ranks all 280 books against the 7 answers, and each recommendation shows its *actual* reason: *"Because you said you're stuck at night and want it tactical."* People can tell the difference, and this one is real.

Also: progress dots, back button on every step, **skippable at any point** (skipping just uses defaults — never a wall), answers stored in `profiles.preferences` so it follows them across devices.

---

## 5. The new app shell (matching your reference image)

### What I'm taking from the reference
Dark charcoal canvas · **big bold chunky sans headings in caps** · full-bleed **saturated colour blocks** (coral/red, periwinkle blue, butter yellow, mint) as card backgrounds · generous **rounded corners (~20–24px)** · pill-shaped dropdown chips · small circular ↗ action buttons top-right of each card · floating **rounded-rect bottom bar with 4 icons, active one in a filled rounded square** · a coral **+** FAB.

This is a natural evolution of your neo-brutalism: **same loud palette and confident type, but softened corners, layered depth and dark-first.** Your existing yellow/black identity survives — it stops looking like a 2021 template and starts looking like a 2026 product.

### Bottom action bar (Substack-style, 5 slots)
```
🏠 Home   📖 Read   ➕ Add   💬 Chat   👤 You
```
- Fixed, `env(safe-area-inset-bottom)` aware (no iPhone home-indicator overlap).
- Hides on scroll-down, returns on scroll-up.
- Active tab = filled rounded square, exactly like the reference.
- **➕ Add** is the coral FAB, visually raised.
- Never renders on `books/*.html` SEO pages unless the visitor is signed in.

### The five tabs

**🏠 Home — infinite feed**
Top bar: small logo + full-width search + notification bell.
Then an endless mixed stream of colour-blocked cards:
- Quote cards (typographic, coloured block, book cover corner)
- Lesson cards (cover image + hook + read time)
- Community posts (avatar, name, text/image)
- Graveyard cards (dark red "R.I.P." treatment)
- Occasional "Because you said you're building" personalized inserts

Every card: tap → full reader · ❤️ like · 🔖 save · ↗ share. Likes/saves work **from the feed**, optimistically, no page change. Cursor pagination, ~15 cards/page, skeleton loaders, pull-to-refresh.

**📖 Read — the library shelf**
Real bookshelf presentation: horizontal shelf rails by category with wooden-edge shading, "Continue reading" rail first, then My Shelf, Trending, New This Week, Graveyard. Toggle to grid/list. Search + filters + sort carried over from today's homepage.

**➕ Add — live publishing**
Composer for Quote / Lesson / Story / Review. Attach a book, upload an image (Supabase Storage), pick a colour block. **Publishes instantly and appears in every online user's feed via Realtime.** Auto-moderation pass (see §6) + report button + your admin queue.

**💬 Chat — real chat interface, no more popup**
Full-screen thread UI: message bubbles, streaming responses, suggested-prompt chips ("Show me a lesson on discipline"), history in the sidebar, per-book context ("Ask about *Atomic Habits*"). Backed by an `ai-chat` Edge Function so the API key stays server-side; falls back to your existing `ask-data.js` corpus for the questions it already answers well (free + instant). Rate-limited per user; Gold gets more.

**👤 You — profile & settings**
Public profile: avatar, @username, bio, follower/following counts, posts grid, books read, streak, badges. Follow/unfollow. Shareable at `thesmallbook.in/u/username`.
**Settings** (a real screen, everything you listed): theme (Dark/Light/**Auto**), 26 languages + Hinglish/Gujlish, font size & reading font, reminder time, notifications, data & privacy, export/delete my data, manage subscription, sign out.

### Share cards — premium pass
Your current cards look cheap because of flat fills and system type. Fix: 1080×1350 canvas, real gradient meshes, layered depth, the book cover embedded with a soft shadow, a proper type hierarchy, subtle grain, and a small elegant `thesmallbook.in` wordmark instead of a big watermark. Templates per content type. Web Share API for native sheet, PNG download fallback.

### Mobile — the hard rule
Mobile-first, not mobile-adapted. 360px is the baseline design width; desktop is the enhancement.
- Every tap target ≥ 44×44px
- Safe-area insets on all fixed elements
- No horizontal scroll at any width, ever
- 60fps: transform/opacity animations only, `content-visibility` on long feeds
- Lighthouse mobile ≥ 90 across the board — enforced in CI, not by eyeball

---

## 6. Making it live — the honest checklist

You asked what's actually needed for real-time user content. This:

1. **Real accounts** — §3. Nothing social works without a stable `user_id`.
2. **Tables + RLS** — `profiles, posts, likes, saves, follows, comments, notifications, chat_threads, chat_messages, subscriptions, events, reports`. Row-Level Security on every one: anyone can read public posts, only the owner can write their own row. This is the entire security model — I'll write and test each policy.
3. **Realtime subscriptions** — Postgres change streams for new posts, like counts, follows, chat. Instant, no polling.
4. **Storage buckets** — `avatars/` (2 MB cap) and `posts/` (5 MB cap), client-side image compression before upload, signed upload policies.
5. **Moderation — mandatory, not optional.** The day you allow public posting you inherit spam, abuse and NSFW. Plan: auto-screen new posts through the Edge Function (blocklist + AI classification), auto-hide anything reported 3× pending review, shadow-ban repeat offenders, plus an admin queue at `/admin` gated to your user id. **Do not launch open posting without this.**
6. **Rate limits** — posts/hour, chat messages/hour, follows/day. Stops bots from turning your free tier into someone's spam host.
7. **Notifications** — in-app first (bell + `notifications` table); web push via OneSignal (already stubbed in config) once there's something worth pushing.
8. **Legal** — Terms, Privacy (India DPDP Act 2023 applies to you), Community Guidelines, Refund policy. Also required for Razorpay activation.
9. **Abuse-proof counters** — likes/followers as DB triggers on real rows, never client-incremented integers.
10. **Backups** — Supabase daily backups on, plus a weekly export. User-generated content is unrecoverable if lost.

### Cost reality
Supabase free tier: 500 MB DB, 1 GB storage, 2 GB egress, 50k MAU. Comfortable to roughly **5–10k active users**; images are what will push you over first. Next step is Pro at $25/mo. Razorpay ~2%+GST per transaction. AI chat is the only genuinely variable cost — hence server-side rate limits and a cheap model for routine queries.

---

## 7. Build sequence

| Phase | What ships | Est. |
|---|---|---|
| **1 — Foundation** | Design tokens, dark/light, split `data.js`, CSS split, app shell + bottom bar, client router. *No feature changes, so nothing can break.* | 2–3 sessions |
| **2 — Auth & onboarding** | Email OTP, 7-step onboarding + real recommender, 5-minute gate (crawler-safe), `profiles` table, migration of existing users | 2 sessions |
| **3 — Home feed** | `posts` schema + RLS, infinite feed, colour-block cards, like/save/share, reader view, Realtime | 3 sessions |
| **4 — Social** | Profiles, avatars, follows, comments, notifications, Add composer + Storage + moderation | 3 sessions |
| **5 — Chat & Settings** | Full chat UI + `ai-chat` Edge Function, complete settings screen, language integration | 2 sessions |
| **6 — Payments** | Razorpay Edge Functions, checkout, webhook, entitlements, Gold gating, legal pages | 2 sessions |
| **7 — Polish** | Premium share cards, Library shelf, empty/error/offline states, a11y, Lighthouse, full QA sweep | 2 sessions |

Each phase ends **deployable and green**. Nothing half-wired gets left on the branch.

## 8. Quality gates (your "no bugs, self-checks" rule)
Run before every phase is called done:
- Playwright smoke suite: sign in → onboard → read → post → like → chat → pay (Razorpay test mode) across mobile + desktop viewports
- Lighthouse mobile ≥ 90 perf / 95 a11y / 100 best-practices
- Zero console errors or 404s on every route
- 360px / 390px / 768px / 1440px visual check, no horizontal scroll
- RLS verified adversarially: signed-out and other-user tokens must be *denied* writes
- Razorpay webhook replay + tampered-signature test → must reject
- Offline/PWA still installs and serves cached books

## 9. Things you must supply (blockers, in order of need)
1. Razorpay **test** key id + secret (Phase 6) — via Supabase secrets, never in the repo
2. Supabase **service role** key for Edge Function deploys
3. AI provider key for chat (OpenAI/Anthropic/Groq — Groq is cheapest for this workload)
4. Decision: Gold pricing — keep ₹999/yr, add a ₹149/mo?
5. Decision: is posting open to everyone on day one, or invite/approve-only until moderation is proven?

## 10. Open questions
- **Username namespace** — reserve now (`@jash`) before squatters arrive?
- **Should Gold gate content, or only extras?** Strong recommendation: keep all 280 summaries free forever (that's your SEO moat and your reputation) and sell audio, deep dives, PDFs, unlimited AI chat, and offline packs.
- **Comments at launch?** They're the highest-moderation-cost feature. Suggest launching with likes/saves only, adding comments in Phase 4.5 once the moderation queue is proven.
