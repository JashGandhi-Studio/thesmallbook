# TheSmallBook Build 410

## What this build is

Two corrections, made properly. The post-update screen was rebuilt to be
simple, and taste became one ecosystem: everything the reader does, on
any surface, is recorded into one profile, and every recommendation in
the app, books included, answers that same profile.

## The update screen, made simple

The old screen stacked three feature cards under a rotated, overlapping
book fan that clipped at the top of the phone. It now shows exactly five
things: a kicker naming the build, three books standing in one straight
row (same size, same baseline, honest gaps, nothing rotated, nothing
cropped), one headline, one personal line, and Continue. Measured on a
390px phone after a real cold load: book boxes at x 41, 149 and 257,
all 92 by 138, all sharing one baseline, computed transform none. The
returning reader is still greeted by name. Onboarding freshness moves
to 392 so every phone sees the corrected screen once.

## One ecosystem of taste

Build 409 left two notebooks: book taste at home and a Listen-only ear.
They now write into one ledger, the taste event stream that already
travels with the account:

- Every play of anything (book narration, show, audiobook, Original)
  signals the shared profile from the player itself.
- Opening a book page and saving a book are recorded with the book's
  own words, from the book page, not only via home feed taps.
- A settled library search teaches the same ledger.
- Listen keeps its fast local notebook for ranking the rails, and
  mirrors every signal into the ledger, so a show played tonight can
  steer tomorrow's book picks on the home shelf.
- In the other direction, the Listen morning fetch seeds from the
  ledger's strongest words: read Deep Work and the room starts the
  day around deep work, before a single thing is played.

Proved headless with real pages in both directions: opening Deep Work
seeded the Listen fetch with deep, work, cal; saving and searching
meditation in Listen lifted the Meditations book category at home
from 0.0000 to 0.4190.

## A first-load recording bug, fixed at the root

Proving the above exposed a vault edge from build 406: on the very
first identity decision, the account vault cleared the live keys
without parking them, so anything recorded before auth settled on a
first ever load (a book opened in the first seconds) was lost. The
first decision now parks the live keys as the guest's work before
clearing, and the usual guest restore or first-account adoption hands
them straight back.

## Verification

- Client suite: 1120 passed, 0 failed (7 new v410 assertions), in the
  build tree and in a clean unzip.
- Headless, cold, phone profile: update screen alignment measured, not
  eyeballed; both taste directions exercised on real pages; zero page
  errors.
- The patch applies to a fresh clone of main and reproduces the
  shipped tree with 0 differing lines.

## Still honest

Cross-device deletions remain union-merged (no tombstones yet), and
about sixty books stay in the next content tranche, as noted in 409.
