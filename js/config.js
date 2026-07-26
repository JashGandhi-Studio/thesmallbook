/* ============================================================
   THESMALLBOOK — CLOUD CONFIG
   To make community stories visible to EVERYONE (not just each
   visitor's own browser), plug in a free Supabase project:

   1. Go to https://supabase.com  → New project (free tier)
   2. In the SQL editor, run:

      create table stories (
        id text primary key,
        title text not null,
        author text not null,
        book_id text,
        cover text,
        pdf text,
        text_body text,
        date text
      );
      alter table stories enable row level security;
      create policy "public read"  on stories for select using (true);
      create policy "public write" on stories for insert with check (true);

   3. Project Settings → API → copy the URL and the anon public key
   4. Paste them below and push to GitHub. Done — stories are global.

   Leave both empty ("") and the site still works: stories are then
   saved in each visitor's own browser (localStorage).
   ============================================================ */

window.TSB_CONFIG = {
  SUPABASE_URL: "",        // e.g. "https://abcdefgh.supabase.co"
  SUPABASE_ANON_KEY: "",   // e.g. "eyJhbGciOiJIUzI1NiIsInR5cCI6..."

  // Email where readers send their story files for the Global Shelf
  // (used by the no-backend submission flow — set this before launch!)
  SUBMIT_EMAIL: "jashgandhicreator07@gmail.com"
};
