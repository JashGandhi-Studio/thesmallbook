# v346 · the voice is yours by default, the pill follows you, and everything is smoother

Build **346**. Drop this folder over your site (or deploy as is). No database
work, no config change, no new keys, no SQL.

Priority this release, in the order you asked for it: **smoothness first, then
the yellow pill, then the sound.**

---

## 1. Smoothness

`js/bar.js` · `js/film.js` · `css/style.css`

- **The other tabs are already here.** Once the page you are on settles, the
  four shelf pages (Today, Library, Listen, You) are prefetched in idle time.
  Tapping a tab now opens a document the browser already holds instead of
  starting a fresh request. Measured Today → Library switch: **60 ms**.
- **Long lists only paint what is on screen.** 600 book cards, the Today
  sections and the graveyard rows now use `content-visibility: auto` with a
  reserved height, so the browser keeps the scroll geometry but skips layout
  and paint for everything below the fold. The scrollbar never jumps.
- **No wasted work on a view change.** Switching Today ⇄ Library no longer
  scrolls the page or repaints a view that has not changed; the hidden side is
  kept cheap instead of being destroyed and rebuilt.
- The tab highlight is painted by exactly one place now, so no double paint
  and no jump when both painters used to run.

## 2. The yellow pill

`js/bar.js` · `js/film.js` · `css/style.css`

Two real bugs, both fixed:

- **The leftover pill.** The sliding animation ends at `opacity: 1` with
  `fill-mode: both`, and the class that runs it stayed on the tab you had just
  left. That painted a second yellow pill on the old tab for good. Now the
  class is cleared from every item before the new one gets it, it is removed
  after the spring lands, and a CSS guard makes it impossible for any tab that
  is not active to paint the pill at all.
- **The pill that went home on its own.** The bar rebuilt itself whenever the
  Gold answer arrived (or Settings applied a new look), and a rebuild painted
  the highlight from the value read at page load — always Today. A rebuild now
  keeps you where you are: Gold landing cannot move the pill.

`film.js` no longer paints the highlight itself; it calls the bar, so Today →
Library slides instead of jumping, and the two can never disagree.

## 3. The voice

`js/tts-engine.js` · `js/audioplayer.js`

- **A downloaded voice is the default voice.** The choice used to live in one
  localStorage key; if that key was empty for any reason — a restore, an
  update, a download on another page, a Plus voice without Gold — a 63 MB
  model you already owned was silently ignored and the phone/cloud voice
  played instead. The device is now asked directly at page load: if a model is
  stored, **that is the choice**, it is written back, and it is the only voice
  used. No sheet, no question, no prompt.
- **The download sheet only appears when the device truly has no voice.**
- **It no longer stops after lesson one.** Three separate causes, all closed:
  1. a queue that was cut to a single lesson whenever the lock answer was
     "still checking" instead of "locked" (a paying member could hit this),
  2. a voice model that failed twice while waking up, which pushed the whole
     session onto the phone voice,
  3. a stalled stream that left the runner waiting forever in silence.
  Now: every lesson gets a fresh chance at the model, membership is allowed a
  moment to answer before anything is truncated, and a 15-second watchdog hands
  one silent line to the next route and keeps the book moving. Listening always
  continues, and it continues in your voice.
- **A smoother first sentence.** A stored model is woken in idle time at page
  load and again the moment Listen is tapped, so the first line lands in about
  a second instead of after a cold start.

## 4. The graveyard share card

`js/graveyard.js` · `js/graveyard2.js` · `css/style.css`

- **It closes now.** The sheet element was created but never stored, so the
  close function returned immediately every time — ✕, tapping outside and
  Escape all did nothing, and Share threw before it could hand the file over.
  One assignment fixed it (`shareSheetEl = d`).
- **Cancel means cancel.** Backing out of the phone's share sheet used to fall
  through to a silent download. It now returns to the card.
- **Rebuilt as a real phone sheet**: it rises from the bottom with a grab
  handle, dims the room, fits the card without cropping, and leaves on ✕, a tap
  outside, Escape, or a downward swipe. Closing releases the image, removes
  every scroll lock and returns focus to the grave that opened it.
- A card that fails to draw now says so instead of doing nothing.

## 5. Ask the Library, simplified

`js/ask.js` · `css/style.css`

One row under the answer — **try this next** — instead of two rows plus a
receipt line. The answer, one next move, then the sources.

## 6. Membership

`js/gold.js` · `js/deepdive.js` · `js/audioplayer.js` · `js/film.js`

Activated means access, unactivated means none:

- **One bad response is not a verdict.** A dropped connection, a token
  refreshing mid-flight or a cold edge function used to lock a paying member
  out for the whole page load. Two retries, with backoff, and "unknown" is now
  a real state instead of a silent "no".
- **A row with no end date is a lifetime membership**, not an expired one.
- **No paywall while we are still checking.** Gated pages say "checking your
  membership" for the few hundred milliseconds it takes, then open. The deep
  dive keeps listening for the answer instead of giving up after five seconds,
  and the book queue no longer truncates anything while the answer is in
  flight.
- Gold pages and tiles repaint the moment the server answers.

---

## Verified

- `npm test` · **1021 passed, 0 failed** (13 new v346 assertions)
- `tests/compare-live.js` · **35 passed, 0 failed**
- 13-page browser sweep on a 390 × 760 phone · every page clean, no console
  errors, and **exactly one yellow pill on the tab you are on**
- pill behaviour driven in a real browser: Library → late Gold rebuild → back
  to Today · the pill followed every time
- grave card: opens, Escape closes, ✕ closes, no scroll lock left behind
- book page: an 8-lesson book queues **33 parts / 9 items** — the whole book
- Ask: one move, one row, no receipt

## Files changed

`js/tts-engine.js` · `js/audioplayer.js` · `js/bar.js` · `js/film.js` ·
`js/gold.js` · `js/deepdive.js` · `js/graveyard.js` · `js/graveyard2.js` ·
`js/ask.js` · `css/style.css` · `tests/client-suite.js` · version strings
across the tree (346) · this README.

## Not touched

The 600 books, the 518 autopsies, the Ask modes and quota tiers, onboarding,
the covers, the store and the existing SQL all stay exactly as they were in
v345.
