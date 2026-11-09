# TheSmallBook Build 406

Foundations release. What changed, in plain words:

## Your account is now really your account
- Everything you do lives under your sign-in: finished books, reading progress, bookmarks, highlights, notes, minutes, plans, streak, reader positions, listening positions, saved episodes and the taste signals used for recommendations.
- On a shared phone, accounts no longer bleed into each other. When a different person signs in, the previous person's work is parked in a private per-account vault on the device and the new account starts from its own shelf. Signing out parks your work too.
- Guest work is adopted once, by the first account that signs in, and only when that account has nothing of its own yet.
- Still per device, on purpose: theme, action bar layout and text size.
- No database change is needed. Build 406 uses the existing `reading_state` table; the snapshot now also carries listening state (saved episodes, audiobook and podcast positions, the last player session and spoken book positions).

## One player, everywhere
- A spoken book (book lesson narration) now survives page changes like real audio does. The full player comes back parked at the lesson you left, paused, ready on one tap.
- Kids stories get the same shared player (`kids.html` now loads it).
- Swipe the player away and it stays away until you press play on something again.

## A better voice
- Kokoro English joins the voice chooser: the clearest English narration that can run on the device itself. It downloads once (larger than the standard model) and then works offline.
- Hindi keeps the Piper model, fixed in place, because Kokoro does not speak Hindi.

## Listen, finished
- The Listen room gets an Apple Podcasts level pass: bigger artwork, calmer cards, spring hover on desktop.
- If the audiobook catalogue ever fails to arrive (usually a stale cached copy of the app), the room now says so and offers a reload instead of showing a blank shelf.

## Desktop motion repaired
- Cards lift on hover, sidebar items travel, and the rail slides instead of snapping. All of it still switches off for reduced motion.

## Content
- The five thinnest books (The Great Derangement, Zen Mind Beginner's Mind, The Third Pillar, Intellectuals and Society, Alchemy) had one-sentence lessons. Every lesson now carries a full, book-specific treatment, roughly triple the reading depth.
- The generated "visual handle" graphic inside lessons is removed, as requested, generator, styles and all.

## Housekeeping
- Files that GitHub's web upload previously resurrected (admin page and its script, the retired scroller and free-shelf modules, stray duplicate covers at the root, an old About copy) are deleted again. They must be deleted on GitHub too, or the app will keep shipping them.
- All version markers now say 406 (service worker cache `tsb-v406`, bootguard build, page footers).

Suite: 1094 passed, 0 failed (was 1084).
