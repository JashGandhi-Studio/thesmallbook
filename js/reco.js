/* ============================================================
   THESMALLBOOK, ONE RECOMMENDATION ENGINE (reco.js) · v419
   The app grew several small recommenders that could not see
   each other: a taste model, an onboarding shelf, a daily trio
   with its own category names that no longer match the library.
   This is the one engine they now share.

     TSB.recommend(n, opts)  the next n books for this reader
     TSB.reco.profile()      the taste profile it ranked from
     TSB.reco.explain(id)    why a book scored what it scored

   The ranking, in order of weight:
     taste      categories of books finished, bookmarked and
                listened to, plus the onboarding answers
     goal       books that fit the reader's daily minutes and
                read/listen style beat books that do not
     - seen     finished books are out; books served in the
                last week (tsb_served) sink hard
     - recency  a book finished yesterday does not lead today
     + explore  every fourth slot is a deliberate step outside
                the reader's strongest categories, rotated daily
   Cold start is the onboarding shelf's categories, then the
   library's own NEW list. Everything is computed on the device
   from the reader's stored state; the server profile shape is
   profile() itself, so if accounts ever rank centrally, this
   is the payload - no second model to reconcile.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB && window.TSB.recommend) return;

  function jget(key, def) {
    try {
      if (window.TSB && TSB.store) { var v = TSB.store.get(key, def); return v == null ? def : v; }
    } catch (e) {}
    try { var raw = localStorage.getItem(key); return raw === null ? def : JSON.parse(raw); } catch (e) { return def; }
  }
  function books() { return window.BOOKS || []; }
  function byId() {
    var m = {};
    books().forEach(function (b) { m[b.id] = b; });
    return m;
  }
  function daySeed() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h;
  }

  /* the taste profile: one shape, every signal the app already keeps */
  function profile() {
    var idx = byId();
    var cats = {};                       /* category -> affinity weight */
    function add(cat, w) { if (cat) cats[cat] = (cats[cat] || 0) + w; }

    var progress = jget("tsb_progress", {}) || {};
    Object.keys(progress).forEach(function (id) {
      var b = idx[id]; if (!b) return;
      var done = (progress[id] || []).length;
      var total = (b.lessons || []).length || 1;
      add(b.category, done >= total ? 3 : 1 + (done / total));   /* finished counts most */
    });
    (jget("tsb_bookmarks", []) || []).forEach(function (id) { var b = idx[id]; if (b) add(b.category, 1.5); });
    (jget("tsb_read_books", []) || []).forEach(function (id) { var b = idx[id]; if (b) add(b.category, 3); });

    var ev = [];
    try { ev = (window.TSB && TSB.telemetry && TSB.telemetry.events && TSB.telemetry.events()) || []; } catch (e) {}
    ev.forEach(function (x) {
      var id = x && x.d && (x.d.book || x.d.id);
      var b = id && idx[id];
      if (b) add(b.category, 0.4);
    });

    /* onboarding answers are the cold-start taste */
    var mind = jget("tsb_mind", []) || [];
    var interests = jget("tsb_interests", []) || [];
    var starter = jget("tsb_starter_shelf", []) || [];
    starter.forEach(function (id) { var b = idx[id]; if (b) add(b.category, 1.2); });

    return {
      cats: cats,
      mind: mind,
      interests: interests,
      minutes: +(jget("tsb_read_minutes", 10) || 10),
      style: String(jget("tsb_read_style", "steady") || "steady"),
      finished: Object.keys(progress).filter(function (id) {
        var b = idx[id];
        return b && (progress[id] || []).length >= ((b.lessons || []).length || 1);
      }),
      served: jget("tsb_served", {}) || {},
      cold: !Object.keys(cats).length && !mind.length && !interests.length
    };
  }

  function score(book, prof, now) {
    var why = { taste: 0, goal: 0, seen: 0, fresh: 0 };
    why.taste = (prof.cats[book.category] || 0) * 2;
    if (prof.interests.indexOf(book.category) >= 0) why.taste += 2.5;
    var mins = parseInt(book.readTime, 10) || 10;
    why.goal = Math.max(0, 2 - Math.abs(mins - prof.minutes) / 6);   /* fits the day you have */
    var sv = prof.served[book.id];
    if (typeof sv === "number" && now - sv < 7 * 864e5) why.seen = -6;   /* served this week sinks */
    if (prof.finished.indexOf(book.id) >= 0) why.seen = -100;           /* finished is out */
    var news = (window.TSB_CONFIG && TSB_CONFIG.NEW_THIS_WEEK) || [];
    var ni = news.indexOf(book.id);
    if (ni >= 0) why.fresh = Math.max(0, 1.5 - ni * 0.02);              /* new books get a fair hearing */
    return { total: why.taste + why.goal + why.seen + why.fresh, why: why };
  }

  function recommend(n, opts) {
    opts = opts || {};
    var all = books();
    if (!all.length) return [];
    var prof = profile();
    var now = Date.now();
    var pool = all.filter(function (b) { return prof.finished.indexOf(b.id) < 0; });
    if (opts.category) pool = pool.filter(function (b) { return b.category === opts.category; });
    if (!pool.length) pool = all.slice();

    /* cold start: the onboarding answers lead, then the library's new list */
    if (prof.cold && !opts.category) {
      var idx = byId();
      var cold = [];
      (jget("tsb_starter_shelf", []) || []).forEach(function (id) { if (idx[id]) cold.push(idx[id]); });
      ((window.TSB_CONFIG && TSB_CONFIG.NEW_THIS_WEEK) || []).forEach(function (id) {
        if (idx[id] && cold.indexOf(idx[id]) < 0) cold.push(idx[id]);
      });
      all.forEach(function (b) { if (cold.indexOf(b) < 0) cold.push(b); });
      return cold.slice(0, n || 3);
    }

    var scored = pool.map(function (b) { return { b: b, s: score(b, prof, now) }; });
    scored.sort(function (a, b2) { return b2.s.total - a.s.total || (hash(a.b.id) % 97) - (hash(b2.b.id) % 97); });

    var out = [];
    var strongCats = Object.keys(prof.cats).sort(function (a, b2) { return prof.cats[b2] - prof.cats[a]; }).slice(0, 2);
    var exploreEvery = 4;
    for (var i = 0; i < scored.length && out.length < (n || 3); i++) {
      var slot = out.length + 1;
      if (slot % exploreEvery === 0) {
        /* one deliberate step outside the strongest categories,
           rotated by the day so it is exploration, not noise */
        var outside = scored.filter(function (x) {
          return strongCats.indexOf(x.b.category) < 0 && out.indexOf(x.b) < 0 && x.s.total > -50;
        });
        if (outside.length) {
          var pick = outside[(daySeed() + hash(outside[0].b.id)) % outside.length];
          out.push(pick.b);
          continue;
        }
      }
      if (out.indexOf(scored[i].b) < 0) out.push(scored[i].b);
    }
    return out;
  }

  function explain(id) {
    var b = byId()[id];
    if (!b) return null;
    var prof = profile();
    var s = score(b, prof, Date.now());
    return { id: id, total: Math.round(s.total * 100) / 100, why: s.why, category: b.category };
  }

  window.TSB = window.TSB || {};
  window.TSB.recommend = recommend;
  window.TSB.reco = { recommend: recommend, profile: profile, explain: explain };
})();
