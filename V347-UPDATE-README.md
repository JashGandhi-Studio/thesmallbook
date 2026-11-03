# v347 · the model is the voice. Nothing else speaks.

Build **347**. Drop this folder over your site. No database work, no config
change, no new keys, no SQL.

This build answers one thing: **when TheSmallBook Voice Model is downloaded,
that voice reads the book - not TTS, not the phone voice, not Puter.**

---

## 1. Why TTS kept winning

Three separate faults, all in `js/tts-engine.js`:

- **A silent swap.** Any hiccup on the model (one slow sentence, one chunk
  that would not play, one worker restart) fell straight through to
  `device()` - the phone/cloud voice - and after three hiccups in a lesson the
  whole lesson was read by TTS. That is the switch you were hearing.
- **A player that never said where it was.** `onProgress` was only ever called
  with `(0, 0, false)` when playback stopped. Nothing told the dock, the
  follow-along page or the saved position that the book had moved on. A book
  could be reading lesson four while the player still said "Introduction" -
  which looks exactly like "it read lesson one and stopped".
- **A chunk that never ended.** If an audio element played but never fired
  `ended` (stalled decoder, audio route suspended, phone asleep mid-sentence),
  the passage waited for ever. The queue froze on that line and the watchdog
  politely restarted the same line, again and again.

## 2. What it does now

`js/tts-engine.js`

- **The model is the only voice.** If it is on the device, it reads every
  line. The phone/cloud voice is not reachable while a model is stored - the
  code path is gone, not just deprioritised.
- **A stubborn line is retried on the model** (four tries when the model is
  working but slow), then that one line is skipped and the book moves on. It
  never hands the line to another engine behind your back.
- **If the model cannot start at all**, you get one honest card - *Retry the
  model* / *Use phone voice* - and the phone voice only happens if you tap it.
  If the model has vanished from the device, the retry offers the download
  again instead of pretending.
- **Every chunk has a guard**: if it never reports `ended`, the passage is
  moved on by itself. The queue cannot freeze on one sentence any more.
- **Every advance is announced**: `emitProgress()` now reports the real line
  index on every item, every pause and every resume, so the dock label, the
  progress bar, the follow-along page and the saved position all move with the
  book.
- **A dead worker is rebuilt.** A phone under memory pressure can lose the
  inference worker without an error. `js/tts-piper.mjs` now terminates and
  rebuilds it after 45 s of silence, so the voice comes back on the next line
  instead of being gone for the session.

## 3. Better first words

`js/tts-piper-worker.js` · `js/tts-piper.mjs`

- Synthesis pieces dropped from 220 to **~120 characters** (stream) and 360 to
  140 (single-shot). The first words now arrive in about a second instead of
  waiting for a whole paragraph to be synthesised - which also removes the
  timeouts that used to look like dead air on slower phones.

---

## Verified on a real download, not by reading code

Downloaded the 63 MB model in Chromium, then measured:

- `provider` = **model**, `speechSynthesis` calls = **0**
- book advanced **lesson 1 → lesson 2** with the model still speaking
- model deliberately corrupted on the device → **0 TTS calls**, honest card
  appears in under 3 seconds, provider stays `model`
- chunks keep flowing through a lesson (synthesis cadence, not silence)

## Tests

- `npm test` · **1028 passed, 0 failed** (7 new v347 assertions; the v346 ones
  that described the old fallback were rewritten)
- `tests/compare-live.js` · **35 passed, 0 failed**

## Files changed

`js/tts-engine.js` · `js/tts-piper.mjs` · `js/tts-piper-worker.js` ·
`tests/client-suite.js` · version strings across the tree (347) · this README.

## Not touched

Books, autopsies, Ask, onboarding, covers, store, Gold, the grave-card sheet
and the tab bar are exactly as they were in v346.
