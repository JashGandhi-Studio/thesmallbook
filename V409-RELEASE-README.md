# TheSmallBook Build 409

## What this build is

Listen stops being a shelf and becomes a room that builds itself. Until
408 the Listen room opened onto a starter catalogue: some curated
audiobooks, nineteen shows, six narrated dives, and buttons inviting you
to fetch more. Build 409 removes the ceiling. The room now fetches from
LibriVox and the podcast directory every morning, arranges the finds
around the ear you have been training, and treats anything you save as a
permanent, playable part of your shelf on every device you sign into.

## The room builds itself

- FRESH TODAY: the first open of a new day fetches audiobooks and shows
  around your strongest taste words and paints them as a dated rail. A
  "More fresh picks" button keeps pulling; the shelf never runs dry.
- Taste is learned, not asked. Every play, search and save teaches the
  room words, hosts and shelves (weighted: a save teaches more than a
  search). Choose focus and meditation in your mind settings and the
  morning rail leans into meditation audiobooks one day, a matching show
  the next.
- MORE LIKE THIS: listening to or saving a show (say, a Raj Shamani
  podcast) fills a rail with its neighbours: same host first, then the
  genre half of its tag, then the wider net. The same show wearing its
  host's name is never offered back as a stranger. Audiobooks answer by
  author and topic. Change what you listen to and the rail changes with
  you; park a player and the rail re-anchors at once.
- One search box now asks the whole ecosystem: LibriVox for audiobooks
  and the full podcast directory for shows, with play-latest, episode
  browsing and save on every result. Nothing is confined to the local
  catalogue any more.

## Saving is permanent, and the shelf plays

Everything hearted joins tsb_bookmarks and the Your Shelf rail, and from
408 onward the listening caches and the taste profile sit inside the
account vault and the reading-state snapshot: shelf_shows, shelf_books,
listen_taste and show_taste merge union-wise into your cloud state, so a
show saved on your phone is waiting, playable, on your tablet. Only theme,
action bar layout and text size stay per-device, as agreed.

## The Start Here hero grew up

The first card a new ear meets now picks by taste across the whole shelf,
says why it is at the door ("Because you keep returning to focus"), wears
bigger art on a warm gradient, and promises what the room now does:
"Fresh picks land here every morning."

## Tablet and desktop scrolling, fixed at the paint layer

Diagnosis on an iPad profile, before and after, same page: median frame
16.7ms both ways, but p95 frame gap fell from 33.3ms to 16.8ms and the
worst frame from 50.1ms to 16.8ms. The page scrolled; the paint could not
keep up. Three things changed at tablet widths: the rail and top nav stop
paying for full-height backdrop blurs per frame, card shadows shrink to a
whisper, and scroll chaining ends at the page edge. The artwork hydration
observer is now throttled to one scan per animation frame, page-level
smooth scrolling applies only where a pointer can enjoy it, and show
cards below the fold paint when they approach the screen.

## The dark strip, gone

The white band beneath the Request a book area was the page canvas: body
went dark, html stayed cream, and every overscroll flash showed it. The
canvas now follows the theme on every page.

## The update screen earns its wow

The post-update card always had a stage built for it (a blurred sky and a
three-book fan in film2.css); the script simply never emitted it, and its
kicker still announced build 390. It now shows the fan, names the real
build from the one constant that owns it, and tells the 409 story in
three honest lines.

## Content, tranche three

Eight more of the thinnest books grew full lessons in both content
stores: working-backwards, black-box-thinking,
common-stocks-and-uncommon-profits, the-first-20-hours, the-gene,
the-splendid-and-the-vile, unlimited-power and lost-connections, from
roughly 27-30 summary words a lesson to 65-72. About sixty books remain
in the next band and stay on the tranche list.

## Verification

- Client suite: 1113 passed, 0 failed (12 new v409 assertions), in the
  build tree and in a clean unzip.
- Headless, cold, phone and tablet profiles, live network: Fresh Today
  fetched 6 real cards; a saved fresh audiobook appeared on the shelf;
  More Like Figuring Out returned 6 neighbours; one search found playable
  shows across the directory and a found show played in the shared player
  (real mp3 stream); the update screen showed its fan and BUILD 409
  kicker for a phone arriving from build 390; tablet scroll p95 16.8ms;
  zero page errors throughout.
- The patch applies to a fresh clone of main and reproduces the shipped
  tree with 0 differing lines.

## Still honest

Cross-device deletions do not propagate yet: cloud merge is union-based
by design, so removing a save on one device will not remove it on another
until tombstones ship. Roughly sixty books remain in the 31-36 word band
for the next content tranche.
