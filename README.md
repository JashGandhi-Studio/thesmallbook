# 📕 TheSmallBook

**Live repo:** [github.com/JashGandhi-Studio/thesmallbook](https://github.com/JashGandhi-Studio/thesmallbook) - ⭐ star it if the lessons helped you!

**600 books · 4,343 lessons · 400 failure autopsies - free to read.**

**Big books. Small reads.** Every lesson from the world's greatest books - broken down chapter by chapter with real examples, killer quotes, and action steps. Skim it, understand it, apply it. No 300-page grind.

## 🆕 What's new in v336 (30 October 2026)

- **600 books, 4,343 lessons:** 80 substantial new reads, including 10 illustrated TheSmallBook Originals. Every new title has eight or more long lessons, a related graveyard case, cover, action plan and printable sheet.
- **TheSmallBook Voice Model:** an opt-in English or Hindi on-device voice. It says exactly what it is, shows the one-time download progress, keeps the model in device storage and never sends spoken text to a cloud voice service. Gold readers can choose Voice Model Plus.
- **A reading desk for large screens:** desktop and tablet use a responsive editorial spread and a vertical navigation rail instead of a blown-up phone screen.
- **Smoother from first paint:** the shell stays in front until content is ready, book covers lift into the reader, lazy heavy content no longer blocks the first screen, and scripts preload above the CSP so a cold 4G opening is much faster.
- **People and retention:** Stories exposes People again with follow and message actions. Daily phone push is available in You. Readers can explicitly choose a private weekly Sunday reading digest.
- **Setup returns once:** existing readers get the four calm setup screens once for this version, prefilled with their saved choices.
- **SQL:** run `supabase/sql/UPDATE-v336-retention.sql` only if you want the optional weekly email. Follow `docs/WEEKLY-DIGEST.md`; existing payments SQL remains in place.

## What's new in v335 (30 October 2026)

- **Gold in You:** members see "You are Gold", their plan and end date, with Manage. The ₹99 offer no longer shows to people who already pay, on You or Today. The Gold screen ends cleanly (no stray footer).
- **Story time only in You:** removed from Today, the home banner, Listen and onboarding. You has a small sheet to show or hide it; Settings has a switch that asks before hiding it everywhere (`tsb_kids_show`).
- **Smoother Read:** the opening page is laid out on finger down, layout is read before it is written, and the book shadow no longer redraws every frame (tap work 108 ms to 17 ms on a 4x slowed CPU; 60 fps).
- **520 books, 3,685 lessons** everywhere, including the share image.
- Nothing new to run in Supabase: the v334 SQL still applies.

## 🆕 What's new in v334 (30 October 2026)

- **Read opens the real 3D book.** The cover swings open and the first page becomes the reader, with no loading pause.
- **New scanner (`scan.html`).** Reads the ISBN barcode live (where the phone supports it) or the cover title; missing books can be requested in one tap.
- **Gold by UPI.** Pay with a UPI app or QR, paste the 12-digit UTR, and the server switches Gold on. YouPI-PG works alongside when it is set up. See `docs/GOLD-PAYMENTS.md`.
- **13+ sign-up**, no parent tick. **Kids mode** opens from Today and You.
- **Voice typing** with the phone's recogniser, then free on-device Whisper-tiny. **Hold a word** to see its meaning.
- **Hindi audiobook covers**, a cleaner search bar, and dark-mode contrast fixes.
- **Security:** no admin password in the app, no email in public profiles, exact-amount payment checks.
- **SEO:** canonical links, site structured data with a search box, a clean sitemap, and no invented star ratings.

**After uploading:** run `supabase/sql/UPDATE-v334-payments-security.sql` once in the Supabase SQL editor, then deploy the edge functions listed in `docs/GOLD-PAYMENTS.md`. Files removed in this release are listed in `docs/REMOVED-FILES.txt`.

> 🎨 Design language: calm paper, ink and one yellow. Newsreader for reading, Space Grotesk for the interface.

## ✨ Features

### 📚 Library
- **280 books, 1643 lessons** with covers, read time & lesson count
- **Fuzzy search** (typos OK), **category filters**, **sorting** (A-Z, shortest, newest, progress...)
- **My Shelf** - bookmark books with the ❤️ button
- **Lesson of the Day** - rotates daily, no backend needed
- **🎲 Surprise Me** - random book button
- **Continue Reading** banner - picks up where you left off

### 📖 Reading Experience
- **Reading progress** - mark lessons as read, progress bars everywhere
- **🔊 Listen** - text-to-speech reads any lesson aloud (built into the browser)
- **🃏 Quiz Mode** - flashcard recall testing for every book
- **✅ Checkable action plans** - tick off the 5 steps as you do them
- **- **🎴 Share Cards** - every book, lesson, and quote generates a branded neo-brutalist image card (1080px, Instagram/WhatsApp-ready) shared via the native share sheet or downloaded
- **📤 Share** - books & individual lessons, deep links included (native share on mobile)
- **Read Next** - related book suggestions on every page
- Expand/collapse all, 3 text sizes, keyboard shortcuts (/, R, D, ←, →, Esc)

### 🏆 Gamification
- **Streaks** - daily reading streak counter
- **Levels** - Apprentice 🐣 → Bookworm → Deep Reader → Scholar → Sage → Enlightened ✨
- **16 achievement badges** with unlock popups and a Trophy Room

### 🌙 Experience
- **Dark mode** - full neo-brutalist dark theme, remembered across visits
- **PWA** - installable on phones ("Add to Home Screen"), works offline
- **Perfect mobile experience** - responsive down to 360px, touch-optimized
- Motion design: floating shapes, scroll reveals, hover physics - respects reduced-motion
- Custom 404 page, skeleton loaders, SEO/OG meta tags

### ✍️ Community Stories
- Type a story or upload a PDF, add an AI-generated cover
- Optional **global stories** via free Supabase (5-min setup, see below)

## 🌍 Global Stories - Two Ways (pick one)

### Option A: No backend at all (default - works today)
Readers publish → story saves on their device → the site offers them a tiny `.json` story file + a pre-written email to send it to you. You review it, paste the object into `js/stories-community.js`, and re-upload during your weekly update. **The story is now visible to every visitor.** You are the moderator - nothing goes global without you.

> Set your email in `js/config.js` → `SUBMIT_EMAIL` before launch!

### Option B: Instant global publishing (free Supabase, 5 min)
For stories to appear globally **instantly** without your weekly review, plug in a free [supabase.com](https://supabase.com) backend:
1. Create a free project → SQL editor → run the snippet at the top of `js/config.js`
2. Project Settings → API → copy URL + anon key into `js/config.js`
3. Push to GitHub - the site auto-switches to cloud mode

## 💾 User Progress - How Saving Works

Badges, streaks, reading progress, bookmarks, and checked action plans **save automatically in each visitor's browser** (localStorage) - close the site, come back next month, everything is still there. No login needed.

- It's per-device (phone and laptop each have their own progress)
- Clearing browser data erases it
- Solution built-in: **Trophy Room → Backup My Progress** downloads a file; **Restore From File** loads it on any other device

## 🚀 Deploy on GitHub Pages

1. Push this folder to a GitHub repo
2. Settings → Pages → Deploy from branch → `main` / root
3. Done. Your site is live at `https://<username>.github.io/<repo>/`

## ➕ Adding a New Book

Open `js/data.js` and add one object to the `BOOKS` array:

```js
{
  id: "deep-work",                    // used in the URL: book.html?id=deep-work
  title: "Deep Work",
  author: "Cal Newport",
  year: 2016,
  category: "Productivity",           // new categories auto-create filter chips
  cover: "assets/covers/deep-work.jpg",
  readTime: "10 min",
  tagline: "Card text on the shelf...",
  oneLiner: "One-sentence essence...",
  bigIdea: "The yellow Big Idea box text...",
  quotes: ["Quote 1", "Quote 2", "Quote 3"],
  lessons: [
    {
      title: "Lesson title",
      chapter: "Chapter 1",
      summary: "The distilled teaching...",
      example: "A real story/example from the book...",
      action: "One concrete thing to do today..."
    }
  ],
  actionPlan: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]
}
```

Drop the cover image into `assets/covers/` - that's it. Everything else (stats, filters, search, prev/next navigation) updates automatically.

## 📂 Structure

```
thesmallbook/
├── index.html          # Homepage (shelf, search, filters)
├── book.html           # Book detail template (?id=book-id)
├── stories.html        # ✍️ Community Stories - write & publish
├── story.html          # Story reader (?id=story-id)
├── css/style.css       # Neo-brutalist design system
├── js/config.js        # ☁️ Cloud config - paste Supabase keys here for global stories
├── js/store.js         # Storage adapter (Supabase cloud / localStorage fallback)
├── js/data.js          # 📌 THE LIBRARY - all book content lives here
├── js/app.js           # Homepage logic (search, filters, stats)
├── js/book.js          # Book detail renderer
├── js/stories.js       # Story publishing + community shelf
├── js/stories-seed.js  # Seed stories shipped with the site
├── js/story.js         # Story reader logic
└── assets/covers/      # Book cover images
```

## 💀 The Graveyard

The anti-library: **300 legendary real-world failures** - Newton buying the bubble top, Kodak shelving the digital camera, Madoff, Theranos, Napoleon in Russia, Harshad Mehta, Kingfisher, the Trojan Horse - each with the full story, the fatal mistake, and the free lesson, linked to the book that teaches the antidote. Searchable, filterable by 8 ways-to-die (Startups, Money, Fraud, Ego, Business, Trust, History, Fame), with a daily Grave of the Day, a 🎲 random-corpse button, and shareable R.I.P. cards. Add cases in `js/failures.js`.

## 🌐 Universal Language Support

The entire app - all 240 books, every lesson - translates into **26 languages** via the 🌐 button: Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Urdu, Odia, Spanish, French, German, Chinese, Japanese, Arabic, and more. Plus two **exclusive modes** found nowhere else:
- **Hinglish** - Hindi transliterated to English letters ("tum kya kar rahe ho" style) for readers who speak Hindi but read Roman script best
- **Gujlish** - the same for Gujarati ("tame shu karo cho")

Built on Google Translate's page engine + our own transliteration engine (`js/lang.js`). Choice is remembered across visits. Requires internet for translation.

## 🍕 Support

Love the project? Hit **Fuel the Library** on the site (UPI) - supporters get early access to new books & features, priority book requests, and exclusive cheat-sheet packs.

## 👤 Credits

Made by **Jash Gandhi**.

## ⚖️ Disclaimer

All summaries are original educational analyses and commentary. No book text is reproduced. Please support the authors - buy the full books.
