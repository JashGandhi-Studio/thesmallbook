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
