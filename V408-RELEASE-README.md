# TheSmallBook Build 408

## audio.html, rebuilt like a podcast app
- `audio.html` is now the Listen room itself, rebuilt in the style of the great podcast apps: a large Listen title, Continue Listening up front, a For You rail, full audiobooks as big sleeves (a snap rail on the phone, a calm grid on desktop), top shows as soft rows, TSB Originals deep dives, your saved shelf, live search for both audiobooks and shows, and the one shared player underneath it all.
- The design lives in `css/listen-apple.css`: soft surfaces, big rounded artwork, one obvious play per card, spring motion on a single curve, hover lift on desktop, press feedback on touch, and everything off for reduced motion.
- The Listen tab opens `audio.html` again, and `podcasts.html` now forwards to it, so there is still exactly one Listen room however you arrive.
- All in-app links (Today tile, book pages, guide tour, player) point at the rebuilt room; the sitemap lists `audio.html`.

Suite: 1101 passed, 0 failed (407 was 1098).
