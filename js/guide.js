/* ============================================================
   THESMALLBOOK, 🧭 THE GUIDE (guide.js) · v316
   Three answers to "I feel lost":
   1. THE WALKTHROUGH - the full tutorial, and it is hands-on:
      twenty stops across ten pages, starting with a welcome. The
      important stops are YOUR TURN stops - the card asks you to
      actually do the thing (tap the plus, search, press play,
      open the player, open a grave) and the tour only moves when
      you did. New readers see it once; it resumes exactly where
      you left it, even mid-action, even across pages; skippable
      (it tells you where to replay it); replayable from Settings.
   2. THE TOUR - the quick 30-second loop across the home
      screen's five key functions, behind the guide sheet.
   3. THE GUIDE - a permanent plain-English sheet listing every
      function of the app with a real link that takes you
      there. Lives behind the ? chip on Home and inside All
      Settings (index.html#guide).
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_GUIDE) return;

  var TOURKEY = "tsb_tour_done";
  var WALKKEY = "tsb_walk";        /* { i: n } - the stop you are on */
  var WALKDONE = "tsb_walk_done";  /* true - finished, skipped, or seen the old mini tour */

  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function jdel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function pageName() { var p = (location.pathname.split("/").pop() || "index.html").split("?")[0]; return p || "index.html"; }

  /* ---------- the guide sheet: every function, plainly ---------- */
  var ROWS = [
    { g: "READ", rows: [
      { e: "📚", n: "The Library", d: "500 books, 3,540 lessons, 26 languages. Free to read, forever.", h: "index.html" },
      { e: "📷", n: "Scanner", d: "Holding a paper book? Scan its cover and its shelf opens here.", h: "scan.html" },
      { e: "🌊", n: "Deep Dives", d: "The one chapter of a book worth reading in full, with narration.", h: "deepdive.html" },
      { e: "🗒️", n: "Notebook", d: "Every highlight, note and saved line you keep, in one place.", h: "notes.html" }
    ]},
    { g: "LISTEN", rows: [
      { e: "🎧", n: "Audio Room", d: "40 full audiobooks and real podcasts. Heart-tap any audiobook to save it to your shelf.", h: "podcasts.html" },
      { e: "⏩", n: "Listen Today", d: "Your continue card, book picks and today's listens. Continue plays exactly where you paused.", h: "stories.html" }
    ]},
    { g: "DISCOVER", rows: [
      { e: "💀", n: "The Graveyard", d: "360 real failures autopsied: startups, frauds, empires, egos. They paid billions; your lesson is free.", h: "graveyard.html" },
      { e: "📌", n: "Quote Wall", d: "A public soft board of lines worth keeping. Find a great line first, or pin your own. Tap any note to share it.", h: "quotes.html" }
    ]},
    { g: "ASK & WRITE", rows: [
      { e: "💬", n: "Ask (Chat)", d: "Ask a life question in your own words. The library answers with real books and real cases.", h: "chat.html" },
      { e: "✍️", n: "Write & Stories", d: "Write your own lessons, publish, and read what other readers wrote.", h: "write.html" }
    ]},
    { g: "YOU", rows: [
      { e: "👤", n: "You", d: "Your account, streak, badges and bookmarks.", h: "login.html" },
      { e: "⚙️", n: "All Settings", d: "Darkness, text size, sound, app size, every toggle there is.", h: "settings.html" },
      { e: "👑", n: "TSB Gold", d: "What membership adds on top of the free library. ₹999/yr, locked early-bird.", h: "gold.html" },
      { e: "🛍️", n: "Store", d: "Support the library and unlock everything.", h: "store.html" },
      { e: "ℹ️", n: "About", d: "The story behind TheSmallBook, and everything each build changed.", h: "about.html" }
    ]}
  ];

  /* the ? corner tab dresses itself the moment home loads - it must not
     wait for the guide sheet to ever be opened */
  function chipCss() {
    if (!document.getElementById("tsbHelpChip") || document.getElementById("tsb-chip-style")) return;
    var st = document.createElement("style");
    st.id = "tsb-chip-style";
    st.textContent =
      "#tsbHelpChip{position:absolute;top:0;right:0;z-index:6;width:48px;height:44px;border:none;border-left:3px solid var(--ink);border-bottom:3px solid var(--ink);border-radius:0 0 0 24px;background:var(--yellow);color:var(--ink);font:800 17px 'Space Grotesk',sans-serif;display:flex;align-items:center;justify-content:center;cursor:pointer;text-decoration:none;padding:0 2px 6px 0}" +
      "#tsbHelpChip:active{transform:translateY(1.5px)}";
    document.head.appendChild(st);
  }
  chipCss();

  function sheetCss() {
    if (document.getElementById("tsb-guide-style")) return;
    var st = document.createElement("style");
    st.id = "tsb-guide-style";
    st.textContent =
      "#tsbGuideSheet{position:fixed;inset:0;z-index:262;background:rgba(20,12,0,.5);display:flex;align-items:flex-end}" +
      "#tsbGuideSheet .tg-card{width:100%;max-height:84vh;overflow:auto;background:var(--paper);border-top:3px solid var(--ink);border-radius:22px 22px 0 0;padding:18px 16px calc(26px + env(safe-area-inset-bottom, 0px));animation:tgIn .28s cubic-bezier(.22,.9,.35,1)}" +
      "@keyframes tgIn{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}" +
      "#tsbGuideSheet .tg-x{position:sticky;top:8px;z-index:5;margin-left:auto;display:flex;align-items:center;justify-content:center;border:2.5px solid var(--ink);background:var(--paper);border-radius:10px;width:34px;height:34px;font:800 13px 'Space Grotesk',sans-serif;color:var(--ink);cursor:pointer}" +
      "#tsbGuideSheet .tg-head{font:400 15px 'Archivo Black','Arial Black',sans-serif;color:var(--ink);letter-spacing:.5px;margin:0 44px 4px 2px}" +
      "#tsbGuideSheet .tg-sub{font:600 11.5px/1.5 'Space Grotesk',sans-serif;color:var(--ink);opacity:.65;margin:0 2px 12px}" +
      "#tsbGuideSheet .tg-g{font:800 9.5px 'Archivo Black','Arial Black',sans-serif;letter-spacing:1px;color:var(--ink);opacity:.55;margin:14px 2px 6px}" +
      "#tsbGuideSheet .tg-row{display:flex;align-items:center;gap:11px;border:2.5px solid var(--ink);background:var(--bg);border-radius:14px;padding:11px 12px;margin-bottom:7px;text-decoration:none}" +
      "#tsbGuideSheet .tg-row:active{transform:translate(1.5px,1.5px)}" +
      "#tsbGuideSheet .tg-e{flex:0 0 auto;font-size:19px}" +
      "#tsbGuideSheet .tg-m{flex:1;min-width:0}" +
      "#tsbGuideSheet .tg-n{display:block;font:800 12.5px 'Space Grotesk',sans-serif;color:var(--ink)}" +
      "#tsbGuideSheet .tg-d{display:block;font:600 10.5px/1.45 'Space Grotesk',sans-serif;color:var(--ink);opacity:.65;margin-top:2px}" +
      "#tsbGuideSheet .tg-go{flex:0 0 auto;font:800 9px 'Archivo Black',sans-serif;letter-spacing:.8px;color:var(--ink);background:var(--yellow);border:2px solid var(--ink);border-radius:999px;padding:4px 9px}" +
      "#tsbGuideSheet .tg-walk{display:block;width:100%;border:3px solid var(--ink);background:var(--yellow);color:#16130e;border-radius:999px;box-shadow:4px 4px 0 var(--ink);padding:13px;font:800 12px 'Archivo Black','Arial Black',sans-serif;letter-spacing:.8px;cursor:pointer;margin-top:12px}" +
      "#tsbGuideSheet .tg-walk:active{transform:translate(2px,2px);box-shadow:none}" +
      "#tsbGuideSheet .tg-replay{display:block;width:100%;border:none;background:none;color:var(--ink);opacity:.6;font:800 10.5px 'Space Grotesk',sans-serif;cursor:pointer;padding:10px 0 0;text-decoration:underline}" +
      "#tsbGuideSheet .tg-fine{text-align:center;font:600 10.5px/1.5 'Space Grotesk',sans-serif;color:var(--ink);opacity:.55;margin:10px 0 0}" +
      /* shared ring + card for the walkthrough and the mini tour */
      "#tsbTourRing{position:fixed;left:0;top:0;z-index:9992;border:3.5px solid var(--yellow);border-radius:16px;box-shadow:0 0 0 4000px rgba(12,10,6,.44);pointer-events:none;transition:opacity .18s linear;will-change:transform}" +
      "#tsbTourRing.tsb-try{animation:tsbTryRing 1.5s ease-in-out infinite}" +
      "@keyframes tsbTryRing{0%,100%{border-color:var(--yellow);border-width:3.5px}50%{border-color:#fff;border-width:5px}}" +
      "#tsbTourCard{position:fixed;left:12px;right:12px;z-index:9993;bottom:calc(var(--bar-total, 68px) + 18px);background:var(--paper);border:3px solid var(--ink);border-radius:18px;box-shadow:5px 5px 0 var(--ink);padding:14px 14px 12px;animation:tgIn .28s cubic-bezier(.22,.9,.35,1)}" +
      "#tsbTourCard .tt-step{font:800 9px 'Archivo Black',sans-serif;letter-spacing:1px;color:var(--ink);opacity:.5;display:flex;align-items:center;gap:7px}" +
      "#tsbTourCard .tt-turnbadge{font:800 9px 'Archivo Black',sans-serif;letter-spacing:1px;font-style:normal;color:#16130e;background:var(--yellow);border:2px solid var(--ink);border-radius:999px;padding:3px 8px;opacity:1}" +
      "#tsbTourCard .tt-wait{flex:1;font:800 11.5px 'Space Grotesk',sans-serif;color:var(--ink);background:var(--bg);border:2.5px dashed var(--ink);border-radius:12px;padding:10px 12px;animation:tsbWaitPulse 1.6s ease-in-out infinite}" +
      "#tsbTourCard .tt-acts2{display:flex;gap:8px;align-items:center;margin-top:9px}" +
      "#tsbTourCard .tt-stepskip{flex:1;background:none;border:none;font:800 10.5px 'Space Grotesk',sans-serif;color:var(--ink);opacity:.55;cursor:pointer;padding:8px;text-decoration:underline;text-align:left}" +
      "@keyframes tsbWaitPulse{0%,100%{opacity:.85}50%{opacity:.55}}" +
      "#tsbTourCard .tt-t{display:block;font:800 14px/1.3 'Space Grotesk',sans-serif;color:var(--ink);margin:4px 0 4px}" +
      "#tsbTourCard .tt-d{display:block;font:600 12px/1.5 'Space Grotesk',sans-serif;color:var(--ink);opacity:.75}" +
      "#tsbTourCard .tt-acts{display:flex;gap:8px;align-items:center;margin-top:11px}" +
      "#tsbTourCard .tt-back{flex:0 0 auto;border:2.5px solid var(--ink);background:var(--paper);border-radius:999px;padding:11px 14px;font:800 11px 'Archivo Black',sans-serif;letter-spacing:.8px;color:var(--ink);cursor:pointer}" +
      "#tsbTourCard .tt-next{flex:1;border:3px solid var(--ink);background:var(--yellow);border-radius:999px;box-shadow:3px 3px 0 var(--ink);padding:11px;font:800 11.5px 'Archivo Black',sans-serif;letter-spacing:.8px;color:var(--ink);cursor:pointer}" +
      "#tsbTourCard .tt-next:active{transform:translate(1.5px,1.5px);box-shadow:none}" +
      "#tsbTourCard .tt-skip{flex:0 0 auto;background:none;border:none;font:800 10.5px 'Space Grotesk',sans-serif;color:var(--ink);opacity:.55;cursor:pointer;padding:8px}";
    document.head.appendChild(st);
  }

  function openGuide() {
    closeGuide();
    sheetCss();
    var sh = document.createElement("div");
    sh.id = "tsbGuideSheet";
    var html = '<div class="tg-card">' +
      '<button class="tg-x" aria-label="Close">✕</button>' +
      '<h2 class="tg-head">🧭 EVERY FUNCTION, PLAINLY</h2>' +
      '<p class="tg-sub">What this app does and where it lives. Tap any row to go there.</p>';
    ROWS.forEach(function (grp) {
      html += '<div class="tg-g">' + grp.g + "</div>";
      grp.rows.forEach(function (r) {
        html += '<a class="tg-row" href="' + r.h + '">' +
          '<span class="tg-e">' + r.e + "</span>" +
          '<span class="tg-m"><span class="tg-n">' + r.n + "</span><span class=\"tg-d\">" + r.d + "</span></span>" +
          '<span class="tg-go">OPEN →</span></a>';
      });
    });
    html += '<button class="tg-walk" id="tgWalk">▶ REPLAY THE FULL TUTORIAL</button>' +
      '<button class="tg-replay" id="tgReplay">just the 30-second home tour</button>' +
      '<p class="tg-fine">Nothing here breaks and nothing bites. Everything worth reading or hearing is free.</p></div>';
    sh.innerHTML = html;
    document.body.appendChild(sh);
    sh.querySelector(".tg-x").addEventListener("click", closeGuide);
    sh.addEventListener("click", function (e) { if (e.target === sh) closeGuide(); });
    sh.querySelector("#tgWalk").addEventListener("click", function () {
      closeGuide();
      startWalk(0);
    });
    sh.querySelector("#tgReplay").addEventListener("click", function () {
      closeGuide();
      startTour(true);
    });
  }

  function closeGuide() {
    var sh = document.getElementById("tsbGuideSheet");
    if (sh) sh.remove();
  }

  /* ---------- the walkthrough: the full tutorial, page by page ----------
     Every stop is { p: page, sel: what to point at, t: title, d: how it
     works }. Stops with tryit: 1 are hands-on - the card has no NEXT,
     the reader has to actually DO the thing (tap the plus, press play,
     open a grave), and the tour only moves when they did. That is the
     whole point: you don't learn the plus by reading about the plus.
     NEXT hops to the next stop even when that means loading another
     page; the stop index lives in localStorage, so a hop resumes
     exactly where you were. A stop whose element is missing waits a
     while (sheets and docks mount late), then steps aside. */
  var WALK = [
    { p: "index.html", sel: null, t: "Welcome to TheSmallBook", d: "A quiet library: 500 books broken into 5-minute lessons, full audiobooks, real podcasts, a private notebook - and 360 stories of failure worth more than most success books. This walkthrough is hands-on. When you see YOUR TURN, the next move is yours: the tour only moves when you actually do the thing. Everything stays free, nothing breaks, and you can leave anytime with skip." },
    { p: "index.html", sel: "#searchInput", t: "Your turn: search the library", d: "500 books in 26 languages, every one free. Titles, authors, moods - type 'focus' or 'money' or a name, the shelf rearranges itself around it.", tryit: "#searchInput", tryTxt: "Tap the search box" },
    { p: "index.html", sel: ".scanbtn", t: "Scan a paper book", d: "Holding a real book? The scanner reads its cover and opens that book's whole shelf here: lessons, audio, everything it has. It works on any book, not just the famous ones." },
    { p: "index.html", sel: ".gravebanner__box", t: "The Graveyard", d: "360 real failures autopsied - Enron, the Titan, Nokia, and cons nobody taught you about. Each grave reads the same way: HOW IT STARTED, THE FALL, THE LESSON. The people in it paid billions for these lessons; reading them is free. You will open one yourself in a minute." },
    { p: "index.html", sel: ".tsb-bar__item--plus", t: "Your turn: the big + is audio country", d: "First, a trick: scroll down a little and the menu bar tucks itself away - scroll back up and it returns, so it never eats your screen. Bring it back, then tap the big + and let's go in together.", tryit: ".tsb-bar__item--plus", tryTxt: "Scroll a bit, then tap the big yellow +" },
    { p: "stories.html", sel: ".lt-head", t: "Listen Today", d: "Your daily audio front page, made for doing the other thing: the continue card resumes exactly where you paused, then today's picks - books spoken by the app, full audiobooks read by real narrators, podcasts from their own feeds. One tap, it plays." },
    { p: "stories.html", sel: "#writeBtn", t: "Or write your own", d: "Every reader can write here: lessons from your own life, published to the stories feed, read by other readers. No follower count needed to start - a good lesson travels on its own." },
    { p: "podcasts.html", sel: ".pc-hero", t: "The Audio Room", d: "40 full audiobooks and real podcasts, all playable right here. The small heart on any cover saves it to your shelf. Playback never dies when you move around the app - you are about to hear it for yourself." },
    { p: "podcasts.html", sel: ".pc-ab__card", t: "Your turn: press play for real", d: "Pick any book on the shelf. It streams the moment you tap - the chapters come straight from Archive.org, read by volunteer narrators, free and public domain.", tryit: "#pcAudiobooks [data-ab]", tryTxt: "Tap PLAY on any audiobook" },
    { p: "podcasts.html", sel: "#tsbAp", t: "This dock follows you everywhere", d: "That little bar is the player. It rides above the menu on every page, keeps playing while you read, and its thin yellow line is your progress in this chapter. Swipe it fully right to close it - your spot is kept.", tryit: "#tsbAp .ap-mid", tryTxt: "Tap the title on the dock" },
    { p: "podcasts.html", sel: "#tsbApSheet .ap-card", t: "The now-playing screen", d: "Big art, a seek bar you can drag, 15 and 30 second skips, speed from 0.75x to 1.5x, a sleep timer, a volume boost for the old recordings, and the full chapter queue below. Close it any way you like - the music never stops.", tryit: "#tsbApSheet .ap-x", tryTxt: "Look around, then close it with the red button" },
    { p: "graveyard.html", sel: "#freshAnchor", t: "The Graveyard, the full museum", d: "360 autopsies, filterable by era, cause and how much burned. New graves land every week - the fresh ones wear the red tag." },
    { p: "graveyard.html", sel: ".grave__stone", t: "Your turn: open a grave", d: "Any gravestone. The autopsy opens right here - the full story in three acts.", tryit: ".grave__stone", tryTxt: "Tap any gravestone" },
    { p: "graveyard.html", sel: ".autopsy__page", t: "Every autopsy reads the same honest way", d: "HOW IT STARTED: the rise, with the numbers. THE FALL: exactly what broke it. THE LESSON: the one line worth carrying. Close the reader when you're done and pick up the tour right here." },
    { p: "quotes.html", sel: "#qwBoard", t: "The Quote Wall", d: "A public soft board of lines worth keeping, pinnable by any reader. Move it around with your fingers, zoom in, tap any note to share it as a card." },
    { p: "quotes.html", sel: "#qwAdd", t: "Your turn: pin a line of your own", d: "The 📌 button opens the pinning sheet - pick a ready line from the shelf, or write your own and put it on the wall for other readers. Leave your first line behind.", tryit: "#qwAdd", tryTxt: "Tap the 📌 button" },
    { p: "chat.html", sel: "#tsb-input", t: "Ask the library anything", d: "Type a life question in your own words - why do I procrastinate, how do I pick a career - and the library answers with real books and real cases, not opinions. A handful of questions a day keeps it free for everyone." },
    { p: "notes.html", sel: ".nt-wrap", t: "Your notebook", d: "Every highlight, saved line, voice note and diagram you keep lands here. Private by default, saves by itself, exports as one clean file. Sign in and it follows your account to every device." },
    { p: "deepdive.html", sel: ".dd-head", t: "Deep dives", d: "One chapter of a book, read in full, with narration - for the ideas that need more than five minutes. Free samples are always marked; the full dives are part of Gold." },
    { p: "login.html", sel: "#lgTitle", t: "You", d: "Your streak, badges, bookmarks and shelf. Sign-in is free, one tap with Google, and your progress follows you anywhere you sign in." },
    { p: "settings.html", sel: "#tsbWalkReplay", t: "Settings, and this tutorial", d: "Darkness, text size, sound, app size - every toggle lives here. And this whole walkthrough replays from this very card, anytime. That's the app. Off you go - start with any book, or press play on something and cook. 📚" }
  ];

  var walk = null;   /* { i, ring, card, place } */
  var waitTries = 0; /* late mounts (docks, readers, sheets) get ~9s */

  /* ---- YOUR TURN: the tour advances only when the reader really
     taps the thing. A capture-phase click/focus listener matches the
     stop's try target; links that navigate just save the state and
     let the hop resume us on the next page. ---- */
  /* v317: ONE persistent capture listener for the whole walkthrough.
     The old engine re-bound document listeners every stop and then went
     deaf for 800ms after each hit - a fast user's taps landed in that
     dead zone and were swallowed, and the per-step re-binding stacked.
     Now the listener lives as long as the walk does, reads the CURRENT
     stop's target, and advances in ~120ms. */
  var tryArmed = false, tryAdvTimer = null;

  function trySel() {
    if (!walk) return null;
    var s = WALK[walk.i];
    return s && s.tryit ? s.tryit : null;
  }
  function tryAdvance() {
    if (tryAdvTimer) { clearTimeout(tryAdvTimer); tryAdvTimer = null; }
    var me = walkGen, nxt = walk ? walk.i + 1 : 0;
    var s2 = WALK[nxt];
    tryAdvTimer = setTimeout(function () {
      tryAdvTimer = null;
      if (me !== walkGen || !walk) return;   /* step changed / stopped meanwhile */
      if (s2 && s2.p !== pageName()) walkGo(nxt);
      else { walk.i = nxt; jset(WALKKEY, { i: nxt }); walkShow(); }
    }, 120);   /* just enough for the tap's own effect to begin */
  }
  function tryDocHandler(kind) {
    return function (e) {
      var sel = trySel();
      if (!sel || !walk) return;
      var t = e.target;
      if (t.closest && t.closest("#tsbTourCard")) return;   /* the tour's own buttons */
      if (!t.closest || !t.closest(sel)) return;
      if (kind === "click") {
        var a = t.closest && t.closest("a[href]");
        if (a) {
          var h = a.getAttribute("href") || "";
          if (h && h.indexOf("#") !== 0 && h.split("?")[0] !== pageName()) {
            jset(WALKKEY, { i: (walk ? walk.i + 1 : 0) });
            return;   /* the hop itself resumes the tour */
          }
        }
        tryAdvance();
      } else if (!tryAdvTimer) {
        tryAdvance();   /* focus (search box): fire once, not on every keystroke */
      }
    };
  }
  var tryClick = tryDocHandler("click");
  var tryFocus = tryDocHandler("focus");
  function armTry() {
    if (tryArmed) return;
    tryArmed = true;
    document.addEventListener("click", tryClick, true);
    document.addEventListener("focusin", tryFocus, true);
  }
  function disarmTry() {
    if (!tryArmed) return;
    tryArmed = false;
    document.removeEventListener("click", tryClick, true);
    document.removeEventListener("focusin", tryFocus, true);
    if (tryAdvTimer) { clearTimeout(tryAdvTimer); tryAdvTimer = null; }
  }

  var walkGen = 0;   /* v317: bumped on every step/stop - stale timers check it and bail */

  function walkStop() {
    walkGen++;
    disarmTry();
    if (walk) {
      window.removeEventListener("resize", walk.place);
      window.removeEventListener("scroll", walk.place, true);
      if (walk.ring) walk.ring.remove();
      if (walk.card) walk.card.remove();
      walk = null;
    }
  }

  function walkFinish(silent) {
    jset(WALKDONE, true);
    jdel(WALKKEY);
    walkStop();
    try { document.documentElement.classList.remove("tsb-walking"); } catch (e2) {}
    if (!silent) {
      try { toast("🧭 Tutorial complete. The ? chip is always up top if you feel lost."); } catch (e) {}
      if (pageName() !== "index.html") setTimeout(function () { location.href = "index.html"; }, 900);
    }
  }

  function walkSkipConfirm() {
    var ok = true;
    try {
      ok = window.confirm("Skip the tutorial?\n\nNo problem - the full tutorial replays anytime from Settings, under \uD83E\uDDED FEELING LOST?.");
    } catch (e) {}
    if (ok) walkFinish();
  }

  function walkShow() {
    if (!walk) return;
    var me = ++walkGen;              /* every timer from the previous step is now stale */
    var cur = walk.i;
    var s = WALK[cur];
    if (!s) { walkFinish(); return; }
    var el = null;
    if (s.sel) {   /* sel null = the Welcome card: no target, no ring */
      el = document.querySelector(s.sel);
      if (!el) {
        /* sheets, docks and readers mount late - wait for them before
           giving up and stepping aside */
        if (waitTries++ < 13) { setTimeout(function () { if (me === walkGen && walk) walkShow(); }, 700); return; }
        walkGo(cur + 1); return;
      }
    }
    waitTries = 0;
    disarmTry();
    sheetCss();   /* the tour's own styles - ring, card, try pulse */
    try { document.documentElement.classList.add("tsb-walking"); } catch (e2) {}   /* keeps the bar pinned up while the walk points at it */
    /* one card for the whole walk: the old engine tore the card down and
       rebuilt it every stop - jank plus a focus steal on every step */
    var card = walk.card;
    var fresh = !card;
    if (fresh) {
      card = document.createElement("div");
      card.id = "tsbTourCard";
      document.body.appendChild(card);
      walk.card = card;
    }
    var n = cur + 1;
    var last = cur === WALK.length - 1;
    var turn = !!s.tryit;
    card.innerHTML =
      '<span class="tt-step">' + (turn ? '<i class="tt-turnbadge">YOUR TURN</i>' : "") + "STOP " + n + " OF " + WALK.length + "</span>" +
      '<b class="tt-t">' + s.t + "</b>" +
      '<span class="tt-d">' + s.d + "</span>" +
      (turn
        ? '<span class="tt-acts"><span class="tt-wait">☝ ' + (s.tryTxt || "do it now") + '</span></span><span class="tt-acts2"><button class="tt-stepskip">skip this step</button><button class="tt-skip">skip the tutorial</button></span>'
        : '<span class="tt-acts">' +
            (cur > 0 ? '<button class="tt-back">← BACK</button>' : "") +
            '<button class="tt-next">' + (last ? "FINISH ✓" : "NEXT →") + "</button>" +
            '<button class="tt-skip">skip the tutorial</button></span>');
    if (fresh) {
      /* v317: the card persists but its buttons are re-rendered every stop,
         so the listeners are DELEGATED - one binding, alive for all 21 */
      card.addEventListener("click", function (e) {
        if (!walk) return;
        if (e.target.closest(".tt-stepskip")) { walkGo(walk.i + 1); return; }
        if (e.target.closest(".tt-back")) { walkGo(walk.i - 1); return; }
        if (e.target.closest(".tt-next")) {
          if (walk.i === WALK.length - 1) walkFinish();
          else walkGo(walk.i + 1);
          return;
        }
        if (e.target.closest(".tt-skip")) walkSkipConfirm();
      });
    }
    if (turn) armTry();
    /* v317, the lag fix: ONE scrollIntoView per stop (the old code re-fired
       it on every scroll event, fighting its own smooth scroll), and the
       ring is created once per step then MOVED with transform - GPU-composited,
       no layout, no full-screen shadow repaint on every frame */
    var scrolled = false;
    var rafPending = 0;
    function place() {
      if (!walk || !walk.card || me !== walkGen) return;
      if (!el) { walk.card.style.bottom = "calc(var(--bar-total, 68px) + 18px)"; return; }
      var r = el.getBoundingClientRect();
      if (!scrolled) {
        scrolled = true;
        var fixedEl = false;
        try { fixedEl = getComputedStyle(el).position === "fixed"; } catch (e4) {}
        if (!fixedEl) { try { el.scrollIntoView({ block: "center" }); } catch (e) {} r = el.getBoundingClientRect(); }
      }
      var ring = walk.ring;
      if (!ring) {
        ring = document.createElement("div");
        ring.id = "tsbTourRing";
        if (turn) ring.className = "tsb-try";
        document.body.appendChild(ring);
        walk.ring = ring;
      }
      ring.style.width = (r.width + 14) + "px";
      ring.style.height = (r.height + 14) + "px";
      ring.style.transform = "translate(" + Math.round(r.left - 7) + "px," + Math.round(r.top - 7) + "px)";
      if (r.top > window.innerHeight * 0.55) walk.card.style.bottom = (window.innerHeight - r.top + 18) + "px";
      else walk.card.style.bottom = "calc(var(--bar-total, 68px) + 18px)";
    }
    walk.place = function () {
      if (rafPending) return;
      rafPending = 1;
      requestAnimationFrame(function () { rafPending = 0; place(); });
    };
    window.addEventListener("resize", walk.place);
    window.addEventListener("scroll", walk.place, true);
    setTimeout(function () { if (me === walkGen) place(); }, 60);
  }

  function walkGo(i) {
    var s = WALK[i];
    if (!s) { walkFinish(); return; }
    jset(WALKKEY, { i: i });
    if (s.p !== pageName()) { location.href = s.p; return; }   /* hop; boot resumes on arrival */
    walk.i = i;
    walkShow();
  }

  function startWalk(i) {
    walkStop();
    jdel(WALKDONE);   /* replaying re-opens the tutorial, even after a skip */
    walk = { i: Math.max(0, i | 0), ring: null, card: null, place: function () {} };
    walkGo(walk.i);
  }

  /* ---------- the mini tour: five soft steps across home ---------- */
  var STEPS = [
    { sel: "#tsbHelpChip", t: "This ? is your map", d: "Lost anytime, on any day? Tap it: every function of the app, explained in plain words, one tap away." },
    { sel: "#searchInput", t: "Type a book, a mood, a problem", d: "500 books live here, broken into 5-minute lessons. Every single one free to read." },
    { sel: ".scanbtn", t: "Reading a paper book?", d: "Scan its cover and its whole shelf opens here - lessons, audio, everything it has." },
    { sel: ".gravebanner__box", t: "The Graveyard", d: "360 real failures autopsied, from Enron to the Titan. The best free read on the internet." },
    { sel: ".tsb-bar__item--plus", t: "The big + is your audio home", d: "Stories, Listen Today, your continue card, audiobooks and podcasts - it all lives behind the plus." }
  ];

  var tour = null;

  function endTour(done) {
    if (tour) {
      window.removeEventListener("resize", tour.place);
      window.removeEventListener("scroll", tour.place, true);
      if (tour.ring) tour.ring.remove();
      if (tour.card) tour.card.remove();
      tour = null;
    }
    if (done) {
      jset(TOURKEY, true);
      try { toast("🧭 You're set. The ? chip is always up top if you feel lost."); } catch (e) {}
    }
  }

  function startTour(force) {
    endTour(false);
    sheetCss();
    if (force) jset(TOURKEY, false);
    else if (jget(TOURKEY, false)) return;
    if (walk) return;   /* never two guides on one page */
    var i = 0;
    tour = { ring: null, card: null, place: function () {} };

    function step() {
      var s = STEPS[i];
      var el = s && document.querySelector(s.sel);
      while (s && !el) { i++; s = STEPS[i]; el = s && document.querySelector(s.sel); }
      if (!s) { endTour(true); return; }
      if (tour.ring) tour.ring.remove();
      if (tour.card) tour.card.remove();
      var last = i === STEPS.length - 1;
      var card = document.createElement("div");
      card.id = "tsbTourCard";
      card.innerHTML =
        '<span class="tt-step">STEP ' + (i + 1) + " OF " + STEPS.length + "</span>" +
        '<b class="tt-t">' + s.t + "</b>" +
        '<span class="tt-d">' + s.d + "</span>" +
        '<span class="tt-acts"><button class="tt-next">' + (last ? "DONE - I'M SET ✓" : "NEXT") + '</button><button class="tt-skip">skip the tour</button></span>';
      document.body.appendChild(card);
      tour.card = card;
      card.querySelector(".tt-next").addEventListener("click", function () {
        if (last) endTour(true);
        else { i++; step(); }
      });
      card.querySelector(".tt-skip").addEventListener("click", function () { endTour(true); });
      function place() {
        if (!tour || !tour.card) return;
        try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
        var r = el.getBoundingClientRect();
        var ring = document.createElement("div");
        ring.id = "tsbTourRing";
        document.body.appendChild(ring);
        ring.style.left = (r.left - 7) + "px";
        ring.style.top = (r.top - 7) + "px";
        ring.style.width = (r.width + 14) + "px";
        ring.style.height = (r.height + 14) + "px";
        if (tour.ring) tour.ring.remove();
        tour.ring = ring;
        var c = tour.card.getBoundingClientRect();
        tour.card.style.bottom = Math.max(14, window.innerHeight - r.top + 14) + "px";
        /* keep the card off the ring: if the target sits low, park the card above it */
        if (r.top > window.innerHeight * 0.55) tour.card.style.bottom = (window.innerHeight - r.top + 18) + "px";
        void c;
      }
      tour.place = place;
      window.addEventListener("resize", place);
      window.addEventListener("scroll", place, true);
      setTimeout(place, 60);
    }
    step();
  }

  /* ---------- boot: walkthrough, mini tour, guide on #guide ---------- */
  function boot() {
    /* v315: no migration - the hands-on tutorial is new for EVERYONE,
       readers of every vintage walk it once; after that it never repeats */

    /* the guide door works even when the reader is already on this page:
       hash changes never reload, so listen for them */
    window.addEventListener("hashchange", function () {
      if (location.hash === "#guide") openGuide();
    });
    if (location.hash === "#guide") { openGuide(); return; }

    /* the Settings replay button, wherever the settings page loads us */
    var wr = document.getElementById("tsbWalkReplay");
    if (wr) wr.addEventListener("click", function () { startWalk(0); });

    /* resume a walkthrough in progress (survives the page hops) */
    var wst = jget(WALKKEY, null);
    if (wst && typeof wst.i === "number" && !jget(WALKDONE, false)) {
      var ii = Math.max(0, Math.min(wst.i, WALK.length - 1));
      /* wandered to another page mid-tour? the tour follows the reader */
      if (WALK[ii] && WALK[ii].p !== pageName()) {
        for (var k = 0; k < WALK.length; k++) { if (WALK[k].p === pageName()) { ii = k; break; } }
      }
      walk = { i: ii, ring: null, card: null, place: function () {} };
      setTimeout(walkShow, 700);   /* let the page settle before pointing */
      return;
    }

    /* auto-start the FULL tutorial for brand-new readers, once, after
       onboarding has calmed down - home page only */
    if (!document.getElementById("tsbHelpChip") || !document.querySelector("#searchInput")) return;
    if (pageName() !== "index.html") return;
    if (jget(WALKDONE, false) || jget("tsb_onboarded", false) !== true) return;
    var tries = 0;
    (function whenCalm() {
      var ob = document.querySelector(".obwrap:not(.obwrap--off)");
      if (ob && tries++ < 8) { setTimeout(whenCalm, 900); return; }
      setTimeout(function () { startWalk(0); }, tries > 0 ? 500 : 1500);
    })();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  function toast(msg) {
    var t = document.createElement("div");
    t.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--bar-total, 68px) + 24px);z-index:280;background:var(--ink);color:var(--paper);border-radius:999px;padding:10px 16px;font:800 12px 'Space Grotesk',sans-serif;max-width:86vw;text-align:center";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
  }

  window.TSB_GUIDE = { openGuide: openGuide, closeGuide: closeGuide, startTour: startTour, startWalk: startWalk };
})();
