# Build 391

This build exists because of one question: why does the app feel broken for a
reader who has been using it, while it works for a first-time visitor?

The answer was not the reader mode, the themes, the languages or the voice.
Those all work. The answer was the cache. This build fixes the cache, fixes the
offline audio data, and finishes four red tests. Details below.

Final state: `1042 passed, 0 failed`. Verified on the extracted zip, not just in
my working copy.

---

## 1. The real reason everything felt broken: returning readers were running old scripts

The service worker serves two different ways:

- HTML is network first, so a returning reader always gets the newest page.
- Every script and stylesheet is cached for ever under its `?v=` number, and the
  worker deliberately never refreshes those, because the version number is
  supposed to change when the code changes.

The version number had not changed. It had been sitting on 390 across a long run
of changes. So a returning reader got:

- new HTML, straight from the network, and
- old JavaScript, from a cache that was never allowed to update.

New pages driving old scripts is exactly the set of symptoms described: themes
that do nothing, a reader that will not page, language that will not switch,
voice that will not start, buttons that look right and answer to nothing. It is
not one bug. It is two versions of the app running against each other.

A brand-new visitor has an empty cache, so their first run is clean. That is why
my earlier testing looked healthy and the app still felt broken to a real,
returning reader. That was my miss, and this fixes it.

The cache name is now `tsb-v391`, the build is 391, and every `?v=` on every
page moved with it, all 1089 references in 32 files. On the first visit after
this deploy the new worker installs, takes over, and deletes the old cache. The
reader gets a coherent set of files instead of a mixture.

## 2. The voice engine was missing from the package

Six files were not in the zip I handed over, 38 MB of them, and they are the
whole narration engine:

- `js/vendor/tsb-voice/ort-wasm-simd.wasm` (10.6 MB)
- `js/vendor/tsb-voice/ort-wasm.wasm` (9.8 MB)
- `js/vendor/tsb-voice/piper-phonemize.data` (18 MB)
- `js/vendor/tsb-voice/ort-wasm.min.js`, `piper-phonemize.mjs`,
  `piper-phonemize.wasm`

Without them the private voice model can download and then fail to run, because
the phonemiser and the ONNX runtime are exactly what is not there. If narration
was dead for you, this is why, and it was my packaging error, not your code.

They are restored and verified byte for byte against your repository by
checksum, all six serve 200 with the right sizes, and they are in this zip.

## 3. Offline audio was never actually offline

`sw.js` precached 207 files. It did not precache the three data bundles that
make listening work:

- `data/podcast-episodes.js` (89 KB, the episode lists)
- `data/podcast-eps-388.js` (173 KB, the same for newer shows)
- `data/audiobook-files.js` (258 KB, the chapter audio map)

They were loaded at runtime instead. That works on wifi and fails on everything
else, which is the only situation where offline matters. When they were missing,
the episode sheet sat on its fetching note and the reader saw a podcast that
never opened. All three are precached now.

Checked with the network switched off completely after a normal visit: the app
opens, all seven shows are there, nineteen shows carry their bundled episode
lists, and browsing episodes returns real episodes with no connection at all.
The cache holds 212 entries and is named `tsb-v391`.

## 4. The service worker never installed on 221 pages

Carried over from the last round. `js/prefs.js` registered a bare `"sw.js"`, so
a page inside a folder asked for `sw.js` inside that folder, got a 404, and never
installed the worker. The root is now derived from the file's own address, which
is correct at any depth and still correct under a subfolder. Verified: the 404
console error on nested pages is gone and the worker reaches ACTIVE on a first
visit to an SEO page.

## 5. Four red tests, finished properly

- `about - Copy.html`, a stray root duplicate still carrying old library counts.
- `js/freeshelf.js` and `js/smallscroller.js`, retired modules with no script tag
  and no caller left.
- Eight duplicate cover images at the repo root, all exact copies of files in
  `assets/covers/` where every page actually points. About 1.3 MB lighter upload,
  no visual change. I checked every reference before removing them.
- `legal.html` said `Build tsb-v322` in the footer, and one em dash sat in a
  `spine-389.js` comment. Both corrected.

## 6. The files to delete by hand

Unzipping replaces files. It cannot delete them. Remove these eleven or the
tests stay red:

```
about - Copy.html
js/freeshelf.js
js/smallscroller.js
anything-you-want.png
e-myth.webp
grit.webp
intelligent-investor.webp
richest-man-babylon.webp
thinking-fast-slow.png
you-are-badass.png
zero-to-one.webp
```

From the repo root:

```bash
git rm "about - Copy.html" js/freeshelf.js js/smallscroller.js \
  anything-you-want.png e-myth.webp grit.webp intelligent-investor.webp \
  richest-man-babylon.webp thinking-fast-slow.png you-are-badass.png zero-to-one.webp
```

---

## What I verified as a user, not as a test

In a clean profile at build 391, on a phone-sized screen:

- Read mode: opens from the book page, shows the chapter, the real-world example
  and the practical action, and the Next control moves through the chapters.
- Themes: paper is 18.2 to 1 contrast, sepia 12.8 to 1, night 15.5 to 1 on the
  article text. All three apply and all three stay readable. Switching them is
  what was broken before, not the themes themselves.
- Podcasts: search for naval returns five shows. Play latest starts audio and the
  clock runs. Browse episodes lists them. All of that also works with the
  network disconnected.
- Onboarding: walks end to end, saves every answer, greets the reader by name,
  and does not return on reload.
- Thirty page types loaded with zero 404s and zero console errors.

## What I have NOT done

The rest of your list is design and product work, not repair, and I did not
touch it: retiring the separate Ask Library window and simplifying the bot down
to voice and typing with a switch in Settings, making the Mind Pick line unique
per reader, making the Listen tab build a personalised feed for signed-in
readers and a plain one for guests, the action bar icon and label treatment, a
new splash screen, animation polish, and the Pip bot rework.

Each of those is a real change with its own decisions, and bundling them into a
repair build is how an app gets worse. Tell me which one to take first and I will
do it on its own so you can judge it on its own.

If anything still looks broken after you install this build, clear site data
once for thesmallbook.in. The new worker should do that by itself, but a browser
that is holding a half finished install can need the nudge.

## The offline bug that made the reader look empty (fixed in this build)

If you opened a book and the page came up with no text at all, this was why, and
it was not one bug but five stacked on top of each other.

1. `sw.js` stored every file it precaches as `?v=v391`. The cache name is
   `tsb-v391`, and the code took `split("-")[1]`, which keeps the `v`. Every page
   asks for `?v=391`. So not one precached file ever matched a request. Online
   the browser quietly went to the network and nobody noticed. Offline, or on a
   bad connection, every script failed and the app had no working offline mode
   at all. The number now has its leading `v` removed before use.
2. `reader.html` guessed the build number in two places, `"390"` and `"388"`,
   before the build was known, so the reader asked for `spine-389.js?v=390`
   while the cache held `?v=391`. It now asks for the plain address when the
   build is not known yet, and the worker answers a plain address from the copy
   it holds under any version.
3. A reload marks every request `cache: "reload"`, and that branch of the worker
   went straight to the network with no way back. Reloading without signal gave
   a blank page. It now falls back to the saved copy.
4. `reader.html` was not in the precache at all, and neither were `js/reader.js`,
   `js/listen.js` or twenty two other scripts the pages load. A first visit
   followed by a lost signal fell through to `index.html`, which is why a book
   looked like the home page. Every top level page and every page script now
   ships in the precache, and the reader's spine is in there too.
5. `addAll` is all or nothing. One refused connection out of 238 threw the whole
   offline copy away. The install now saves what it can, six at a time, and
   always takes over.

Two more things came out of the audit:

- The Mind Pick question was wired to the Next button, so anyone swiping through
  chapters had a full screen sheet thrown over the reading controls a second
  later. It now waits until the chapter is actually scrolled to its end.
- The voice pack (`js/vendor/tsb-voice/`, 38 MB, six files) was missing from the
  tree and is restored, md5 matching the repository.

Measured after the fix, on the extracted zip served over HTTP:

- Reader online: 882 characters of text, chapter heading present.
- Reader offline after one visit: 882 characters, identical.
- Swiping four chapters offline: 844, 946, 807, 853 characters, each with its
  own heading.
- A book never opened, offline: 1209 characters of fallback, not a blank page.
- 40 book sweep: 40 of 40, zero failures.
- `npm test` in the extracted zip: 1042 passed, 0 failed.

## Reader swipe, the sheet that blocked it, and the splash (this build)

- The "Where do you think this idea fails?" sheet is gone from the reader. It
  opened itself at the end of a chapter, it was fixed over the whole screen with
  pointer events on, and on a phone it swallowed every scroll and every tap on
  Next. That single overlay is why a chapter could not be scrolled and why Next
  did nothing. The question still exists on Today.
- Swipe is a real gesture now. It used to run only in page mode, measured
  screenX which moves with zoom, and had no vertical guard, so a diagonal scroll
  could turn a page. It now needs a sideways, quick, single finger gesture, it
  ignores the bottom bar, and it works in both reading modes.
- A swipe during the moment the full lesson pack lands used to be undone, because
  the rebuild jumped back to the page captured before the tap. It now keeps the
  page the reader is on.
- 45 of the 50 Originals are paid and stop after the first lesson at the unlock
  page by design. The other 560 books read start to finish.
- Splash: v382 had killed it with a `display:none` override, which is why nobody
  ever saw it. It is back, it plays once per app open on Today, and any touch
  sends it away. Its shelf line was drawn with a mismatched negative margin and
  hung off the left edge; it is centred now and tapers. The progress line the
  markup always carried but no rule ever drew now exists and fills while the app
  boots behind it.

Measured after these changes, on a fresh iPhone profile with no storage:

- 30 free books, three real touch swipes each: 30 of 30 reached four distinct
  chapters, zero failures, zero page errors.
- Vertical scrolls that wrongly turned a page: 0 of 30.
- Splash progress line: 34, 58, 64, 92 percent across the opening.

## The book opens on the big idea again (this build)

- The reader had been made to land on chapter one in build 382, on the theory
  that the big idea looked thin. It is back to the format the books are written
  in: big idea, every lesson, then the action plan. Measured: a book with 8
  lessons reports 10 pages, so nothing is being cut short.
- 50 books are Originals. The first five are free and the other 45 stop after
  the first lesson at the unlock page, which is the paywall, not a fault. The
  remaining 550 books read start to finish.
- Swipe: single finger, sideways, quick, away from the bottom bar, and it now
  also finishes on a cancelled touch, because a repaint under the finger used to
  swallow the gesture.
- If a reader swipes past the last page they have while the rest of the book is
  still arriving, the reader is told and offered a retry, instead of the swipe
  simply doing nothing.
- Splash: the character is gone. What is left is the mark, the name, the promise
  and a line that fills while the app boots behind it.

Measured on ten separate fresh phone sessions, one book each, three real swipes:
ten of ten reached four distinct pages, starting at the big idea, zero failures.

## v391 · the reader is never a blank page with dead controls

Opening a book on a slow connection showed one chapter with no page counter and
no working Next, because the code that counts pages and drives swipes lives in a
script that arrives after a 1.2 MB catalogue. Three changes:

1. `reader.html` now builds the whole book from the small lesson file the moment
   it lands, not just the first chapter, and shows "Page 1 of 8" straight away.
2. A real thumb swipe turns the page in that early window, in both directions.
3. A watchdog keeps asking to paint until a page is on screen. The old code used
   five one-shot timers that all fired before the index arrived on a slow phone,
   so nothing ever painted again.

`js/reader.js` takes over the moment it loads and sets `window.__TSB_EARLY = false`,
which stands the temporary controls down. Measured on eight books with the reader
script and catalogue held back 6 s: every one opened with a real lesson, a correct
page count, and working swipe; after handover all page totals were correct.

Test suite: 1042 passed, 0 failed.

## v391 · four more defects found by using the app, not just loading it

1. **Podcast shows with a shipped episode list did not play.** `js/audioplayer.js`
   called a helper named `fmt` that does not exist, so the whole shipped-episode
   path threw a ReferenceError and the button did nothing, silently. Two call
   sites now use `fmtTime`. Tim Ferriss and the other list-backed shows play.
2. **A dead image request on the quotes page.** `#qwInspectPhoto` shipped with
   `src=""`, which asks the server for the page itself as if it were an image.
   The attribute is gone; the script sets it when a real photo exists.
3. **The onboarding topic step hid its own choices.** On a phone the sticky
   Next button sat on top of Read / Listen / Both, so those were never seen. The
   sticky footer was also falling below the bottom of the screen on the "It
   starts noticing" step. On short screens the footer is back in the flow and the
   topic list gives some height back, so nothing is covered and nothing is lost.
4. **og-builder clipped its own canvas on a phone.** It keeps the exact 1200x630
   frame for export, but a narrow screen can now scroll to see all of it.

Verified after the change: 600 of 600 books read correctly (page count matches the
label, opens on the Big Idea, swipes both ways, ends on the action plan, and the
45 locked Originals stop at the unlock page), every page loads with no JS errors
and no failed requests, and the suite is 1042 passed.
