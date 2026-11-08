# Build 401

This build exists because of one complaint: too many books opened onto lessons
that were not about the book. A reader would tap a title, get eight pages of
confident sounding filler, and the app would look broken even though every
button worked.

That is fixed. All sixty-six affected books now carry their own content, written
per book, per chapter. Nothing in this build is generated text that imitates a
structure.

Final state: `1084 passed, 0 failed`. Verified on the extracted zip, on an
iPhone 13 profile in a real browser, not just in a working copy.

---

## 1. The placeholder problem

Sixty-six books had lessons built from a template. The template knew how a
lesson should look, so each page had a heading, a paragraph, an example box and
an action box, and none of it said anything about the book you had opened. The
tell was the same sentence at the start of every one of them: a book
"designed to be used slowly".

Those sixty-six books now have:

- a real tagline and one line summary,
- a real big idea,
- three real quotes,
- eight chapters, each with its own title and its own chapter reference,
- eight lesson bodies, each with a summary, a real world example and a practice,
- a five step action plan and an honest caveat.

Ten of the sixty-six were TheSmallBook Originals with invented titles. They were
written from scratch rather than left as the only books on the shelf with
nothing in them: The 8 PM Reset, The Commute Advantage, The Family Ledger, The
Quiet Internship, The Neighbourhood Network, The Attention Garden, The Long Game
Classroom, The Repair Economy, The Kind Boundary, The Listening Bench.

Sixty of the sixty-six were real books, and every chapter title in them now
matches the book it belongs to: Braiding Sweetgrass opens on the gift economy,
Caste on the word, The Wager on the wreck of the Wager.

## 2. What was checked, and how

- Placeholder detector over both catalogues: `600 books, 0 placeholders`.
- Every book in `js/data-full.js` has a body on every lesson: 0 missing.
- All 600 `data/lessons/<id>.js` files were parsed with stubbed loaders and
  compared to the bulk catalogue: 600 match, 0 bodies differ, 0 titles differ.
- Forty books swept in the reader on an iPhone 13 profile, 343 pages opened:
  every page in the right order, every lesson page carrying both its example
  box and its action box, no filler text anywhere.
- The ten new Originals read start to finish, ten pages each, once owned.
  Locked, they stop where they are sold, three pages in, which is the rule.
- Reader, swipe back, room player, offline row, update card, Your Time: all
  still pass, unchanged in this build.

## 3. The cover that nothing pointed at

While checking the finished package against a fresh copy of the repository, one
file that the app asks for turned out not to be in the tree, and never had been:
`assets/cover-fallback.png`. Seventy two of the generated topic, comparison and
book like pages point every book cover at it, in the `onerror` of the `<img>`, so
a cover that fails to load shows this instead of nothing. The file was not in
the repository, so that safety net was itself a 404.

It is in this build, drawn in the app's own colours: paper cream, the yellow
band, the book mark from the logo, and the words the shop uses. Eight kilobytes,
no code changed, nothing else touched. A missing cover now shows a card instead
of a broken image.

## 4. One honest number

On a throttled 4G profile (1.6 Mbps, 150 ms latency) the first words of a cold
open arrive in about 6.2 seconds, and the page pulls about 1.1 MB to do it. On
an unthrottled connection the same open is 174 ms. The 6.2 seconds is the
payload divided by the pipe, not a script stalling. The bulk catalogue got
smaller in this build, not bigger: `js/data-full.js` went from 6.28 MB to
5.93 MB, because real chapter text is tighter than filler.

## 5. Build number

Every place that prints a version prints 401: `js/bootguard.js` (`BUILD`),
`sw.js` (`CACHE_VERSION = "tsb-v401"`), the about, settings and legal pages, and
every asset query string in all 33 HTML files. The service worker rotates its
caches on the new name, so a returning reader's old scripts cannot survive this
release.

## 6. Files of note

- `REPORT-v401.md` sits beside the zip, not inside it, and documents the work.
- `CHANGES-vs-main-v401.diff` sits beside the zip and reads cleanly in GitHub
  Desktop.
- The tree is unchanged in structure: same folders, same 600 books, same tests.
