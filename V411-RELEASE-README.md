# TheSmallBook Build 411

## What this build is

One composition fix. The simple update screen from 410 sat in the top
half of the phone and left the bottom empty. First impression is the
last impression, so the screen now fills the phone the way Apple
composes its first screens, with exactly the same five elements and
nothing added.

## The composition

- Kicker at the top, naming the build.
- Three books, larger (104 by 156), in one straight aligned row in
  the upper middle, with air around them.
- "Welcome back, Name" under the books when the reader is known.
- The headline and one personal line beneath.
- Continue anchored to the bottom of the screen, with Set up again
  under it, clear of the home indicator.

Measured on a 390 by 844 phone after a cold load, not eyeballed:
books at y 140 to 296 sharing one baseline, headline at 371, action
block ending at 816 of 844. Onboarding freshness moves to 393 so
every phone sees the filled screen once.

## Verification

- Client suite: 1121 passed, 0 failed (1 new v411 assertion), in the
  build tree and in a clean unzip.
- Headless cold phone run: screen-fill measurements above, zero page
  errors.
- The patch applies to a fresh clone of main and reproduces the
  shipped tree with 0 differing lines.
