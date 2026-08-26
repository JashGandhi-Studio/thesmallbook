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
  /* 🔔 PUSH NOTIFICATIONS (optional, free): create a free account at
     onesignal.com → Add App → Web Push → paste the App ID below.
     Also add their OneSignalSDKWorker.js to your site root.
     Empty = bell shows "coming soon" (WhatsApp reminder still works). */
  ONESIGNAL_APP_ID: "",

  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbXhjZXdteW9maWhncmhldWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTc3NjQsImV4cCI6MjEwMTc3Mzc2NH0.ZiaeA9eA7uxVeP0qhuoFdoY4CGP0eKI7VD87xsE3tw8",   // e.g. "eyJhbGciOiJIUzI1NiIsInR5cCI6..."

  /* ⭐ SOCIAL PROOF — REAL reader words only. Paste your real DMs/emails here.
     Empty quotes are skipped. No fake testimonials — only real people. */
  TESTIMONIALS: [
    { quote: "I used a Psychology of Money lesson to negotiate my first internship stipend. Thank you.", who: "Rushit, 19, Ahmedabad" },
    { quote: "The 48 Laws summary saved me in a family property fight. I finally understood the game being played on us.", who: "Sneha M., Pune" },
    { quote: "Read Deep Work on my phone during metro commutes. Two months later I got my first promotion.", who: "Karan, Bengaluru" },
    { quote: "Your Graveyard made me avoid a franchise deal that would have drained my savings. Best free read on the internet.", who: "Divya R., Jaipur" },
    { quote: "Chetan Bhagat se shuru kiya, ab Harari tak pahunch gaya. 5 minute lessons ne reading habit bana di.", who: "Arjun, Indore" },
    { quote: "Read the Atomic Habits summary in 8 minutes during lunch. It changed how I plan my whole day.", who: "Rohan, Hyderabad" },
    { quote: "My father thought summaries were a waste of time. Now he asks me to explain every book to him.", who: "Priya, Chennai" },
    { quote: "I was stuck on my startup pitch for weeks. One Lean Startup lesson on MVPs got me to launch within ten days.", who: "Ankit, Delhi" },
    { quote: "The Graveyard reads like free MBA lectures. I shared the Enron autopsy with my entire team.", who: "Meera, Kochi" },
    { quote: "I used to buy books and never finish them. Now I finish one summary every morning with my chai.", who: "Vikram, Lucknow" },
    { quote: "That 5 Second Rule summary finally got me out of bed for morning runs. Three months strong now.", who: "Aditi, Nagpur" },
    { quote: "I teach science and I use your examples in class. Students actually remember the stories.", who: "Farhan, Bhopal" },
    { quote: "Heard the Gold human audio sample and immediately joined the waitlist. The narration quality is better than most paid audiobook apps.", who: "Tanvi, Surat" },
    { quote: "The Graveyard is addictive. I read one failure story every night before sleeping, it is better than any business podcast.", who: "Sameer, Nashik" },
    { quote: "My Hindi reading habit was zero. Now I read TheSmallBook in Hindi on my phone during lunch, 3 books done this month.", who: "Kavita, Patna" },
    { quote: "I am 60 and your summaries keep me sharp. Reading Ikigai here reminded me of my father's wisdom.", who: "Mr. Deshpande, Pune" },
    { quote: "Used the 5-minute Deep Work summary before a client pitch and landed the project. The lessons are practical, not philosophy.", who: "Zoya, Mumbai" },
    { quote: "The audio feature reads to me while I cook. My daughter thinks I listen to podcasts now, close enough.", who: "Neelam, Delhi" },
    { quote: "Was skeptical about TSB Gold until I heard the samples. The Let Them Theory one had me nodding the whole minute.", who: "Ishaan, Kolkata" },
    { quote: "My college friends share summaries in our group chat now. We have a running bet on who reads more books this year.", who: "Sahil, Chandigarh" },
    { quote: "Came for one book, stayed for the shelf. The way lessons end with an action step makes you actually change something.", who: "Ritika, Indore" },
    { quote: "I recommended the Graveyard to my father for his startup fears. He now checks the graveyard before every big decision.", who: "Manav, Jaipur" },
    { quote: "The 'when this doesn't work' note under Atomic Habits hit me hard. No other summary site tells you where the advice breaks.", who: "Dev, Thane" },
    { quote: "Read the Sapiens summary at 2 AM and texted my brother the whole night about it. TheSmallBook made thinking feel cool.", who: "Aisha, Lucknow" },
    { quote: "I open the Graveyard before starting anything new now. It is cheaper than an MBA and more honest than most mentors.", who: "Nikhil, Ahmedabad" },
    { quote: "The voice quality on the Gold samples made me re-listen three times. If full books sound like this, it is a steal at ₹999.", who: "Sara, Goa" },
    { quote: "My 14-year-old reads a summary every day. He argued with me about money using Rich Dad Poor Dad. I am not mad, I am impressed.", who: "Mr. Kulkarni, Nagpur" },
    { quote: "Came to read one book before an interview, stayed for the graveyard. The OYO case study alone saved me from a bad franchise deal.", who: "Bharat, Indore" },
    { quote: "The summaries are short enough to finish on a metro ride and deep enough that I remember them weeks later. That balance is rare.", who: "Tanya, Noida" },
    { quote: "I used the Graveyard's Enron case study in my college presentation. The professor asked where I found it and the whole class is on the site now.", who: "Rhea, Bengaluru" }
  ],

  /* 🟢 GOOGLE OAUTH CLIENT — "Sign in with Google" popup (Google Identity
     Services). NO secret needed — Google's SDK hands the ID token straight
     to the browser, so the consent popup shows "TheSmallBook · thesmallbook.in".
     Google Cloud Console → Credentials → OAuth client ID.
     ⚠️ Add these to that client's "Authorized JavaScript origins":
        https://thesmallbook.in  and  https://www.thesmallbook.in */
  GOOGLE_CLIENT_ID: "730711772117-6jqonfh58n6963r12k6ri2g0ov6841eq.apps.googleusercontent.com",

  // Email where readers send their story files for the Global Shelf
  // (used by the no-backend submission flow — set this before launch!)
  /* 👑 GOLD BANNER meter — set GOLD_TAKEN to your real waitlist count
     (0 hides the meter and shows "FIRST 500 EARLY-BIRDS" instead). */
  GOLD_TAKEN: 0,
  GOLD_TOTAL: 500,

  SUBMIT_EMAIL: "jashgandhicreator07@gmail.com",

  /* 🆕 NEW THIS WEEK — badges on homepage cards & graveyard.
     HOW TO UPDATE (weekly, 1 minute): replace these ids with whatever
     you added this week. Empty list [] = no badges shown. */
  /* 🔥 THIS WEEK'S NEW RELEASES — only the latest batch (updated every batch).
     Old books leave this list automatically — they're no longer "new". */
  NEW_THIS_WEEK: [
    "rudest-book-ever", "turning-points-kalam", "my-journey-kalam", "discovery-of-india", "dream-with-eyes-open", "chanakya-in-you", "art-of-being-alone", "victory-project", "indias-money-heist", "blink-gladwell", "tipping-point", "art-of-happiness", "tidying-up", "intelligence-analysis", "culture-map", "body-bryson", "second-mountain", "gifts-of-imperfection", "five-love-languages", "better-than-before"
  ],
  /* 🩸 THIS WEEK'S FRESH GRAVES — latest batch only (updated every batch). */
  NEW_GRAVES_THIS_WEEK: [
    "shopclues", "vedantu", "oyo-hotels", "paisabazaar", "housing-com",
    "pepperfry", "voonik", "juul", "silk-road", "cryptopia",
    "blockfi", "avon", "spirit-airlines"
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
