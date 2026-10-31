# v345 · the grave card, onboarding that fits any phone, and nine new Originals covers

Build **345**. Drop this folder over your site (or deploy as is). No database
work, no config change, no new keys.

## 1. The Graveyard share card, rebuilt

`js/graveyard.js` · `css/style.css`

- The card is now **1080 × 1350** (4:5), the shape WhatsApp, Instagram and X
  all crop kindly, drawn on the app's paper in the house type instead of a
  dark rectangle.
- **Measured, not boxed.** Every line is measured and wrapped before it is
  placed; the card steps its type down a size if an autopsy runs long, and only
  ellipsizes at a word boundary when the text truly will not fit. No sentence
  is sliced any more, and no box has a fixed height.
- New on the card: the cause of death chip, the autopsy number and total, and
  an honest "the rest is free" line above the footer.
- It reads the case that is open on screen, so a translated grave produces a
  translated card, with the record as the fallback.
- **A share sheet you see first**: the finished card, then Share (native file
  share into WhatsApp and friends), Download, and Copy image. Where
  `navigator.share` or `canShare` is missing, the same button downloads, so it
  never dead-ends. Escape closes it.

## 2. Onboarding that fits every screen

`js/onboard.js` · `css/film.css` · `css/film2.css`

- The three-book fan is now **built to the height of the screen it lands on**
  (124 / 96 / 84 / 78 px wide), so the stack can never fight the headline.
- Under 800 px of viewport height, step one folds down: smaller fan, tighter
  headline, 48 px input, 36 px pills. The activity dial gives back 70 px on
  step three, and the shelf scrolls while the button stays put.
- The footer is **sticky on every step**, with a soft paper fade, so "Start
  reading" is reachable even if a translation runs long.
- Chip labels wrap inside their own box, so a narrow screen can no longer be
  pushed sideways.

Measured after the change (Chromium, 12 viewports):

| screen | tallest step | CTA on screen | sideways overflow |
|---|---|---|---|
| 320×568 | 568 | yes | 0 |
| 360×640 | 640 | yes | 0 |
| 360×740 | 740 | yes | 0 |
| 375×667 / 390×844 / 412×915 | exact fit | yes | 0 |
| 768×1024 / 1024×768 / 1280×900 / 1440×900 | exact fit | yes | 0 |
| 844×390 / 640×360 (landscape) | scrolls, sticky CTA | yes | 0 |

Before this build, 360×640 was 816 px tall with the button below the fold.

## 3. Nine Originals covers redrawn

`assets/covers/*.jpg` · `tools/make-covers.py`

The flat covers now follow the same system as `chai-stall-ceo` and `the-queue`:
cream paper, thin keyline frame, Archivo Black title, heavy rule, one flat
cut-paper illustration on a single colour band, red corner, UNKNOWN at the
foot. Only the band colour and the scene change, which is what makes them read
as one imprint at thumbnail size.

Redrawn: `the-8-pm-reset`, `the-kind-boundary`, `the-family-ledger`,
`the-neighbourhood-network`, `the-listening-bench`, `the-repair-economy`,
`the-quiet-internship`, `the-long-game-classroom`,
`nobody-is-thinking-about-you`.

All 400 × 596, 60-79 KB, so the suite's 40 KB cover assertions still hold.
Redraw any of them with:

```bash
python3 tools/make-covers.py                 # all nine
python3 tools/make-covers.py the-8-pm-reset  # one
```

(The script needs `playwright` and `pillow`, plus the site served on
`http://localhost:4321` so the woff2 faces load.)

## Version and cache

- `js/bootguard.js` · `var BUILD = "345"`
- `sw.js` · `CACHE_VERSION = "tsb-v346"`
- every asset URL in the HTML · `?v=346` (1,283 pages)
- `login.html` and `settings.html` badges · "Build tsb-v346"

Because the cache name changed, an existing visitor picks up the new CSS, JS
and covers on the first load after deploy.

## What was checked before packaging

- `npm test` · **1008 passed, 0 failed**
- `tests/compare-live.js` · **35 passed, 0 failed**
- 8-page browser smoke sweep · every page clean, no console errors
- onboarding sweep over 12 viewports · no overflow, CTA always reachable
- grave card · renders at 1080 × 1350, sheet fits a 360 × 640 phone
- covers · 9/9 present, all above 40 KB, no 404s on book pages

## Not touched

The Ask feature (one mode, compare two books), the quota tiers
(3 / 10 / unlimited), the 518 autopsies and the existing SQL all stay exactly
as they were in v344.
