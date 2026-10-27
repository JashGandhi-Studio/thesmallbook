# TheSmallBook System Flow Architecture (flow.md)

This document provides a comprehensive end-to-end technical and user flow blueprint for TheSmallBook. It details every journey, state transition, data pipeline, and interaction loop across the platform.

---

## 1. High-Level Architectural Flow

```
                      +-----------------------------+
                      |   1. Entry & First Visit     |
                      |  (Guest Session / Storage)  |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |  2. Circadian Theme Detect  |
                      |  6am-6pm Light / 6pm-6am Drk |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   3. Onboarding (Tune-Up)   |
                      | 7 Chapters: Battle to Shelf |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | 4. Welcome Recommendation   |
                      | Horizontal Book Rail (0ms)  |
                      +--------------+--------------+
                                     |
           +-------------------------+-------------------------+
           |                         |                         |
           v                         v                         v
+--------------------+    +--------------------+    +--------------------+
| 5. Core Reader     |    | 6. Discovery Hub   |    | 7. Quote Wall      |
| (book.html)        |    | (index / random)   |    | (quotes.html)      |
| Lessons, autopsies |    | 3D desk tumble,    |    | Corkboard scatter, |
| audio narration    |    | category filter    |    | 0ms spring bounce  |
+----------+---------+    +----------+---------+    +----------+---------+
           |                         |                         |
           +-------------------------+-------------------------+
                                     |
                                     v
                      +-----------------------------+
                      | 8. Social & Direct Messages |
                      | (dm.html, stories.html)     |
                      | 0ms dispatch, tick updates  |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | 9. Monetization Funnel      |
                      | (gold.html, youpi.js)       |
                      | ₹49 / ₹99 / ₹999 Plans      |
                      | Direct UPI, DPDP Compliant  |
                      +-----------------------------+
```

---

## 2. Circadian Time-of-Day Theme Engine

### Purpose
Aligns the reading surface with natural daylight cycles to minimize eye fatigue without forcing the user to hunt for manual toggles.

### Logic Flow
1. **Pre-Paint Inline Check (`<head>` of all HTML files)**:
   - Reads `localStorage.getItem("tsb_theme")`.
   - Checks local system clock: `var hr = new Date().getHours()`.
   - Computes: `var isNight = (hr < 6 || hr >= 18)`.
   - If manual override exists (`"dark"` or `"light"`), respects user decision.
   - If unset or `"auto"`, applies `dark` class if `isNight` is true, or removes it if `isNight` is false (6:00 AM to 6:00 PM).
   - Syncs phone browser status bar `<meta name="theme-color">` to `#ffc800` (light) or `#16130e` (dark) before first layout pass.
2. **Runtime Engine (`js/prefs.js`)**:
   - `theme.apply()` dynamically re-evaluates hours and user preferences.
   - `window.matchMedia("(prefers-color-scheme: dark)")` change listeners trigger `theme.apply()` when OS theme shifts.
   - Both `index.html` and `book.html` use identical logic so switching from feed to reading mode never results in visual flash.

---

## 3. The 7-Chapter Onboarding Flow (`js/onboard.js`)

### Step Breakdown
- **Chapter 00: The Welcome Greeting**:
   - Input for reader name.
   - Defaults gracefully to "Reader" if left blank.
- **Chapter 01: Your Battle (Focus Area)**:
   - Identifies reader struggle: Overthinking, Money, Restlessness, Systems, Procrastination, Career.
- **Chapter 02: Your Fixes (Secondary Categories)**:
   - Selects 2 to 3 related disciplines (Philosophy, Wealth, Habit Design, Focus).
- **Chapter 03: Daily Reading Commitment**:
   - Time commitment: 5 min, 10 min, 15 min, 30 min.
- **Chapter 04: Reading Cadence**:
   - Pace preferences: Steady daily habit vs. weekend deep explorer.
- **Chapter 05: Visual Atmosphere**:
   - Language selection (English, Hindi, regional dialects) and preview theme.
- **Chapter 06: Starter Shelf Generation**:
   - Algorithm filters the 520-book database.
   - Combines the user's primary battle, secondary fixes, and new releases (tagged with NEW).
   - Reader toggles books on or off to assemble their active starter shelf.
   - Persists selections to `tsb_starter_shelf`, `tsb_interests`, and `tsb_onboarded`.

---

## 4. Post-Onboarding Recommendation Experience

### User Experience
- Rather than showing a crowded, multi-font modal or dumping the user onto an empty feed, onboarding completes directly into a focused welcome window.
- **Header**: "Welcome to TheSmallBook! Here are your personal book recommendations."
- **Horizontal Book Track**:
  - Horizontal swipe rail (`overflow-x: auto; scroll-snap-type: x mandatory`).
  - Presents 4 to 6 curated books derived from the user's starter shelf.
  - Each card displays authentic cover art, clean title, author name, estimated read time pill (`⏱ 8 min`), and a direct `Read →` action.
- **Dismissal Action**:
  - Single tap on `Explore All Books →` or top-right `✕` dismisses the overlay and reveals the customized home feed.

---

## 5. Library Discovery & 3D Physical Book Mode

### Discovery Tracks
1. **Curated Category Rail**:
   - Horizontal scrolling track featuring 14 clean category pills (Habits, Wealth, Calm, Stoicism, Strategy, Biographies, Psychology, Leadership, Indian Disruptors, etc.).
   - Instant client-side DOM filter across 520 book cards without full page reload.
2. **Instant Search Engine**:
   - Live query evaluation across book titles, authors, big ideas, and takeaway summaries.
   - Zero-delay input responsiveness using lightweight text normalization.
3. **Architectural 3D Discovery Mode (`random.html`)**:
   - **Physics & Motion**:
     - Realistic 3D book model rendered with CSS 3D transforms (`preserve-3d`).
     - Desk bounce and tumble animation mimicking physical book handling.
     - Gravity-assisted double impact bounce upon rolling a new selection.
   - **Interaction**:
     - Locked screen scrolling when book is closed allows touch dragging and 3D rotation on mobile devices without accidental page scrolling.
     - Clicking "Open" unfolds the book spread to reveal 3 core lessons, key takeaways, and action steps.
     - Scanned QR codes and shared book links deep link to `random.html?id=[bookId]` for an engaging 3D preview before reading.
4. **The Graveyard of Ambition (`graveyard.html`)**:
   - Library of 400 commercial, startup, and historical failure autopsies.
   - Each failed endeavor is paired with an antidote book from the collection.

---

## 6. Full-Screen Reader Experience (`book.html`)

### Core Reading Mechanics
1. **Centered Focal Reading Area**:
   - Neo-brutalist distraction-free layout optimized for reading retention.
   - Book header includes cover, category, author, read time, and audio button.
2. **Lesson Breakdown Architecture**:
   - Each book contains 5 to 11 substantial lessons.
   - Every lesson includes:
     - **Summary**: Analytical distillation of the concept.
     - **Example**: Real-world commercial or historical evidence.
     - **Action Plan**: Immediate executable step.
3. **Audio Player Integration**:
   - Top and bottom action bars allow readers to listen to LibriVox public-domain recordings or Web Audio synthesized narrations.
4. **Notebook & Quote Highlighting (`notes.html`, `js/highlight.js`)**:
   - Selecting text pops an instant highlight drawer.
   - Highlights sync directly to the user's personal notebook with book metadata pre-linked.

---

## 7. Audio Room & Continuous Player (`podcasts.html`, `js/audioplayer.js`)

### Pipeline
1. **Audio Sources**:
   - High-fidelity studio recordings of TheSmallBook original analyses.
   - Curated RSS show streams from verified platforms.
   - Volunteer public-domain recordings via LibriVox and Archive.org.
2. **Persistent Player Engine**:
   - Player dock stays mounted across navigation.
   - Integrates with browser `MediaSession` API: shows cover art, track title, and enables lockscreen play, pause, and scrub controls.
   - Features 1.0x, 1.25x, 1.5x, 2.0x playback speeds and sleep timer.

---

## 8. Tactile Quote Wall Flow (`quotes.html`, `js/quotewall.js`)

### Pinning Pipeline
```
User taps 📌 Floating Action Button
        |
        v
Composer Sheet Opens
        |
        +---> Option A: Write / Select Quote
        |       |
        |       +---> Dual Source Finder:
        |               [📚 520 Library Books] (1,570+ Quotes)
        |               [📜 Classical Wisdom] (60 Quotes)
        |       |
        |       +---> Real-time keyword & author filter
        |       |
        |       +---> Tap quote -> fills note with author & title attribution
        |
        +---> Option B: Select Polaroid Photo (Camera / Gallery)
        |
        v
User clicks "PIN IT" / "PIN THE PHOTO"
        |
        v [0ms Optimistic UI Phase]
1. Play tactile Web Audio pin sound (playPinSound)
2. Trigger subtle mobile haptic vibration
3. Generate local temporary id (opt-[timestamp])
4. Prepend note to local array
5. Mount element on corkboard with spring bounce animation (qw-note--spring)
6. Close composer sheet immediately
7. Display toast: "📌 Pinned! The whole library can see it now."
        |
        v [Asynchronous Network Phase]
Background dispatch to Supabase posts table:
   api("posts", { method: "POST", body: payload })
        |
   +----+--------------------------+
   | Success                       | Network Failure
   v                               v
Reconcile local temporary id      Revert optimistic note from DOM
with real server UUID.            Display clear error toast.
Transfer saved board coordinates.
```

---

## 9. Latency-Free Messaging & Community (`dm.html`, `stories.html`)

### Direct Messaging Pipeline
1. **Instant Send Execution**:
   - User types message and hits Send.
   - `playChatChime("send")` produces immediate audio feedback.
   - Bubble mounts instantly in thread with a single gray tick (`✓`).
   - Network payload dispatches via `C.sendDM(uid, body)`.
2. **Server Confirmation**:
   - Once server responds, the tick updates immediately to double tick (`✓✓`).
   - Thread syncs in the background without UI stutter.
3. **Incoming Message Notification**:
   - Active chat polling runs every 2,000ms (2s) while tab is visible.
   - When a new message from the peer is detected:
     - Repaints thread smoothly.
     - Plays `playChatChime("recv")`.
     - Triggers mobile haptic pulse: `navigator.vibrate([15, 40, 15])`.
4. **Optimistic Social Actions**:
   - Following, subscribing, and follow requests toggle visual state instantly with haptic feedback.
   - Server synchronization runs asynchronously in the background.

---

## 10. Monetization & Payment Architecture (`gold.html`, `js/youpi.js`)

### Pricing Tier Matrix
| Plan | Price | Duration | Target Audience | Primary Features Unlocked |
| :--- | :--- | :--- | :--- | :--- |
| **PDF Pass** | ₹49 | 75 Days | Students & Exam Preppers | Unlimited 2-page PDF cheat-sheets, printable action plans |
| **Gold Monthly** | ₹99 | 30 Days | Habitual Readers | 5-button dock customization, studio cover tools, offline cache |
| **Gold Annual** | ₹999 | 365 Days | Power Learners & Founders | All features, founding supporter profile badge, locked price |

### Payment Flow Engine (`js/youpi.js`)
1. **Intent Launch**:
   - On mobile, tapping any payment button launches the UPI intent URI (`upi://pay?pa=...&am=...`).
   - Supported apps: PhonePe, Google Pay, Paytm, BHIM.
2. **Pure Client QR Rendering**:
   - On desktop, an authentic ISO-18004 QR code is generated in pure JavaScript without external API calls.
3. **Mandatory 12-Digit UTR Bank Verification**:
   - To eliminate false unlocks and fraud, the checkout requires the user to input the 12-digit bank reference number (UTR) from their receipt.
   - Checks against the bank reconciliation endpoint.
   - No payment data or tracking cookies are stored on third-party servers.

---

## 11. Admin Command Console (`admin.html`, `js/admin.js`)

### Access & Controls
- **Protected Entry**: Gated behind `tsb_admin` and secure authentication.
- **Telemetry & Config**:
  - Live metric telemetry (active readers, lesson completions, streak data).
  - Dynamic remote feature toggles synced via `tsb_remote_config`.
  - Reader moderation tools (ban abusive users, inspect reported stories).
  - Instant book catalog search and pricing adjustments.
