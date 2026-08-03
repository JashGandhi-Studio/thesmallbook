/* ============================================================
   THESMALLBOOK — ASK THE LIBRARY (floating widget v3)
   Bottom-right chat on EVERY page. No AI server.

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
  function esc(s) {
    return String(s == null ? "" : s)
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
  function lessonLink(book, idx) { return "book.html?id=" + encodeURIComponent(book.id) + "#lesson-" + (idx + 1); }
  function graveLink(f) { return "graveyard/" + encodeURIComponent(f.id) + ".html"; }

  /* ============ answer builders ============ */
  function srcCard(bid, frag, blurb) {
    var b = bookIndex()[bid];
    if (!b) return "";
    var idx = 0;
    if (frag) {
      var fi = b.lessons.findIndex(function (l) { return l.title.toLowerCase().indexOf(String(frag).toLowerCase()) !== -1; });
      if (fi !== -1) idx = fi;
    }
    var l = b.lessons[idx] || b.lessons[0];
    var hue = ["aq-b--y", "aq-b--p", "aq-b--g", "aq-b--b", "aq-b--v"][idx % 5];
    return '<a class="aq-src ' + hue + '" href="' + lessonLink(b, idx) + '">' +
      '<span class="aq-src__book">📕 ' + esc(b.title) + '</span>' +
      '<span class="aq-src__lesson">' + esc(l.title) + '</span>' +
      '<span class="aq-src__blurb">' + esc(blurb || l.summary.slice(0, 100) + "…") + '</span>' +
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

  function topicHtml(topic, qT, ansT, blurbsT, gBlurbsT) {
    var books = (topic.books || []).map(function (s, i) {
      return srcCard(s.id, s.lesson, blurbsT[i] || s.blurb);
    }).join("");
    var graves = (topic.graves || []).map(function (s, i) {
      return graveCard(s.id, gBlurbsT[i] || s.blurb);
    }).join("");
    return '<div class="aq-q">\u201C' + esc(qT) + '\u201D</div>' +
      '<div class="aq-guided"><span class="aq-guided__tag">' + esc(t("THE ANSWER")) + "</span>" + esc(ansT) + "</div>" +
      '<div class="aq-srcs">' + books + graves + "</div>" +
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
      return '<div class="aq-q">\u201C' + esc(qT) + '\u201D</div>' +
        '<div class="aq-guided">' + esc(headT) + "</div>";
    }
    return '<div class="aq-q">\u201C' + esc(qT) + '\u201D</div>' +
      '<div class="aq-guided"><span class="aq-guided__tag">' + esc(t("CLOSEST MATCHES")) + "</span>" + esc(headT) + "</div>" +
      (hits || "<div class='aq-none'>📖 " + esc(t("no book lesson matched")) + "</div>") +
      (gHits ? '<div class="aq-gravehead">💀 ' + esc(t("FROM THE GRAVEYARD")) + "</div>" + gHits : "");
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
    return '<div class="aq-q">💀 ' + esc(t("THE GRAVEYARD SAYS")) + "</div>" +
      '<div class="aq-guided"><span class="aq-guided__tag">' + esc(t("FAILURES LINKED TO THIS BOOK")) + "</span>" +
      esc(t("Real companies that died the exact way this book warns about.")) + "</div>" +
      '<div class="aq-srcs">' + cards + "</div>" +
      '<div class="aq-foot">✦ ' + esc(t("tap an autopsy to read the full story")) + " ✦</div>";
  }

  /* short string translator (headers, chips, labels) */
  var shortMap = {};
  var shortLoaded = false;
  function t(s) {
    if (!shortLoaded && getLang() !== "en") {
      shortLoaded = true;
      var keys = ["ASK","THE ANSWER","CLOSEST MATCHES","FROM THE GRAVEYARD","AUTOPSY","READ","TRY NEXT →","COPIED","COPY ANSWER","Ask anything…","Clear chat","Close","Browse all questions","THE PROBLEM LIBRARY","questions · tap ASK · 📋 to copy","Filter questions… (e.g. money, habits, fear)","No questions match","ask it yourself in the chat","tap a source to read the real lesson","tap an autopsy to read the full story","FAILURES LINKED TO THIS BOOK","THE GRAVEYARD SAYS","Real companies that died the exact way this book warns about.","no book lesson matched","Something went wrong — try again!","ask it yourself in the chat","Related failures","Why do companies die?","ALL QUESTIONS","Scanning","Reading","Checking","Compiling your answer","On this book?","related failures are linked to this book — tap below.","Ask anything —","How do I stop procrastinating?","questions in","and 200 books answer. Even the Graveyard warns you."];
      trBatch(keys, getLang()).then(function (arr) {
        keys.forEach(function (k, i) { shortMap[k] = arr[i]; });
      });
    }
    return shortMap[s] || s;
  }

  /* ============ widget DOM ============ */
  var root = null, fab = null, panel = null, msgs = null, input = null;
  var open_ = false;
  function headStats() {
    var el = root && root.querySelector("#tsb-headstats");
    if (!el) return;
    var nb = (window.BOOKS || []).length;
    var nl = (window.BOOKS || []).reduce(function (a, b) { return a + (b.lessons ? b.lessons.length : 0); }, 0);
    var ng = (window.FAILURES || []).length;
    el.textContent = nb + " books · " + nl + " lessons · " + ng + " autopsies";
  }
  var STORE_KEY = "tsb_ask_hist";
  function loadHist() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch (e) { return []; } }
  function saveHist(h) { try { localStorage.setItem(STORE_KEY, JSON.stringify(h.slice(-30))); } catch (e) {} }

  function build() {
    if (root) return;
    root = document.createElement("div");
    root.id = "tsb-ask-root";
    if (/book\.html/.test(location.pathname)) root.className = "tsb-ask--book";
    root.innerHTML =
      '<button id="tsb-fab" class="aq-fab" title="Ask TheSmallBook" aria-label="Ask TheSmallBook">' +
        '<span class="aq-fab__txt">' + t("ASK") + '</span><span class="aq-fab__pulse"></span></button>' +
      '<div id="tsb-panel" class="aq-panel" role="dialog" aria-label="Ask TheSmallBook">' +
        '<div class="aq-head">' +
          '<div class="aq-head__t">📕 ASK THE LIBRARY</div>' +
          '<div class="aq-head__s" id="tsb-headstats"></div>' +
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
      "</div>";
    document.body.appendChild(root);
    fab = root.querySelector(".aq-fab");
    panel = root.querySelector(".aq-panel");
    msgs = root.querySelector("#tsb-msgs");
    input = root.querySelector("#tsb-input");
    /* translate static bits after short-map loads (non-en) */
    var lang = getLang();
    if (lang !== "en") {
      setTimeout(function () {
        var f = root.querySelector(".aq-fab__txt");
        var h = root.querySelector(".aq-head__t");
        var pl = root.querySelector("#tsb-input");
        var snd = root.querySelector("#tsb-send");
        tr1("ASK", lang).then(function (v) { if (f) f.textContent = v; if (snd) snd.textContent = v; });
        tr1("ASK THE LIBRARY", lang).then(function (v) { if (h) h.textContent = "📕 " + v; });
        tr1("Ask anything…", lang).then(function (v) { if (pl) pl.placeholder = v; });
      }, 250);
    }
    bind();
    headStats();
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
    QUICK.slice(0, 4).forEach(function (c) { chips.push(c); });
    return chips;
  }

  function renderChips() {
    var wrap = root.querySelector("#tsb-chips");
    if (!wrap) return;
    wrap.innerHTML = "";
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
      t("Compiling your answer") + "…"
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
        var head = "The library searched all " + (window.BOOKS || []).length + " books and " + (window.FAILURES || []).length + " autopsies — no direct match. Try rephrasing, or tap a suggestion below.";
        if (lRes.length || gRes.length) head = "Closest matches from all " + (window.BOOKS || []).length + " books + " + (window.FAILURES || []).length + " autopsies:";
        html = fallbackHtml(qT2, head, lRes, gRes, blurbsT2, gBlurbsT2);
      }
      renderBotAnswer(q, html);
    }).catch(function () {
      stopT();
      renderBotAnswer(q, "<div class='aq-guided'>" + t("Something went wrong — try again!") + "</div>");
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
    hist.push({ role: "user", text: q }, { role: "bot", text: strip(html).join(" ") });
    saveHist(hist);
  }

  function send(raw) {
    var q = String(raw || "").trim();
    if (!q) return;
    var b = currentBook();
    if (q === "Show related failures" && b) {
      addMsg("user", "💀 " + b.title + " — " + t("related failures"));
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
      }).catch(function () { stopT(); renderBotAnswer(q, "<div class='aq-guided'>" + t("Something went wrong — try again!") + "</div>"); });
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
  function renderLib(filter) {
    var list = root.querySelector("#tsb-liblist");
    var f = filter.trim().toLowerCase();
    libData().then(function (items) {
      var filtered = items.filter(function (it) {
        return !f || it.q.toLowerCase().indexOf(f) !== -1 || it.tq.toLowerCase().indexOf(f) !== -1;
      });
      if (!filtered.length) {
        list.innerHTML = '<div class="aq-lib__empty">' + esc(t("No questions match") + " \u201C" + filter + "\u201D — " + t("ask it yourself in the chat")) + " 📕</div>";
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
    fab.addEventListener("click", function () { open_ ? close() : open(); });
    root.querySelector(".aq-close").addEventListener("click", close);
    root.querySelector("#tsb-libbtn").addEventListener("click", openLib);
    root.querySelector("#tsb-libclose").addEventListener("click", closeLib);
    root.querySelector("#tsb-libsearch").addEventListener("input", function (e) { renderLib(e.target.value); });
    root.querySelector(".aq-clear").addEventListener("click", function () {
      if (!confirm("Clear this chat?")) return;
      msgs.innerHTML = ""; saveHist([]);
      greet();
    });
    root.querySelector("#tsb-send").addEventListener("click", function () { send(input.value); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(input.value); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (root.querySelector("#tsb-lib").classList.contains("aq-lib--open")) closeLib();
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
          d.innerHTML = '<span class="aq-av">📕</span><div class="aq-bubble">' + esc(m.text) + "</div>";
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
      addMsg("bot", '<div class="aq-guided">👋 <b>' + esc(b.title) + "</b> — <b>💀 " + gs + " " + t("related failures are linked to this book — tap below.") + "</b></div>");
    } else {
      addMsg("bot", '<div class="aq-guided">👋 ' + t("Ask anything —") + " <b>\u201C" + t("How do I stop procrastinating?") + "\u201D</b>, <b>\u201Cpaise kaise bachau?\u201D</b> — " + (window.TSB_ASK_DATA || []).length + " " + t("questions in") + " <b>📚</b> " + t("and 200 books answer. Even the Graveyard warns you.") + " 💀</div>");
    }
  }

  function currentBook() {
    try { return bookIndex()[new URLSearchParams(location.search).get("id")] || null; } catch (e) { return null; }
  }

  function open() {
    if (!root) build();
    open_ = true;
    panel.classList.add("aq-panel--open");
    fab.classList.add("aq-fab--hidden");
    setTimeout(function () { if (input) input.focus(); }, 120);
    renderChips();
  }
  function close() {
    open_ = false;
    panel.classList.remove("aq-panel--open");
    fab.classList.remove("aq-fab--hidden");
    closeLib();
  }

  function boot() {
    if (document.body) build();
    else document.addEventListener("DOMContentLoaded", build);
  }
  boot();
})();
