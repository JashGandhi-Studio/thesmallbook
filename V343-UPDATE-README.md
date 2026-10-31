# TheSmallBook · Build 343

This build starts the list you sent, in the order you ranked it. The first item
is the one you circled, and it is done properly rather than patched. The rest of
this note says exactly what changed, what was verified, and what is still open.

---

## 1. The app owns selection. Google never gets a turn.

You circled the browser menu (Define, Copy, Select all, Web search) and the
Google share bubble sitting on top of the app's own Highlight / Copy / Share /
Explain bar. That happens because the page lets the browser select text. No CSS
hint suppresses that menu reliably while native selection is on.

So the browser no longer selects text in this app at all. `js/inapp-select.js`
marks the whole document as app-owned and builds the selection itself:

- Rest a finger on a word for about 0.4 seconds and that word is selected. Drag
  the same finger and the selection grows word by word, across paragraphs.
- Two round yellow handles sit at the ends of the line, and either one can be
  dragged to change where the selection starts or stops.
- The app's own bar appears above it: Highlight, Copy, Share, Explain. Copy now
  gives you the quote plus the book name and thesmallbook.in, not a bare string.
- The meaning card still opens for a single word, because that part of the app
  was always right.
- Nothing appears from the browser: no Define, no Select all, no Web search, no
  share bubble, no long-press image menu.
- Text fields, textareas and the editors keep normal behaviour. A native menu is
  genuinely useful there and nowhere else.

It is loaded on every page, 1280 of them, so this is the behaviour in the reader,
on book pages, on graveyard cases, on the pSEO pages and on every sheet.

Verified in a real mobile browser: reader, book page, graveyard case and a pSEO
comparison page all open the app bar with the app highlight painted, and copy
returns "quote" Book · thesmallbook.in.

## 2. Listen is instant after the download

The model was being read into the worker on the first tap of Listen, which is
several seconds of ONNX warm-up on top of the download. Now:

- Finishing the download immediately wakes the engine in the background, so the
  next Listen has nothing to load.
- Opening any reading page with a stored voice warms it while the page settles,
  inside idle time, so the tap lands on a ready engine.
- Nothing plays and nothing prompts during either warm-up.

## 3. Paid Originals stop being free

Your note was right: the read view handed over every lesson of every Original
and Listen spoke them too. One rule now lives in `js/config.js` (`TSB_LOCK`) and
is asked by the book page, the read view and the Listen queue:

- The first five Originals stay open, exactly as before.
- In a paid Original the first lesson reads in full. The read view then closes on
  one card: 19 rupees once for this book, or Gold for everything, and every
  lesson, the action plan and the quotes stay behind it.
- Listen narrates the same amount as the page, then says why it stopped.
- Sharing, highlighting, saving and quoting stay open to everyone.
- A 19-rupee unlock is remembered per book. Gold beats it.

Verified: a paid Original shows 3 pages instead of 27, a free one is untouched,
and a local unlock restores all 27.

## 4. Gold is a one-time payment, and the page is quieter

- Every "a month", "a year", "Cancel anytime" and "auto-renewal" line on the
  Gold page and in the Gold sheet is gone. ₹99 is one payment, ₹999 is one
  payment for life.
- The feature cards lose the valuation line, the second badge, the third badge
  and the footnote under each one. Same offer, said once.
- The reassurance slide that repeated the essay below it is gone.

## 5. The 3D discovery page has the real wordmark back

- The header reads THE SMALL BOOK, with SMALL in brand red, next to the yellow
  tile with the ink book.
- The four buttons that were crowding the wordmark into the corner are out of the
  header. They now sit in one quiet dark pill at the foot of the page, where the
  thumb already is. The buttons themselves are untouched, the new pill presses
  the same ones.

## What is verified in this build

- `npm test`: 1010 passed, 0 failed.
- 12 pages loaded in a real mobile browser: no JS errors, no 404s.
- Selection, copy, meaning card, paywall, unlock and the Listen queue all checked
  in Chromium with a touch profile.

## What is next, in your order

Not in this zip, and not started yet, so there is no half-finished work in the
diff:

1. Motion pass: page and tab transitions at 120 Hz, the reader's movement, the
   selection handles' feel once they are in daily use.
2. Library: the search field clipping, and a skeleton that matches the shelf
   layout instead of a generic shimmer.
3. Messages: the typing indicator sitting too high, and its alignment.
4. The library modes rebuilt around better answers (Compare books, Decision
   before disaster, 7-day challenge, Myth vs less, Red flag Friday). Founder
   field notes to be removed.
5. The grave share card rebuilt from scratch, then audited across every graveyard
   entry with a table.
6. The new case file with evidence, chat proofs, misleading details and videos.
7. Onboarding, the last of the old sheets, and the Original covers in the
   Attention Garden register.
