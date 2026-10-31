/* ============================================================
   THESMALLBOOK, ASK THE LIBRARY (floating widget v3)
   Bottom-right chat on EVERY page. Answers come from the library, not a server.

   v3:
   - Replies in the SAME language as the site (Google engine:
     Hinglish/Gujlish local, others via gtx endpoint, cached)
   - Book pages: 💀 related-failure chips instead of "About this book"
   - FAB moves to bottom-left on book pages (no clash with lesson nav)
   - Library (48+ questions) fully translated per selected language
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_ASK) return;
  window.TSB_ASK = { open: open, close: close };

  var BOOK_MAP = null;
  function bookIndex() {
    if (BOOK_MAP) return BOOK_MAP;
    BOOK_MAP = {};
    (window.BOOKS || []).forEach(function (b) { BOOK_MAP[b.id] = b; });
    return BOOK_MAP;
  }
  var GRAVE_MAP = null;
  function graveIndex() {
    if (GRAVE_MAP) return GRAVE_MAP;
    var m = {};
    (window.FAILURES || []).forEach(function (f) { m[f.id] = f; });
    if ((window.FAILURES || []).length) GRAVE_MAP = m;   /* v336: cache only once the list has arrived */
    return m;
  }

  /* ============ LANGUAGE ENGINE ============ */
  var _lang = null;
  function getLang() {
    if (_lang) return _lang;
    try { _lang = JSON.parse(localStorage.getItem("tsb_lang")) || "en"; } catch (e) { _lang = "en"; }
    return _lang;
  }
  var trCache = {};
  function isSpecial(l) { return l === "hi-Latn" || l === "gu-Latn"; }
  function localTr(text, l) {
    try {
      if (l === "hi-Latn" && window.TSB_LANG && TSB_LANG.toHinglish) return TSB_LANG.toHinglish(text);
      if (l === "gu-Latn" && window.TSB_LANG && TSB_LANG.toGujlish) return TSB_LANG.toGujlish(text);
    } catch (e) {}
    return text;
  }
  /* translate an array of strings in ONE batched request */
  function trBatch(strings, lang) {
    strings = (strings || []).map(function (s) { return String(s == null ? "" : s); });
    if (!strings.length) return Promise.resolve(strings);
    if (lang === "en") return Promise.resolve(strings);
    if (isSpecial(lang)) {
      try {
        return Promise.resolve(strings.map(function (s) { return localTr(s, lang); }));
      } catch (e) { return Promise.resolve(strings); }
    }
    var key = lang + "\u0001" + strings.join("\u0001");
    if (trCache[key]) return trCache[key];
    var p = new Promise(function (resolve) {
      try {
        var q = strings.join("\n");
        var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
          encodeURIComponent(lang) + "&dt=t&q=" + encodeURIComponent(q);
        fetch(url).then(function (r) { return r.json(); }).then(function (j) {
          var segs = (j && j[0]) || [];
          var out = [];
          var cur = "";
          segs.forEach(function (seg) {
            cur += seg[0] || "";
            if (cur.indexOf("\n") !== -1) {
              var parts = cur.split("\n");
              out.push(parts[0]);
              cur = parts.slice(1).join("\n");
            }
          });
          if (cur !== "" || out.length === 0) out.push(cur);
          while (out.length < strings.length) out.push("");
          resolve(out);
        }).catch(function () { resolve(strings); });
      } catch (e) { resolve(strings); }
    });
    trCache[key] = p;
    return p;
  }
  function tr1(text, lang) {
    return trBatch([text], lang).then(function (a) { return a[0]; });
  }

  /* ============ utils ============ */
  var STOP = new Set(["how","what","why","when","where","which","who","the","a","an","and","or","of","to","do","does","is","are","am","i","me","my","you","your","it","its","for","with","on","in","at","from","can","could","should","will","would","just","get","got","some","any","more","much","very","really","about","into","up","out","all","so","if","then","than","too","not","no","yes","be","been","being","have","has","had","there","their","this","that","these","those","was","were","kaise","kya","kyu","hai","hain","karu","karun","kare","karna","mein","ki","ko","se","ke","aur","bhi","apna","mera","please","tell","give"]);
  function words(q) {
    return String(q).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function (w) { return w.length > 1 && !STOP.has(w); });
  }
  function norm(q) {
    return String(q).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }
  /* v292 house rule: no em dashes anywhere in the app. Ask pulls lines from
     600 books and 400 autopsies, older shelves included, so the escape gate
     also flattens every dash to a plain hyphen. Nothing rendered in the panel
     (or saved to history) can carry one, whatever the source file says. */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/ ?[\u2014\u2013] ?/g, " - ")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ============ matching ============ */
  function findTopic(q) {
    var n = norm(q);
    var data = window.TSB_ASK_DATA || [];
    var best = null, bestScore = 0, bestHits = 0;
    data.forEach(function (t) {
      var score = 0, hits = 0;
      (t.keywords || []).forEach(function (kw) {
        var k = kw.toLowerCase();
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
    (window.BOOKS || []).forEach(function (b) {
      b.lessons.forEach(function (l, i) {
        var title = l.title.toLowerCase();
        var body = ((l.summary || "") + " " + (l.action || "")).toLowerCase();
        var score = 0;
        ws.forEach(function (w) { if (title.indexOf(w) !== -1) score += 3; if (body.indexOf(w) !== -1) score += 1; });
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
    (window.FAILURES || []).forEach(function (f) {
      var hay = ((f.name || "") + " " + (f.title || "") + " " + (f.story || "") + " " + (f.lesson || "")).toLowerCase();
      var score = 0;
      ws.forEach(function (w) { if (hay.indexOf(w) !== -1) score += 1; });
      if (score > 0) out.push({ f: f, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, limit || 2);
  }
  function lessonLink(book, idx) { return "book.html?id=" + encodeURIComponent(book.id) + "#lesson-" + idx; }
  function graveLink(f) { return "graveyard.html#grave=" + encodeURIComponent(f.id); } /* v336: the new case view */

  /* ============ answer builders ============ */
  /* the cover the book actually declares, it is not always a .jpg (7 books
     are .webp or .png), and a hardcoded path showed a broken image on those */
  function coverOf(b) {
    if (b && b.cover) return b.cover;
    return "assets/covers/" + encodeURIComponent(b.id) + ".jpg";
  }
  function srcCard(bid, frag, blurb) {
    var b = bookIndex()[bid];
    if (!b) return "";
    var idx = 0;
    if (frag) {
      var want = String(frag).toLowerCase();
      for (var i = 0; i < b.lessons.length; i++) {
        if (String(b.lessons[i].title || "").toLowerCase().indexOf(want) !== -1) { idx = i; break; }
      }
    }
    var l = b.lessons[idx] || b.lessons[0] || { title: "", summary: "" };
    var hue = ["aq-b--y", "aq-b--p", "aq-b--g", "aq-b--b", "aq-b--v"][idx % 5];
    var rt = b.readTime ? String(b.readTime).replace(/\s*read$/i, "").trim() : "";
    var mins = rt ? (/min/i.test(rt) ? rt : rt + " min") : "";
    return '<a class="aq-src aq-src--img ' + hue + '" href="' + lessonLink(b, idx) + '">' +
      '<img class="aq-src__img" src="' + esc(coverOf(b)) + '" alt="' + esc(b.title) + ' cover" loading="lazy">' +
      '<span class="aq-src__book">' + esc(b.title) + '</span>' +
      '<span class="aq-src__lesson">' + esc(l.title) + '</span>' +
      '<span class="aq-src__blurb">' + esc(blurb || String(l.summary || "").slice(0, 100) + "…") + '</span>' +
      '<span class="aq-src__meta">' +
        (b.category ? '<span class="aq-src__tag">' + esc(b.category) + '</span>' : "") +
        (mins ? '<span class="aq-src__time">⏱ ' + esc(mins) + '</span>' : "") +
      '</span>' +
      '<span class="aq-src__go">READ →</span></a>';
  }
  function graveCard(fid, blurb) {
    var f = graveIndex()[fid];
    if (!f) return "";
    return '<a class="aq-src aq-src--grave" href="' + graveLink(f) + '">' +
      '<span class="aq-src__book">💀 ' + esc(f.name) + '</span>' +
      '<span class="aq-src__blurb">' + esc(blurb || f.lesson.slice(0, 100) + "…") + '</span>' +
      '<span class="aq-src__go">AUTOPSY →</span></a>';
  }

  /* the answer, as a designed block: the headline thought, the reasoning,
     then the sources as real cards with covers you can actually see */
  function answerBlock(tag, text, qT) {
    return '<div class="aq-ans">' +
        (qT ? '<div class="aq-ans__q">' + esc(qT) + '</div>' : "") +
        '<div class="aq-ans__body">' +
          '<span class="aq-ans__tag">' + esc(tag) + '</span>' +
          '<p>' + esc(text) + '</p>' +
        '</div>' +
      '</div>';
  }
  function sourceHead(n, label) {
    return '<div class="aq-head2"><span>' + esc(label) + '</span><i>' + n + '</i></div>';
  }
  /* v346 · ONE ROW, ONE MOVE.
     Two stacked rows under every answer ("try this next" + "keep in mind")
     plus a receipt line made a simple answer feel like a form. One row does
     the same job: the single next thing to do. */
  function nextMove(action) {
    var a = String(action || "Open the closest lesson and choose one small action you can test today.");
    return '<div class="aq-move aq-move--one"><div><b>TRY THIS NEXT</b><span>' + esc(a) + '</span></div></div>';
  }
  function topicHtml(topic, qT, ansT, blurbsT, gBlurbsT) {
    var books = (topic.books || []).map(function (s, i) {
      return srcCard(s.id, s.lesson, blurbsT[i] || s.blurb);
    }).join("");
    var graves = (topic.graves || []).map(function (s, i) {
      return graveCard(s.id, gBlurbsT[i] || s.blurb);
    }).join("");
    /* v317: the receipt - what the answer was built from, said out loud.
       This is the thing AI chat cannot say, so we say it every time. */
    var first = (topic.books && topic.books[0] && bookIndex()[topic.books[0].id]) || null;
    var firstLesson = first && first.lessons ? first.lessons[0] : null;
    return answerBlock(t("THE ANSWER"), ansT, "\u201C" + qT + "\u201D") + nextMove(firstLesson && firstLesson.action) +
      (books ? sourceHead((topic.books || []).length, t("FROM THE LIBRARY")) + '<div class="aq-srcs">' + books + "</div>" : "") +
      (graves ? sourceHead((topic.graves || []).length, t("FROM THE GRAVEYARD")) + '<div class="aq-srcs">' + graves + "</div>" : "") +
      '<div class="aq-foot">✦ ' + esc(t("tap a source to read the real lesson")) + " ✦</div>";
  }

  function fallbackHtml(qT, headT, lRes, gRes, blurbsT, gBlurbsT) {
    var hits = lRes.map(function (r, i) {
      return srcCard(r.book.id, r.lesson.title, blurbsT[i] || (r.lesson.summary || "").slice(0, 110) + "…");
    }).join("");
    var gHits = gRes.map(function (r, i) {
      return graveCard(r.f.id, gBlurbsT[i] || (r.f.lesson || r.f.mistake || "").slice(0, 110) + "…");
    }).join("");
    if (!hits && !gHits) {
      return answerBlock(t("CLOSEST MATCHES"), headT, "\u201C" + qT + "\u201D") +
        '<div class="aq-none">📖 ' + esc(t("no book lesson matched")) + "</div>";
    }
    var action = lRes[0] && lRes[0].lesson && lRes[0].lesson.action;
    return answerBlock(t("CLOSEST MATCHES"), headT, "\u201C" + qT + "\u201D") + nextMove(action) +
      (hits ? sourceHead(lRes.length, t("FROM THE LIBRARY")) + hits : "<div class='aq-none'>📖 " + esc(t("no book lesson matched")) + "</div>") +
      (gHits ? sourceHead(gRes.length, t("FROM THE GRAVEYARD")) + gHits : "");
  }

  /* related failures for a book: its antidote graves + same-category famous ones */
  function relatedGraves(book) {
    var graves = (window.FAILURES || []).filter(function (f) { return f.book === book.id; });
    var catMap = { "Self-Improvement": ["BUSINESS", "EGO"], "Business & Startups": ["STARTUP", "BUSINESS"], "Money & Finance": ["MONEY", "FRAUD"], "Psychology & People": ["EGO", "FAME"], "Productivity": ["BUSINESS"], "Creativity": ["STARTUP", "BUSINESS"], "Power & Strategy": ["EGO", "TRUST"] };
    var want = catMap[book.category] || ["BUSINESS"];
    var extra = (window.FAILURES || []).filter(function (f) {
      return f.book !== book.id && want.indexOf(f.category) !== -1 && graves.length < 5;
    });
    return graves.concat(extra).slice(0, 5);
  }

  function relatedFailuresHtml(book, namesT, lossesT) {
    var gs = relatedGraves(book);
    var cards = gs.map(function (f, i) {
      return '<a class="aq-src aq-src--grave" href="' + graveLink(f) + '">' +
        '<span class="aq-src__book">💀 ' + esc(namesT[i] || f.name) + "</span>" +
        '<span class="aq-src__blurb">' + esc(lossesT[i] || f.loss || (f.lesson || "").slice(0, 90)) + "</span>" +
        '<span class="aq-src__go">' + esc(t("AUTOPSY")) + " →</span></a>";
    }).join("");
    return answerBlock("💀 " + t("THE GRAVEYARD SAYS"), t("Real companies that died the exact way this book warns about."), "") +
      sourceHead(gs.length, t("FAILURES LINKED TO THIS BOOK")) +
      '<div class="aq-srcs">' + cards + "</div>" +
      '<div class="aq-foot">✦ ' + esc(t("tap an autopsy to read the full story")) + " ✦</div>";
  }

  /* short string translator (headers, chips, labels) */
  var shortMap = {};
  var shortLoaded = false;
  function t(s) {
    if (!shortLoaded && getLang() !== "en") {
      shortLoaded = true;
      var keys = ["ASK","THE ANSWER","CLOSEST MATCHES","FROM THE GRAVEYARD","AUTOPSY","READ","TRY NEXT →","COPIED","COPY ANSWER","Ask anything…","Clear chat","Close","Browse all questions","THE PROBLEM LIBRARY","questions · tap ASK · 📋 to copy","Filter questions… (e.g. money, habits, fear)","No questions match","ask it yourself in the chat","tap a source to read the real lesson","tap an autopsy to read the full story","FAILURES LINKED TO THIS BOOK","THE GRAVEYARD SAYS","Real companies that died the exact way this book warns about.","no book lesson matched","Something went wrong, try again!","ask it yourself in the chat","Related failures","Why do companies die?","ALL QUESTIONS","Scanning","Reading","Checking","Compiling your answer","On this book?","related failures are linked to this book, tap below.","Ask anything.","How do I stop procrastinating?","questions in","books answer", "Even the Graveyard warns you", "autopsies"];
      trBatch(keys, getLang()).then(function (arr) {
        keys.forEach(function (k, i) { shortMap[k] = arr[i]; });
      });
    }
    return shortMap[s] || s;
  }

  /* ============ widget DOM ============ */
  var root = null, panel = null, msgs = null, input = null;
  var open_ = false;
  /* v344: the Ask panel used to count whatever autopsies the page happened
     to load. Index loaded none of them and Graveyard loaded both, so the same
     panel said 118 on one page and 518 on another. Now the panel completes
     the graveyard itself, in the right order (the main file overwrites, the
     extra file appends), once, and rewrites its own numbers when it lands. */
  var _gMain = 0, _gExtra = 0;
  function hasMainGraves() {
    return (window.FAILURES || []).some(function (f) { return String(f.id || "").indexOf("extra-") !== 0; });
  }
  function hasExtraGraves() {
    return (window.FAILURES || []).some(function (f) { return String(f.id || "").indexOf("extra-") === 0; });
  }
  function refreshGraves() {
    try { headStats(); } catch (e) {}
    try {
      var el = root && root.querySelector("#aqGraves");
      if (el) el.textContent = String((window.FAILURES || []).length);
    } catch (e2) {}
  }
  function gravesComplete(cb) {
    var V = (window.TSB_LESSONS && window.TSB_LESSONS.version) || "344";
    var load = function (file, next) {
      var s = document.createElement("script");
      s.src = file + "?v=" + V;
      s.async = true;
      s.onload = s.onerror = next;
      (document.head || document.documentElement).appendChild(s);
    };
    var done = function () { refreshGraves(); if (cb) cb(); };
    if (hasMainGraves() && hasExtraGraves()) { done(); return; }
    if (_gExtra) { done(); return; }
    _gExtra = 1;
    var wantExtra = function () {
      if (hasExtraGraves() || _gMain === 2) { done(); return; }
      _gMain = 2;
      load("js/failures-extra.js", done);
    };
    if (hasMainGraves()) { wantExtra(); return; }
    _gMain = 1;
    load("js/failures.js", function () { _gMain = 0; wantExtra(); });
  }

  function headStats() {
    var el = root && root.querySelector("#tsb-headstats");
    if (!el) return;
    var nb = (window.BOOKS || []).length;
    var nl = (window.BOOKS || []).reduce(function (a, b) { return a + (b.lessons ? b.lessons.length : 0); }, 0);
    var ng = (window.FAILURES || []).length;
    el.textContent = nb + " books · " + nl + " lessons · " + ng + " autopsies";
    /* ⏳ v300 free-quota meter lives in the same line, wall-on only */
    try {
      var meter = window.TSB_ASK_QUOTA && TSB_ASK_QUOTA.meterText && TSB_ASK_QUOTA.meterText();
      if (meter) el.textContent += " · " + meter;
    } catch (e) {}
  }
  var STORE_KEY = "tsb_ask_hist";
  function loadHist() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch (e) { return []; } }
  function saveHist(h) { try { localStorage.setItem(STORE_KEY, JSON.stringify(h.slice(-30))); } catch (e) {} }

  /* v4: chat.html hosts the FULL chat interface (no pop-out there) */
  var PAGE_MODE = /chat\.html$/.test(location.pathname);

  function build() {
    if (root) return;
    root = document.createElement("div");
    root.id = "tsb-ask-root";
    if (PAGE_MODE) root.className = "tsb-ask--page";
    else if (/book\.html/.test(location.pathname)) root.className = "tsb-ask--book";
    /* v4: the floating ASK button is GONE, the bottom action bar's
       Chat tab (js/bar.js) owns this panel now, same everything. */
    root.innerHTML =
      '<div id="tsb-panel" class="aq-panel" role="dialog" aria-label="Ask TheSmallBook">' +
        '<div class="aq-head">' +
          '<div class="aq-head__c"><div class="aq-head__t">Ask the library</div>' +
          '<div class="aq-head__s" id="tsb-headstats"></div></div>' +
          '<div class="aq-head__btns">' +
            '<button class="aq-libbtn" id="tsb-libbtn" title="' + t("Browse all questions") + '" aria-label="' + t("Browse all questions") + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="M16.5 4.6l3.8-1 3.2 15.5-3.8 1z"/></svg></button>' +
            '<button class="aq-clear" title="' + t("Clear chat") + '" aria-label="' + t("Clear chat") + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>' +
            '<button class="aq-close" title="' + t("Close") + '" aria-label="' + t("Close") + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
          "</div>" +
        "</div>" +
        '<div class="aq-chips" id="tsb-chips"></div>' +
        '<div class="aq-msgs" id="tsb-msgs"></div>' +
        '<div class="aq-inputrow">' +
          '<button id="tsb-plus" class="aq-plus" type="button" aria-label="' + t("Compare two books") + '" title="' + t("Compare two books") + '">+</button>' +
          '<input id="tsb-input" class="aq-input" type="text" maxlength="140" placeholder="' + t("Ask anything…") + '" autocomplete="off">' +
          '<button id="tsb-send" class="aq-send">' + t("ASK") + "</button>" +
        "</div>" +
      "</div>" +
      '<div id="tsb-lib" class="aq-lib" role="dialog" aria-label="Question library">' +
        '<div class="aq-lib__head">' +
          '<span class="aq-lib__t">📚 ' + t("THE PROBLEM LIBRARY") + "</span>" +
          '<span class="aq-lib__s">' + (window.TSB_ASK_DATA || []).length + " " + t("questions · tap ASK · 📋 to copy") + "</span>" +
          '<button class="aq-lib__close" id="tsb-libclose">✕</button>' +
        "</div>" +
        '<input id="tsb-libsearch" class="aq-lib__search" type="text" placeholder="' + t("Filter questions… (e.g. money, habits, fear)") + '">' +
        '<div class="aq-lib__list" id="tsb-liblist"></div>' +
      "</div>" +
      '<div id="tsb-modes" class="aq-lib aq-lib--modes" role="dialog" aria-label="Ask modes">' +
        '<div class="aq-lib__head">' +
          '<span class="aq-lib__t">🎭 ' + t("ASK MODES") + "</span>" +
          '<span class="aq-lib__s">' + t("7 formats · every answer from the real library") + "</span>" +
          '<button class="aq-lib__close" id="tsb-modesclose">✕</button>' +
        "</div>" +
        '<div class="aq-mdgrid" id="tsb-mdgrid"></div>' +
      "</div>";
    document.body.appendChild(root);
    panel = root.querySelector(".aq-panel");
    msgs = root.querySelector("#tsb-msgs");
    input = root.querySelector("#tsb-input");
    /* translate static bits after short-map loads (non-en) */
    var lang = getLang();
    if (lang !== "en") {
      setTimeout(function () {
        var h = root.querySelector(".aq-head__t");
        var pl = root.querySelector("#tsb-input");
        var snd = root.querySelector("#tsb-send");
        tr1("ASK", lang).then(function (v) { if (snd && !PAGE_MODE) snd.textContent = v; });
        tr1(PAGE_MODE ? "Ask" : "ASK THE LIBRARY", lang).then(function (v) { if (h) h.textContent = v; });
        tr1(PAGE_MODE ? "Ask the library" : "Ask anything…", lang).then(function (v) { if (pl) pl.placeholder = v; });
      }, 250);
    }
    bind();
    headStats();
    if (PAGE_MODE) pageExtras();
    /* ?mode=<key>&arg=<arg>: every mode is an independent destination */
    var mq = null, ma = null;
    try {
      var qsp = new URLSearchParams(location.search);
      mq = qsp.get("mode"); ma = qsp.get("arg");
    } catch (e) {
      mq = (location.search.match(/[?&]mode=([a-z]+)/) || [])[1] || null;
      ma = (location.search.match(/[?&]arg=([^&]+)/) || [])[1] || null;
    }
    if (mq && MODES.some(function (m) { return m.key === mq; })) {
      setTimeout(function () {
        open();
        if (ma) modeGo(mq, ma, mq);
        else { var mdef = MODES.filter(function (m) { return m.key === mq; })[0];
          mdef && mdef.pick ? pickBubble(mq) : modeGo(mq, null, mq); }
      }, 380);
    } else if (!mq && ma) {
      /* v300: chat.html?arg=<question> lands as a plain asked question */
      setTimeout(function () { open(); send(ma); }, 380);
    }
  }

  /* ---- full-page chat mode: back button + library search + auto-open ---- */
  function goBack() {
    if (history.length > 1) history.back();
    else location.href = "index.html";
  }
  function pageExtras() {
    var panel = root.querySelector(".aq-panel");
    var head = root.querySelector(".aq-head");
    if (head) {
      var back = document.createElement("button");
      back.className = "aq-back";
      back.id = "tsb-back";
      back.setAttribute("aria-label", "Back");
      back.innerHTML = FA_IC.back;
      back.addEventListener("click", goBack);
      head.insertBefore(back, head.firstChild);
    }
    /* ---- deterministic full-height column (inline beats any cache) ----
       head / conversation(1fr) / personalised pills / ask-composer,
       composer glued just above the action bar. No dead space, ever. */
    var panel = root.querySelector(".aq-panel");
    if (panel) {
      panel.style.position = "fixed";
      panel.style.top = "0";
      panel.style.left = "0";
      panel.style.right = "0";
      panel.style.bottom = "0";
      panel.style.width = "100%";
      panel.style.height = "100%";
      panel.style.display = "grid";
      panel.style.gridTemplateRows = "auto minmax(0, 1fr) auto auto";
      var rowOf = { ".aq-head": 1, ".aq-msgs": 2, ".aq-chips": 3, ".aq-inputrow": 4 };
      Object.keys(rowOf).forEach(function (sel) {
        var el = panel.querySelector(sel);
        if (el) el.style.gridRow = String(rowOf[sel]);
      });
      var msgs = panel.querySelector(".aq-msgs");
      if (msgs) { msgs.style.minHeight = "0"; msgs.style.overflowY = "auto"; }
      var inp = panel.querySelector(".aq-inputrow");
      if (inp) inp.style.paddingBottom = "calc(var(--bar-total) + 6px)";
      /* belt & braces: if anything still short-changes the height, pin it */
      requestAnimationFrame(function () {
        try {
          var h = panel.getBoundingClientRect().height;
          if (h < window.innerHeight - 2) panel.style.height = window.innerHeight + "px";
        } catch (e) {}
      });
    }
    /* v330: the Gemini-style home. Greeting, one big ask box, four taps. */
    try { document.body.classList.add("fask"); } catch (e) {}
    faComposer();
    faHero();
    open();
  }

  /* ============ v330 page chat: ChatGPT / Gemini calm ============ */
  var FA_IC = {
    back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    mic: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    up: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>'
  };
  var FA_SUG_SV = {"time": "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 9v4l2.5 2.5M9 2h6\"/></svg>", "habit": "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\"/></svg>", "focus": "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>", "money": "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 17l6-6 4 4 8-8\"/><path d=\"M15 7h6v6\"/></svg>", "brave": "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z\"/></svg>", "phone": "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"6\" y=\"2.5\" width=\"12\" height=\"19\" rx=\"2.5\"/><path d=\"M3 3l18 18\"/></svg>", "spark": "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6\"/></svg>"};
  /* the icon follows the question, never its position */
  function faSugIc(q) {
    q = String(q).toLowerCase();
    var k = /procrastinat|time|late|morning|sleep/.test(q) ? "time" : /habit|routine|disciplin/.test(q) ? "habit" :
      /focus|distract|attention|study/.test(q) ? "focus" : /money|invest|paise|save|rich|salary|wealth/.test(q) ? "money" :
      /confiden|fear|anxi|brave|shy/.test(q) ? "brave" : /phone|scroll|screen|social/.test(q) ? "phone" : "spark";
    return FA_SUG_SV[k];
  }
  function faName() {
    try { var n = JSON.parse(localStorage.getItem("tsb_reader_name") || '""'); n = typeof n === "string" ? n.trim() : ""; return n === "Guest Reader" ? "" : n.split(" ")[0]; } catch (e) { return ""; }
  }
  function faSuggestions() {
    var seen = {}, out = [];
    personalChips().concat(QUICK).forEach(function (c) {
      var q = c.q; if (!q || seen[norm(q)] || out.length >= 4) return;
      seen[norm(q)] = 1; out.push(q);
    });
    return out;
  }
  function faBooks() {
    var bi = bookIndex(), ids = [];
    try { ids = (JSON.parse(localStorage.getItem("tsb_starter_shelf") || "null") || []).map(function (x) { return x && x.id ? x.id : x; }); } catch (e) {}
    ids = ids.concat(["atomic-habits", "psychology-of-money", "deep-work", "ikigai"]).filter(function (id) { return bi[id]; });
    var u = []; ids.forEach(function (id) { if (u.indexOf(id) < 0) u.push(id); });
    return u.slice(0, 3).map(function (id) { return bi[id]; });
  }
  function faHero() {
    var msgsEl = root.querySelector("#tsb-msgs");
    if (!msgsEl || msgsEl.querySelector(".aq-msg--user") || msgsEl.querySelector(".cht-hero")) return;
    var nm = faName();
    var hero = document.createElement("div");
    hero.className = "cht-hero fa-hero";
    hero.innerHTML =
      '<div class="fa-books" aria-hidden="true">' + faBooks().map(function (b, i) {
        return '<span class="fa-bk fa-bk--' + i + '"><img src="' + esc(coverOf(b)) + '" alt=""></span>';
      }).join("") + "</div>" +
      '<h1 class="fa-hi"><span>' + (nm ? "Hello, " + esc(nm) : "Hello") + "</span></h1>" +
      '<p class="fa-sub">' + esc(t("What should the library help with?")) + "</p>" +
      '<div class="fa-sugs">' + faSuggestions().map(function (q, i) {
        return '<button class="fa-sug" data-faq="' + esc(q) + '"><i>' + faSugIc(q) + "</i><span>" + esc(q) + "</span></button>";
      }).join("") + "</div>" +
      '<button class="fa-all" id="faAll">' + esc(t("Browse all")) + " " + (window.TSB_ASK_DATA || []).length + " " + esc(t("questions")) + "</button>";
    msgsEl.insertBefore(hero, msgsEl.firstChild);
    hero.querySelectorAll("[data-faq]").forEach(function (b) {
      b.addEventListener("click", function () { send(b.getAttribute("data-faq")); });
    });
    var all = hero.querySelector("#faAll");
    if (all) all.addEventListener("click", openLib);
    try {
      var mo = new MutationObserver(function () {
        if (msgsEl.querySelector(".aq-msg--user") && hero.parentNode) {
          hero.classList.add("cht-hero--off");
          setTimeout(function () { if (hero.parentNode) hero.parentNode.removeChild(hero); }, 300);
          mo.disconnect();
        }
      });
      mo.observe(msgsEl, { childList: true });
    } catch (e) {}
  }
  function faComposer() {
    var row = root.querySelector(".aq-inputrow");
    var snd = root.querySelector("#tsb-send");
    if (!row || !snd || row.querySelector(".fa-plus")) return;
    var plus = document.createElement("button");
    plus.className = "fa-plus"; plus.type = "button";
    plus.setAttribute("aria-label", "Ways to ask"); plus.title = "Ways to ask";
    plus.innerHTML = FA_IC.plus;
    plus.addEventListener("click", openModes);
    row.insertBefore(plus, row.firstChild);
    var SR = window.TSB_SR || window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      var mic = document.createElement("button");
      mic.className = "fa-mic"; mic.type = "button";
      mic.setAttribute("aria-label", "Speak your question"); mic.title = "Speak";
      mic.innerHTML = FA_IC.mic;
      mic.addEventListener("click", function () {
        try {
          var r = new SR(); r.lang = "en-IN"; r.interimResults = true;
          mic.classList.add("fa-mic--on");
          r.onresult = function (e) { var tx = ""; for (var i = 0; i < e.results.length; i++) tx += e.results[i][0].transcript; input.value = tx; row.classList.toggle("fa-has", !!tx); };
          r.onend = function () { mic.classList.remove("fa-mic--on"); if (input.value.trim()) send(input.value); };
          r.start();
        } catch (e) { mic.classList.remove("fa-mic--on"); }
      });
      row.insertBefore(mic, snd);
    }
    var pill = document.createElement("div");
    pill.className = "fa-pill";
    while (row.firstChild) pill.appendChild(row.firstChild);
    row.appendChild(pill);
    snd.innerHTML = FA_IC.up;
    snd.setAttribute("aria-label", "Ask");
    input.placeholder = "Ask the library";
    var sync = function () { row.classList.toggle("fa-has", !!input.value.trim()); };
    input.addEventListener("input", sync);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") setTimeout(sync, 0); });
    snd.addEventListener("click", function () { setTimeout(sync, 0); });
    var clr = root.querySelector(".aq-clear");
    if (clr) { clr.innerHTML = FA_IC.edit; clr.title = "New chat"; clr.setAttribute("aria-label", "New chat"); }
    var ht = root.querySelector(".aq-head__t");
    if (ht) ht.textContent = "Ask";
    var mt = root.querySelector("#tsb-modes .aq-lib__t");
    if (mt) mt.textContent = "Ways to ask";
    document.addEventListener("click", function (e) {
      var tg = e.target;
      if (!tg || !tg.closest || tg.closest(".aq-lib") || tg.closest(".fa-plus") || tg.closest("#faAll")) return;
      if (root.querySelector("#tsb-modes.aq-lib--open")) closeModes();
      if (root.querySelector("#tsb-lib.aq-lib--open")) closeLib();
    }, true);
    var lt = root.querySelector("#tsb-lib .aq-lib__t");
    if (lt) lt.textContent = "All questions";
    var ls = root.querySelector("#tsb-libsearch");
    if (ls) ls.placeholder = "Search questions";
    root.querySelectorAll(".aq-lib__close").forEach(function (b) { b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'; b.setAttribute("aria-label", "Close"); });
  }

  var QUICK = [
    { label: "⏰ How do I stop procrastinating?", q: "How do I stop procrastinating?" },
    { label: "💰 Paise kaise bachau?", q: "Paise kaise bachau?" },
    { label: "💪 How do I become more confident?", q: "How do I become more confident?" },
    { label: "📈 How should I start investing?", q: "How should I start investing?" },
    { label: "😨 How do I overcome fear?", q: "How do I overcome fear?" },
    { label: "📵 How do I stop scrolling on my phone?", q: "How do I stop scrolling on my phone?" }
  ];

  function contextChips() {
    var chips = [];
    var b = currentBook();
    if (b) {
      chips.push({ label: "💀 " + t("Related failures"), q: "__GRAVES__" });
    }
    if (/graveyard/.test(location.pathname)) chips.push({ label: "💀 " + t("Why do companies die?"), q: "Why do big companies fail?" });
    /* 🎯 suggestions tuned to the reader's onboarding choices */
    var pc = personalChips();
    pc.forEach(function (c) { chips.push(c); });
    QUICK.slice(0, pc.length ? 2 : 4).forEach(function (c) { chips.push(c); });
    return chips;
  }

  /* pick library questions whose books sit on the reader's chosen shelves */
  function personalChips() {
    var out = [];
    try {
      var ints = JSON.parse(localStorage.getItem("tsb_interests") || "null") || [];
      var lead = JSON.parse(localStorage.getItem("tsb_ob_lead") || "null");
      if (lead && ints.indexOf(lead) < 0) ints.unshift(lead);
      if (!ints.length) return out;
      var bi = bookIndex();
      (window.TSB_ASK_DATA || []).forEach(function (d) {
        if (out.length >= 4) return;
        var hit = (d.books || []).some(function (s) {
          var bk = bi[s.id];
          return bk && ints.indexOf(bk.category) >= 0;
        });
        if (hit) out.push({ label: "✨ " + d.q, q: d.q });
      });
    } catch (e) {}
    return out;
  }


  /* ============ 🎭 ASK MODES (v292): 8 editorial formats. Every answer is
     composed live from real book lessons + real Graveyard autopsies. No
     filler, no invented facts: history comes from FAILURES, ideas from BOOKS. ============ */
  /* v344: one mode. The rest were noise; this one earns its tap. */
  var MODES = [
    { key: "compare", label: "⚖️ Compare two books", pick: true }
  ];
  var modePick = null; /* set while the reader is in a pick-mode menu */

  function MDD() { return window.TSB_ASK_MODES || { TOPICS: [], REDFLAGS: [], SCENARIOS: [], MYTHS: [], FIELD: [] }; }
  function firstSent(s, n) {
    var parts = String(s || "").replace(/\s+/g, " ").split(". ");
    var k = Math.min(parts.length, n || 1);
    var out = parts.slice(0, k).join(". ");
    if (out && out.charAt(out.length - 1) !== "." && out.charAt(out.length - 1) !== "!" && out.charAt(out.length - 1) !== "?") out += ".";
    return out;
  }
  function weekNum(salt) { return Math.floor(Date.now() / (7 * 24 * 36e5)) + (salt || 0); }
  /* cut at a word border, never mid-word */
  function ell(s, n) {
    s = String(s || "");
    if (s.length <= n) return s;
    var cut = s.slice(0, n);
    return cut.slice(0, Math.max(cut.lastIndexOf(" "), n - 20)).replace(/[\s,;:]+$/, "") + "\u2026";
  }
  function nextBtn(label, opt, axLabel) {
    return '<button class="aq-chip aq-chip--mini aq-mode-next" data-axopt="' + esc(opt) + '"' +
      (axLabel ? ' data-axlabel="' + esc(axLabel) + '"' : "") + ">" + label + "</button>";
  }
  /* best lesson of each book for a query, books ranked */
  function bestPerBook(q, nBooks) {
    var ws = words(q);
    if (!ws.length) return [];
    var byBook = {};
    (window.BOOKS || []).forEach(function (b) {
      b.lessons.forEach(function (l, i) {
        var title = String(l.title || "").toLowerCase();
        var body = ((l.summary || "") + " " + (l.action || "")).toLowerCase();
        var score = 0;
        ws.forEach(function (w) { if (title.indexOf(w) !== -1) score += 3; if (body.indexOf(w) !== -1) score += 1; });
        if (score > 0 && (!byBook[b.id] || score > byBook[b.id].score)) byBook[b.id] = { book: b, lesson: l, idx: i, score: score };
      });
    });
    return Object.keys(byBook).map(function (k) { return byBook[k]; })
      .sort(function (a, b2) { return b2.score - a.score; })
      .slice(0, nBooks || 4);
  }
  function topicFromText(q) {
    var nq = " " + norm(q) + " ";
    var best = null, bs = 0;
    MDD().TOPICS.forEach(function (tp) {
      var s = 0;
      tp.kws.forEach(function (k) { if (nq.indexOf(k) >= 0) s += (k.length > 4 ? 2 : 1); });
      if (s > bs) { bs = s; best = tp; }
    });
    return bs ? best : null;
  }
  function scenarioFromText(q) {
    var nq = norm(q);
    var best = null, bs = 0;
    MDD().SCENARIOS.forEach(function (s) {
      var score = 0;
      norm(s.label).split(" ").forEach(function (w) { if (w.length > 3 && nq.indexOf(w) >= 0) score += 2; });
      s.books.forEach(function (bid) {
        var b = bookIndex()[bid];
        if (b && nq.indexOf(norm(b.title)) >= 0) score += 4;
      });
      if (score > bs) { bs = score; best = s; }
    });
    return bs >= 2 ? best : null;
  }
  function bookFromText(q) {
    var nq = norm(q);
    var best = null, bs = 0;
    (window.BOOKS || []).forEach(function (b) {
      var t2 = norm(b.title || "");
      var score = 0;
      if (t2 && nq.indexOf(t2) >= 0) score = t2.length;
      else t2.split(" ").forEach(function (w) { if (w.length > 4 && nq.indexOf(w) >= 0) score = Math.max(score, w.length); });
      if (score > bs) { bs = score; best = b; }
    });
    return bs >= 5 ? best : null;
  }
  function bookBlurb(bid) {
    var b = bookIndex()[bid];
    if (!b || !b.lessons || !b.lessons[0]) return "";
    return ell(firstSent(b.lessons[0].summary, 1), 120);
  }

  /* ---- mode 1+2: compare / one idea five books ---- */
  function compareHtml(label, hits, five) {
    var cards = hits.map(function (r) {
      var sum = firstSent(r.lesson.summary, 1);
      var act = firstSent(r.lesson.action, 1);
      var blurb = act && act !== sum ? sum + " → " + act : sum;
      return srcCard(r.book.id, r.lesson.title, ell(blurb, 150));
    }).join("");
    var intro = five
      ? "One idea, " + hits.length + " books, " + hits.length + " different answers. No single book owns the truth; that is the whole point of a library."
      : "Same question, " + hits.length + " books, side by side. Read the answers next to each other, then steal what fits your life. That comparison is the part nobody does, and it is where the value hides.";
    return answerBlock(five ? "5️⃣ ONE IDEA, FIVE BOOKS" : "⚖️ COMPARE IDEAS ACROSS BOOKS", intro, "\u201C" + label + "\u201D") +
      sourceHead(hits.length, t("FROM THE LIBRARY")) + '<div class="aq-srcs">' + cards + "</div>" +
      '<div class="aq-foot">✦ ' + esc(t("same question, different authors, your call")) + " ✦</div>";
  }

  /* ============================================================
     ⚖️ COMPARE TWO BOOKS (v344)

     The modes are gone. What is left is the one worth doing properly:
     you name two books, and the answer reads like a person who has read
     both. What each one is actually about, where they agree, where they
     split, which to read first, and one thing to try from each this week.
     Every sentence is built from the book's own one-liner, first lesson
     and action plan, so nothing here is invented and nothing is scored.
     ============================================================ */
  /* shared ground is described in human words, never in raw keywords:
     a small map of the themes this library actually argues about, each
     with the words that signal it. A theme counts only when BOTH books
     keep returning to it, twice or more. */
  var THEMES = [
    { k: "habits",        w: ["habit", "routine", "streak", "cue", "trigger"] },
    { k: "attention",     w: ["focus", "attention", "distraction", "concentration", "deep work"] },
    { k: "money",         w: ["money", "wealth", "invest", "saving", "compound interest", "asset"] },
    { k: "time", g: 1,          w: ["time", "schedule", "deadline", "calendar"] },
    { k: "discipline",    w: ["discipline", "willpower", "consistency", "self-control"] },
    { k: "people", g: 1,        w: ["people", "team", "relationship", "trust", "respect"] },
    { k: "conversation", g: 1,  w: ["talk", "conversation", "listen", "feedback", "persuade"] },
    { k: "risk",          w: ["risk", "downside", "uncertainty", "luck", "loss"] },
    { k: "thinking",      w: ["think", "decision", "bias", "judgment", "mental model"] },
    { k: "purpose",       w: ["purpose", "meaning", "values", "identity"] },
    { k: "fear",          w: ["fear", "anxiety", "worry", "courage"] },
    { k: "systems",       w: ["system", "process", "environment", "design"] },
    { k: "learning",      w: ["learn", "practice", "skill", "repetition"] },
    { k: "change", g: 1,        w: ["change", "improve", "transform", "progress"] },
    { k: "work", g: 1,          w: ["work", "career", "job", "productivity", "output"] }
  ];
  function textOf(b) {
    var out = String(b.title || "") + " " + String(b.oneLiner || "") + " " + String(b.bigIdea || "") + " " + String(b.tagline || "") + " ";
    (b.lessons || []).forEach(function (l) { out += String(l.title || "") + " " + String(l.summary || "") + " "; });
    return out.toLowerCase();
  }
  function themeScore(th, text) {
    var n = 0;
    for (var i = 0; i < th.w.length; i++) {
      var w = th.w[i], at = 0;
      while ((at = text.indexOf(w, at)) !== -1) { n++; at += w.length; }
    }
    return n;
  }
  /* how a theme is said out loud */
  var THEME_SAY = {
    habits: "habits", attention: "attention", money: "money", time: "how time gets spent",
    discipline: "keeping the promise", people: "how people respond to you", conversation: "the conversation",
    risk: "the downside", thinking: "how decisions get made", purpose: "why any of it matters",
    fear: "fear", systems: "systems", learning: "how skill is built", change: "how change actually happens",
    work: "how the work actually gets done"
  };
  function sharedThemes(A, B) {
    var ta = textOf(A), tb = textOf(B), hits = [];
    THEMES.forEach(function (th) {
      var ha = themeScore(th, ta), hb = themeScore(th, tb);
      if (ha >= 3 && hb >= 3) hits.push({ k: th.k, s: Math.min(ha, hb) - (th.g ? 1 : 0) });
    });
    hits.sort(function (x, y) { return y.s - x.s; });
    return hits.filter(function (h) { return h.s > 1; }).slice(0, 2).map(function (h) { return THEME_SAY[h.k] || h.k; });
  }
  function cleanSentence(s) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    if (!/[.!?]$/.test(s)) s += ".";
    return s;
  }
  function actionOf(b) {
    try {
      if (b.actionPlan && b.actionPlan.length) return cleanSentence(b.actionPlan[0]);
      var l = (b.lessons || [])[0];
      return cleanSentence((l && (l.action || l.summary)) || "");
    } catch (e) { return ""; }
  }
  function minsOf(b) { var m = parseInt(String(b.readTime || "").replace(/[^\d]/g, ""), 10); return isNaN(m) ? 8 : m; }
  function aboutOf(b) {
    var s = b.oneLiner || b.bigIdea || b.tagline || "";
    return cleanSentence(s);
  }

  /* the whole answer: six short sections, in the order a friend would say them */
  function compareTwo(aId, bId) {
    var A = bookIndex()[aId], B = bookIndex()[bId];
    if (!A || !B || A.id === B.id) return "";
    var nA = A.title, nB = B.title;
    var aboutA = aboutOf(A), aboutB = aboutOf(B);
    var lA = (A.lessons || [])[0] || {}, lB = (B.lessons || [])[0] || {};
    var shared = sharedThemes(A, B);
    var sameShelf = String(A.category || "").toLowerCase() === String(B.category || "").toLowerCase();
    var m1 = minsOf(A), m2 = minsOf(B);
    var first = m1 <= m2 ? A : B, second = m1 <= m2 ? B : A;
    var mFirst = Math.min(m1, m2), mSecond = Math.max(m1, m2);

    var s1 = "<b>" + esc(nA) + ":</b> " + esc(aboutA) + " <b>" + esc(nB) + ":</b> " + esc(aboutB);

    var s2;
    if (shared.length) {
      s2 = "Both keep circling " + (shared[1] ? "<b>" + esc(shared[0]) + "</b> and <b>" + esc(shared[1]) + "</b>" : "<b>" + esc(shared[0]) + "</b>") +
        ". You will meet the same idea in both books, wearing different clothes. That is a good sign: it means the idea survives two authors.";
    } else {
      s2 = "Almost no shared ground, and that is useful to know before you start. " +
        esc(nA) + " opens on \u201C" + esc(String(lA.title || "")) + "\u201D, " + esc(nB) + " opens on \u201C" + esc(String(lB.title || "")) + "\u201D. " +
        "Read them as two separate repairs, not two opinions on one question.";
    }

    var s3;
    if (sameShelf) {
      s3 = "They sit on the same shelf, <b>" + esc(String(A.category || "")) + "</b>, so the argument is not about the subject, it is about method. " +
        esc(nA) + " opens with \u201C" + esc(String(lA.title || "")) + "\u201D. " + esc(nB) + " opens with \u201C" + esc(String(lB.title || "")) + "\u201D.";
    } else {
      s3 = esc(nA) + " comes from the <b>" + esc(String(A.category || "library")) + "</b> shelf and opens with \u201C" + esc(String(lA.title || "")) + "\u201D. " +
        esc(nB) + " comes from <b>" + esc(String(B.category || "the library")) + "</b> and opens with \u201C" + esc(String(lB.title || "")) + "\u201D. " +
        "Different rooms, different first question, which is exactly why reading both is worth it.";
    }

    var s4 = "Start with <b>" + esc(first.title) + "</b>. It is the shorter read, " + mFirst + " minutes here against " + mSecond +
      ". Then read " + esc(second.title) + " while the first is still fresh, because " + (sameShelf ? "the two argue with each other" : "the second one will rewire how you heard the first") + ".";

    var actA = actionOf(A), actB = actionOf(B);
    var s5 = (actA ? "<b>From " + esc(nA) + ":</b> " + esc(actA) + " " : "") +
      (actB ? "<b>From " + esc(nB) + ":</b> " + esc(actB) : "") +
      " Do not start both on the same day. Three days on the first, then bring in the second.";

    var html =
      '<div class="cmp-ans">' +
        '<p class="cmp-lead"><b>' + esc(nA) + "</b> by " + esc(A.author || "an author") + ", and <b>" + esc(nB) + "</b> by " + esc(B.author || "an author") + ". Two books, one honest comparison, no scores.</p>" +
        '<div class="cmp-sec"><span>WHAT EACH ONE IS</span><p>' + s1 + "</p></div>" +
        '<div class="cmp-sec"><span>WHERE THEY AGREE</span><p>' + s2 + "</p></div>" +
        '<div class="cmp-sec"><span>WHERE THEY SPLIT</span><p>' + s3 + "</p></div>" +
        '<div class="cmp-sec"><span>WHICH ONE FIRST</span><p>' + s4 + "</p></div>" +
        '<div class="cmp-sec"><span>TRY THIS WEEK</span><p>' + s5 + "</p></div>" +
      "</div>" +
      sourceHead(2, t("THE TWO BOOKS")) +
      '<div class="aq-srcs">' +
        srcCard(A.id, lA.title, ell(firstSent(lA.summary || "", 1), 140)) +
        srcCard(B.id, lB.title, ell(firstSent(lB.summary || "", 1), 140)) +
      "</div>" +
      '<div class="aq-foot">✦ ' + esc(t("two books, one decision, yours")) + " ✦</div>";
    return html;
  }

  /* ---- the picker: two slots, a search, one button ---- */
  var cmpA = "", cmpB = "", cmpSlot = "A";
  function cmpBook(id) { return bookIndex()[id] || null; }
  function cmpBuild() {
    if (!root || root.querySelector("#tsb-cmp")) return;
    var d = document.createElement("div");
    d.id = "tsb-cmp";
    d.className = "aq-lib aq-lib--cmp";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-label", "Compare two books");
    d.innerHTML =
      '<div class="aq-lib__head">' +
        '<span class="aq-lib__t">⚖️ ' + esc(t("COMPARE TWO BOOKS")) + "</span>" +
        '<span class="aq-lib__s">' + esc(t("pick two, get an honest read")) + "</span>" +
        '<button class="aq-lib__close" id="tsb-cmpclose" aria-label="Close">✕</button>' +
      "</div>" +
      '<div class="cmp-slots">' +
        '<button type="button" class="cmp-slot is-on" id="cmpSlotA"><em>FIRST</em><b>Add a book</b><i>+</i></button>' +
        '<span class="cmp-vs">vs</span>' +
        '<button type="button" class="cmp-slot" id="cmpSlotB"><em>SECOND</em><b>Add a book</b><i>+</i></button>' +
      "</div>" +
      '<input id="cmpSearch" class="aq-lib__search" type="text" placeholder="' + esc(t("Search 600 books, or type a title")) + '" autocomplete="off">' +
      '<div class="cmp-list" id="cmpList"></div>' +
      '<button type="button" class="cmp-go" id="cmpGo" disabled>' + esc(t("Compare these two")) + "</button>";
    root.appendChild(d);
    d.querySelector("#tsb-cmpclose").addEventListener("click", cmpClose);
    d.querySelector("#cmpSlotA").addEventListener("click", function () { cmpSlot = "A"; cmpPaintSlots(); cmpList(root.querySelector("#cmpSearch").value); });
    d.querySelector("#cmpSlotB").addEventListener("click", function () { cmpSlot = "B"; cmpPaintSlots(); cmpList(root.querySelector("#cmpSearch").value); });
    var s = d.querySelector("#cmpSearch");
    s.addEventListener("input", function () { cmpList(s.value); });
    d.querySelector("#cmpGo").addEventListener("click", cmpFire);
    cmpPaintSlots();
    cmpList("");
  }
  function cmpPaintSlots() {
    ["A", "B"].forEach(function (k) {
      var el = root.querySelector("#cmpSlot" + k);
      if (!el) return;
      var b = cmpBook(k === "A" ? cmpA : cmpB);
      el.classList.toggle("is-on", cmpSlot === k);
      el.classList.toggle("is-set", !!b);
      el.querySelector("b").textContent = b ? b.title : "Add a book";
      var i = el.querySelector("i");
      if (i) i.textContent = b ? "✓" : "+";
    });
    var go = root.querySelector("#cmpGo");
    if (go) {
      var ready = !!(cmpA && cmpB && cmpA !== cmpB);
      go.disabled = !ready;
      go.classList.toggle("is-ready", ready);
    }
  }
  function cmpList(filter) {
    var listEl = root.querySelector("#cmpList");
    if (!listEl) return;
    var f = String(filter || "").trim().toLowerCase();
    var rows = (window.BOOKS || []).filter(function (b) {
      if (b.id === cmpA || b.id === cmpB) return false;
      if (!f) return true;
      return (String(b.title) + " " + String(b.author || "") + " " + String(b.category || "")).toLowerCase().indexOf(f) !== -1;
    });
    if (f) rows.sort(function (x, y) { return String(x.title).toLowerCase().indexOf(f) - String(y.title).toLowerCase().indexOf(f); });
    var cap = f ? 24 : 12;
    rows = rows.slice(0, cap);
    listEl.innerHTML = "";
    if (!rows.length) {
      listEl.innerHTML = '<div class="aq-lib__empty">' + esc(t("No book matches that. Try the author, or one word from the title.")) + "</div>";
      return;
    }
    rows.forEach(function (b) {
      var row = document.createElement("button");
      row.type = "button";
      row.className = "cmp-row";
      row.innerHTML = '<b>' + esc(b.title) + "</b><span>" + esc(b.author || "") + " · " + esc(String(b.readTime || "")) + "</span>";
      row.addEventListener("click", function () { cmpPick(b.id); });
      listEl.appendChild(row);
    });
  }
  function cmpPick(id) {
    if (cmpSlot === "A") { cmpA = id; cmpSlot = "B"; }
    else { cmpB = id; }
    cmpPaintSlots();
    var s = root.querySelector("#cmpSearch");
    if (s) s.value = "";
    cmpList("");
  }
  function cmpFire() {
    if (!cmpA || !cmpB || cmpA === cmpB) return;
    var A = cmpBook(cmpA), B = cmpBook(cmpB);
    var label = "Compare " + (A ? A.title : "this") + " and " + (B ? B.title : "that");
    cmpClose();
    modeGo("compare", cmpA + "|" + cmpB, label);
  }
  function cmpClose() { var d = root.querySelector("#tsb-cmp"); if (d) d.classList.remove("aq-lib--open"); }
  function openCompare(preA) {
    if (!root) { try { build(); } catch (e) {} }
    if (!open_) { try { open(); } catch (e) {} }
    cmpBuild();
    cmpA = preA || ""; cmpB = ""; cmpSlot = preA ? "B" : "A";
    var s = root.querySelector("#cmpSearch");
    if (s) { s.value = ""; }
    cmpPaintSlots();
    cmpList("");
    var d = root.querySelector("#tsb-cmp");
    if (d) d.classList.add("aq-lib--open");
    setTimeout(function () { try { s.focus(); } catch (e) {} }, 120);
  }
  /* "compare atomic habits and deep work" typed straight into the chat */
  function booksInText(q) {
    var nq = norm(q), hits = [];
    (window.BOOKS || []).forEach(function (b) {
      var tt = norm(b.title || "");
      if (tt && tt.length > 3 && nq.indexOf(tt) !== -1) hits.push({ b: b, at: nq.indexOf(tt), len: tt.length });
    });
    hits.sort(function (x, y) { return x.at - y.at || y.len - x.len; });
    var out = [];
    hits.forEach(function (h) { if (!out.some(function (o) { return o.id === h.b.id; })) out.push(h.b); });
    return out.slice(0, 2);
  }

  /* ---- dispatcher ---- */
  function modeRender(key, arg) {
    if (key !== "compare") return "";
    var pair = String(arg || "").split("|");
    if (pair.length === 2 && pair[0] && pair[1]) return compareTwo(pair[0], pair[1]);
    /* no pair: an idea across four books, the old strength, kept */
    var tp = arg ? MDD().TOPICS.filter(function (x) { return x.key === arg; })[0] : null;
    var text = tp ? tp.kws.join(" ") : String(arg || "");
    if (!text) return "";
    var hits = bestPerBook(text, 4);
    return hits.length ? compareHtml(tp ? tp.label : text, hits, false) : "";
  }
  /* free text typed while a pick-mode menu is open */
  function modeFromText(key, q) {
    if (key !== "compare") return "";
    var pair = booksInText(q);
    if (pair.length >= 2) return compareTwo(pair[0].id, pair[1].id);
    var tp = topicFromText(q);
    var hits = bestPerBook(tp ? tp.kws.join(" ") : q, 4);
    return hits.length ? compareHtml(tp ? tp.label : q, hits, false) : "";
  }
  function modeGo(key, arg, userLabel, tried) {
    if (quotaBlocked()) { paintQuota(); return; }
    /* v344: a real comparison needs both books at full text (action plans,
       summaries). data.js keeps them light until someone asks, so ask. */
    if (key === "compare" && !tried) {
      var need = String(arg || "").split("|");
      if (need.length === 2 && need[0] && need[1] && window.TSB_LESSONS && window.TSB_LESSONS.ensure) {
        var fullA = window.TSB_LESSONS.ready ? window.TSB_LESSONS.ready(need[0]) : true;
        var fullB = window.TSB_LESSONS.ready ? window.TSB_LESSONS.ready(need[1]) : true;
        if (!fullA || !fullB) {
          /* never let a slow network hold the answer hostage: 1.6s and we
             compare with whatever text we already have */
          var done = false, left = 2;
          var finish = function () { if (done) return; done = true; modeGo(key, arg, userLabel, 1); };
          var again = function () { if (--left <= 0) finish(); };
          setTimeout(finish, 1600);
          try { window.TSB_LESSONS.ensure(need[0], again); } catch (e1) { again(); }
          try { window.TSB_LESSONS.ensure(need[1], again); } catch (e2) { again(); }
          return;
        }
      }
    }
    if (!open_) { try { open(); } catch (e) {} }
    modePick = null;
    if (window.TSB_ASK_QUOTA) { try { TSB_ASK_QUOTA.consume(); } catch (e) {} }
    addMsg("user", userLabel || key);
    if (input) input.value = "";
    var stopT = thinking();
    var html = modeRender(key, arg);
    Promise.all([delay(1800)]).then(function () {
      stopT();
      renderBotAnswer(userLabel || key, html || "<div class='aq-guided'>" + t("Something went wrong, try again!") + "</div>");
    });
  }
  /* v344: the picker is a real sheet with two slots, see openCompare */
  function pickBubble() { return ""; }
  /* v344: the only mode opens its own two-slot picker */
  function showModeIntro(key) {
    if (!open_) { try { open(); } catch (e) {} }
    modePick = null;
    openCompare();
  }

  function renderChips() {
    var wrap = root.querySelector("#tsb-chips");
    if (!wrap) return;
    wrap.innerHTML = "";
    /* v344: one chip, one mode, straight to the picker */
    var mdb = document.createElement("button");
    mdb.className = "aq-chip aq-chip--modes aq-chip--cmp";
    mdb.textContent = "⚖️ " + t("COMPARE BOOKS");
    mdb.addEventListener("click", function () { openCompare(); });
    wrap.appendChild(mdb);
    contextChips().slice(0, 5).forEach(function (c, i) {
      var b = document.createElement("button");
      b.className = "aq-chip aq-chip--" + (i % 5);
      b.textContent = c.label;
      b.addEventListener("click", function () {
        send(c.q === "__GRAVES__" ? "Show related failures" : c.q);
      });
      wrap.appendChild(b);
    });
    var all = document.createElement("button");
    all.className = "aq-chip aq-chip--all";
    all.textContent = "📚 " + t("ALL QUESTIONS");
    all.addEventListener("click", openLib);
    wrap.appendChild(all);
  }

  function addMsg(role, html) {
    var d = document.createElement("div");
    d.className = "aq-msg aq-msg--" + role;
    if (role === "bot") {
      var av = document.createElement("span");
      av.className = "aq-av"; av.textContent = "📕";
      d.appendChild(av);
      var bub = document.createElement("div");
      bub.className = "aq-bubble";
      bub.innerHTML = html;
      d.appendChild(bub);
    } else {
      d.innerHTML = '<div class="aq-bubble aq-bubble--user">' + esc(html) + "</div>";
    }
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* AI-style thinking card: scanning book + rotating status + progress bar */
  function thinking() {
    var nb = (window.BOOKS || []).length;
    var nl = (window.BOOKS || []).reduce(function (a, b) { return a + (b.lessons ? b.lessons.length : 0); }, 0);
    var ng = (window.FAILURES || []).length;
    var d = document.createElement("div");
    d.className = "aq-msg aq-msg--bot aq-msg--think";
    d.innerHTML =
      '<span class="aq-av">📕</span>' +
      '<div class="aq-think">' +
        '<div class="aq-think__scan"><span class="aq-think__book">📕</span></div>' +
        '<div class="aq-think__status">' + t("Scanning") + ' ' + nb + ' books…</div>' +
        '<div class="aq-think__bar"><i></i></div>' +
      '</div>';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    var statuses = [
      t("Scanning") + " " + nb + " books…",
      t("Reading") + " " + nl + " lessons…",
      t("Checking") + " " + ng + " autopsies…",
      t("Compiling your answer") + "…",
      /* v317: the promise, stated while it works */
      "every answer comes with its sources, no opinions"
    ];
    var si = 0;
    var statusEl = d.querySelector(".aq-think__status");
    var iv = setInterval(function () {
      si = (si + 1) % statuses.length;
      if (statusEl) statusEl.textContent = statuses[si];
    }, 620);
    return function () {
      clearInterval(iv);
      if (d.parentNode) d.remove();
    };
  }

  function strip(html) {
    var tEl = document.createElement("div");
    tEl.innerHTML = html;
    return tEl.textContent.replace(/\s+/g, " ").split("✦").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function copyText(text, btn) {
    var done = function () {
      var old = btn.innerHTML;
      btn.textContent = PAGE_MODE ? t("Copied") : "✅ " + t("COPIED");
      setTimeout(function () { btn.innerHTML = old; }, 1300);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(done);
    else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta); done(); }
  }

  function relatedChips(excludeQ) {
    var data = window.TSB_ASK_DATA || [];
    var seenQ = {};
    var others = data.filter(function (t2) { var k = norm(t2.q); if (k === norm(excludeQ) || seenQ[k]) return false; seenQ[k] = 1; return true; }).map(function (t2) { return t2.q; });
    for (var i = others.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = others[i]; others[i] = others[j]; others[j] = tmp;
    }
    return others.slice(0, 3);
  }

  function sendFollowUps(q) {
    var rel = relatedChips(q);
    if (!rel.length) return;
    var lang = getLang();
    var d = document.createElement("div");
    d.className = "aq-follow";
    d.innerHTML = '<span class="aq-follow__l">' + t("TRY NEXT →") + "</span>";
    trBatch(rel, lang).then(function (translated) {
      rel.forEach(function (r, i) {
        var b = document.createElement("button");
        b.className = "aq-chip aq-chip--mini";
        b.textContent = translated[i] || r;
        b.addEventListener("click", function () { send(r); });
        d.appendChild(b);
      });
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    });
  }

  function answer(q) {
    var lang = getLang();
    var topic = findTopic(q);
    var stopT = thinking();
    var lRes = topic ? [] : searchLessons(q, 4);
    var gRes = topic ? [] : searchGraves(q, 2);
    /* guarantee autopsies: if the topic has no graves, find matching ones */
    if (topic && (!topic.graves || !topic.graves.length) && window.FAILURES && window.FAILURES.length) {
      topic = JSON.parse(JSON.stringify(topic));
      topic.graves = (topic.graves || []).concat(searchGraves(q, 2).map(function (r) {
        return { id: r.f.id, blurb: (r.f.lesson || r.f.mistake || "").slice(0, 110) + "…" };
      }));
    }
    var strings = [];
    if (topic) {
      strings.push(q, topic.answer);
      (topic.books || []).forEach(function (s) { strings.push(s.blurb || ""); });
      (topic.graves || []).forEach(function (s) { strings.push(s.blurb || ""); });
    } else {
      strings.push(q);
      lRes.forEach(function (r) { strings.push((r.lesson.summary || "").slice(0, 110) + "…"); });
      gRes.forEach(function (r) { strings.push((r.f.lesson || r.f.mistake || "").slice(0, 110) + "…"); });
    }
    Promise.all([trBatch(strings, lang), delay(2600)]).then(function (res) {
      var trs = res[0];
      stopT();
      var html;
      if (topic) {
        var qi = 0;
        var qT = trs[qi++], ansT = trs[qi++];
        var blurbsT = [], gBlurbsT = [];
        (topic.books || []).forEach(function () { blurbsT.push(trs[qi++]); });
        (topic.graves || []).forEach(function () { gBlurbsT.push(trs[qi++]); });
        html = topicHtml(topic, qT, ansT, blurbsT, gBlurbsT);
      } else {
        var qi2 = 0;
        var qT2 = trs[qi2++];
        var blurbsT2 = [], gBlurbsT2 = [];
        lRes.forEach(function () { blurbsT2.push(trs[qi2++]); });
        gRes.forEach(function () { gBlurbsT2.push(trs[qi2++]); });
        var head = "The library searched all " + (window.BOOKS || []).length + " books and " + (window.FAILURES || []).length + " autopsies, no direct match. Try rephrasing, or tap a suggestion below.";
        if (lRes.length || gRes.length) head = "Closest matches from all " + (window.BOOKS || []).length + " books + " + (window.FAILURES || []).length + " autopsies:";
        html = fallbackHtml(qT2, head, lRes, gRes, blurbsT2, gBlurbsT2);
      }
      renderBotAnswer(q, html);
    }).catch(function () {
      stopT();
      renderBotAnswer(q, "<div class='aq-guided'>" + t("Something went wrong, try again!") + "</div>");
    });
  }

  function renderBotAnswer(q, html) {
    var wrap = document.createElement("div");
    wrap.className = "aq-bubble";
    wrap.innerHTML = html;
    var row = document.createElement("div");
    row.className = "aq-copyrow";
    var cb = document.createElement("button");
    cb.className = "aq-copy";
    if (PAGE_MODE) { cb.innerHTML = FA_IC.copy + "<span>" + esc(t("Copy")) + "</span>"; cb.setAttribute("aria-label", "Copy answer"); }
    else cb.textContent = "📋 " + t("COPY ANSWER");
    cb.addEventListener("click", function () { copyText([q].concat(strip(html)).join("\n\n"), cb); });
    row.appendChild(cb);
    wrap.appendChild(row);
    var d = document.createElement("div");
    d.className = "aq-msg aq-msg--bot";
    d.innerHTML = '<span class="aq-av">📕</span>';
    d.appendChild(wrap);
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    sendFollowUps(q);
    var hist = loadHist();
    hist.push({ role: "user", text: q }, { role: "bot", html: html });
    saveHist(hist);
  }

  function send(raw) {
    var q = String(raw || "").trim();
    if (!q) return;
    /* v336: Ask reads every lesson, so the lesson text is fetched once first */
    if (window.TSB_LESSONS && !send._all) { send._all = 1; var n = 2, both = function () { if (--n === 0) { send._all = 2; send(raw); } }; TSB_LESSONS.all(both); if (TSB_LESSONS.failures) TSB_LESSONS.failures(both); else both(); return; }
    if (send._all === 1) return;
    /* ⏳ v300 free quota: one honest card instead of a silent fourth answer */
    if (quotaBlocked()) { input.value = ""; paintQuota(); return; }
    /* ⚖️ v344: "compare atomic habits and deep work" is a comparison, not a search */
    if (!modePick) {
      var cpair = booksInText(q);
      if (cpair.length >= 2) { modeGo("compare", cpair[0].id + "|" + cpair[1].id, "Compare " + cpair[0].title + " and " + cpair[1].title); return; }
      if (cpair.length === 1 && /(\bvs\b|\bversus\b|compare)/i.test(q)) { openCompare(cpair[0].id); return; }
    }
    if (window.TSB) { try { window.TSB.achv.award("ask-1"); } catch (e) {} }
    if (window.TSB_ASK_QUOTA) { try { TSB_ASK_QUOTA.consume(); } catch (e) {} }
    /* 🎭 v292 typed input while a pick-mode menu is open routes to that mode */
    if (modePick) {
      var mk = modePick; modePick = null;
      addMsg("user", q);
      input.value = "";
      var stopM = thinking();
      var htmlM = modeFromText(mk, q);
      Promise.all([delay(1800)]).then(function () {
        stopM();
        if (htmlM) renderBotAnswer(q, htmlM);
        else answer(q);
      });
      return;
    }
    var b = currentBook();
    if (q === "Show related failures" && b) {
      addMsg("user", "💀 " + b.title + ", " + t("related failures"));
      input.value = "";
      var stopT = thinking();
      var gs = relatedGraves(b);
      var lang = getLang();
      var names = gs.map(function (g) { return g.name; });
      var losses = gs.map(function (g) { return g.loss || (g.lesson || "").slice(0, 90); });
      Promise.all([trBatch(names.concat(losses), lang), delay(2600)]).then(function (res) {
        var trs = res[0];
        stopT();
        var n = trs.slice(0, names.length);
        var lo = trs.slice(names.length);
        renderBotAnswer(q, relatedFailuresHtml(b, n, lo));
      }).catch(function () { stopT(); renderBotAnswer(q, "<div class='aq-guided'>" + t("Something went wrong, try again!") + "</div>"); });
      return;
    }
    addMsg("user", q);
    input.value = "";
    answer(q);
  }

  /* ============ 📚 LIBRARY (translated) ============ */
  var libItems = null;
  function libData() {
    if (libItems) return Promise.resolve(libItems);
    var data = window.TSB_ASK_DATA || [];
    var lang = getLang();
    if (lang === "en") {
      libItems = data.map(function (t2) { return { q: t2.q, tq: t2.q }; });
      return Promise.resolve(libItems);
    }
    var cacheKey = "tsb_ask_lib_" + lang;
    try {
      var cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached && cached.length === data.length) {
        libItems = data.map(function (t2, i) { return { q: t2.q, tq: cached[i] }; });
        return Promise.resolve(libItems);
      }
    } catch (e) {}
    var qs = data.map(function (t2) { return t2.q; });
    return trBatch(qs, lang).then(function (trs) {
      libItems = data.map(function (t2, i) { return { q: t2.q, tq: trs[i] || t2.q }; });
      try { localStorage.setItem(cacheKey, JSON.stringify(trs)); } catch (e) {}
      return libItems;
    }).catch(function () {
      libItems = data.map(function (t2) { return { q: t2.q, tq: t2.q }; });
      return libItems;
    });
  }
  function openLib() {
    var lib = root.querySelector("#tsb-lib");
    lib.classList.add("aq-lib--open");
    var s = root.querySelector("#tsb-libsearch");
    s.value = "";
    renderLib("");
    setTimeout(function () { s.focus(); }, 80);
  }
  function closeLib() { root.querySelector("#tsb-lib").classList.remove("aq-lib--open"); }

  /* ============ 🎭 MODES SHEET (v292): the 8 formats live in one grid,
     the chat keeps its original single-line chip bar ============ */
  var MODE_DESC = {
    compare: "Two books, one honest comparison, in plain English"
  };
  function renderModes() {
    var g = root.querySelector("#tsb-mdgrid");
    if (!g || g.children.length) return;
    MODES.forEach(function (m, i) {
      var c = document.createElement("button");
      c.className = "aq-mdcard aq-mdcard--" + (i % 5);
      c.setAttribute("data-md", m.key);
      if (PAGE_MODE) {
        var sp = m.label.indexOf(" ");
        c.innerHTML = "<i>" + esc(m.label.slice(0, sp)) + "</i><b>" + esc(m.label.slice(sp + 1)) + "</b><span>" + esc(t(MODE_DESC[m.key] || "")) + "</span>";
      } else c.innerHTML = "<b>" + esc(m.label) + "</b><span>" + esc(t(MODE_DESC[m.key] || "")) + "</span>";
      c.addEventListener("click", function () {
        closeModes();
        if (m.pick) showModeIntro(m.key, m.label);
        else modeGo(m.key, null, m.label);
      });
      g.appendChild(c);
    });
  }
  function openModes() { renderModes(); root.querySelector("#tsb-modes").classList.add("aq-lib--open"); }
  function closeModes() { root.querySelector("#tsb-modes").classList.remove("aq-lib--open"); }
  function renderLib(filter) {
    var list = root.querySelector("#tsb-liblist");
    var f = filter.trim().toLowerCase();
    libData().then(function (items) {
      var filtered = items.filter(function (it) {
        return !f || it.q.toLowerCase().indexOf(f) !== -1 || it.tq.toLowerCase().indexOf(f) !== -1;
      });
      if (!filtered.length) {
        list.innerHTML = '<div class="aq-lib__empty">' + esc(t("No questions match") + " \u201C" + filter + "\u201D, " + t("ask it yourself in the chat")) + " 📕</div>";
        return;
      }
      list.innerHTML = "";
      filtered.forEach(function (it) {
        var row = document.createElement("div");
        row.className = "aq-lib__row";
        var q = document.createElement("span");
        q.className = "aq-lib__q";
        q.textContent = it.tq;
        var act = document.createElement("span");
        act.className = "aq-lib__act";
        var askB = document.createElement("button");
        askB.className = "aq-lib__ask";
        askB.textContent = t("ASK");
        askB.addEventListener("click", function () { closeLib(); send(it.q); });
        var copyB = document.createElement("button");
        copyB.className = "aq-lib__copy";
        copyB.textContent = "📋";
        copyB.title = t("Copy this question");
        copyB.addEventListener("click", function (e) { copyText(it.tq, copyB); });
        act.appendChild(askB);
        act.appendChild(copyB);
        row.appendChild(q);
        row.appendChild(act);
        if (PAGE_MODE) row.addEventListener("click", function (e) { if (e.target === copyB) return; closeLib(); send(it.q); });
        list.appendChild(row);
      });
    });
  }

  function bind() {
    /* v4: FAB removed, the bar's Chat tab calls TSB_ASK.open() */
    root.querySelector(".aq-close").addEventListener("click", close);
    root.querySelector("#tsb-libbtn").addEventListener("click", openLib);
    root.querySelector("#tsb-libclose").addEventListener("click", closeLib);
    root.querySelector("#tsb-modesclose").addEventListener("click", closeModes);
    var plusBtn = root.querySelector("#tsb-plus");
    if (plusBtn) plusBtn.addEventListener("click", function () { openCompare(); });
    root.querySelector("#tsb-libsearch").addEventListener("input", function (e) { renderLib(e.target.value); });
    root.querySelector(".aq-clear").addEventListener("click", function () {
      if (!PAGE_MODE && !confirm("Clear this chat?")) return;
      msgs.innerHTML = ""; saveHist([]);
      greet();
      if (PAGE_MODE) faHero();
    });
    root.querySelector("#tsb-send").addEventListener("click", function () { send(input.value); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(input.value); });
    /* 🎭 v292 delegated taps on mode option buttons inside bot bubbles */
    msgs.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("[data-axopt]") : null;
      if (!b) return;
      var v = b.getAttribute("data-axopt") || "";
      var ci = v.indexOf(":");
      modeGo(ci >= 0 ? v.slice(0, ci) : v, ci >= 0 ? v.slice(ci + 1) : null, b.getAttribute("data-axlabel") || b.textContent);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (root.querySelector("#tsb-modes").classList.contains("aq-lib--open")) closeModes();
        else if (root.querySelector("#tsb-lib").classList.contains("aq-lib--open")) closeLib();
        else if (open_) close();
      }
    });
    renderChips();
    var hist = loadHist();
    if (hist.length >= 2) {
      hist.forEach(function (m) {
        if (m.role === "user") addMsg("user", m.text);
        else if (m.role === "bot") {
          var d = document.createElement("div");
          d.className = "aq-msg aq-msg--bot";
          if (m.html) {
            d.innerHTML = '<span class="aq-av">📕</span><div class="aq-bubble">' + m.html + "</div>";
          } else {
            d.innerHTML = '<span class="aq-av">📕</span><div class="aq-bubble">' + esc(m.text || "") + "</div>";
          }
          msgs.appendChild(d);
        }
      });
      msgs.scrollTop = msgs.scrollHeight;
    } else {
      greet();
    }
  }

  function greet() {
    var b = currentBook();
    if (PAGE_MODE && !b) return;
    if (b) {
      var gs = relatedGraves(b).length;
      addMsg("bot", '<div class="aq-guided">👋 <b>' + esc(b.title) + "</b>, <b>💀 " + gs + " " + t("related failures are linked to this book, tap below.") + "</b></div>");
    } else {
      var askBooks = (window.BOOKS && window.BOOKS.length) || 320;
      var askGraves = (window.FAILURES && window.FAILURES.length) || 300;
      addMsg("bot", '<div class="aq-guided">' + t("Ask anything.") + " <b>\u201C" + t("How do I stop procrastinating?") + "\u201D</b>, <b>\u201Cpaise kaise bachau?\u201D</b>, " + (window.TSB_ASK_DATA || []).length + " " + t("questions in") + " " + askBooks + " " + t("books answer") + ". " + t("Even the Graveyard warns you") + ' (<span id="aqGraves">' + askGraves + "</span> " + t("autopsies") + ")</div>");
    }
  }

  function currentBook() {
    try { return bookIndex()[new URLSearchParams(location.search).get("id")] || null; } catch (e) { return null; }
  }

  function goldLocked() {
    try { return !!(window.TSB_PAYWALL && TSB_PAYWALL.locked && TSB_PAYWALL.locked("ask")); } catch (e) { return false; }
  }
  function paintLocked() {
    var msgs = root.querySelector("#tsb-msgs");
    var row = root.querySelector(".aq-inputrow");
    var chips = root.querySelector("#tsb-chips");
    if (!msgs.classList.contains("aq-msgs--locked")) {
      msgs.classList.add("aq-msgs--locked");
      if (chips) chips.style.display = "none";
      if (row) row.style.display = "none";
      msgs.innerHTML =
        '<div class="aq-locked">' +
          '<div class="aq-locked__chip">👑</div>' +
          '<h3>ASK THE LIBRARY IS PART OF GOLD</h3>' +
          '<p>Every answer is composed live from <b>600 books, 4,343 lessons and 400 autopsies</b>, with the exact lesson it came from, one tap away. Nothing invented, no chatbot filler.</p>' +
          '<p class="aq-locked__modes">Ask anything, or open the plus and put two books side by side for an honest comparison.</p>' +
          '<a class="aq-locked__go" href="gold.html">👑 SEE TSB GOLD</a>' +
          '<small>The library itself stays open, every book, every lesson.</small>' +
        '</div>';
    }
  }
  /* ⏳ v300 free quota: honest over-window card (wall on + not Gold + 5/24h used) */
  function quotaBlocked() {
    try { return !!(window.TSB_ASK_QUOTA && TSB_ASK_QUOTA.blocked && TSB_ASK_QUOTA.blocked()); } catch (e) { return false; }
  }
  function paintQuota() {
    var msgs = root.querySelector("#tsb-msgs");
    var row = root.querySelector(".aq-inputrow");
    var chips = root.querySelector("#tsb-chips");
    var clock = (window.TSB_ASK_QUOTA && TSB_ASK_QUOTA.resetClock) ? TSB_ASK_QUOTA.resetClock() : "";
    var nb = (window.BOOKS || []).length;
    var nl = (window.BOOKS || []).reduce(function (a, b) { return a + (b.lessons ? b.lessons.length : 0); }, 0);
    var ng = (window.FAILURES || []).length;
    var lim = (window.TSB_ASK_QUOTA && TSB_ASK_QUOTA.perDay) ? TSB_ASK_QUOTA.perDay() : 3;
    var gold = (window.TSB_CONFIG && TSB_CONFIG.PAYWALL && TSB_CONFIG.PAYWALL.PLANS) || {};
    var p99 = gold.MONTHLY || 99, p999 = gold.YEARLY || 999;
    if (!msgs.classList.contains("aq-msgs--locked")) {
      msgs.classList.add("aq-msgs--locked");
      if (chips) chips.style.display = "none";
      if (row) row.style.display = "none";
      msgs.innerHTML =
        '<div class="aq-quota">' +
          '<div class="aq-quota__chip">⏳</div>' +
          '<h3>TODAY\u2019S ' + lim + ' QUESTIONS ARE USED</h3>' +
          '<p>Each one was composed live from <b>' + nb + ' books, ' + nl.toLocaleString("en-IN") + ' lessons and ' + ng + ' autopsies</b>, with the exact lesson it came from. That is real work, so the free window is ' + lim + ' a day.</p>' +
          '<p class="aq-quota__clock">Your next window opens in <b>' + (clock || "about 24h") + '</b>.</p>' +
          '<div class="aq-quota__tiers">' +
            '<a class="aq-quota__tier" href="gold.html#buy-monthly"><b>\u20b9' + p99 + ' once</b><span>10 questions a day</span></a>' +
            '<a class="aq-quota__tier aq-quota__tier--top" href="gold.html#buy-yearly"><b>\u20b9' + p999 + ' once</b><span>ask without a limit</span></a>' +
          '</div>' +
          '<a class="aq-quota__go" href="gold.html">\ud83d\udc51 SEE THE TWO PASSES</a>' +
          '<small>The books stay open, every page, every lesson. Comparing stays free.</small>' +
        '</div>';
    }
  }
  function open() {
    if (!root) build();
    try { gravesComplete(); } catch (e) {}
    if (goldLocked()) {
      open_ = true;
      panel.classList.add("aq-panel--open");
      paintLocked();
      try { document.dispatchEvent(new CustomEvent("tsb-ask", { detail: { open: true } })); } catch (e) {}
      return;
    }
    if (quotaBlocked()) {
      open_ = true;
      panel.classList.add("aq-panel--open");
      paintQuota();
      try { document.dispatchEvent(new CustomEvent("tsb-ask", { detail: { open: true } })); } catch (e) {}
      return;
    }
    open_ = true;
    panel.classList.add("aq-panel--open");
    try { document.dispatchEvent(new CustomEvent("tsb-ask", { detail: { open: true } })); } catch (e) {}
    if (!PAGE_MODE) setTimeout(function () { if (input) input.focus(); }, 120);
    renderChips();
  }
  function close() {
    if (PAGE_MODE) { goBack(); return; }
    open_ = false;
    panel.classList.remove("aq-panel--open");
    try { document.dispatchEvent(new CustomEvent("tsb-ask", { detail: { open: false } })); } catch (e) {}
    closeLib();
  }

  function boot() {
    if (document.body) build();
    else document.addEventListener("DOMContentLoaded", build);
  }
  boot();
})();
