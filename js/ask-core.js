/* ============================================================
   THESMALLBOOK — 🧠 ASK CORE (ask-core.js)
   The shared answer engine behind BOTH the legacy Ask popup and
   the new full-screen Chat page.

   Extracted verbatim from js/ask.js so the FUNCTIONING IS IDENTICAL:
   same keyword topic matcher, same lesson/grave search and scoring,
   same source cards. Only the presentation layer differs.

   window.TSB_ASK_CORE
     .findTopic(q)            → topic object | null
     .searchLessons(q, n)     → [{book, lesson, idx, score}]
     .searchGraves(q, n)      → [{f, score}]
     .resolve(q)              → { kind, topic, lessons, graves, sources }
     .suggestions(n)          → seeded starter questions
     .followUps(q, n)         → related questions
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_ASK_CORE) return;

  var STOP = ("the a an and or but if to of in on for with my me i you your it is are was "
    + "were be been do does did how what why when where which who am can should would could "
    + "will just about from into at as by that this these those not no yes get got make").split(" ");

  function norm(q) {
    return String(q).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }
  function words(q) {
    return norm(q).split(" ").filter(function (w) {
      return w.length > 2 && STOP.indexOf(w) === -1;
    });
  }

  /* ---------- indexes ---------- */
  var BOOK_MAP = null, GRAVE_MAP = null;
  function books() { return window.BOOKS || []; }
  function graves() { return window.FAILURES || []; }
  function bookIndex() {
    if (BOOK_MAP && BOOK_MAP.__n === books().length) return BOOK_MAP;
    BOOK_MAP = { __n: books().length };
    books().forEach(function (b) { BOOK_MAP[b.id] = b; });
    return BOOK_MAP;
  }
  function graveIndex() {
    if (GRAVE_MAP && GRAVE_MAP.__n === graves().length) return GRAVE_MAP;
    GRAVE_MAP = { __n: graves().length };
    graves().forEach(function (f) { GRAVE_MAP[f.id] = f; });
    return GRAVE_MAP;
  }

  /* ---------- matching (identical scoring to ask.js) ---------- */
  function findTopic(q) {
    var n = norm(q);
    var data = window.TSB_ASK_DATA || [];
    var best = null, bestScore = 0, bestHits = 0;
    data.forEach(function (t) {
      var score = 0, hits = 0;
      (t.keywords || []).forEach(function (kw) {
        var k = String(kw).toLowerCase();
        if (n.indexOf(k) !== -1) { score += k.indexOf(" ") !== -1 ? 2 : 1; hits++; }
      });
      if (score > bestScore || (score === bestScore && hits > bestHits && score > 0)) {
        bestScore = score; bestHits = hits; best = t;
      }
    });
    return bestScore >= 1 ? best : null;
  }

  function searchLessons(q, limit) {
    var ws = words(q);
    if (!ws.length) return [];
    var out = [];
    books().forEach(function (b) {
      (b.lessons || []).forEach(function (l, i) {
        if (!l || !l.title) return;
        var title = String(l.title).toLowerCase();
        var body = ((l.summary || "") + " " + (l.action || "")).toLowerCase();
        var score = 0;
        ws.forEach(function (w) {
          if (title.indexOf(w) !== -1) score += 3;
          if (body.indexOf(w) !== -1) score += 1;
        });
        if (score > 0) out.push({ book: b, lesson: l, idx: i, score: score });
      });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, limit || 5);
  }

  function searchGraves(q, limit) {
    var ws = words(q);
    if (!ws.length) return [];
    var out = [];
    graves().forEach(function (f) {
      var hay = ((f.name || "") + " " + (f.title || "") + " " +
                 (f.story || "") + " " + (f.lesson || "")).toLowerCase();
      var score = 0;
      ws.forEach(function (w) { if (hay.indexOf(w) !== -1) score += 1; });
      if (score > 0) out.push({ f: f, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, limit || 2);
  }

  /* ---------- link builders (depth-aware) ---------- */
  var depth = (function () {
    var p = location.pathname.replace(/\/[^\/]*$/, "/");
    return (p.match(/\//g) || []).length - 1;
  })();
  var UP = depth > 0 ? new Array(depth + 1).join("../") : "";

  function lessonLink(book, idx) {
    return UP + "book.html?id=" + encodeURIComponent(book.id) + "#lesson-" + idx;
  }
  function graveLink(f) { return UP + "graveyard/" + encodeURIComponent(f.id) + ".html"; }

  /* ---------- unified resolver used by the Chat UI ---------- */
  function resolve(q) {
    var topic = findTopic(q);
    var lessons = topic ? [] : searchLessons(q, 4);
    var gRes = topic ? [] : searchGraves(q, 2);

    /* guarantee autopsies, exactly as ask.js does */
    if (topic && (!topic.graves || !topic.graves.length) && graves().length) {
      topic = JSON.parse(JSON.stringify(topic));
      topic.graves = (topic.graves || []).concat(
        searchGraves(q, 2).map(function (r) {
          return { id: r.f.id, blurb: (r.f.lesson || r.f.mistake || "").slice(0, 110) + "\u2026" };
        }));
    }

    var sources = [];
    if (topic) {
      (topic.books || []).forEach(function (s) {
        var b = bookIndex()[s.id];
        if (!b) return;
        var idx = 0;
        if (s.lesson) {
          var fi = (b.lessons || []).findIndex(function (l) {
            return String(l.title).toLowerCase().indexOf(String(s.lesson).toLowerCase()) !== -1;
          });
          if (fi !== -1) idx = fi;
        }
        var l = (b.lessons || [])[idx] || (b.lessons || [])[0] || {};
        sources.push({
          type: "book", id: b.id, title: b.title, cover: b.cover,
          lesson: l.title || "", blurb: s.blurb || (l.summary || "").slice(0, 110) + "\u2026",
          href: lessonLink(b, idx)
        });
      });
      (topic.graves || []).forEach(function (s) {
        var f = graveIndex()[s.id];
        if (!f) return;
        sources.push({
          type: "grave", id: f.id, title: f.name,
          blurb: s.blurb || (f.lesson || "").slice(0, 110) + "\u2026",
          href: graveLink(f)
        });
      });
    } else {
      lessons.forEach(function (r) {
        sources.push({
          type: "book", id: r.book.id, title: r.book.title, cover: r.book.cover,
          lesson: r.lesson.title,
          blurb: (r.lesson.summary || "").slice(0, 110) + "\u2026",
          href: lessonLink(r.book, r.idx)
        });
      });
      gRes.forEach(function (r) {
        sources.push({
          type: "grave", id: r.f.id, title: r.f.name,
          blurb: (r.f.lesson || r.f.mistake || "").slice(0, 110) + "\u2026",
          href: graveLink(r.f)
        });
      });
    }

    var answer;
    if (topic) answer = topic.answer;
    else if (sources.length) {
      answer = "Closest matches from all " + books().length + " books + " +
        graves().length + " autopsies:";
    } else {
      answer = "The library searched all " + books().length + " books and " +
        graves().length + " autopsies \u2014 no direct match. Try rephrasing, " +
        "or tap a suggestion below.";
    }

    return {
      kind: topic ? "topic" : (sources.length ? "matches" : "empty"),
      question: q, topic: topic, answer: answer,
      lessons: lessons, graves: gRes, sources: sources
    };
  }

  /* ---------- question library (browsable, categorised) ---------- */
  var CATS = [
    { id: "money",     label: "Money",      emoji: "\uD83D\uDCB0",
      kw: ["money","salary","save","saving","invest","rich","debt","paise","budget","spend","income","wealth","price","cost","broke","afford","loan","fund"] },
    { id: "focus",     label: "Focus",      emoji: "\u26A1",
      kw: ["procrastinat","focus","distract","habit","productiv","time","routine","discipline","lazy","morning","deep work","attention","goal","plan"] },
    { id: "mind",      label: "Mind",       emoji: "\uD83E\uDDE0",
      kw: ["anxiety","anxious","stress","fear","confidence","overthink","angry","anger","sad","depress","happy","calm","mental","emotion","doubt","worry","regret","lonely","heal","mindful","peace"] },
    { id: "people",    label: "People",     emoji: "\u2764\uFE0F",
      kw: ["friend","relationship","love","people","talk","conversation","social","charisma","persuade","negotiat","argue","trust","family","parent","partner","network","influence","respect"] },
    { id: "work",      label: "Work",       emoji: "\uD83D\uDCBC",
      kw: ["career","job","boss","interview","work","promotion","business","startup","company","team","lead","manage","hire","sell","market","client","product","freelanc"] },
    { id: "growth",    label: "Growth",     emoji: "\uD83C\uDF31",
      kw: ["learn","read","study","skill","grow","improve","better","change","start","success","fail","mistake","purpose","meaning","life","decision","think","creativ","write"] }
  ];

  function categorise(topic) {
    var hay = ((topic.q || "") + " " + (topic.keywords || []).join(" ")).toLowerCase();
    var best = null, bestScore = 0;
    CATS.forEach(function (c) {
      var score = 0;
      c.kw.forEach(function (k) { if (hay.indexOf(k) !== -1) score++; });
      if (score > bestScore) { bestScore = score; best = c; }
    });
    return best || CATS[CATS.length - 1];
  }

  var _lib = null;
  function library() {
    if (_lib) return _lib;
    var data = window.TSB_ASK_DATA || [];
    var groups = {};
    CATS.forEach(function (c) { groups[c.id] = { id: c.id, label: c.label, emoji: c.emoji, items: [] }; });
    data.forEach(function (t) {
      var c = categorise(t);
      groups[c.id].items.push({ id: t.id, q: t.q, books: (t.books || []).length });
    });
    _lib = CATS.map(function (c) { return groups[c.id]; })
               .filter(function (g) { return g.items.length; });
    return _lib;
  }

  function searchLibrary(q) {
    var f = String(q || "").toLowerCase().trim();
    var data = window.TSB_ASK_DATA || [];
    if (!f) return null;
    return data.filter(function (t) {
      return (t.q + " " + (t.keywords || []).join(" ")).toLowerCase().indexOf(f) !== -1;
    }).map(function (t) { return { id: t.id, q: t.q, books: (t.books || []).length }; });
  }

  /* ---------- suggestion chips ---------- */
  function suggestions(n) {
    var data = window.TSB_ASK_DATA || [];
    if (!data.length) return [];
    var day = Math.floor(Date.now() / 864e5);
    var out = [], seen = {};
    for (var i = 0; i < data.length && out.length < (n || 6); i++) {
      var pick = data[(day * 7 + i * 13) % data.length];
      if (pick && pick.q && !seen[pick.q]) { seen[pick.q] = 1; out.push(pick.q); }
    }
    return out;
  }

  function followUps(q, n) {
    var data = window.TSB_ASK_DATA || [];
    var cur = findTopic(q);
    var ws = words(q);
    var scored = data
      .filter(function (t) { return !cur || t.id !== cur.id; })
      .map(function (t) {
        var s = 0;
        (t.keywords || []).forEach(function (kw) {
          ws.forEach(function (w) { if (String(kw).toLowerCase().indexOf(w) !== -1) s++; });
        });
        return { q: t.q, s: s };
      })
      .sort(function (a, b) { return b.s - a.s; });
    var out = scored.filter(function (x) { return x.s > 0; }).slice(0, n || 3).map(function (x) { return x.q; });
    for (var i = 0; out.length < (n || 3) && i < scored.length; i++) {
      if (out.indexOf(scored[i].q) === -1) out.push(scored[i].q);
    }
    return out;
  }

  window.TSB_ASK_CORE = {
    norm: norm, words: words,
    findTopic: findTopic, searchLessons: searchLessons, searchGraves: searchGraves,
    resolve: resolve, suggestions: suggestions, followUps: followUps,
    library: library, searchLibrary: searchLibrary, CATS: CATS,
    lessonLink: lessonLink, graveLink: graveLink,
    bookIndex: bookIndex, graveIndex: graveIndex
  };
})();
