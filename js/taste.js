/* ==========================================================================
   v353 · TASTE
   ---------------------------------------------------------------
   The feed used to be: onboarding categories + a hash of the date. Pick one
   new interest and every recommendation changed at once. That is not how a
   good feed behaves.

   This one keeps a small, boring, private model of what you actually do:
   a weight per category, moved by what you open, finish, save and underline,
   decayed by age so last month matters less than last week. Then:

     - picks are ANCHORED. Two of yesterday's three survive unless your taste
       has genuinely moved (measured, not guessed). Instagram does not rebuild
       your feed because you tapped one reel.
     - journeys are built from your weights, so a reader who leans creative
       gets creative paths, and a reader who leans money gets money paths.
     - the onboarding answers are a starting prior, not a cage. Behaviour wins
       within about five books.

   Nothing leaves the device. No network calls.
   ========================================================================== */
(function () {
  "use strict";

  var DAY = 864e5;
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function now() { return Date.now(); }
  function books() { return window.BOOKS || []; }
  function byId(id) { var B = books(); for (var i = 0; i < B.length; i++) if (B[i].id === id) return B[i]; return null; }
  function catOf(b) { return (b && (b.category || b.cat)) || "Other"; }

  /* ---------------- signals ---------------- */
  function events() {
    var e = get("tsb_taste_events", []);
    return Array.isArray(e) ? e : [];
  }

  var STOPW = ["the", "and", "for", "with", "how", "why", "what", "your", "you", "are", "book", "books", "show", "podcast", "episode", "part", "vol"];
  function titleWords(b) {
    if (!b) return [];
    return String((b.title || "") + " " + (b.tags || []).join(" ") + " " + (b.author || "")).toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097f]+/g, " ").split(/\s+/)
      .filter(function (w) { return w.length > 2 && STOPW.indexOf(w) < 0; }).slice(0, 8);
  }
  function wordsOf(str) {
    return String(str || "").toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, " ").split(/\s+/)
      .filter(function (w) { return w.length > 2 && STOPW.indexOf(w) < 0; }).slice(0, 8);
  }

  /* the reader does something; we remember one small row, nothing else.
     v410: the row carries the book's own words too, so the Listen room
     can fetch around what was read, not only what was played. */
  function note(id, kind) {
    if (!id) return;
    var e = events();
    var b = byId(id);
    e.unshift({ i: id, k: kind || "open", t: now(), w: titleWords(b), c: catOf(b) });
    set("tsb_taste_events", e.slice(0, 400));
    /* a tasted book changes the anchor for tomorrow, never for today */
    var slots = get("tsb_taste_slots", null);
    if (slots && slots.day === dayKey()) return;
  }

  /* v410 · ONE ECOSYSTEM LEDGER. A show played, an audiobook saved, a
     word searched: none of these are catalogue books, so they used to
     live in a Listen-only notebook that book picks never read. They
     now land in the same event ledger (already account-synced), as
     words, and model() folds the strongest of them into book taste
     while topWords() hands them back to the Listen room. Everything
     the reader does teaches everything the app recommends. */
  function signal(o) {
    try {
      o = o || {};
      if (o.bookId) { note(o.bookId, o.kind || "listen"); return; }
      var ws = wordsOf((o.title || "") + " " + (o.by || ""));
      if (o.words) ws = ws.concat(wordsOf(Array.isArray(o.words) ? o.words.join(" ") : o.words));
      ws = ws.filter(function (w, i) { return ws.indexOf(w) === i; }).slice(0, 8);
      if (!ws.length && !o.host) return;
      var e = events();
      e.unshift({ w: ws, h: o.host || "", c: o.cat || "", k: o.kind || "listen", m: o.mult || 1, t: now() });
      set("tsb_taste_events", e.slice(0, 400));
    } catch (err) {}
  }
  function topWords(n) {
    var bag = {};
    events().forEach(function (e) {
      var age = Math.max(0, (now() - (e.t || now())) / DAY);
      var w = (WEIGHT[e.k] != null ? WEIGHT[e.k] : 0.3) * Math.exp(-age / 45) * (e.m || 1);
      (e.w || []).forEach(function (word) { if (word && word.length > 2) bag[word] = (bag[word] || 0) + Math.max(0.05, w); });
    });
    try {
      var lt = get("tsb_listen_taste", null);
      if (lt && lt.terms) Object.keys(lt.terms).forEach(function (word) { bag[word] = (bag[word] || 0) + Math.min(2, lt.terms[word] || 0); });
    } catch (err) {}
    return Object.keys(bag).sort(function (a, b) { return bag[b] - bag[a]; }).slice(0, n || 5);
  }

  var WEIGHT = { finish: 1.0, save: 0.55, highlight: 0.45, listen: 0.7, search: 0.35, open: 0.18, shown: -0.04, skip: -0.12 };

  function model() {
    var cats = {}, seen = {}, finishedIds = {};
    /* prior: what they said at onboarding, worth about four books */
    var interests = get("tsb_interests", []), mind = get("tsb_mind", []);
    if (!Array.isArray(interests)) interests = [];
    if (!Array.isArray(mind)) mind = [];
    interests.forEach(function (c) { cats[c] = (cats[c] || 0) + 1.1; });
    mind.forEach(function (m) {
      var mm = String(m).toLowerCase();
      books().forEach(function (b) {
        if (cats[catOf(b)]) return;
        var tag = ((b.category || "") + " " + (b.tags || []).join(" ") + " " + (b.title || "")).toLowerCase();
        if (tag.indexOf(mm.slice(0, 5)) >= 0) cats[catOf(b)] = (cats[catOf(b)] || 0) + 0.35;
      });
    });
    /* a new reader's chosen shelf is also a small prior */
    var starter = get("tsb_starter_shelf", []);
    if (Array.isArray(starter)) starter.forEach(function (item) {
      var id = item && typeof item === "object" ? (item.id || item.bookId) : item;
      var b = byId(id); if (b) cats[catOf(b)] = (cats[catOf(b)] || 0) + 0.18;
    });

    /* behaviour: everything they actually did, aged */
    events().forEach(function (e) {
      var b = byId(e.i);
      if (!b) return;
      var age = Math.max(0, (now() - (e.t || now())) / DAY);
      var decay = Math.exp(-age / 45);
      var w = (WEIGHT[e.k] != null ? WEIGHT[e.k] : 0.1) * decay;
      cats[catOf(b)] = (cats[catOf(b)] || 0) + w;
      seen[e.i] = e.t || 1;
      if (e.k === "finish") finishedIds[e.i] = 1;
    });

    /* reading state, bookmarks and highlights count even when a tap happened
       before the taste listener was ready. All of this stays on this device. */
    var prog = get("tsb_progress", {}) || {};
    books().forEach(function (b) {
      var rows = prog[b.id];
      var n = Array.isArray(rows) ? rows.length : 0;
      if (!n) return;
      var total = (b.lessons && b.lessons.length) || 8;
      var readingWeight = n >= total ? 0.9 : 0.15 + 0.35 * Math.min(1, n / total);
      cats[catOf(b)] = (cats[catOf(b)] || 0) + readingWeight;
      seen[b.id] = seen[b.id] || now() - 30 * DAY;
      if (n >= total) finishedIds[b.id] = 1;
    });

    var readBooks = get("tsb_read_books", []);
    if (Array.isArray(readBooks)) readBooks.forEach(function (id) {
      var b = byId(id); if (!b) return;
      cats[catOf(b)] = (cats[catOf(b)] || 0) + 0.5;
      seen[id] = seen[id] || now() - 20 * DAY;
    });

    var bookmarks = get("tsb_bookmarks", []);
    if (Array.isArray(bookmarks)) bookmarks.forEach(function (id) {
      var b = byId(id); if (!b) return;
      cats[catOf(b)] = (cats[catOf(b)] || 0) + 0.55;
      seen[id] = seen[id] || now() - 10 * DAY;
    });

    var highlights = get("tsb_highlights_v1", {});
    if (highlights && typeof highlights === "object" && !Array.isArray(highlights)) {
      Object.keys(highlights).forEach(function (id) {
        var b = byId(id), marks = highlights[id];
        if (!b || !Array.isArray(marks) || !marks.length) return;
        cats[catOf(b)] = (cats[catOf(b)] || 0) + 0.45 * Math.min(2, marks.length);
        seen[id] = seen[id] || now() - 5 * DAY;
      });
    }

    /* v410: what was listened to or searched steers book taste too.
       The strongest ledger words lift the categories of books that
       carry them, bounded so one binge cannot rebuild the shelf. */
    var wordBag = {};
    events().forEach(function (e) {
      if (e.i) return;
      var age = Math.max(0, (now() - (e.t || now())) / DAY);
      var w = (WEIGHT[e.k] != null ? WEIGHT[e.k] : 0.3) * Math.exp(-age / 45) * (e.m || 1);
      (e.w || []).forEach(function (word) { if (word.length > 3) wordBag[word] = (wordBag[word] || 0) + w; });
      if (e.c && e.c !== "podcast" && e.c !== "audiobook") cats[e.c] = (cats[e.c] || 0) + w * 0.4;
    });
    Object.keys(wordBag).sort(function (a, b) { return wordBag[b] - wordBag[a]; }).slice(0, 10).forEach(function (word) {
      var lift = Math.min(0.5, wordBag[word] * 0.2);
      if (lift <= 0.02) return;
      books().forEach(function (b) {
        var tag = ((b.category || "") + " " + (b.tags || []).join(" ") + " " + (b.title || "")).toLowerCase();
        if (tag.indexOf(word) >= 0) cats[catOf(b)] = (cats[catOf(b)] || 0) + lift;
      });
    });

    /* normalise, floor at zero */
    var keys = Object.keys(cats), total = 0;
    keys.forEach(function (k) { cats[k] = Math.max(0, cats[k]); total += cats[k]; });
    if (total > 0) keys.forEach(function (k) { cats[k] = cats[k] / total; });
    return { cats: cats, seen: seen, finished: finishedIds };
  }

  function drift() {
    var m = model(), prev = get("tsb_taste_snap", null);
    set("tsb_taste_snap", { d: dayKey(), cats: m.cats });
    if (!prev || !prev.cats) return 1;      /* no history: rebuild once, then settle */
    var d = 0, keys = {};
    Object.keys(m.cats).forEach(function (k) { keys[k] = 1; });
    Object.keys(prev.cats).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) { d += Math.abs((m.cats[k] || 0) - (prev.cats[k] || 0)); });
    return d / 2;                            /* 0 = identical taste, 1 = completely different */
  }

  function score(b, m, rnd) {
    var w = m.cats[catOf(b)] || 0.05;
    var fresh = m.seen[b.id] ? 0 : 0.45;
    var done = m.finished[b.id] ? -2 : 0;
    return w * 3 + fresh + done + rnd * 0.35;
  }
  function profileSignature() {
    var interests = get("tsb_interests", []), mind = get("tsb_mind", []), shelf = get("tsb_starter_shelf", []);
    if (!Array.isArray(interests)) interests = [];
    if (!Array.isArray(mind)) mind = [];
    if (!Array.isArray(shelf)) shelf = [];
    shelf = shelf.map(function (item) { return item && typeof item === "object" ? (item.id || item.bookId || "") : item; });
    return String(hash(JSON.stringify([interests, mind, shelf])));
  }

  /* ---------------- picks: anchored, never rebuilt ---------------- */
  function picks(n) {
    n = n || 3;
    var today = dayKey(), profile = profileSignature();
    var saved = get("tsb_taste_slots", null);
    if (saved && saved.day === today && saved.profile === profile && (saved.ids || []).length === n) {
      var out = saved.ids.map(byId).filter(Boolean);
      if (out.length === n) return out;
    }
    var m = model();
    var sameProfile = saved && (!saved.profile || saved.profile === profile);
    var prev = (sameProfile && saved.ids || []).map(byId).filter(Boolean);
    var dr = drift();
    /* how much of yesterday survives. Small movement of taste keeps the feed. */
    var keep = prev.length ? (dr < 0.12 ? n - 1 : dr < 0.3 ? Math.max(1, n - 2) : 0) : 0;
    var picked = [], used = {};
    for (var i = 0; i < keep && i < prev.length; i++) {
      var p = prev[i];
      if (!p || m.finished[p.id]) continue;
      picked.push(p); used[p.id] = 1;
    }
    var rndSeed = hash(today + "|" + Object.keys(m.cats).join(","));
    var pool = books().filter(function (b) { return !used[b.id] && !m.finished[b.id]; });
    pool.forEach(function (b, i) {
      var r = ((rndSeed = (rndSeed * 1664525 + 1013904223) >>> 0) % 1000) / 1000;
      b.__s = score(b, m, r);
    });
    pool.sort(function (a, b) { return b.__s - a.__s; });
    /* one per category first, so three picks are never three clones */
    var catsUsed = {};
    picked.forEach(function (b) { catsUsed[catOf(b)] = 1; });
    pool.forEach(function (b) {
      if (picked.length >= n) return;
      if (catsUsed[catOf(b)]) return;
      picked.push(b); catsUsed[catOf(b)] = 1;
    });
    pool.forEach(function (b) {
      if (picked.length >= n) return;
      if (picked.indexOf(b) >= 0) return;
      picked.push(b);
    });
    picked.forEach(function (b) { delete b.__s; });
    set("tsb_taste_slots", { day: today, profile: profile, ids: picked.map(function (b) { return b.id; }), drift: Math.round(dr * 100) / 100 });
    return picked.slice(0, n);
  }

  function why(b) {
    if (!b) return "";
    var m = model();
    var e = events().filter(function (x) { return x.i === b.id; })[0];
    if (e && e.k === "open") return "You opened this before";
    var cat = catOf(b), best = null;
    Object.keys(m.cats).forEach(function (c) { if (!best || m.cats[c] > m.cats[best]) best = c; });
    if (cat === best) return "Because " + String(cat).toLowerCase() + " is where you keep landing";
    return "A way out of your usual shelf";
  }

  /* ---------------- journeys ---------------- */
  var PATHS = {
    "Creativity": { t: "Make something every day", b: "Seven small books for people who want to make things and keep making them.", tint: "#C86B4A" },
    "Focus": { t: "The attention diet", b: "Five books on getting your mind back from the day.", tint: "#4A5335" },
    "Money & Finance": { t: "Money, calmly", b: "Start where you are. No charts, no shouting.", tint: "#4B1F6F" },
    "Money & Wealth": { t: "Money, calmly", b: "Start where you are. No charts, no shouting.", tint: "#4B1F6F" },
    "Psychology & Mind": { t: "Understand people", b: "Why they act the way they do, including you.", tint: "#123049" },
    "Psychology & People": { t: "Understand people", b: "Why they act the way they do, including you.", tint: "#123049" },
    "Self-Improvement": { t: "Build the habit first", b: "Small systems beat big intentions. Six books that prove it.", tint: "#16130F" },
    "Business & Startups": { t: "Build something", b: "From first customer to first thousand. Order matters.", tint: "#241C15" },
    "Power & Strategy": { t: "Read the room", b: "Strategy, power and the long game.", tint: "#0E0C0B" },
    "Leadership": { t: "Lead without noise", b: "How to be the person others can build on.", tint: "#1B2E4A" },
    "History": { t: "How we got here", b: "The long view, in small doses.", tint: "#2A231C" },
    "Health": { t: "The body first", b: "Sleep, food, movement, in that order.", tint: "#4A5335" },
    "Relationships": { t: "Close to people", b: "The books nobody teaches you to read.", tint: "#8C3B2A" }
  };

  function journeys(n) {
    n = n || 3;
    var m = model();
    var cats = Object.keys(m.cats).sort(function (a, b) { return m.cats[b] - m.cats[a]; });
    var chosen = [];
    cats.forEach(function (c) {
      if (chosen.length >= n) return;
      if (PATHS[c] && !chosen.some(function (x) { return x.cat === c; })) chosen.push({ cat: c, p: PATHS[c] });
    });
    /* if taste is thin, the shelf still deserves paths */
    Object.keys(PATHS).forEach(function (c) {
      if (chosen.length >= n) return;
      if (books().some(function (b) { return catOf(b) === c; }) && !chosen.some(function (x) { return x.cat === c; }))
        chosen.push({ cat: c, p: PATHS[c] });
    });
    return chosen.map(function (o) {
      var list = books().filter(function (b) { return catOf(b) === o.cat && !m.finished[b.id]; });
      list.sort(function (a, b) { return (hash(a.id) % 97) - (hash(b.id) % 97); });
      return { cat: o.cat, title: o.p.t, blurb: o.p.b, tint: o.p.tint, books: list.slice(0, 5) };
    }).filter(function (j) { return j.books.length >= 3; });
  }

  /* ---------------- one hook, so no other file has to remember ----------------
     any tap that leads to a book page is a signal. Captured once, on the
     document, in the capture phase, so it survives repaints of any feed. */
  try {
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[href*='book.html']") : null;
      if (!a) return;
      var m = /[?&]id=([^&#]+)/.exec(a.getAttribute("href") || "");
      if (m) note(decodeURIComponent(m[1]), "open");
    }, true);
  } catch (e) {}

  window.TSB_TASTE = {
    model: model, note: note, picks: picks, why: why, journeys: journeys,
    drift: drift, events: events, signal: signal, topWords: topWords
  };
})();
