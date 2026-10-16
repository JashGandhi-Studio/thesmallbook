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
    GRAVE_MAP = {};
    (window.FAILURES || []).forEach(function (f) { GRAVE_MAP[f.id] = f; });
    return GRAVE_MAP;
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
     500 books and 360 autopsies, older shelves included, so the escape gate
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
  function graveLink(f) { return "graveyard/" + encodeURIComponent(f.id) + ".html"; }

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
  function topicHtml(topic, qT, ansT, blurbsT, gBlurbsT) {
    var books = (topic.books || []).map(function (s, i) {
      return srcCard(s.id, s.lesson, blurbsT[i] || s.blurb);
    }).join("");
    var graves = (topic.graves || []).map(function (s, i) {
      return graveCard(s.id, gBlurbsT[i] || s.blurb);
    }).join("");
    /* v317: the receipt - what the answer was built from, said out loud.
       This is the thing AI chat cannot say, so we say it every time. */
    var receipt = '<div class="aq-receipt">✦ answered from <b>' + (topic.books || []).length + ' book lesson' + ((topic.books || []).length === 1 ? "" : "s") +
      '</b> + <b>' + (topic.graves || []).length + ' real failure' + ((topic.graves || []).length === 1 ? "" : "s") +
      "</b> · zero opinions, every line traceable ✦</div>";
    return answerBlock(t("THE ANSWER"), ansT, "\u201C" + qT + "\u201D") + receipt +
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
    return answerBlock(t("CLOSEST MATCHES"), headT, "\u201C" + qT + "\u201D") +
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
          '<div class="aq-head__c"><div class="aq-head__t">📕 ASK THE LIBRARY</div>' +
          '<div class="aq-head__s" id="tsb-headstats"></div></div>' +
          '<div class="aq-head__btns">' +
            '<button class="aq-libbtn" id="tsb-libbtn" title="' + t("Browse all questions") + '">📚</button>' +
            '<button class="aq-clear" title="' + t("Clear chat") + '">🗑</button>' +
            '<button class="aq-close" title="' + t("Close") + '">✕</button>' +
          "</div>" +
        "</div>" +
        '<div class="aq-chips" id="tsb-chips"></div>' +
        '<div class="aq-msgs" id="tsb-msgs"></div>' +
        '<div class="aq-inputrow">' +
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
        tr1("ASK", lang).then(function (v) { if (snd) snd.textContent = v; });
        tr1("ASK THE LIBRARY", lang).then(function (v) { if (h) h.textContent = "📕 " + v; });
        tr1("Ask anything…", lang).then(function (v) { if (pl) pl.placeholder = v; });
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
      back.textContent = "←";
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
    /* empty-state hero, the designed "home" of the chat, gone on first message */
    var msgsEl = root.querySelector("#tsb-msgs");
    if (msgsEl) {
      var hero = document.createElement("div");
      hero.className = "cht-hero";
      hero.innerHTML = '<div class="cht-hero__logo">📕</div>' +
        "<h1>Ask the library</h1>" +
        "<p>500 books · 3,540 lessons · 360 autopsies, one question away.</p>";
      msgsEl.insertBefore(hero, msgsEl.firstChild);
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
    open();
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
  var MODES = [
    { key: "compare",  label: "⚖️ Compare books", pick: true },
    { key: "decision", label: "🧨 The decision before the disaster" },
    { key: "redflag",  label: "🚩 Red Flag Friday" },
    { key: "before",   label: "⚠️ Read this before you…", pick: true },
    { key: "seven",    label: "📅 The 7-day challenge", pick: true },
    { key: "myth",     label: "🃏 Myth vs lesson" },
    { key: "field",    label: "📓 Founder field notes" }
  ];
  var modePick = null; /* set while the reader is in a pick-mode menu */
  var SEVEN_CYCLE = ["atomic-habits", "deep-work", "psychology-of-money", "raja-yoga", "ikigai", "subtle-art", "the-goal", "made-to-stick"];

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

  /* ---- mode 3: the decision before the disaster ---- */
  function decisionHtml(page) {
    var list = (window.FAILURES || []).filter(function (f) { return f.mistake && String(f.mistake).length > 40; });
    var per = 3;
    var pages = Math.ceil(list.length / per);
    var p = ((page % pages) + pages) % pages;
    var picks = list.slice(p * per, p * per + per);
    var cards = picks.map(function (f) { return graveCard(f.id, "THE CALL: " + firstSent(f.mistake, 1)); }).join("");
    var intro = "Every collapse had a moment when it was still reversible. Here are " + picks.length + " of those moments, drawn from " + list.length + " autopsies. Notice the pattern: in the room, none of these decisions felt reckless. They all felt normal. That is the lesson.";
    return answerBlock("🧨 THE DECISION BEFORE THE DISASTER", intro, "case files " + (p * per + 1) + " to " + (p * per + picks.length) + " of " + list.length) +
      sourceHead(picks.length, t("FROM THE GRAVEYARD")) + '<div class="aq-srcs">' + cards + "</div>" +
      '<div class="aq-foot">' + nextBtn("🧨 Next 3 case files", "decision:" + (p + 1)) + "</div>";
  }

  /* ---- mode 4: red flag friday ---- */
  /* curated flags first, then one derived from every real autopsy: the pool runs years */
  var _DFLAGS = null;
  function allFlags() {
    if (_DFLAGS) return _DFLAGS;
    var base = MDD().REDFLAGS.slice();
    var seen = {};
    base.forEach(function (r) { seen[r.grave] = 1; });
    (window.FAILURES || []).forEach(function (f) {
      if (seen[f.id]) return;
      var flag = firstSent(f.mistake || f.lesson, 1);
      if (flag && flag.length > 24) base.push({ flag: ell(flag, 120), grave: f.id });
    });
    _DFLAGS = base;
    return base;
  }
  function redflagHtml(explicit) {
    var flags = allFlags();
    if (!flags.length) return "";
    var idx = (explicit === null || explicit === undefined || explicit === "")
      ? ((weekNum(3) % flags.length) + flags.length) % flags.length
      : ((parseInt(explicit, 10) % flags.length) + flags.length) % flags.length;
    var r = flags[idx];
    var g = graveIndex()[r.grave];
    if (!g) return "";
    var intro = "This week's flag: " + r.flag + ". " + firstSent(g.lesson, 1) + " The flag never feels like a flag while you are waving it. That is exactly what makes it a flag.";
    return answerBlock("🚩 RED FLAG FRIDAY", intro, "exhibit: " + g.name + (g.year ? ", " + g.year : "")) +
      sourceHead(1, t("FROM THE GRAVEYARD")) + '<div class="aq-srcs">' +
        graveCard(g.id, "THE FLAG: " + firstSent(g.mistake || g.lesson, 1)) + "</div>" +
      '<div class="aq-foot">' + nextBtn("🚩 Peek next week's flag", "redflag:" + ((idx + 1) % flags.length)) + "</div>";
  }

  /* ---- mode 5: read this before you… ---- */
  function beforeHtml(key, typed) {
    var scs = MDD().SCENARIOS;
    var sc = null;
    if (typed) {
      sc = scenarioFromText(typed);
      if (!sc) {
        var hits = bestPerBook(typed, 3);
        var gs = searchGraves(typed, 1);
        if (hits.length >= 2) {
          var cards0 = hits.map(function (r) { return srcCard(r.book.id, r.lesson.title, ell(firstSent(r.lesson.summary, 1), 130)); }).join("");
          return answerBlock("⚠️ READ THIS BEFORE YOU…", "Typed in the dark, matched in the library. This is the pre-flight reading for it.", "\u201C" + typed + "\u201D") +
            sourceHead(hits.length, t("FROM THE LIBRARY")) + '<div class="aq-srcs">' + cards0 + "</div>" +
            (gs.length ? sourceHead(1, t("THE WARNING")) + '<div class="aq-srcs">' + graveCard(gs[0].f.id, "THE WARNING: " + firstSent(gs[0].f.lesson, 1)) + "</div>" : "");
        }
      }
    }
    if (!sc && key) sc = scs.filter(function (s) { return s.key === key; })[0] || null;
    if (!sc) sc = scs[0];
    if (!sc) return "";
    var cards = sc.books.map(function (bid, i) {
      var b = bookIndex()[bid];
      return srcCard(bid, b && b.lessons[0] ? b.lessons[0].title : "", sc.whys[i]);
    }).join("");
    var g = graveIndex()[sc.grave];
    return answerBlock("⚠️ READ THIS BEFORE YOU…", "Three short reads before the leap. The books will not make the decision for you; they make sure it is your decision, not an accident with a receipt.", "before " + sc.label.toLowerCase()) +
      sourceHead(sc.books.length, t("FROM THE LIBRARY")) + '<div class="aq-srcs">' + cards + "</div>" +
      (g ? sourceHead(1, t("THE WARNING")) + '<div class="aq-srcs">' + graveCard(g.id, "WHO SKIPPED THIS READING: " + firstSent(g.lesson, 1)) + "</div>" : "") +
      '<div class="aq-foot">' + nextBtn("⚠️ A different scenario", "before:" + scs[(scs.indexOf(sc) + 1) % scs.length].key) + "</div>";
  }

  /* ---- mode 6: the 7-day application challenge ---- */
  function sevenHtml(bid) {
    var b = bookIndex()[bid];
    if (!b || !b.lessons || !b.lessons.length) return "";
    var ls = b.lessons.slice(0, 7);
    var cards = ls.map(function (l, i) {
      return srcCard(b.id, l.title, ell("DAY " + (i + 1) + ": " + firstSent(l.action || l.summary, 1), 140));
    }).join("");
    var intro = "No speed reading. One action a day for 7 days, pulled straight from " + b.title + " by " + (b.author || "the author") + ". Small, boring, done. That is how a book becomes a week of your life instead of a screenshot.";
    var nx = SEVEN_CYCLE[(SEVEN_CYCLE.indexOf(bid) + 1 + SEVEN_CYCLE.length) % SEVEN_CYCLE.length] || SEVEN_CYCLE[0];
    return answerBlock("📅 THE 7-DAY APPLICATION CHALLENGE", intro, b.title + " · " + (b.author || "")) +
      sourceHead(ls.length, t("7 DAYS, 7 ACTIONS")) + '<div class="aq-srcs">' + cards + "</div>" +
      '<div class="aq-foot">' + nextBtn("📅 Challenge me with another book", "seven:" + nx) + "</div>";
  }

  /* ---- mode 7: myth vs lesson ---- */
  function mythHtml(offset) {
    var ms = MDD().MYTHS;
    if (!ms.length) return "";
    var start = (((weekNum(5) + (offset || 0)) % ms.length) + ms.length) % ms.length;
    var picks = [ms[start], ms[(start + 1) % ms.length]];
    var blocks = picks.map(function (m2) {
      return '<div class="aq-mythrow">' +
          '<div class="aq-myth"><span>🃏 THE MYTH</span>' + esc("\u201C" + m2.myth + "\u201D") + "</div>" +
          '<div class="aq-myth aq-myth--t"><span>📖 THE LESSON</span>' + esc(m2.truth) + "</div>" +
          srcCard(m2.book, "", bookBlurb(m2.book)) +
        "</div>";
    }).join("");
    return answerBlock("🃏 MYTH vs LESSON", "Popular advice on top, what the books actually say underneath. Two this week; the deck keeps shuffling, tap for two more.", "myths die here") +
      '<div class="aq-srcs">' + blocks + "</div>" +
      '<div class="aq-foot">' + nextBtn("🃏 Two more myths", "myth:" + (start + 2)) + "</div>";
  }

  /* ---- mode 7: from the founders' record (documented, sourced) ---- */
  function fieldHtml(offset) {
    var ns = MDD().FIELD;
    if (!ns.length) return "";
    var start = (((weekNum(7) + (offset || 0)) % ns.length) + ns.length) % ns.length;
    var picks = [ns[start], ns[(start + 1) % ns.length]];
    var blocks = picks.map(function (n2) {
      return '<div class="aq-fieldnote"><span>📓 ON THE RECORD · ' + esc(n2.who) + "</span>" + esc(n2.note) + "</div>" +
        srcCard(n2.book, "", bookBlurb(n2.book));
    }).join("");
    return answerBlock("📓 FROM THE FOUNDERS' RECORD", "Documented moves from real founders and operators, all on the public record: what they actually did, and the book in the library that teaches it. Two entries this week, tap for two more.", "on the record") +
      '<div class="aq-srcs">' + blocks + "</div>" +
      '<div class="aq-foot">' + nextBtn("📓 Two more from the record", "field:" + (start + 2)) + "</div>";
  }

  /* ---- dispatcher ---- */
  function modeRender(key, arg) {
    if (key === "compare") {
      var tp = arg ? MDD().TOPICS.filter(function (x) { return x.key === arg; })[0] : null;
      var text = tp ? tp.kws.join(" ") : String(arg || "");
      var hits = bestPerBook(text, 4);
      return hits.length ? compareHtml(tp ? tp.label : text, hits, false) : "";
    }
    if (key === "decision") return decisionHtml(parseInt(arg || "0", 10) || weekNum(0));
    if (key === "redflag") return redflagHtml(arg);
    if (key === "before") return beforeHtml(arg || null, null);
    if (key === "seven") return sevenHtml(arg || SEVEN_CYCLE[weekNum(2) % SEVEN_CYCLE.length]);
    if (key === "myth") return mythHtml(arg ? parseInt(arg, 10) : 0);
    if (key === "field") return fieldHtml(arg ? parseInt(arg, 10) : 0);
    return "";
  }
  /* free text typed while a pick-mode menu is open */
  function modeFromText(key, q) {
    if (key === "compare") {
      var tp = topicFromText(q);
      var hits = bestPerBook(tp ? tp.kws.join(" ") : q, 4);
      return hits.length ? compareHtml(tp ? tp.label : q, hits, false) : "";
    }
    if (key === "before") return beforeHtml(null, q);
    if (key === "seven") {
      var b = bookFromText(q);
      if (!b) {
        var top = bestPerBook(q, 1);
        b = top.length ? top[0].book : bookIndex()[SEVEN_CYCLE[weekNum(2) % SEVEN_CYCLE.length]];
      }
      return b ? sevenHtml(b.id) : "";
    }
    return "";
  }
  function modeGo(key, arg, userLabel) {
    if (quotaBlocked()) { paintQuota(); return; }
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
  /* pick-mode menu: chips for presets, typing also works */
  function pickBubble(key) {
    modePick = key;
    var head = "", opts = "";
    if (key === "compare") {
      head = "Pick a topic and the books go side by side, lesson by lesson. Or type your own topic below.";
      MDD().TOPICS.slice(0, 6).forEach(function (tp) {
        opts += '<button class="aq-chip aq-chip--mini" data-axopt="' + key + ":" + tp.key + '" data-axlabel="' + esc(tp.label) + '">' + esc(tp.label) + "</button>";
      });
    } else if (key === "before") {
      head = "The reads before the leap. Pick a jump, or type it: raising money, hiring fast, buying a franchise, quitting your job…";
      MDD().SCENARIOS.slice(0, 6).forEach(function (sc) {
        opts += '<button class="aq-chip aq-chip--mini" data-axopt="before:' + sc.key + '" data-axlabel="' + esc(sc.label) + '">' + esc(sc.label) + "</button>";
      });
    } else if (key === "seven") {
      head = "One book. Seven days. One action a day from the book itself. Pick a book or type one: Atomic Habits, Deep Work…";
      SEVEN_CYCLE.slice(0, 6).forEach(function (bid) {
        var b = bookIndex()[bid];
        if (b) opts += '<button class="aq-chip aq-chip--mini" data-axopt="seven:' + bid + '" data-axlabel="' + esc(b.title) + '">' + esc(b.title) + "</button>";
      });
    } else { return ""; }
    return '<div class="aq-guided"><b>' + esc(head) + "</b>" +
      '<div class="aq-optrow">' + opts + "</div>" +
      '<div class="aq-foot aq-foot--dim">✍️ ' + esc(t("or just type it below")) + "</div></div>";
  }
  function showModeIntro(key, label) {
    if (!open_) { try { open(); } catch (e) {} }
    modePick = null;
    addMsg("user", label);
    if (input) input.value = "";
    setTimeout(function () {
      var html = pickBubble(key);
      if (html) addMsg("bot", html); /* a menu, not an answer: not saved to history */
      else modeGo(key, null, label);
    }, 350);
  }

  function renderChips() {
    var wrap = root.querySelector("#tsb-chips");
    if (!wrap) return;
    wrap.innerHTML = "";
    /* 🎭 v292: ONE modes chip opens the grid, the chip row stays a single line */
    var mdb = document.createElement("button");
    mdb.className = "aq-chip aq-chip--modes";
    mdb.textContent = "🎭 " + t("MODES");
    mdb.addEventListener("click", openModes);
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
      var old = btn.textContent;
      btn.textContent = "✅ " + t("COPIED");
      setTimeout(function () { btn.textContent = old; }, 1300);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(done);
    else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta); done(); }
  }

  function relatedChips(excludeQ) {
    var data = window.TSB_ASK_DATA || [];
    var others = data.filter(function (t2) { return norm(t2.q) !== norm(excludeQ); }).map(function (t2) { return t2.q; });
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
    cb.textContent = "📋 " + t("COPY ANSWER");
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
    /* ⏳ v300 free quota: one honest card instead of a silent fourth answer */
    if (quotaBlocked()) { input.value = ""; paintQuota(); return; }
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
    compare:  "Lessons from different books, side by side on one question",
    decision: "The reversible moment before famous collapses",
    redflag:  "A fresh warning sign every week, straight from the autopsies",
    before:   "The reads before the big jumps: money, hiring, franchises",
    seven:    "One book, seven days, one action a day",
    myth:     "Popular advice vs what the books actually say",
    field:    "Honest notes from readers out in the field"
  };
  function renderModes() {
    var g = root.querySelector("#tsb-mdgrid");
    if (!g || g.children.length) return;
    MODES.forEach(function (m, i) {
      var c = document.createElement("button");
      c.className = "aq-mdcard aq-mdcard--" + (i % 5);
      c.setAttribute("data-md", m.key);
      c.innerHTML = "<b>" + esc(m.label) + "</b><span>" + esc(t(MODE_DESC[m.key] || "")) + "</span>";
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
    root.querySelector("#tsb-libsearch").addEventListener("input", function (e) { renderLib(e.target.value); });
    root.querySelector(".aq-clear").addEventListener("click", function () {
      if (!confirm("Clear this chat?")) return;
      msgs.innerHTML = ""; saveHist([]);
      greet();
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
    if (b) {
      var gs = relatedGraves(b).length;
      addMsg("bot", '<div class="aq-guided">👋 <b>' + esc(b.title) + "</b>, <b>💀 " + gs + " " + t("related failures are linked to this book, tap below.") + "</b></div>");
    } else {
      var askBooks = (window.BOOKS && window.BOOKS.length) || 320;
      var askGraves = (window.FAILURES && window.FAILURES.length) || 300;
      addMsg("bot", '<div class="aq-guided">👋 ' + t("Ask anything.") + " <b>\u201C" + t("How do I stop procrastinating?") + "\u201D</b>, <b>\u201Cpaise kaise bachau?\u201D</b>, " + (window.TSB_ASK_DATA || []).length + " " + t("questions in") + " <b>📚</b> " + askBooks + " " + t("books answer") + ". " + t("Even the Graveyard warns you") + " 💀 (" + askGraves + " " + t("autopsies") + ")</div>");
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
          '<p>Every answer is composed live from <b>500 books, 3,540 lessons and 360 autopsies</b>, with the exact lesson it came from, one tap away. Nothing invented, no chatbot filler.</p>' +
          '<p class="aq-locked__modes">Seven ways to ask: compare books on one question, the decision before the disaster, red flags, seven-day plans and more.</p>' +
          '<a class="aq-locked__go" href="gold.html">👑 SEE TSB GOLD</a>' +
          '<small>The library itself stays free, every book, every lesson, forever.</small>' +
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
    if (!msgs.classList.contains("aq-msgs--locked")) {
      msgs.classList.add("aq-msgs--locked");
      if (chips) chips.style.display = "none";
      if (row) row.style.display = "none";
      msgs.innerHTML =
        '<div class="aq-quota">' +
          '<div class="aq-quota__chip">⏳</div>' +
          '<h3>THE FREE DAY\u2019S ' + ((window.TSB_ASK_QUOTA && TSB_ASK_QUOTA.perDay) ? TSB_ASK_QUOTA.perDay() : 5) + ' QUESTIONS ARE USED</h3>' +
          '<p>Each one was composed live from <b>' + nb + ' books, ' + nl.toLocaleString("en-IN") + ' lessons and ' + ng + ' autopsies</b>, with the exact lesson it came from. That depth takes real work, so the free window is ' + ((window.TSB_ASK_QUOTA && TSB_ASK_QUOTA.perDay) ? TSB_ASK_QUOTA.perDay() : 5) + ' questions every 24 hours.</p>' +
          '<p class="aq-quota__clock">Your next window opens in <b>' + (clock || "about 24h") + '</b>.</p>' +
          '<a class="aq-quota__go" href="gold.html">👑 GO GOLD, ASK WITHOUT LIMITS</a>' +
          '<small>The books stay free, every page, every lesson, forever.</small>' +
        '</div>';
    }
  }
  function open() {
    if (!root) build();
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
