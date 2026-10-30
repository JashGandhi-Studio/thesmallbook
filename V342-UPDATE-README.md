# TheSmallBook · Build 342

Everything in this build answers one of the notes you sent. Nothing else in the
app was rebuilt, so the diff stays readable in GitHub Desktop.

---

## 1. Listen works, on the first tap, and it does not stop

This was the real bug, and it had two causes.

**Cause one, in `js/audioplayer.js`.** Before the narrator could start, the
player demanded the voice model:

```
if (!queue._voiceReady && T.ensureVoiceModel) { ... else toast("Download TheSmallBook Voice Model to start listening.") }
```

Say "Not now" and the book never began. That is the silence you were hearing.

**Cause two, in `js/tts-engine.js`.** If no model was chosen, the router ran
`offerVoiceModel(); done(false); return;` for every English and Hindi sentence,
which meant: open a download sheet, play nothing.

**What happens now**

- The device voice starts speaking inside the same tap.
- The private model is used first when you keep one, and if it cannot start the
  sentence is handed to the phone voice instead of the book stopping.
- Two model failures in a session and the narrator stays on the phone voice
  until the next open, so a broken worker can never mute a whole book.
- A first phrase from the model that takes longer than nine seconds falls
  through to the device voice instead of waiting in silence.
- The download sheet now appears **once, quietly, twenty seconds in**, while the
  book is already reading itself, and never over the sound.
- The first sentence of a session gets seven seconds to start instead of three
  (Android needs it), so a slow start is no longer cancelled.
- The gap between sentences on the device voice dropped from 260 ms to 60 ms,
  which is what made listening feel stop-start.
- If a device genuinely has no voice installed, the app says so once and opens
  the model chooser, instead of turning pages in silence for twenty minutes.

**Cause three, the one that made a downloaded model sound like nothing.**
`audioplayer.js` started the narrator and then immediately called
`T.seekTo(lesson)` to jump to the tapped chapter. `seekTo` bumps the generation
token, so the first phrase - the one the model was still synthesising, three
seconds of ONNX warm-up - was thrown away on arrival. Every Listen tap began
with a silent, wasted phrase, and on a slow phone that could be the whole start.
The offset is now passed into the queue (`playParts(parts, startAt)`) so the
book opens on the right chapter without cancelling anything. Verified in a real
browser with the real 63 MB model: download, store, synthesise and play.
- Kids read-aloud was gated the same way. It now starts on the tap too.

I ran the model end to end in a real browser: download, store, and speak all
succeed, and a deliberately broken model still falls back to audible speech.
**Cause four, the one that broke playback once the model was stored.**
`js/tts-piper-worker.js` writes every audio chunk by hand. One constant in that
header was wrong: the chunk tag said `aRta` where the format needs `data`, so
Chrome rejected every chunk with "no supported source was found". The main
thread path had the right constant, which is exactly why a fresh download played
and a stored model stayed silent, and why the engine counted two failures and
re-offered the download sheet in the middle of a book. The tag is fixed, and a
test now compares the worker header against the main thread one so it cannot
drift again.

**How the first Listen behaves now**

- The first Listen on a device opens the voice sheet once and speaks nothing
  underneath it, so the book begins on the voice the reader actually chose.
  Download it and the model reads from that same tap.
- "Use my phone voice instead" starts the phone voice at once and the app stops
  asking for thirty days.
- Once a model is stored the sheet never opens again. Listen plays immediately.
- `navigator.storage.persist()` is requested as soon as the engine is ready, so
  the browser does not evict a 63 MB voice to reclaim space.

## 2. "Free to read" is gone

Removed from the login card, the home meta and social cards, the Gold page,
About, the Graveyard meta, the gate card, the install prompt, the guide, the
store copy, the topic pages, and from all 521 book pages (`READ THE FULL FREE
BREAKDOWN`, the `(Free)` in the SEO title, the `free to read` taglines).

The "Want all of it? Read it free." shelf is deleted completely, as asked:
section, script and service-worker entry.

Where the sentence would have broken without a word, it was rewritten, not
deleted: "The library stays open, always", "An open shelf", "Nothing in your
way."

## 3. Word meanings: every word, every meaning

`js/wordtap.js` was rewritten.

- English words read from dictionaryapi.dev; if that answers nothing, Wiktionary
  answers instead.
- Hindi, Gujarati, Marathi, Bengali, Tamil, Telugu, Urdu and any other script go
  straight to Wiktionary, which carries them.
- The card now shows **every** part of speech and up to four definitions each,
  with examples and synonyms, in a scrollable card instead of a single line.
- Answers are cached on the device, so a second lookup is instant and works
  offline.

Tested: "serendipity" returns phonetic, noun senses, examples and synonyms;
"साहस" returns courage, pluck, an example, and its other senses.

## 4. Stories: People, actually aligned

- The follow button was `background: transparent`, which is why it read as an
  empty input box. It is now a real button: ink fill, paper text; the followed
  state is yellow with a check; a private-account request is a dashed outline.
- The verified tick was a flex item sitting off its baseline. It is now a
  centred circle with a drawn check, on the text baseline.
- The message icon was being pushed sideways by a global `margin-right` on
  `.tsb-ic`. It is now a 34 px circle with the glyph dead centre, the same height
  as the follow pill.
- The person card is a real grid: avatar, name and stats, then the actions. On a
  phone the two actions get their own row, evenly split.

## 5. Quote cards, from any quote, in any book

Tapping the card icon on a quote used to fire a random palette at you. It now
opens a studio:

- a live 1080 × 1350 card, drawn with the book's own quote, title and author;
- ten colourways you tap through, one tap each, live;
- **The desk**: eight photographic backdrops (paper, cream, linen, marble,
  dunes, shadow, terracotta, ink desk) for Gold, locked with a key for everyone
  else, exactly as you said;
- Save, and Share (which uses the phone's own share sheet, like the top-of-book
  share card).

## 6. 3D Discovery header

The header hid the mark and set the name in a serif. It is now the real lockup:
a yellow tile with the book mark and **TheSmallBook** in Archivo Black, centred
over the library like a masthead, with the Open / Save / Share / Roll cluster on
the right. On a phone the lockup sits left and the buttons stay right.

## 7. Graveyard

- "Public record context" is gone from every case.
- Every case now carries **The pattern behind it**: a real essay per category
  (money, business, startup, fraud, ego, trust, fame, history, tech) that gives
  the page the length it was missing.
- **Where to read next**: three real book covers from the matching shelf.
- **Neighbours in this graveyard**: three cases from the same category, one tap
  to open in the same sheet.

## 8. First open

- The four setup screens are a **once in a lifetime** thing. A reader who has
  already set the app up now goes straight in, on this build and on every future
  build. `alreadySetUp()` also catches anyone with a shelf, a reading time or
  interests saved, so a half-finished setup is never repeated either.
- The setup screen now fills the whole screen: warm paper edge to edge, a soft
  light from the top, real paper grain, and a content column that widens on a
  desktop instead of leaving white space at the sides. The floating card with
  dead space around it is gone.

## 9. Housekeeping

- Build 342 everywhere: `?v=341` on every asset, `tsb-v342` in the service
  worker, `BUILD = "341"` in bootguard, settings and login. **This matters**:
  without the bump your phone would keep serving the old cached files and none
  of the above would appear.
- 74 pages under `authors/` and `topics/` were loading `js/gate.js` from the
  wrong folder. Fixed to `../js/`.
- Two broken preloads (`data/lessons/'+id+'.js`) that 404'd on every book and
  reader page are gone.
- `font-display` and sheet transitions are unchanged elsewhere; no motion was
  slowed down.

### Tests

`npm test` → **1006 passed, 2 failed**. Both failures existed before this build
and are unrelated: duplicate cover images at the repo root, and a leftover
hands-free scroller reference. The five v338 assertions that encoded the
old voice gate were rewritten to assert the new rule, because the old rule was
the bug.

---

### Still open, and I want your eyes on these

1. **"The version SVG diagram in every book"** - I could not identify which
   diagram you mean. Book pages, the 3D view, and the reader all looked
   different. Point me at one book and I will rebuild it properly.
2. **Thumbnails for stories / podcasts** - tell me which shelf you mean (the
   "500 Money felt like a joke" line) and I will design a proper set.
3. **"Leave down updates alignment"** - say the screen name and I will fix it.

## Cleanup: duplicates and dead files removed

The two failing tests in the previous build were both caused by leftover files,
not by broken code. They are gone, and so are the other strays the sweep found.

**Removed, 123 files, 5.2 MB**

- 95 cover images sitting at the repo root that already live in
  `assets/covers/`. Nothing referenced them; covers resolve through
  `assets/covers/<id>` only. This was the "stray duplicate covers" failure.
- `js/smallscroller.js`, the retired hands-free scroller module. The feature was
  retired in v303 and the test that guards it had been failing since. No page,
  no service worker entry and no script referenced it.
- `css/soft-layer.css`. Its tokens now live inside `css/style.css`, so it was a
  second copy of the same layer.
- `js/sponsors.js`, an empty placeholder that no page loaded and no doc
  mentioned.
- `books/thinking-clearly.html`, an orphan duplicate of
  `books/art-of-thinking-clearly.html`. No page linked to it, it was not in the
  sitemap, and its meta description still advertised a "free summary".
- 19 `assets/podcasts/*.svg` icons superseded by `assets/podcasts/art/*.jpg`.
- `docs/retired/` and `supabase/retired/`, byte-identical copies of the current
  weekly digest doc and function.
- `dbge.js` and `pausetest.js`, Playwright scratch scripts left at the repo root.

`docs/REMOVED-FILES.txt` lists every removed path, because unzipping over an
existing folder does not delete anything. Delete those names in your clone
before you commit.

**Bugs found while checking that nothing broke**

- `js/gate.js` was referenced as `js/gate.js` from inside `books/`, `graveyard/`
  and every `pseo/` folder, so it resolved to `books/js/gate.js` and 404ed on
  1152 pages. The finish gate and the guest gate never ran on any of them. Every
  path now carries the right number of `../`.
- Those pages also carried version stamps from v289 to v323. All normalised to
  342 so they match the rest of the build and the cache version.
- `pseo/index.html` linked to 59 `authors/` pages and 15 `topics/` pages that
  only exist at the repo root, so every one of them 404ed. They now point at the
  real pages.

Verified after the deletions: `npm test` 1010 passed, 0 failed; a link sweep of
all 1286 HTML files reports 0 broken local links; 20 pages loaded in a real
browser with no JS errors and no 404s, including a book page, a graveyard case,
a pSEO comparison page and the pSEO hub.
