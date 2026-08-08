/* ============================================================
   THESMALLBOOK — CLOUD CONFIG
   🔐 SIGN-IN (optional): to let readers save progress across
   devices with "Log in with Google" (free, no card needed):

   1. https://supabase.com → New project (free tier, region Mumbai)
   2. Authentication → Providers → Google (creates the OAuth
      client via console.cloud.google.com — full steps in
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
   6. Paste them below and push. Done — progress syncs everywhere.

   (Stories table — same project, if you want community stories
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
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbXhjZXdteW9maWhncmhldWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTc3NjQsImV4cCI6MjEwMTc3Mzc2NH0.ZiaeA9eA7uxVeP0qhuoFdoY4CGP0eKI7VD87xsE3tw8",   // e.g. "eyJhbGciOiJIUzI1NiIsInR5cCI6..."

  // Email where readers send their story files for the Global Shelf
  // (used by the no-backend submission flow — set this before launch!)
  SUBMIT_EMAIL: "jashgandhicreator07@gmail.com",

  /* 🆕 NEW THIS WEEK — badges on homepage cards & graveyard.
     HOW TO UPDATE (weekly, 1 minute): replace these ids with whatever
     you added this week. Empty list [] = no badges shown. */
  NEW_THIS_WEEK: [
    "ultralearning", "switch-heath", "decisive-heath", "the-goal",
    "21-laws-leadership", "linchpin", "talent-code", "happiness-advantage",
    "coaching-habit", "skin-in-the-game", "infinite-game", "bullet-journal-method"
  ],
  NEW_GRAVES_THIS_WEEK: [
    "evergrande", "dhfl-scam", "future-group", "gofirst-airline",
    "wish-collapse", "groupon-collapse", "bitconnect", "pmc-bank"
  ],

  /* Amazon Associates (India) — book buy links */
  AMAZON_TAG: "thesmallbook-21",

  /* Direct product links (higher conversion than search).
     Key = book id from data.js, value = Amazon ASIN / ISBN-10.
     HOW TO ADD MORE: open the book on amazon.in → the URL contains
     /dp/XXXXXXXXXX → copy that 10-character code here.
     Books not listed automatically use a search link — nothing breaks. */
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
