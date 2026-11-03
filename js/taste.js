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

  /* the reader does something; we remember one small row, nothing else */
  function note(id, kind) {
    if (!id) return;
    var e = events();
    e.unshift({ i: id, k: kind || "open", t: now() });
    set("tsb_taste_events", e.slice(0, 400));
    /* a tasted book changes the anchor for tomorrow, never for today */
    var slots = get("tsb_taste_slots", null);
    if (slots && slots.day === dayKey()) return;
  }

  var WEIGHT = { finish: 1.0, save: 0.55, highlight: 0.45, listen: 0.7, open: 0.18, shown: -0.04, skip: -0.12 };

  function model() {
    var cats = {}, seen = {}, finishedIds = {};
    /* prior: what they said at onboarding, worth about four books */
    (get("tsb_interests", []) || []).forEach(function (c) { cats[c] = (cats[c] || 0) + 1.1; });
    (get("tsb_mind", []) || []).forEach(function (m) {
      var mm = String(m).toLowerCase();
      books().forEach(function (b) {
        if (cats[catOf(b)]) return;
        var tag = ((b.category || "") + " " + (b.tags || []).join(" ") + " " + (b.title || "")).toLowerCase();
        if (tag.indexOf(mm.slice(0, 5)) >= 0) cats[catOf(b)] = (cats[catOf(b)] || 0) + 0.35;
      });
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

    /* the reading state itself is the strongest signal there is */
    var prog = get("tsb_progress", {}) || {};
    books().forEach(function (b) {
      var n = (prog[b.id] || []).length;
      if (!n) return;
      var total = (b.lessons && b.lessons.length) || 8;
      cats[catOf(b)] = (cats[catOf(b)] || 0) + (n >= total ? 0.9 : 0.25 * Math.min(1, n / total));
      seen[b.id] = seen[b.id] || now() - 30 * DAY;
      if (n >= total) finishedIds[b.id] = 1;
    });

    (get("tsb_read_books", []) || []).forEach(function (id) {
      var b = byId(id); if (!b) return;
      cats[catOf(b)] = (cats[catOf(b)] || 0) + 0.5;
      seen[id] = seen[id] || now() - 20 * DAY;
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

  /* ---------------- picks: anchored, never rebuilt ---------------- */
  function picks(n) {
    n = n || 3;
    var today = dayKey();
    var saved = get("tsb_taste_slots", null);
    if (saved && saved.day === today && (saved.ids || []).length === n) {
      var out = saved.ids.map(byId).filter(Boolean);
      if (out.length === n) return out;
    }
    var m = model(), prev = (saved && saved.ids || []).map(byId).filter(Boolean);
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
    set("tsb_taste_slots", { day: today, ids: picked.map(function (b) { return b.id; }), drift: Math.round(dr * 100) / 100 });
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
    drift: drift, events: events
  };
})();
