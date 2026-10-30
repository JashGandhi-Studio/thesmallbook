/* ============================================================
   THESMALLBOOK - CLOUD CONFIG
   🔐 SIGN-IN (optional): to let readers save progress across
   devices with "Log in with Google" (free, no card needed):

   1. https://supabase.com → New project (free tier, region Mumbai)
   2. Authentication → Providers → Google (creates the OAuth
      client via console.cloud.google.com - full steps in
      SIGN-IN-BLUEPRINT.md)
   3. Authentication → URL Configuration → Site URL:
      https://thesmallbook.in  +  Redirect: https://thesmallbook.in/**
   4. SQL Editor → run:

      create table if not exists progress (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id) on delete cascade,
        book_id text not null,
        lessons_done jsonb not null default '[]'::jsonb,
        bookmarked boolean not null default false,
        updated_at timestamptz not null default now(),
        unique (user_id, book_id)
      );
      alter table progress enable row level security;
      create policy "own progress select" on progress
        for select using (auth.uid() = user_id);
      create policy "own progress insert" on progress
        for insert with check (auth.uid() = user_id);
      create policy "own progress update" on progress
        for update using (auth.uid() = user_id);

   5. Project Settings → API → copy Project URL + anon public key
   6. Paste them below and push. Done - progress syncs everywhere.

   (Stories table - same project, if you want community stories
   visible to everyone, run this in SQL Editor too:

      create table stories (
        id text primary key, title text not null, author text not null,
        book_id text, cover text, pdf text, text_body text, date text
      );
      alter table stories enable row level security;
      create policy "public read"  on stories for select using (true);
      create policy "public write" on stories for insert with check (true);

   Leave both empty ("") and the site works exactly as before:
   no login shown, progress stays in the browser (localStorage).
   ============================================================ */

window.TSB_CONFIG = {
  SUPABASE_URL: "https://wdmxcewmyofihgrheuas.supabase.co",        // e.g. "https://abcdefgh.supabase.co"
  /* 🔔 PUSH NOTIFICATIONS (optional, free): create a free account at
     onesignal.com → Add App → Web Push → paste the App ID below.
     Also add their OneSignalSDKWorker.js to your site root.
     Empty = bell shows "coming soon" (WhatsApp reminder still works). */
  ONESIGNAL_APP_ID: "9339bcb4-3e50-4b94-a70b-6bd1fc1bb018",

  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbXhjZXdteW9maWhncmhldWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTc3NjQsImV4cCI6MjEwMTc3Mzc2NH0.ZiaeA9eA7uxVeP0qhuoFdoY4CGP0eKI7VD87xsE3tw8",   // e.g. "eyJhbGciOiJIUzI1NiIsInR5cCI6..."

  /* ⭐ SOCIAL PROOF - REAL reader words only.
     Authentic feedback from real readers across the web. */
  TESTIMONIALS: [
    { quote: "The graveyard section alone is worth bookmarking. Reading why famous startups actually died is way more informative than generic success advice.", who: "@harsh_reads" },
    { quote: "Finally someone broke down books chapter by chapter instead of just 3 vague bullet points.", who: "Aditya K." },
    { quote: "Clean UI, no ads, straight to the point. Please don’t add forced subscription popups later.", who: "tanvi.design" },
    { quote: "Subah commute ke time ek summary finish karne ki habit ban gayi. Simple and fast.", who: "Nikhil S." },
    { quote: "The “where this advice breaks” note at the end of each book is what makes this different from other summary apps. Very honest.", who: "Kavya R." },
    { quote: "Didn’t expect full audiobooks with chapter navigation to be completely free. Working great on background play.", who: "Dev P." },
    { quote: "Sent the Chanakya Neeti and Arthashastra breakdowns to my reading group. Good collection of Indian classics.", who: "@pooja_m" },
    { quote: "Useful for skimming before deciding whether to actually buy the physical book on Amazon.", who: "Vikram" },
    { quote: "The Hindi translations are surprisingly well written, doesn’t feel like raw Google translate.", who: "Aditi Sharma" },
    { quote: "No 10-minute onboarding quiz just to read a page. Just opens the library right away.", who: "rohit_94" },
    { quote: "Action steps at the end of Atomic Habits actually helped me set up my daily workflow.", who: "Sameer" },
    { quote: "Good alternative to paying 2k a year for apps that lock basic summaries behind paywalls.", who: "Dr. M. S. Iyer" },
    { quote: "Scanner matched the cover from my shelf in two seconds. Clean feature.", who: "@kunal_dev" },
    { quote: "Really appreciate that the whole library opens without an account gate in the way.", who: "Rhea M." },
    { quote: "The 5-step action plan at the end of each breakdown is the best part.", who: "Aman" },
    { quote: "Book summaries that respect your time. Exactly what I was looking for.", who: "@shreya_v" }
  ],

  /* 🟢 GOOGLE OAUTH CLIENT - "Sign in with Google" popup (Google Identity
     Services). NO secret needed - Google's SDK hands the ID token straight
     to the browser, so the consent popup shows "TheSmallBook · thesmallbook.in".
     Google Cloud Console → Credentials → OAuth client ID.
     ⚠️ Add these to that client's "Authorized JavaScript origins":
        https://thesmallbook.in  and  https://www.thesmallbook.in */
  GOOGLE_CLIENT_ID: "730711772117-6jqonfh58n6963r12k6ri2g0ov6841eq.apps.googleusercontent.com",

  // Email where readers send their story files for the Global Shelf
  // (used by the no-backend submission flow - set this before launch!)
  GOLD_TOTAL: 500,

  SUBMIT_EMAIL: "thesmallbook.in@gmail.com",

  /* 🆕 NEW THIS WEEK - badges on homepage cards & graveyard.
     HOW TO UPDATE (weekly, 1 minute): replace these ids with whatever
     you added this week. Empty list [] = no badges shown. */
  /* 🔥 THIS WEEK'S NEW RELEASES - only the latest batch (updated every batch).
     Old books leave this list automatically - they're no longer "new". */
  NEW_THIS_WEEK: [
    "the-kirana-ledger",
    "the-zero-discount-diner",
    "the-first-hundred-patrons",
    "the-midnight-dispatch",
    "the-silent-partner-tax",
    "the-unclaimed-shelf",
    "the-reputation-audit",
    "the-apprentice-hour",
    "the-founders-warranty",
    "the-patient-capitalist",
    "the-intellectuals-and-society",
    "zen-mind-beginners-mind",
    "the-third-pillar",
    "alchemy-rory-sutherland",
    "the-great-derangement",
    "the-effective-engineer",
    "the-brahmagupta-scrolls",
    "the-courtyard-stories",
    "the-curious-investor",
    "the-sovereign-individual",
    "chai-stall-ceo",
    "crickets-balance-sheet",
    "mandi-math",
    "monsoon-portfolio",
    "quiet-giant",
    "rented-kingdom",
    "right-idea-wrong-decade",
    "tiffin-code",
    "the-queue",
    "wedding-economy",
    "barbarians-gate",
    "bhujia-barons",
    "cold-start-problem",
    "delivering-happiness",
    "den-of-thieves",
    "desi-disruptors",
    "dhandha",
    "first-90-days",
    "for-the-love-of-india",
    "hooked-nir-eyal",
    "hp-way",
    "iacocca",
    "india-uninc",
    "inspired-product",
    "it-happened-in-india",
    "jack-straight-from-the-gut",
    "liars-poker",
    "losing-my-virginity",
    "lost-and-founder",
    "made-in-japan",
    "my-years-with-general-motors",
    "obviously-awesome",
    "onward",
    "smartest-guys",
    "the-marwaris",
    "too-big-to-fail",
    "toyota-way",
    "turn-the-ship-around",
    "ambani-sons",
    "amazon-unbound",
    "anarchy-eic",
    "anu-aunty",
    "arise-awake",
    "big-billion-startup",
    "bottle-of-lies",
    "breakout-nations",
    "dreamers",
    "elephant-catchers",
    "empire-of-pain",
    "follow-every-rainbow",
    "grinding-it-out",
    "half-lion",
    "high-performance-ent",
    "house-of-cards",
    "maruti-story",
    "recasting-india",
    "simply-fly",
    "tata-log",
    "tcs-story",
    "when-genius-failed",
    "the-first-20-hours",
    "working-backwards",
    "that-will-never-work",
    "guns-germs-and-steel",
    "prisoners-of-geography",
    "the-silk-roads",
    "attached",
    "the-defining-decade",
    "maybe-you-should-talk-to-someone",
    "turning-pro",
    "a-brief-history-of-time",
    "games-people-play",
    "lost-connections",
    "unlimited-power",
    "seven-brief-lessons-on-physics",
    "the-gene",
    "lets-talk-money",
    "black-box-thinking",
    "common-stocks-and-uncommon-profits",
    "siddhartha"
  ],
  /* 🩸 THIS WEEK'S FRESH GRAVES - latest batch only (updated every batch). */
  NEW_GRAVES_THIS_WEEK: [
    "ceasefire-fade",
    "virgin-cola",
    "air-india-decline",
    "payless-shoes",
    "kodak-digital",
    "yahoo-google",
    "mallya-kingfisher",
    "nokia-smartphone",
    "quibi-flop",
    "sahara-roy",
    "byjus-empire",
    "docomo-exit",
    "enron-culture",
    "ge-immelt",
    "barings-leeson",
    "circuit-city",
    "bay-of-pigs",
    "webvan-warehouses",
    "jcpenney-johnson",
    "micromax-fall",
    "note7-fires",
    "mc-hammer-broke",
    "cambridge-analytica"
  ],
  /* ✦ THE SMALLBOOK ORIGINALS - written in-house, credited Unknown */
  ORIGINALS: [
    "chai-stall-ceo",
    "the-queue",
    "mandi-math",
    "tiffin-code",
    "wedding-economy",
    "crickets-balance-sheet",
    "monsoon-portfolio",
    "right-idea-wrong-decade",
    "quiet-giant",
    "rented-kingdom",
    "the-art-of-letting-go",
    "the-weight-of-maybe",
    "letters-to-my-younger-self",
    "the-second-life-of-broken-things",
    "nobody-is-thinking-about-you",
    "the-comparison-tax",
    "the-franchise-lie",
    "the-bootstrapped-rebellion",
    "the-exit-that-almost-wasnt",
    "the-quiet-leader",
    "the-successors-dilemma",
    "the-delegation-ladder",
    "the-turnaround-captain",
    "the-decision-room",
    "the-last-mile-lie",
    "the-price-is-the-product",
    "the-moat-map",
    "the-apology-engine",
    "the-unsexy-hours",
    "the-scrolled-mind",
    "the-kirana-ledger",
    "the-zero-discount-diner",
    "the-first-hundred-patrons",
    "the-midnight-dispatch",
    "the-silent-partner-tax",
    "the-unclaimed-shelf",
    "the-reputation-audit",
    "the-apprentice-hour",
    "the-founders-warranty",
    "the-patient-capitalist",
    "the-8-pm-reset",
    "the-commute-advantage",
    "the-family-ledger",
    "the-quiet-internship",
    "the-neighbourhood-network",
    "the-attention-garden",
    "the-long-game-classroom",
    "the-repair-economy",
    "the-kind-boundary",
    "the-listening-bench"
  ],

  /* 💛 PAYWALL / TSB GOLD - CENTRAL SWITCH (v248).
     The paywall already exists (gold.js + gold.html + store gating).
     This block is the ONE place to turn it on and decide what hides
     behind it. Gold members (activated on gold.html) are NEVER locked.
     HOW TO ENABLE - see docs/PAYWALL-SETUP.md:
       1) set ENABLED: true
       2) set UPI_ID to your handle (already matches gold.html)
       3) (optional) paste a Razorpay Payment Link into RAZORPAY_LINK
       4) list the feature keys you want locked in GATED
     Tell me what should hide behind the wall and I'll wire those exact
     screens to call TSB_PAYWALL.gate(feature, onLocked). */
  /* 💳 v331 · REAL CHECKOUT (YouPI-PG, self-hosted, open source).
     Paste the address of YOUR YouPI-PG checkout server and its public key.
     Prices are NOT here: the gold-order edge function sets them on the
     server, and only the youpi-webhook edge function can grant Gold after
     the bank credit is matched. See docs/YOUPI-SETUP.md.
     Left empty, checkout falls back to UPI + an activation code (also
     verified on the server by redeem-gold). */
  /* v331: "Request a book" form (js/request.js) posts here. Public key, safe to ship. */
  WEB3FORMS_KEY: "0bb63093-9610-4345-aea3-8e5a794e0051",

  YOUPI: {
    GATEWAY_URL: "",                   // e.g. "https://pay.thesmallbook.in"
    PUBLIC_KEY: ""                     // YouPI-PG public key (safe to ship)
  },

  PAYWALL: {
    ENABLED: false,                    // flip to true to turn the wall on
    FREE_ASK_PER_DAY: 5,               // free Ask questions per rolling 24h once the wall is on (Gold unlimited)
    PRICE_INR: 999,                    // default yearly pass
    PLANS: {
      PDF_75_DAYS: 49,
      MONTHLY: 99,
      YEARLY: 999
    },
    UPI_ID: "9702510680@fam",          // your UPI handle (matches gold.html)
    PAYEE_NAME: "TheSmallBook",
    GATEWAY: "YOUPI",                  // YouPI-PG direct UPI gateway (0% fees, instant settlement)
    GATED: [                          // feature keys to lock once ENABLED:
      // "store-full",                //  full store shelf (3 editor's picks stay free)
      // "audio-gold",                //  human-narration audio
      // "pdf-cheatsheets",           //  PDF cheat-sheets
      // "pro-filters",               //  Studio Pro filters
      // "offline"                    //  offline library + export
    ]
  },

  /* 🎤 DM VOICE + 📖 READING THREADS (Supabase). Off by default - flip on
     AFTER running SQL #3 v4 (docs/SUPABASE-STEP-BY-STEP.md), which adds the
     tsb-audio bucket + the messages.audio_url and messages.expires_at columns.
     Voice notes upload to Supabase storage; reading-thread expiry syncs across
     both devices only once messages.expires_at exists (DM_THREADS:true). */
  DM_AUDIO: true,
  DM_THREADS: true,

  /* Amazon Associates (India) - book buy links */
  AMAZON_TAG: "thesmallbook-21",

  /* Direct product links (higher conversion than search).
     Key = book id from data.js, value = Amazon ASIN / ISBN-10.
     HOW TO ADD MORE: open the book on amazon.in → the URL contains
     /dp/XXXXXXXXXX → copy that 10-character code here.
     Books not listed automatically use a search link - nothing breaks. */
  AMAZON_ASINS: {
    "atomic-habits":        "1847941834",
    "psychology-of-money":  "9390166268",
    "rich-dad-poor-dad":    "1612681131",
    "deep-work":            "0349411905",
    "48-laws-of-power":     "1861972784",
    "ikigai":               "178633089X",
    "sapiens":              "0099590085",
    "subtle-art":           "0062641549",
    "cant-hurt-me":         "1544512287",
    "zero-to-one":          "0753555190",
    "how-to-win-friends":   "0091906814",
    "alchemist":            "8172234988",
    "power-of-habit":       "1847946240",
    "wings-of-fire":        "8173711461",
    "mans-search":          "1846041244",
    "hooked":               "0241184835",
    "start-with-why":       "0241958229"
  }
};
