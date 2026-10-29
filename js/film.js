/* ============================================================
   THESMALLBOOK v326 · THE FILM, BUILT (film.js)
   Runtime for the redesign film, on the real app and real data:
     · Today   (index.html)      one hero, mind pick, continue, rows
     · Library (index.html#library) search, shelves, the grid
     · You     (you.html)        reading year, ring, spines, highlights
     · About   (about.html)      opens like a book
     · Book    (book.html)       Read / Listen with honest durations
   Plus a quiet minutes log (tsb_min_log) so the You ring is real.
   No features are removed: every old section is still in the page.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_FILM) return;
  var root = document.documentElement;
  root.classList.add("film");
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (page === "" || page === "/") page = "index.html";

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k, d) { try { var r = localStorage.getItem(k); if (r === null) return d; try { return JSON.parse(r); } catch (e) { return r; } } catch (e2) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function books() { return window.BOOKS || []; }
  var _idx = null;
  function byId(id) { if (!_idx) { _idx = {}; books().forEach(function (b) { _idx[b.id] = b; }); } return _idx[id] || null; }
  function cover(b) { return b.cover || "assets/covers/" + b.id + ".jpg"; }
  function mins(b) { var m = parseInt(b && b.readTime, 10); return isNaN(m) ? 10 : m; }
  function lessons(b) { return (b && b.lessons && b.lessons.length) || 0; }
  function readCount(id) { try { return window.TSB && TSB.progress ? TSB.progress.forBook(id).length : 0; } catch (e) { return 0; } }
  function name() { var n = lsGet("tsb_reader_name", ""); n = typeof n === "string" ? n : ""; return n === "Guest Reader" ? "" : n.trim(); }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function seed(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function coverEl(b, w, h) { return '<span class="f-cover" style="width:' + w + "px;height:" + h + 'px"><img src="' + esc(cover(b)) + '" alt="' + esc(b.title) + '" loading="lazy" decoding="async"></span>'; }
  var ICON = {
    spark4: '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
    listen: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="13" width="4" height="8" rx="1.5"/><rect x="17" y="13" width="4" height="8" rx="1.5"/></svg>',
    flame: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.4 1.2-3.9 2.3-5 .2 1.6 1 2.6 2 3 0-3.6-1.3-6.4.7-9z" fill="#FF7A3D"/><path d="M12 13c.6 1.6 2.2 2.2 2.2 4.1a2.2 2.2 0 0 1-4.4 0c0-1.4.9-2.3 2.2-4.1z" fill="#FFC800"/></svg>',
    seal: '<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true"><circle cx="24" cy="24" r="17" fill="#E9C46A"/><circle cx="24" cy="24" r="12.5" fill="none" stroke="#B8902F" stroke-width="1.4" stroke-dasharray="2 2.6"/><path d="M18.5 24.5l3.6 3.6 7.6-8" fill="none" stroke="#5A4310" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    book: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.9C10.6 5.1 8.4 4.1 5.7 4.1H2.9v13.5h3.3c2.5 0 4.5 1 5.8 2.8 1.3-1.8 3.3-2.8 5.8-2.8h3.3V4.1h-2.8c-2.7 0-4.9 1-6.3 2.8Z"/><path d="M12 6.9v13.5"/></svg>',
    crown: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
    pen: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'
  };
  var SR = window.TSB_SR || window.SpeechRecognition || window.webkitSpeechRecognition || null;
  ICON.mic = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  /* voice search: say a title, an author or a feeling, the library listens */
  function voiceSearch(btn) {
    if (!SR) return;
    var rec = new SR(), lang = "en";
    try { lang = window.TSB_LANG ? TSB_LANG.get() : "en"; } catch (e) {}
    rec.lang = (lang === "en" || /Latn/.test(lang)) ? "en-IN" : lang + "-IN";
    rec.interimResults = true; rec.maxAlternatives = 1;
    btn.classList.add("on");
    var input = document.getElementById("searchInput");
    if (!/^#library/.test(location.hash)) location.hash = "library";
    rec.onresult = function (e) {
      var t = ""; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      if (input) { input.value = t.trim(); input.dispatchEvent(new Event("input", { bubbles: true })); }
    };
    rec.onend = rec.onerror = function () { btn.classList.remove("on"); var b2 = document.querySelector("#searchWrap [data-fmic]"); if (b2) b2.classList.remove("on"); };
    try { rec.start(); } catch (e) { btn.classList.remove("on"); }
  }
  var CAT_COL = { "Self-Improvement": ["#FFC800", "#16130F"], "Productivity": ["#1F3A5F", "#FBF8F1"], "Money & Finance": ["#2F7D5B", "#FBF8F1"], "Psychology & People": ["#6F5BD9", "#FBF8F1"], "Business & Startups": ["#FF7A59", "#16130F"], "Power & Strategy": ["#7A1C24", "#FBF8F1"], "Creativity": ["#FFA9CC", "#16130F"], "History": ["#A67C52", "#FBF8F1"], "Leadership": ["#25C79C", "#16130F"] };
  function catCol(c) { return CAT_COL[c] || ["#EFE6D3", "#16130F"]; }

  /* ---------- a quiet minutes log: real time with a book or a player ---------- */
  (function minutes() {
    if (!/^(book|reader|podcasts|kids|story|deepdive)\.html$/.test(page)) return;
    var last = Date.now(), active = Date.now();
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (ev) { window.addEventListener(ev, function () { active = Date.now(); }, { passive: true }); });
    function playing() { var a = document.querySelectorAll("audio"); for (var i = 0; i < a.length; i++) if (!a[i].paused) return true; try { return !!(window.speechSynthesis && speechSynthesis.speaking); } catch (e) { return false; } }
    setInterval(function () {
      var now = Date.now(), dt = Math.min(20, (now - last) / 1000); last = now;
      if (document.hidden && !playing()) return;
      if (now - active > 90000 && !playing()) return;
      var log = lsGet("tsb_min_log", {}) || {}, k = dayKey();
      log[k] = Math.round((log[k] || 0) + dt);
      var keys = Object.keys(log).sort(); while (keys.length > 400) delete log[keys.shift()];
      lsSet("tsb_min_log", log);
    }, 15000);
  })();
  function weekMinutes() {
    var log = lsGet("tsb_min_log", {}) || {}, out = [], d = new Date(), dow = (d.getDay() + 6) % 7;
    for (var i = 0; i < 7; i++) { var x = new Date(d); x.setDate(d.getDate() - dow + i); out.push(Math.round((log[dayKey(x)] || 0) / 60)); }
    return out;
  }

  /* ---------- the shelf that belongs to this reader ---------- */
  function interests() { var a = lsGet("tsb_interests", []); return Array.isArray(a) ? a : []; }
  function mindWords() { var m = lsGet("tsb_mind", []); return Array.isArray(m) ? m : []; }
  function finished(b) { var n = lessons(b); return n > 0 && readCount(b.id) >= n; }
  function todaysPick() {
    var shelf = lsGet("tsb_starter_shelf", []), pool = [];
    (Array.isArray(shelf) ? shelf : []).forEach(function (id) { var b = byId(id); if (b && !finished(b)) pool.push(b); });
    if (!pool.length) {
      var cats = interests(); if (!cats.length) cats = ["Self-Improvement"];
      books().forEach(function (b) { if (cats.indexOf(b.category) >= 0 && !finished(b)) pool.push(b); });
      pool = pool.slice(0, 30);
    }
    if (!pool.length) pool = books().slice(0, 20);
    var day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
    return pool[day % pool.length];
  }
  function rowFor(cat, skip, n) {
    var out = [], s = seed(dayKey() + cat);
    var list = books().filter(function (b) { return b.category === cat && skip.indexOf(b.id) < 0; });
    for (var i = 0; i < list.length && out.length < n; i++) out.push(list[(i + s) % list.length]);
    return out;
  }

  /* ============================================================
     TODAY + LIBRARY (index.html)
     ============================================================ */
  function todayHtml() {
    var d = new Date(), h = d.getHours();
    var hi = h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    var nm = name(), streak = 0;
    try { streak = window.TSB && TSB.streak ? TSB.streak.count() : 0; } catch (e) {}
    var date = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    var pick = todaysPick(), html = "";
    html += '<div class="ft-hd f-up" style="--d:.05"><div><div class="ft-date">' + esc(date) + '</div><h1 class="ft-hi">' + hi + (nm ? ", <i>" + esc(nm) + "</i>" : "") + "</h1></div>" +
      '<div class="ft-acts"><a class="ft-streak" href="you.html" aria-label="' + streak + ' day streak">' + ICON.flame + streak + '</a><a class="ft-av" href="you.html" aria-label="You">' + esc((nm || "R").charAt(0).toUpperCase()) + "</a></div></div>";
    html += '<a class="ft-search f-up" style="--d:.15" href="#library" data-fsearch>' + ICON.search + "<span>Search " + books().length + " books, authors, ideas</span>" + (SR ? '<button type="button" class="ft-mic" data-fmic aria-label="Search by voice">' + ICON.mic + "</button>" : "<kbd>/</kbd>") + "</a>";
    if (pick) {
      var why = pick.tagline || pick.oneLiner || "";
      html += '<section class="ft-hero f-up" style="--d:.25" aria-label="Today\u2019s pick"><div class="f-kick">TODAY\u2019S PICK FOR YOU</div><div class="ft-hero__row">' +
        '<a href="book.html?id=' + encodeURIComponent(pick.id) + '" aria-label="' + esc(pick.title) + '">' + coverEl(pick, 112, 168) + "</a>" +
        '<div class="ft-hero__meta"><h2 class="ft-hero__t"><a href="book.html?id=' + encodeURIComponent(pick.id) + '">' + esc(pick.title) + '</a></h2><div class="ft-hero__a">' + esc(pick.author) + "</div>" +
        '<div class="ft-hero__chips"><span class="f-chip">' + mins(pick) + ' min</span><span class="f-chip">' + lessons(pick) + " lessons</span></div>" +
        '<div class="ft-hero__btns"><a class="f-btn" href="book.html?id=' + encodeURIComponent(pick.id) + '#bigidea">' + ICON.play + ' Read</a><a class="f-btn f-btn--sq" href="book.html?id=' + encodeURIComponent(pick.id) + '&play=1" aria-label="Listen to ' + esc(pick.title) + '">' + ICON.listen + "</a></div></div></div>" +
        (why ? '<div class="ft-hero__why">' + esc(why) + "</div>" : "") + "</section>";
    }
    html += mindPickHtml();
    var last = null; try { last = window.TSB && TSB.lastRead ? TSB.lastRead.get() : null; } catch (e) {}
    var lb = last && byId(last.id);
    if (lb && !finished(lb)) {
      var pct = lessons(lb) ? Math.round(readCount(lb.id) / lessons(lb) * 100) : 0;
      html += '<a class="ft-cont f-up" style="--d:.45" href="book.html?id=' + encodeURIComponent(lb.id) + '">' + coverEl(lb, 44, 66) + '<div class="ft-cont__m"><div class="ft-cont__k">CONTINUE</div><div class="ft-cont__t">' + esc(lb.title) + '</div><div class="ft-bar"><i data-w="' + pct + '"></i></div></div><div class="ft-cont__p">' + pct + "%</div></a>";
    }
    var mw = mindWords(), cats = interests();
    var lead = cats[0] || (pick ? pick.category : "Self-Improvement");
    var WORD = { "Self-Improvement": "habits", "Productivity": "focus", "Money & Finance": "money", "Psychology & People": "people", "Business & Startups": "career", "Power & Strategy": "strategy", "Creativity": "ideas", "History": "history", "Leadership": "leadership" };
    var word = mw[0] ? mw[0].toLowerCase() : (WORD[lead] || lead.replace(/ &.*$/, "").toLowerCase());
    var row = rowFor(lead, pick ? [pick.id] : [], 10);
    if (row.length) html += '<div class="ft-sec"><h2>Because you picked <i>' + esc(word) + '</i></h2><a href="#library" data-fbrowse="cat" data-fcat="' + esc(lead) + '" data-fword="' + esc(word) + '">See all</a></div><div class="ft-row">' + row.map(rb).join("") + "</div>";
    html += originalsHtml();
    var budget = Number(lsGet("tsb_read_minutes", 10)) || 10;
    var short = books().filter(function (b) { return mins(b) <= Math.max(8, budget) && (!pick || b.id !== pick.id); });
    var s = seed(dayKey() + "short"), shortRow = [];
    for (var i = 0; i < short.length && shortRow.length < 10; i++) shortRow.push(short[(i * 7 + s) % short.length]);
    if (shortRow.length) html += '<div class="ft-sec"><h2>Fits in <i>' + Math.max(8, budget) + ' minutes</i></h2><a href="#library" data-fbrowse="short" data-fmin="' + Math.max(8, budget) + '">See all</a></div><div class="ft-row">' + shortRow.filter(function (b, k, a) { return a.indexOf(b) === k; }).map(rb).join("") + "</div>";
    var kids = lsGet("tsb_kids_mode", "") === "1" || lsGet("tsb_kids_mode", "") === 1;
    var PROMPTS = ["Which book changed one small habit for you?", "One line from a book you still think about.", "What did you try this week because of a book?", "A book you would hand to your younger self, and why."];
    var wk = Math.floor(Date.now() / (7 * 864e5));
    html += '<div class="ft-sec"><h2>More to <i>explore</i></h2></div><div class="ft-tiles">' +
      '<a class="ft-tile" href="podcasts.html">' + ICON.listen + "<b>Listen</b><span>Audiobooks and shows, in your language</span></a>" +
      '<a class="ft-tile" href="scan.html"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 12h8"/></svg><b>Scan a book</b><span>Point at a cover or a barcode</span></a>' +
      '<a class="ft-tile" href="notes.html">' + ICON.pen + "<b>Notebook</b><span>Your highlights and notes</span></a>" +
      '<a class="ft-tile ft-tile--gold" href="gold.html">' + ICON.crown + "<b>Gold</b><span>" + (function () { try { if (TSB_GOLD.isGold()) return "Yours. See what is on"; if (TSB_GOLD.hasPdf && TSB_GOLD.hasPdf()) return "PDF pass on. Upgrade"; } catch (e) {} return "Just \u20b999 a month"; })() + "</span></a></div>";
    /* v329: the same weekly prompt as Stories, so the app asks one question a week, everywhere */
    var WQ = null; try { if (window.TSB_WEEKLY) WQ = TSB_WEEKLY.current(); } catch (e) {}
    if (!kids) html += '<a class="ft-prompt" href="' + (WQ ? TSB_WEEKLY.replyHref(WQ) : "stories.html") + '"><div class="f-kick">THIS WEEK\u2019S PROMPT</div><q>' + esc(WQ ? WQ.q : PROMPTS[wk % PROMPTS.length]) + "</q><span>Write one sentence " + ICON.arrow + "</span></a>";
    html += '<p class="ft-foot"><a href="about.html">About</a> \u00b7 <a href="settings.html">Settings</a> \u00b7 <a href="legal.html">Privacy</a></p>';
    return html;
  }
  /* v329: TheSmallBook Originals, written in-house, shown with their own house covers */
  function isOriginal(b) {
    if (!b) return false;
    try { if (((window.TSB_CONFIG && TSB_CONFIG.ORIGINALS) || []).indexOf(b.id) >= 0) return true; } catch (e) {}
    return /^unknown$/i.test(b.author || "");
  }
  function originalsHtml() {
    var all = books().filter(isOriginal); if (!all.length) return "";
    var s = seed(dayKey() + "orig"), row = [];
    for (var i = 0; i < all.length && row.length < 10; i++) row.push(all[(i * 3 + s) % all.length]);
    row = row.filter(function (b, k, a) { return a.indexOf(b) === k; });
    return '<section class="ft-orig f-up" style="--d:.5" aria-label="TheSmallBook Originals"><div class="ft-orig__hd"><div><div class="ft-orig__k">' + ICON.spark4 + ' TheSmallBook Originals</div><h2>Written by us. <i>Found nowhere else.</i></h2></div><a href="#library" class="ft-orig__n" data-fbrowse="orig">' + all.length + ' books</a></div>' +
      '<div class="ft-row ft-orig__row">' + row.map(function (b) { return '<a class="ft-rb" href="book.html?id=' + encodeURIComponent(b.id) + '">' + coverEl(b, 116, 174) + "<b>" + esc(b.title) + "</b><span>" + mins(b) + " min \u00b7 Original</span></a>"; }).join("") + "</div></section>";
  }
  /* v331: Today's "See all" opens a calm sheet of covers instead of throwing you into the library */
  function browseSheet(src) {
    var kind = src.getAttribute("data-fbrowse"), list = [], kick = "", title = "";
    if (kind === "cat") { var cat = src.getAttribute("data-fcat"); list = books().filter(function (b) { return b.category === cat; }); kick = cat; title = "Because you picked <i>" + esc(src.getAttribute("data-fword") || "") + "</i>"; }
    else if (kind === "short") { var m = Number(src.getAttribute("data-fmin")) || 10; list = books().filter(function (b) { return mins(b) <= m; }); kick = "Short reads"; title = "Fits in <i>" + m + " minutes</i>"; }
    else { list = books().filter(isOriginal); kick = "TheSmallBook Originals"; title = "Written by us. <i>Found nowhere else.</i>"; }
    if (!list.length) { location.hash = "library"; return; }
    var old = document.getElementById("fbsWrap"); if (old) old.remove();
    var sorts = [["pick", "For you"], ["short", "Shortest"], ["new", "Unread"], ["az", "A to Z"]];
    var w = document.createElement("div"); w.id = "fbsWrap"; w.className = "fbs";
    w.innerHTML = '<div class="fbs-bg" data-fbx></div><div class="fbs-sh" role="dialog" aria-modal="true" aria-label="' + esc(kick) + '"><div class="fbs-grab" data-fbx></div>' +
      '<div class="fbs-hd"><div><div class="f-kick">' + esc(kick) + " \u00b7 " + list.length + " books</div><h2>" + title + '</h2></div><button type="button" class="fbs-x" data-fbx aria-label="Close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="fbs-sort" role="tablist">' + sorts.map(function (x, k) { return '<button type="button" role="tab" data-fbs="' + x[0] + '"' + (k ? "" : ' class="on" aria-selected="true"') + ">" + x[1] + "</button>"; }).join("") + "</div>" +
      '<div class="fbs-g"></div><a class="fbs-all" href="#library" data-fbx-lib>Open the full library</a></div>';
    document.body.appendChild(w);
    var g = w.querySelector(".fbs-g"), shown = 0, cur = list.slice(), base = list.slice();
    var sd = seed(dayKey() + kind); base.sort(function (a, b) { return (seed(a.id + sd) % 997) - (seed(b.id + sd) % 997); });
    function card(b) { var done = finished(b), pct = lessons(b) ? Math.round(readCount(b.id) / lessons(b) * 100) : 0; return '<a class="fbs-b" href="book.html?id=' + encodeURIComponent(b.id) + '"><span class="fbs-c">' + coverEl(b, 104, 156) + (done ? '<em class="fbs-done">Read</em>' : pct ? '<em class="fbs-pct"><i style="width:' + pct + '%"></i></em>' : "") + "</span><b>" + esc(b.title) + "</b><span>" + esc(b.author && !/^unknown$/i.test(b.author) ? b.author : "Original") + " \u00b7 " + mins(b) + " min</span></a>"; }
    function more() { var nx = cur.slice(shown, shown + 24); shown += nx.length; g.insertAdjacentHTML("beforeend", nx.map(card).join("")); }
    function sortBy(k) {
      cur = base.slice();
      if (k === "short") cur.sort(function (a, b) { return mins(a) - mins(b); });
      if (k === "new") cur = cur.filter(function (b) { return !readCount(b.id); }).concat(cur.filter(function (b) { return readCount(b.id) && !finished(b); }));
      if (k === "az") cur.sort(function (a, b) { var na = String(a.title).replace(/^the\s+/i, ""), nb = String(b.title).replace(/^the\s+/i, ""); return na.localeCompare(nb); });
      g.innerHTML = ""; shown = 0; more(); g.scrollTop = 0;
    }
    sortBy("pick");
    var sh = w.querySelector(".fbs-sh");
    sh.addEventListener("scroll", function () { if (shown < cur.length && sh.scrollTop + sh.clientHeight > sh.scrollHeight - 500) more(); }, { passive: true });
    function close() { w.classList.remove("on"); document.documentElement.classList.remove("fbs-lock"); document.removeEventListener("keydown", key); setTimeout(function () { w.remove(); }, 320); }
    function key(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", key);
    w.addEventListener("click", function (e) {
      var t = e.target.closest("[data-fbs]");
      if (t) { [].forEach.call(w.querySelectorAll("[data-fbs]"), function (x) { x.classList.toggle("on", x === t); x.setAttribute("aria-selected", x === t ? "true" : "false"); }); sortBy(t.getAttribute("data-fbs")); return; }
      if (e.target.closest("[data-fbx-lib]")) { close(); if (kind === "cat") { var cat2 = src.getAttribute("data-fcat"); setTimeout(function () { document.querySelectorAll("#filters .chip, #filters button").forEach(function (b) { if (b.textContent.trim() === cat2) b.click(); }); }, 300); } return; }
      if (e.target.closest("[data-fbx]")) close();
    });
    /* pull the sheet down to close it */
    var y0 = null, dy = 0, grab = w.querySelector(".fbs-hd");
    [w.querySelector(".fbs-grab"), grab].forEach(function (h) {
      h.addEventListener("touchstart", function (e) { y0 = e.touches[0].clientY; dy = 0; sh.style.transition = "none"; }, { passive: true });
      h.addEventListener("touchmove", function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = "translateY(" + dy + "px)"; }, { passive: true });
      h.addEventListener("touchend", function () { sh.style.transition = ""; sh.style.transform = ""; if (dy > 90) close(); y0 = null; });
    });
    document.documentElement.classList.add("fbs-lock");
    requestAnimationFrame(function () { requestAnimationFrame(function () { w.classList.add("on"); }); });
    var x0 = w.querySelector(".fbs-x"); if (x0) x0.focus();
  }
  function rb(b) { return '<a class="ft-rb" href="book.html?id=' + encodeURIComponent(b.id) + '">' + coverEl(b, 116, 174) + "<b>" + esc(b.title) + "</b><span>" + mins(b) + " min</span></a>"; }
  function mindPickHtml() {
    var M = window.TSB_MINDPICK; if (!M || !M.daily || !M.problems) return "";
    var day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
    var q = M.daily[(day + seed(name() || "r") % 7) % M.daily.length], p = null;
    M.problems.forEach(function (x) { if (x.key === q.pick) p = x; });
    if (!p) p = M.problems[0];
    var ids = (p.ids || []).filter(byId).slice(0, 3);
    var quote = q.kind === "quote", opened = lsGet("tsb_mp_open", "") === dayKey();
    var covers = ids.map(function (id) { var b = byId(id); return '<a href="book.html?id=' + encodeURIComponent(id) + '" aria-label="' + esc(b.title) + '">' + coverEl(b, quote ? 38 : 50, quote ? 57 : 75) + "</a>"; }).join("");
    /* v328: today's line arrives sealed. It opens once you tap, and a new one waits tomorrow */
    if (quote) return '<div class="ft-mp ft-mp--seal f-up' + (opened ? " flip" : "") + '" style="--d:.35" role="button" tabindex="0" aria-label="Mind pick, tap to open today\u2019s line" data-fmp><div class="ft-mp__in">' +
      '<div class="ft-mp__f"><div class="f-kick">MIND PICK \u00b7 TODAY\u2019S LINE</div><div class="ft-mp__seal">' + ICON.seal + '</div>' +
      '<div class="ft-mp__q ft-mp__q--tease">A line from <span>' + esc(q.who || "a great book") + "</span>, picked for this " + partOfDay() + ".</div>" +
      '<div class="ft-mp__go"><span class="ft-mp__open">Tap to open</span></div></div>' +
      '<div class="ft-mp__b"><div class="f-kick">TODAY\u2019S LINE \u00b7 ' + esc(q.who || "") + '</div><div class="ft-mp__line">\u201c' + esc(q.text) + '\u201d</div>' +
      '<div class="ft-mp__foot"><div class="ft-mp__books ft-mp__books--sm">' + covers + '</div><span>Three books for this line</span></div></div></div></div>';
    return '<div class="ft-mp f-up' + (opened ? " flip" : "") + '" style="--d:.35" role="button" tabindex="0" aria-label="Mind pick, tap for three books" data-fmp><div class="ft-mp__in">' +
      '<div class="ft-mp__f"><div class="f-kick">MIND PICK \u00b7 TODAY\u2019S QUESTION</div><div class="ft-mp__q">' + esc(q.text) + "</div>" +
      '<div class="ft-mp__go">Tap for three books ' + ICON.arrow + "</div></div>" +
      '<div class="ft-mp__b"><div class="f-kick">FOR YOU, THIS WEEK</div><div class="ft-mp__books">' + covers + "</div>" +
      '<div class="ft-mp__try"><b>Try this:</b> ' + esc(p.action || "") + '</div><div class="ft-mp__back">Tap to turn back</div></div></div></div>';
  }
  function partOfDay() { var h = new Date().getHours(); return h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night"; }
  function setTab(id) {
    var bar = document.getElementById("tsbBar"); if (!bar) return;
    bar.querySelectorAll(".tsb-bar__item").forEach(function (it) { var on = it.getAttribute("data-tab") === id; it.classList.toggle("is-active", on); if (on) it.setAttribute("aria-current", "page"); else it.removeAttribute("aria-current"); });
  }
  function isLibHash() { return /^#(library|grid|filters|searchWrap|shelf)/.test(location.hash) || /[?&](q|cat|shelf)=/.test(location.search); }
  function initIndex() {
    var ft = document.createElement("main");
    ft.className = "ft"; ft.id = "filmToday"; ft.setAttribute("aria-label", "Today");
    var lh = document.createElement("div");
    lh.className = "fl-hd"; lh.id = "filmLibHead";
    var cats = {}; books().forEach(function (b) { cats[b.category] = 1; });
    lh.innerHTML = '<div class="fl-hd__row"><h1>Library</h1><a class="ft-av" href="you.html" aria-label="You">' + esc((name() || "R").charAt(0).toUpperCase()) + "</a></div><p>" + books().length + " books \u00b7 eight minutes each \u00b7 every shelf</p>";
    var anchor = $(".ticker") || document.body.firstChild;
    var hero = $("header.hero");
    document.body.insertBefore(ft, hero || anchor);
    document.body.insertBefore(lh, hero || anchor);
    function paint() { ft.innerHTML = todayHtml(); setTimeout(function () { ft.querySelectorAll(".ft-bar i").forEach(function (i) { i.style.width = i.getAttribute("data-w") + "%"; }); }, 60); }
    function view(animate) {
      var lib = isLibHash();
      function apply() {
        root.classList.toggle("fv-lib", lib); root.classList.toggle("fv-today", !lib);
        setTab(lib ? "library" : "home");
        window.scrollTo(0, 0);
      }
      if (animate && document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(apply); else apply();
    }
    var si = document.getElementById("searchInput"); if (si) { si.setAttribute("placeholder", "Books, authors, ideas"); si.setAttribute("enterkeyhint", "search"); si.setAttribute("aria-label", "Search " + books().length + " books"); si.setAttribute("type", "search"); }
    var sg = document.getElementById("searchGo"); if (sg) sg.textContent = "Find";
    if (SR && sg && sg.parentNode) {
      var mb = document.createElement("button"); mb.type = "button"; mb.className = "ft-mic ft-mic--lib"; mb.setAttribute("data-fmic", ""); mb.setAttribute("aria-label", "Search by voice"); mb.innerHTML = ICON.mic;
      sg.parentNode.insertBefore(mb, sg);
      mb.addEventListener("click", function (e) { e.preventDefault(); voiceSearch(mb); });
    }
    paint(); view(false);
    window.addEventListener("hashchange", function () { view(true); });
    window.addEventListener("tsb:onboarded", function () { setTimeout(paint, 80); });
    ft.addEventListener("click", function (e) {
      var t = e.target.closest("[data-fmp]");
      if (t && !e.target.closest("a")) { t.classList.toggle("flip"); if (t.classList.contains("flip")) { try { localStorage.setItem("tsb_mp_open", JSON.stringify(dayKey())); } catch (eS) {} t.classList.add("is-opening"); setTimeout(function () { t.classList.remove("is-opening"); }, 1400); } return; }
      var mic = e.target.closest("[data-fmic]");
      if (mic) { e.preventDefault(); e.stopPropagation(); voiceSearch(mic); return; }
      var s = e.target.closest("[data-fsearch]");
      if (s) { setTimeout(function () { var i = document.getElementById("searchInput"); if (i) i.focus(); }, 350); }
      var fb = e.target.closest("[data-fbrowse]");
      if (fb) { e.preventDefault(); e.stopPropagation(); browseSheet(fb); return; }
      var c = e.target.closest("[data-fcat]");
      if (c) { var cat = c.getAttribute("data-fcat"); setTimeout(function () { document.querySelectorAll("#filters .chip, #filters button").forEach(function (b) { if (b.textContent.trim() === cat) b.click(); }); }, 300); }
    });
    ft.addEventListener("keydown", function (e) { var t = e.target.closest("[data-fmp]"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); t.classList.toggle("flip"); } });
    /* the tab bar's Library and Today links stay on this page */
    document.addEventListener("click", function (e) {
      var a = e.target.closest("#tsbBar a[data-tab]"); if (!a) return;
      var tab = a.getAttribute("data-tab");
      if (tab === "library") { e.preventDefault(); e.stopPropagation(); if (location.hash !== "#library") location.hash = "library"; else view(true); }
      else if (tab === "home") { e.preventDefault(); e.stopPropagation(); if (location.hash) history.pushState("", document.title, location.pathname + location.search); view(true); }
    }, true);
    window.addEventListener("popstate", function () { view(true); });
    var tries = 0; (function waitBar() { if (document.getElementById("tsbBar")) setTab(isLibHash() ? "library" : "home"); else if (tries++ < 40) setTimeout(waitBar, 100); })();
  }

  /* ============================================================
     BOOK (book.html): two honest buttons, ?play=1 starts Listen
     ============================================================ */
  function initBook() {
    var id = new URLSearchParams(location.search).get("id");
    var b = id && byId(id); if (!b) return;
    var r = $("#nbOpenReader .nb-act-lbl"); if (r) r.textContent = "Read \u00b7 " + mins(b) + " min";
    var l = $("#heroPodcastBtn .podcastbtn__label"); if (l) l.textContent = "Listen \u00b7 " + Math.max(4, Math.round(mins(b) * 1.3)) + " min";
    root.classList.add("fv-book");
    var sh = $('.nav__links a[href="index.html#library"]');
    if (sh) { sh.classList.add("fb-back"); sh.setAttribute("aria-label", "Back to the shelf"); sh.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg><span>Shelf</span>'; }
    var lh = document.querySelector(".section-head h2");
    if (/play=1/.test(location.search)) {
      var n = 0; (function tryPlay() { var btn = document.getElementById("heroPodcastBtn"); if (btn && window.TSB_BOOK_READY !== false && n > 6) { btn.click(); return; } if (n++ < 30) setTimeout(tryPlay, 150); })();
    }
    void lh;
  }

  /* ============================================================
     ABOUT (about.html): opens like a book
     ============================================================ */
  function initAbout() {
    var n = books().length || 520, L = 0, M = 0, langs = 26;
    books().forEach(function (b) { L += lessons(b); M += mins(b); });
    try { if (window.TSB_LANG && TSB_LANG.list) langs = TSB_LANG.list.length; } catch (e) {}
    var logs = [];
    document.querySelectorAll("#logGrid .logitem, #logGrid > *").forEach(function (el) {
      var t = (el.querySelector(".logitem__v, .logitem__ver, b, strong, h3") || el).textContent || "";
      var m = t.match(/v\s?(\d{3})/i); if (m && logs.indexOf(m[1]) < 0) logs.push(m[1]);
    });
    if (!logs.length) for (var v = 331; v > 300; v--) logs.push(String(v));
    var COLS = ["#FFC800", "#2F7D5B", "#6F5BD9", "#FF7A59", "#1F3A5F", "#FFA9CC", "#25C79C", "#A67C52", "#E9C46A", "#BFE3FF"];
    var spines = logs.slice(0, 24).map(function (v, i) { var c = COLS[i % COLS.length], dark = /#(2F7D5B|6F5BD9|1F3A5F|A67C52)/.test(c); return '<a href="#logGrid" style="height:' + (120 + (seed(v) % 50)) + "px;background:" + c + ";color:" + (dark ? "#FBF8F1" : "#16130F") + '"><span>v' + v + "</span></a>"; }).join("");
    var fa = document.createElement("section");
    fa.className = "fa"; fa.id = "filmAbout"; fa.setAttribute("aria-label", "About TheSmallBook");
    fa.innerHTML =
      '<div class="fa-book" id="faBook"><div class="fa-book__in"><div class="fa-page"><b>Big books.<br><i>Small reads.</i></b><p>Every great book, cracked open into the few ideas that matter, in your language.</p><s></s><s style="width:80%"></s><s></s><s style="width:60%"></s></div>' +
      '<div class="fa-lid"><div class="fa-lid__f"><span>THE<em>SMALL</em>BOOK</span><small>BY JASH GANDHI \u00b7 MUMBAI</small></div><div class="fa-lid__b"></div></div></div></div>' +
      '<h1 class="fa-h1">Why this <i>exists.</i></h1>' +
      '<p class="fa-sub">Most of us will never finish the books that could change us. Not because we are lazy, because life is full. So we made the small version: honest, warm and free to read.</p>' +
      '<div class="fa-nums">' + [[n, "books, cracked open"], [L, "lessons you can use"], [M, "minutes, all of it"], [langs, "languages to read in"]].map(function (x) { return '<div class="fa-num"><b data-count="' + x[0] + '">0</b><span>' + x[1] + "</span></div>"; }).join("") + "</div>" +
      '<h2 class="fa-sec">How a lesson is <i>made</i></h2><div class="fa-steps">' +
      [["Read the whole book", "Cover to cover, with a pencil. No summaries of summaries."], ["Find the few ideas", "The handful of lessons the book is really about, in plain words."], ["Show it working", "An example from the book and one from life in India today."], ["Give you one thing to try", "Every book ends with an action you can do this week."], ["Make it yours", "Read it, hear it, in your language. Night mode is warm, never blue."]].map(function (s) { return '<div class="fa-step"><div><b>' + s[0] + "</b><span>" + s[1] + "</span></div></div>"; }).join("") + "</div>" +
      '<h2 class="fa-sec">Every release, on the <i>shelf</i></h2><div class="fa-log">' + spines + '</div><div class="fa-plank"></div>' +
      '<div class="fa-maker"><span class="fa-maker__ph"><img src="assets/jash-gandhi.jpg" alt="Jash Gandhi, founder of TheSmallBook" width="600" height="684" loading="lazy" decoding="async" onerror="this.parentNode.classList.add(\'is-noimg\')"><em>J</em></span>' +
        '<div class="fa-maker__t"><small>MADE BY</small><b>Jash Gandhi</b><span>Student, builder, reader. Made in Mumbai with a lot of chai.</span>' +
        '<a class="fa-maker__ig" href="https://instagram.com/jash._gandhi7" target="_blank" rel="noopener">@jash._gandhi7</a></div></div>' +
      '<p class="fa-more">The full story and every update are below</p>';
    var nav = $(".nav");
    if (nav && nav.parentNode) nav.parentNode.insertBefore(fa, nav.nextSibling); else document.body.insertBefore(fa, document.body.firstChild);
    root.classList.add("fv-about");
    setTimeout(function () { var bk = document.getElementById("faBook"); if (bk) bk.classList.add("open"); }, 500);
    var counted = false;
    function count() {
      if (counted) return; counted = true;
      fa.querySelectorAll("[data-count]").forEach(function (el) {
        var to = Number(el.getAttribute("data-count")), t0 = 0;
        function f(ts) { if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / 1400), e = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(to * e).toLocaleString("en-IN"); if (k < 1) requestAnimationFrame(f); }
        requestAnimationFrame(f);
      });
    }
    if ("IntersectionObserver" in window) { var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { count(); io.disconnect(); } }); }, { threshold: .3 }); io.observe(fa.querySelector(".fa-nums")); } else count();
  }

  /* ============================================================
     YOU (you.html)
     ============================================================ */
  function initYou() {
    var host = document.getElementById("filmYou"); if (!host) return;
    var nm = name() || "Reader", signed = false, email = "";
    try { if (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) { signed = true; var u = TSB_AUTH.user(); email = (u && (u.email || (u.user_metadata && u.user_metadata.full_name))) || ""; } } catch (e) {}
    if (!signed) try { var s = JSON.parse(localStorage.getItem("tsb_auth_session")); if (s && (s.user || s.access_token)) { signed = true; email = (s.user && s.user.email) || ""; } } catch (e) {}
    var streak = 0, lessonsRead = 0;
    try { streak = TSB.streak.count(); lessonsRead = TSB.progress.totalRead(); } catch (e) {}
    var fin = [], started = [];
    books().forEach(function (b) { var c = readCount(b.id); if (!c) return; if (finished(b)) fin.push(b); else started.push(b); });
    var week = weekMinutes(), weekTot = week.reduce(function (a, x) { return a + x; }, 0);
    var goal = (Number(lsGet("tsb_read_minutes", 10)) || 10) * 7;
    var days = lsGet("tsb_days", []); days = Array.isArray(days) ? days : [];
    var yr = String(new Date().getFullYear()), daysYr = days.filter(function (d) { return d.indexOf(yr) === 0; }).length;
    var bday = lsGet("tsb_birthday", "");
    var since = bday ? new Date(bday + "T12:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";
    var C = 2 * Math.PI * 50, k = Math.min(1, goal ? weekTot / goal : 0);
    var mx = Math.max(10, Math.max.apply(null, week));
    var DOW = ["M", "T", "W", "T", "F", "S", "S"], today = (new Date().getDay() + 6) % 7;
    var shelf = (fin.length ? fin : started).slice(0, 30);
    var hlMap = lsGet("tsb_highlights_v1", {}) || {}, hls = [];
    Object.keys(hlMap).forEach(function (bid) { (hlMap[bid] || []).forEach(function (h) { if (h && h.text) hls.push({ b: byId(bid), t: h.text, ts: h.ts || 0 }); }); });
    hls.sort(function (a, b) { return b.ts - a.ts; });
    var dark = root.classList.contains("dark"), tier = "";
    try { tier = localStorage.getItem("tsb_voice_tier") || ""; } catch (e) {}
    var lang = "English";
    try { var lc = window.TSB_LANG ? TSB_LANG.get() : "en"; (TSB_LANG.list || []).forEach(function (l) { if (l.code === lc) lang = l.name; }); } catch (e) {}
    var mind = mindWords(), mins0 = Number(lsGet("tsb_read_minutes", 10)) || 10;
    var I = {
      acct: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20.4v-1a5.4 5.4 0 0 1 5.4-5.4h3.2a5.4 5.4 0 0 1 5.4 5.4v1"/></svg>',
      tune: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
      globe: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
      moon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
      voice: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/></svg>',
      kid: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4 4 0 0 0 7 0M9 10h.01M15 10h.01"/></svg>',
      note: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/></svg>',
      info: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>'
    };
    /* v334: Gold members see their plan here, not an offer */
    function goldCard() {
      var g = false, pdf = false, inf = {};
      try { g = !!TSB_GOLD.isGold(); pdf = !!(TSB_GOLD.hasPdf && TSB_GOLD.hasPdf()); inf = TSB_GOLD.info() || {}; } catch (e) {}
      var until = "";
      try { if (inf.expires) until = inf.expires.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch (e) {}
      var pl = inf.plan === "gold-yearly" ? "Yearly" : inf.plan === "gold-monthly" ? "Monthly" : inf.plan === "founder" ? "Founder" : "Gold";
      if (g) return '<span class="fy-gold__seal" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><div><b>You are Gold</b><span>' + esc(pl) + (until && inf.plan !== "founder" ? " \u00b7 until " + esc(until) : "") + "</span></div><em>Manage</em>";
      if (pdf) return '<span class="fy-gold__seal" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><div><b>PDF pass is on</b><span>' + (until ? "Until " + esc(until) + " \u00b7 " : "") + "Gold adds voices and deep dives</span></div><em>Upgrade</em>";
      return "<div><b>TheSmallBook Gold</b><span>Cheat-sheets, natural voices, deep dives</span></div><em>\u20b999 / month</em>";
    }
    var h = "";
    h += '<div class="fy-hd f-up"><div class="fy-av">' + esc(nm.charAt(0).toUpperCase()) + '</div><div><h1>' + esc(nm) + "</h1><p>" + (signed ? esc(email || "Signed in") + " \u00b7 synced" : since ? "Reading since " + esc(since) : "Reading on this device") + '</p></div><a class="fy-hd__gear" href="settings.html" aria-label="Settings">' + ICON.gear + "</a></div>";
    h += '<section class="fy-year f-up" style="--d:.1"><div class="f-kick">YOUR READING YEAR \u00b7 ' + yr + '</div><div class="fy-year__row"><div class="fy-ring"><svg viewBox="0 0 116 116"><circle class="bg" cx="58" cy="58" r="50"/><circle class="fg" cx="58" cy="58" r="50" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '" data-off="' + (C * (1 - k)).toFixed(1) + '"/></svg><div class="fy-ring__n"><b>' + weekTot + "</b><span>OF " + goal + " MIN</span></div></div>" +
      '<div class="fy-year__big">' + (streak ? "<i>" + streak + " day" + (streak === 1 ? "" : "s") + "</i> in a row." : "Today is a good <i>day one.</i>") + "<br>" + daysYr + " reading day" + (daysYr === 1 ? "" : "s") + " this year.</div></div>" +
      '<div class="fy-week" aria-label="Minutes this week">' + week.map(function (m, i) { return '<div><i class="' + (m ? "on" : "") + '" data-h="' + Math.max(6, Math.round(m / mx * 44)) + '" title="' + m + ' min"></i><span style="' + (i === today ? "color:#FFC800" : "") + '">' + DOW[i] + "</span></div>"; }).join("") + "</div></section>";
    h += '<div class="fy-stats f-up" style="--d:.2"><div class="fy-stat"><b>' + fin.length + '</b><span>Books finished</span></div><div class="fy-stat"><b>' + lessonsRead + '</b><span>Lessons read</span></div><div class="fy-stat"><b>' + streak + "</b><span>Day streak</span></div></div>";
    if (!signed) h += '<div class="fy-save f-up" style="--d:.25"><div><b>Keep it forever</b><span>Sign in to keep your shelf on every device.</span></div><a class="f-btn" href="login.html">Sign in</a></div>';
    h += '<div class="fy-sec"><h2>' + (fin.length ? "Finished" : "On your <i>shelf</i>") + "</h2>" + (shelf.length ? '<a href="index.html#library">Library</a>' : "") + '</div><div class="fy-shelf">' +
      (shelf.length ? '<div class="fy-spines">' + shelf.map(function (b, i) { var c = catCol(b.category); return '<a class="fy-spine" style="--i:' + i + ";height:" + (118 + (seed(b.id) % 34)) + "px;background:" + c[0] + ";color:" + c[1] + '" href="book.html?id=' + encodeURIComponent(b.id) + '" title="' + esc(b.title) + '"><span>' + esc(b.title) + "</span></a>"; }).join("") + "</div>" : '<div class="fy-empty">Books you open land here as spines on a shelf.<br><a href="index.html">Find today\u2019s pick</a></div>') +
      '<div class="fy-plank"></div></div>';
    h += '<div class="fy-sec"><h2>Highlights</h2>' + (hls.length ? '<a href="notes.html">All ' + hls.length + "</a>" : "") + "</div>" +
      (hls.length ? '<div class="fy-hls">' + hls.slice(0, 3).map(function (x) { return '<a class="fy-hl" href="' + (x.b ? "book.html?id=" + encodeURIComponent(x.b.id) : "notes.html") + '"><q>' + esc(x.t.length > 220 ? x.t.slice(0, 217) + "..." : x.t) + "</q><span>" + esc(x.b ? x.b.title : "") + "</span></a>"; }).join("") + "</div>"
        : '<div class="fy-shelf"><div class="fy-empty">Press and hold any line in a book to highlight it. It shows up here like a marker on paper.</div></div>');
    var kidsOn = lsGet("tsb_kids_show", 1) !== 0;
    var KIDS_CARD = '<a class="fy-kids" href="kids.html" aria-label="Open Kids mode: story time for little readers"><span class="fy-kids__sky" aria-hidden="true"><i class="fy-kids__sun"></i><i class="fy-kids__cloud"></i><i class="fy-kids__hill"></i><span class="fy-kids__pal">\ud83d\udc12</span><span class="fy-kids__pal">\ud83e\udd81</span><span class="fy-kids__pal">\ud83d\udc22</span></span><span class="fy-kids__tx"><small>For your little one</small><b>Kids mode</b><span>Picture stories read aloud in English and Hindi. No ads, no chat, nothing leaves this phone.</span></span></a>';
    if (kidsOn) h += KIDS_CARD;
    h += '<a class="fy-gold" id="fyGold" href="gold.html">' + goldCard() + '</a>';
    h += '<div class="fy-sec"><h2>Settings</h2></div><div class="fy-list">' +
      '<button class="fy-li" type="button" data-fy="tune">' + I.tune + "Tune my shelf<em>" + esc(mind.length ? mind.join(", ") : "Pick interests") + " \u00b7 " + mins0 + " min</em></button>" +
      '<button class="fy-li" type="button" data-fy="lang">' + I.globe + "Language<em>" + esc(lang) + "</em></button>" +
      '<button class="fy-li" type="button" data-fy="dark">' + I.moon + 'Night mode<span class="fy-tg' + (dark ? " on" : "") + '"></span></button>' +
      '<button class="fy-li" type="button" data-fy="voice">' + I.voice + 'Natural reading voice<span class="fy-tg' + (tier === "studio" ? " on" : "") + '"></span></button>' +
      '<button class="fy-li" type="button" data-fy="kids">' + I.kid + 'Kids mode<em id="fyKidsState">' + (kidsOn ? "Story time" : "Hidden") + "</em></button>" +
      '<a class="fy-li" href="notes.html">' + I.note + "Notebook<em>Notes and highlights</em></a>" +
      '<a class="fy-li" href="login.html">' + I.acct + (signed ? "Account" : "Sign in or create account") + "<em>" + (signed ? "Manage" : "Free") + "</em></a>" +
      '<a class="fy-li" href="settings.html">' + ICON.gear + "All settings<em></em></a>" +
      '<a class="fy-li" href="about.html">' + I.info + "About TheSmallBook<em>v335</em></a></div>";
    h += '<p class="fy-fine">Your reading data lives on your device' + (signed ? " and syncs privately to your account" : "") + '. Build tsb-v335. <a href="legal.html">Privacy</a></p>';
    host.innerHTML = h;
    setTimeout(function () {
      var fg = host.querySelector(".fy-ring .fg"); if (fg) fg.style.strokeDashoffset = fg.getAttribute("data-off");
      host.querySelectorAll(".fy-week i").forEach(function (i) { i.style.height = i.getAttribute("data-h") + "px"; });
    }, 120);
    function paintGold() { var gc = host.querySelector("#fyGold"); if (gc) { var nh = goldCard(); if (gc.innerHTML !== nh) { gc.innerHTML = nh; gc.classList.add("fy-gold--in"); } gc.classList.toggle("fy-gold--on", /fy-gold__seal/.test(nh)); } }
    paintGold();
    window.addEventListener("tsbgold", paintGold);
    window.addEventListener("tsb:gold-on", function () { try { TSB_GOLD.check().then(paintGold); } catch (e) {} });
    /* v334: Story time lives only here. The Kids mode row opens a small sheet to show or hide it. */
    function kidsSheet() {
      if (document.querySelector(".fy-pop")) return;
      var on = lsGet("tsb_kids_show", 1) !== 0;
      var w = document.createElement("div");
      w.className = "fy-pop"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Story time for kids");
      w.innerHTML = '<div class="fy-pop__scrim" data-pop-x></div><div class="fy-pop__card"><div class="fy-pop__grab"></div>' +
        '<div class="fy-pop__art" aria-hidden="true"><i class="fy-kids__sun"></i><span>\ud83d\udc12</span><span>\ud83e\udd81</span><span>\ud83d\udc22</span></div>' +
        '<h3>Story time for kids</h3><p>Picture stories read aloud in English and Hindi. It lives only here in You, so little ones never land on it from Today.</p>' +
        '<button type="button" class="fy-pop__row" data-pop-tg role="switch" aria-checked="' + on + '">Show Story time in You<span class="fy-tg' + (on ? " on" : "") + '"></span></button>' +
        '<a class="fy-pop__go" href="kids.html">Open Story time</a><button type="button" class="fy-pop__x" data-pop-x>Done</button></div>';
      document.body.appendChild(w);
      requestAnimationFrame(function () { w.classList.add("on"); });
      function close() { w.classList.remove("on"); setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 320); }
      w.addEventListener("click", function (ev) {
        if (ev.target.closest("[data-pop-x]")) { close(); return; }
        var tg = ev.target.closest("[data-pop-tg]");
        if (tg) {
          on = !on; lsSet("tsb_kids_show", on ? 1 : 0);
          tg.setAttribute("aria-checked", on ? "true" : "false"); tg.querySelector(".fy-tg").classList.toggle("on", on);
          var st = host.querySelector("#fyKidsState"); if (st) st.textContent = on ? "Story time" : "Hidden";
          var card = host.querySelector(".fy-kids");
          if (card && !on) { card.classList.add("fy-kids--out"); setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 300); }
          if (!card && on) { var anchor = host.querySelector("#fyGold"); if (anchor) { var tmp = document.createElement("div"); tmp.innerHTML = KIDS_CARD; var nc = tmp.firstChild; nc.classList.add("fy-kids--in"); anchor.parentNode.insertBefore(nc, anchor); } }
        }
      });
      document.addEventListener("keydown", function esc1(ev) { if (ev.key === "Escape") { close(); document.removeEventListener("keydown", esc1); } });
    }
    host.addEventListener("click", function (e) {
      var t = e.target.closest("[data-fy]"); if (!t) return;
      var a = t.getAttribute("data-fy");
      if (a === "tune" && window.TSB_ONBOARD) TSB_ONBOARD.start();
      if (a === "kids") kidsSheet();
      if (a === "lang" && window.TSB_LANG && TSB_LANG.open) TSB_LANG.open();
      if (a === "dark") { try { if (window.TSB && TSB.theme) TSB.theme.toggle(); else root.classList.toggle("dark"); } catch (x) {} var g = t.querySelector(".fy-tg"); if (g) g.classList.toggle("on", root.classList.contains("dark")); }
      if (a === "voice") { var on = (localStorage.getItem("tsb_voice_tier") || "") === "studio"; try { localStorage.setItem("tsb_voice_tier", on ? "device" : "studio"); } catch (x) {} var g2 = t.querySelector(".fy-tg"); if (g2) g2.classList.toggle("on", !on); }
    });
  }

  function themeColor() {
    var m = document.querySelector('meta[name="theme-color"]'); if (!m) return;
    m.setAttribute("content", page === "gold.html" ? "#0E0C09" : root.classList.contains("dark") ? "#15120E" : "#FBF8F1");
  }
  /* ============================================================
     v327 · POLISH: fewer words on buttons, calmer numbers, smoother
     motion. Everything here only re-dresses what the page already
     renders, so every old handler keeps working.
     ============================================================ */
  var ACR = { PDF: "PDF", PDFS: "PDFs", TSB: "TSB", AI: "AI", UPI: "UPI", GST: "GST", EN: "EN", OK: "OK", FAQ: "FAQ", ID: "ID" };
  var PROPER = { india: "India", indian: "Indian", hindi: "Hindi", english: "English", gold: "Gold", amazon: "Amazon", audible: "Audible", notion: "Notion", google: "Google", instagram: "Instagram", jash: "Jash", gandhi: "Gandhi", thesmallbook: "TheSmallBook", "@thesmallbook.in": "@thesmallbook.in" };
  var EMOJI_LEAD = /^\s*(?:(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2190-\u21FF\u2300-\u23FF\u2460-\u27BF\u2B00-\u2BFF\u2934\u2935\u3030\u303D\u00A9\u00AE])[\uFE0F\u200D]*)+\s*/;
  var ARROW_TAIL = /\s*(?:\u2192|\u2197|\u2193|->)\s*$/;
  function sentence(s) {
    var first = true;
    return s.toLowerCase().replace(/[@\w.'\u00C0-\u024F-]+/g, function (w) {
      var up = w.toUpperCase().replace(/[^A-Z]/g, "");
      var out = ACR[up] && w.replace(/[^A-Za-z]/g, "").length === up.length ? w.toUpperCase().replace(up, ACR[up]) : (PROPER[w] || w);
      if (first && /[a-z]/.test(out.charAt(0))) out = out.charAt(0).toUpperCase() + out.slice(1);
      first = false;
      return out;
    });
  }
  /* calm one control: strip a leading emoji and a trailing arrow, and turn SHOUTING into a sentence */
  function isIco(n) { var p = n.parentNode; return p && p.nodeType === 1 && /ico|icon/i.test(String(p.className || "")); }
  function calm(el) {
    if (!el || el.getAttribute("data-fcalm") === el.textContent) return;
    var tn = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false), n;
    while ((n = w.nextNode())) if (n.nodeValue.trim() && !isIco(n)) tn.push(n);
    tn.forEach(function (t, i) {
      var v = t.nodeValue;
      if (i === 0) v = v.replace(EMOJI_LEAD, "");
      if (i === tn.length - 1) v = v.replace(ARROW_TAIL, "");
      if (/[A-Z]{2}/.test(v) && !/[a-z]/.test(v)) v = sentence(v);
      if (v !== t.nodeValue) t.nodeValue = v;
    });
    el.setAttribute("data-fcalm", el.textContent);
    el.classList.add("f-calm");
  }
  /* exact rewrites where the old label says too much */
  var RELABEL = [
    ["#abMore", /^\+?\s*(\d+)\s+more audiobooks.*$/i, "Show $1 more"],
    ["#pcMoreShows", /^\+?\s*(\d+)\s+more shows.*$/i, "Show $1 more"],
    [".pc-browse", /^.*?(\d+)\s+episodes.*$/i, "$1 episodes"],
    [".pc-browse", /^.*browse episodes.*$/i, "Episodes"],
    [".pc-play", /^.*play latest.*$/i, "Play latest"],
    ["#resetOnboard", /^.*re-tune my library.*$/i, "Re-tune my library"],
    [".setbtn", /^.*re-tune now.*$/i, "Re-tune now"],
    [".setbtn", /^.*legal & privacy.*$/i, "Legal and privacy"],
    [".setbtn", /^.*open the plain guide.*$/i, "Open the plain guide"],
    ["#tsbWalkReplay", /^.*full tutorial.*$/i, "Play the tutorial"],
    ["#btnCreate", /^.*create my account.*$/i, "Create my account"],
    ["#goldBuyYearly", /^.*yearly.*999.*$/i, "Get Gold yearly \u00b7 \u20b9999"],
    ["#goldBuyMonthly", /^.*monthly.*99.*$/i, "Choose monthly \u00b7 \u20b999"],
    ["#goldBuyPdf", /^.*pdf.*49.*$/i, "Unlock PDFs \u00b7 \u20b949"],
    [".gs-open", /^.*listen to samples.*$/i, "Listen to samples"]
  ];
  var CALM_SEL = [".minibtn", "#expandBtn", ".pc-play", ".pc-browse", "#abMore", "#pcMoreShows", "#pcSearchGo", ".pc-cat", ".pc-ab__card button:not(.pc-ab__save)",
    ".goldplan-btn", "#gAct", ".gs-open", ".goldwrap .btn", ".setbtn", "#resetOnboard", "#tsbWalkReplay", "#btnCreate", "#tabCreate", "#tabSignin",
    "main .btn:not(.btn--icon)", ".fa .btn", "#openLogModal", ".gravecross__go", ".bookkit__h", ".dd-card__go", ".tsb-hero .btn", ".booknav .btn", "#tsb-auth-slot a", "#tsb-auth-slot button", ".pc-ab__ch"].join(",");
  function relabel(el) {
    var t = (el.textContent || "").replace(/\s+/g, " ").trim();
    for (var i = 0; i < RELABEL.length; i++) {
      var r = RELABEL[i];
      if (el.matches(r[0]) && r[1].test(t)) {
        var nt = t.replace(r[1], r[2]);
        var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false), n, all = [], best = null;
        while ((n = w.nextNode())) { if (!/[A-Za-z0-9]/.test(n.nodeValue) || isIco(n)) continue; all.push(n); if (!best || n.nodeValue.trim().length > best.nodeValue.trim().length) best = n; }
        all.forEach(function (x) { x.nodeValue = x === best ? nt : ""; });
        return;
      }
    }
  }
  function calmAll(scope) {
    var list;
    try { list = (scope || document).querySelectorAll(CALM_SEL); } catch (e) { return; }
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.closest(".nav, .tsb-bar, #filmToday, .fo, .chip, [data-fcalm-skip]")) continue;
      if (el.getAttribute("data-fcalm") === el.textContent) continue;
      relabel(el); calm(el);
    }
  }
  function watchCalm() {
    calmAll();
    var pending = 0;
    try {
      new MutationObserver(function () {
        if (pending) return;
        pending = setTimeout(function () { pending = 0; calmAll(); }, 120);
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
  }

  /* ---------- BOOK: the hero, the numbers, the accordion ---------- */
  var ICON2 = {
    more: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
  };
  function polishBookTop() {
    var links = $(".nav__links"); if (!links || $(".fb-more", links)) return;
    var card = $("#shareBtn");
    if (card) { card.removeAttribute("style"); card.classList.add("fb-card"); card.innerHTML = ICON2.share; card.setAttribute("aria-label", "Share this book"); links.appendChild(card); }
    var items = [["#shareLinkBtn", "Copy link"], ["#fontBtn", "Text size"], ["[data-lang-btn]", "Language"], ["[data-theme-toggle]", "Dark mode"]];
    var more = document.createElement("button");
    more.type = "button"; more.className = "btn btn--icon fb-more"; more.setAttribute("aria-label", "More"); more.setAttribute("aria-expanded", "false"); more.innerHTML = ICON2.more;
    var pop = document.createElement("div"); pop.className = "fb-pop"; pop.setAttribute("role", "menu");
    items.forEach(function (it) {
      var b = $(it[0], links); if (!b) return;
      b.classList.add("fb-pop__it"); b.setAttribute("role", "menuitem"); b.setAttribute("data-flabel", it[1]);
      pop.appendChild(b);
    });
    links.appendChild(more); links.appendChild(pop);
    function close() { pop.classList.remove("on"); more.setAttribute("aria-expanded", "false"); }
    more.addEventListener("click", function (e) { e.stopPropagation(); var on = !pop.classList.contains("on"); pop.classList.toggle("on", on); more.setAttribute("aria-expanded", on ? "true" : "false"); });
    pop.addEventListener("click", function (e) { if (e.target.closest(".fb-pop__it")) setTimeout(close, 60); });
    document.addEventListener("click", function (e) { if (!e.target.closest(".fb-pop, .fb-more")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }
  function polishBookCTA(b) {
    var rd = $("#nbOpenReader"), ls = $("#heroPodcastBtn"); if (!rd || !ls) return;
    var mR = mins(b), mL = Math.max(4, Math.round(mR * 1.3));
    function dress(btn, lblSel, fn) {
      var lbl = $(lblSel, btn); if (!lbl) return;
      var box = $(".fb-lbl", btn);
      if (!box) { box = document.createElement("span"); box.className = "fb-lbl"; box.innerHTML = "<b></b><small></small>"; btn.appendChild(box); }
      function paint() { var r = fn((lbl.textContent || "").trim()); box.firstChild.textContent = r[0]; box.lastChild.textContent = r[1]; btn.setAttribute("aria-label", r[0] + ", " + r[1]); }
      paint();
      try { new MutationObserver(paint).observe(lbl, { childList: true, characterData: true, subtree: true }); } catch (e) {}
    }
    dress(rd, ".nb-act-lbl", function (t) {
      var m = t.match(/page\s+(\d+)\s+of\s+(\d+)/i);
      return m ? ["Continue", "Page " + m[1] + " of " + m[2]] : ["Read", mR + " minutes"];
    });
    dress(ls, ".podcastbtn__label", function (t) {
      return /stop|pause/i.test(t) ? ["Stop", "Playing now"] : ["Listen", mL + " minutes"];
    });
    rd.classList.add("fb-cta"); ls.classList.add("fb-cta");
  }
  function polishBadges(b) {
    var host = $("#badges"); if (!host) return;
    function paint() {
      if (host.getAttribute("data-fdone") === "1" && $(".fb-chips", host)) return;
      var rc = readCount(b.id), L = lessons(b), q = (b.quotes && b.quotes.length) || 0, lang = "EN";
      try { lang = window.TSB_LANG ? (TSB_LANG.get() === "en" ? "EN" : TSB_LANG.get().toUpperCase()) : "EN"; } catch (e) {}
      host.setAttribute("data-fdone", "1");
      host.innerHTML = '<div class="fb-chips">' +
        '<span class="fb-chip">' + mins(b) + " min</span>" +
        '<span class="fb-chip">' + (rc ? rc + " of " + L + " read" : L + " lessons") + "</span>" +
        (q ? '<span class="fb-chip">' + q + " quotes</span>" : "") +
        '<button type="button" class="fb-chip fb-chip--lang" data-flang>\u0939\u093f\u0928\u094d\u0926\u0940 \u00b7 ' + esc(lang) + "</button></div>";
    }
    paint();
    try { new MutationObserver(function () { if (!$(".fb-chips", host)) { host.removeAttribute("data-fdone"); paint(); } }).observe(host, { childList: true }); } catch (e) {}
    host.addEventListener("click", function (e) { if (e.target.closest("[data-flang]")) { try { TSB_LANG.open(); } catch (e2) { var lb = $("[data-lang-btn]"); if (lb) lb.click(); } } });
  }
  function words(s) { return String(s || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length; }
  function polishLessons(b) {
    var wrap = $("#lessons"); if (!wrap) return;
    function dress() {
      var list = wrap.querySelectorAll(".lesson");
      for (var i = 0; i < list.length; i++) {
        var d = list[i], idx = parseInt(String(d.id).replace("lesson-", ""), 10);
        if (isNaN(idx)) continue;
        var num = $(".lesson__num", d), L = b.lessons && b.lessons[idx];
        if (num) {
          var isRead = /\u2713/.test(num.textContent) || num.getAttribute("data-fread") === "1";
          var label = ("0" + (idx + 1)).slice(-2);
          if (num.textContent !== label || !num.querySelector(".fb-tick") !== !isRead) {
            num.textContent = label;
            if (isRead) { num.insertAdjacentHTML("beforeend", '<span class="fb-tick">' + ICON2.check + "</span>"); num.setAttribute("data-fread", "1"); d.classList.add("is-read"); }
          }
        }
        var tg = $(".lesson__toggle", d);
        if (tg && !tg.getAttribute("data-fdone") && L) {
          var m = Math.max(1, Math.round(words(L.summary + " " + L.example + " " + L.action) / 200));
          tg.setAttribute("data-fdone", "1");
          tg.innerHTML = '<span class="fb-min">' + m + " min</span>" + ICON2.chev;
        }
      }
    }
    dress();
    var pend = 0;
    try { new MutationObserver(function () { if (!pend) pend = setTimeout(function () { pend = 0; dress(); }, 40); }).observe(wrap, { childList: true, subtree: true, characterData: true }); } catch (e) {}
    /* the list breathes open, it never jumps */
    var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    wrap.addEventListener("click", function (e) {
      var head = e.target.closest(".lesson__head"); if (!head || reduce) return;
      var d = head.parentNode, body = $(".lesson__body", d); if (!body || !body.animate) return;
      var opening = d.classList.contains("open");
      if (opening) {
        var h = body.scrollHeight;
        body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" });
      } else {
        var h2 = body.scrollHeight || 0;
        d.classList.add("is-closing");
        var an = body.animate([{ height: h2 + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 300, easing: "cubic-bezier(.4,0,.2,1)" });
        an.onfinish = function () { d.classList.remove("is-closing"); };
      }
    });
  }
  function polishBook() {
    var id = new URLSearchParams(location.search).get("id");
    var b = id && byId(id); if (!b) return;
    polishBookTop(); polishBookCTA(b); polishBadges(b); polishLessons(b);
    var rel = $("#related"); if (rel && rel.previousElementSibling) calm(rel.previousElementSibling);
  }

  var NAVI = {
    library: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4v16H5zM10 4h4v16h-4zM15.5 5l3.5-.8 2.6 15.6-3.5.8z"/></svg>',
    grave: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V10a6 6 0 0 1 12 0v11M4 21h16M12 9v6M9.5 11.5h5"/></svg>',
    listen: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
    stories: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    login: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/></svg>'
  };

  /* ---------- the old two-row header on secondary pages: one quiet row ---------- */
  function polishNav() {
    var nav = $("nav.nav"), links = nav && $(".nav__links", nav);
    if (!links || $(".fb-more", links) || /fv-(book|gold|listen|lib|today)/.test(root.className) || page === "index.html") return;
    var kids = [].slice.call(links.children).filter(function (el) { return /^(A|BUTTON)$/.test(el.tagName); });
    if (!kids.length) return;
    root.classList.add("fv-nav");
    var more = document.createElement("button");
    more.type = "button"; more.className = "btn btn--icon fb-more"; more.setAttribute("aria-label", "More"); more.setAttribute("aria-expanded", "false"); more.innerHTML = ICON2.more;
    var pop = document.createElement("div"); pop.className = "fb-pop"; pop.setAttribute("role", "menu");
    kids.forEach(function (el) {
      var txt = (el.textContent || "").replace(EMOJI_LEAD, "").replace(ARROW_TAIL, "").trim();
      var lbl = /[A-Za-z]{3}/.test(txt) ? sentence(txt) : (el.getAttribute("aria-label") || el.getAttribute("title") || "").replace(/\s*\(.*\)$/, "");
      if (/[A-Za-z]{3}/.test(txt)) {
        var k = /grave/i.test(lbl) ? "grave" : /listen|audio|podcast/i.test(lbl) ? "listen" : /stor/i.test(lbl) ? "stories" : /log ?in|sign/i.test(lbl) ? "login" : "library";
        el.innerHTML = NAVI[k];
      }
      el.classList.add("fb-pop__it"); el.setAttribute("role", "menuitem"); el.setAttribute("data-flabel", lbl);
      pop.appendChild(el);
    });
    links.appendChild(more); links.appendChild(pop);
    function close() { pop.classList.remove("on"); more.setAttribute("aria-expanded", "false"); }
    more.addEventListener("click", function (e) { e.stopPropagation(); var on = !pop.classList.contains("on"); pop.classList.toggle("on", on); more.setAttribute("aria-expanded", on ? "true" : "false"); });
    pop.addEventListener("click", function (e) { if (e.target.closest(".fb-pop__it")) setTimeout(close, 60); });
    document.addEventListener("click", function (e) { if (!e.target.closest(".fb-pop, .fb-more")) close(); });
  }

  /* ---------- GOLD: one screen, one choice, said plainly ---------- */
  function polishGold() {
    var wrap = $(".goldwrap"); if (!wrap || $("#fgPanel")) return;
    var p = document.createElement("section");
    p.className = "fg"; p.id = "fgPanel"; p.setAttribute("aria-label", "TheSmallBook Gold");
    wrap.insertBefore(p, wrap.firstChild);
    var plan = "y", mode = "";
    var F = [["Deep dives on every book", ""], ["Unlimited PDF cheat-sheets", ""], ["Natural voices, every book", ""], ["Studio Pro, no watermark", ""], ["A streak freeze every month", ""], ["Offline library and export", "Soon"]];
    var I = {
      dive: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5z"/><path d="M8 7h7M8 11h5"/>',
      pdf: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
      voice: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3"/>',
      studio: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
      flame: '<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 8 0 5 3 8 7 8z"/>',
      store: '<path d="M3 9l1.5-5h15L21 9M3 9h18v11H3zM9 20v-6h6v6"/>',
      soon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
    };
    function ic(k) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[k] + "</svg>"; }
    var TILES = [
      ["dive", "Deep dives", "Long reads behind the big books, all open.", "deepdive.html?id=dd-atomic-identity"],
      ["pdf", "PDF cheat-sheets", "Unlimited, for every book. Open a book, tap Cheat-sheet.", "index.html#library"],
      ["voice", "Natural voices", "Every book read aloud in a human-sounding voice.", "podcasts.html"],
      ["studio", "Studio Pro", "Quote cards with Pro filters and no watermark.", "write.html"],
      ["flame", "Streak freeze", "Miss one day a month, keep your streak.", "you.html"],
      ["store", "Case files", "Every startup autopsy in the store, unlocked.", "store.html"]
    ];
    var head = '<a class="fg-x" href="index.html" aria-label="Close"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a>' +
      '<div class="fg-wm">THE<span>SMALL</span>BOOK</div><h1 class="fg-h">Gold</h1>';
    function until() {
      try { var inf = TSB_GOLD.info ? TSB_GOLD.info() : null; if (inf && inf.expires) return inf.expires.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch (e) {}
      return "";
    }
    function planName() {
      try { var pl = (TSB_GOLD.info() || {}).plan || ""; return pl === "gold-yearly" ? "Yearly" : pl === "gold-monthly" ? "Monthly" : pl === "founder" ? "Founder" : pl === "pdf-75d" ? "PDF pass" : "Gold"; } catch (e) { return "Gold"; }
    }
    function render() {
      var g = false, pdf = false;
      try { g = !!TSB_GOLD.isGold(); pdf = !!(TSB_GOLD.hasPdf && TSB_GOLD.hasPdf()); } catch (e) {}
      var m = g ? "gold" : pdf ? "pdf" : "buy";
      if (m === mode) return;
      mode = m;
      root.classList.toggle("fg-yours", m === "gold");
      if (m === "gold") {
        var u = until();
        p.innerHTML = head +
          '<div class="fgy-k">YOUR GOLD</div>' +
          '<div class="fgy-card"><span class="fgy-seal">' + ICON2.check + '</span><div><b>You are Gold' + (name() ? ", " + esc(name()) : "") + '.</b><small>' + esc(planName()) + (u ? " \u00b7 until " + esc(u) : "") + "</small></div></div>" +
          '<div class="fgy-grid">' + TILES.map(function (t, i) {
            return '<a class="fgy-t" style="--i:' + i + '" href="' + t[3] + '"><span class="fgy-ic">' + ic(t[0]) + '</span><b>' + esc(t[1]) + "</b><small>" + esc(t[2]) + '</small><span class="fgy-on">On</span></a>';
          }).join("") + "</div>" +
          '<div class="fgy-soon"><span class="fgy-ic fgy-ic--s">' + ic("soon") + '</span><div><b>Coming to Gold</b><small>Offline library and export, then chapter-by-chapter audio.</small></div></div>' +
          '<p class="fg-fine">Thank you for keeping the library free for everyone.</p>';
        return;
      }
      p.innerHTML = head +
        '<p class="fg-tag">The whole library, a little deeper.</p>' +
        (m === "pdf" ? '<div class="fgy-card fgy-card--pdf"><span class="fgy-seal">' + ICON2.check + '</span><div><b>Your PDF pass is on.</b><small>Unlimited cheat-sheets' + (until() ? " until " + esc(until()) : "") + ". Gold adds everything below.</small></div></div>" : "") +
        '<ul class="fg-list">' + F.map(function (f, i) { return '<li style="--i:' + i + '"><span class="fg-c">' + ICON2.check + "</span>" + esc(f[0]) + (f[1] ? "<em>" + f[1] + "</em>" : "") + "</li>"; }).join("") + "</ul>" +
        '<div class="fg-plans" role="radiogroup" aria-label="Choose a plan">' +
          '<button type="button" class="fg-plan' + (plan === "m" ? " on" : "") + '" role="radio" aria-checked="' + (plan === "m") + '" data-fplan="m"><small>Monthly</small><b>\u20b999<span> a month</span></b><i>Cancel anytime</i></button>' +
          '<button type="button" class="fg-plan' + (plan === "y" ? " on" : "") + '" role="radio" aria-checked="' + (plan === "y") + '" data-fplan="y"><span class="fg-save">SAVE 16%</span><small>Yearly</small><b>\u20b9999<span> a year</span></b><i>About \u20b983 a month</i></button>' +
        "</div>" +
        '<button type="button" class="fg-cta" id="fgCta"><span class="fg-shim"></span><span class="fg-cta__t">' + (plan === "y" ? "Start Gold \u00b7 \u20b9999 a year" : "Start Gold \u00b7 \u20b999 a month") + "</span></button>" +
        '<p class="fg-fine">Pay once with UPI. No auto-debit. ' + (m === "pdf" ? "" : 'Just want the PDFs? <button type="button" class="fg-link" data-fpdf>A 75-day pass is \u20b949</button>') + "</p>" +
        '<p class="fg-fine"><button type="button" class="fg-link" data-fact>Have a code?</button></p>' +
        '<button type="button" class="fg-more" id="fgMore" aria-expanded="false">See everything in Gold ' + ICON2.chev + "</button>";
    }
    root.classList.add("fg-collapsed");
    function setPlan(v) {
      plan = v;
      p.querySelectorAll(".fg-plan").forEach(function (b) { var on = b.getAttribute("data-fplan") === v; b.classList.toggle("on", on); b.setAttribute("aria-checked", on ? "true" : "false"); });
      var t = $(".fg-cta__t", p); if (t) t.textContent = v === "y" ? "Start Gold \u00b7 \u20b9999 a year" : "Start Gold \u00b7 \u20b999 a month";
    }
    function expand(target) {
      root.classList.remove("fg-collapsed");
      var m = $("#fgMore"); if (m) { m.setAttribute("aria-expanded", "true"); m.style.display = "none"; }
      if (target) setTimeout(function () { var el = $(target); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
    }
    function buy(k) { if (window.TSB_GOLDPAY) TSB_GOLDPAY.start(k); }
    p.addEventListener("click", function (e) {
      var pl = e.target.closest("[data-fplan]"); if (pl) { setPlan(pl.getAttribute("data-fplan")); return; }
      if (e.target.closest("#fgCta")) { buy(plan === "y" ? "gold_yearly" : "gold_monthly"); return; }
      if (e.target.closest("[data-fpdf]")) { buy("pdf_75d"); return; }
      if (e.target.closest("[data-fact]")) { var gx = $("#gActBox"); if (gx) gx.hidden = false; expand("#gActBox"); setTimeout(function () { var ci = $("#gCode"); if (ci) ci.focus(); }, 500); return; }
      if (e.target.closest("#fgMore")) { expand("#goldGrid"); }
    });
    render();
    window.addEventListener("tsbgold", render);
    window.addEventListener("tsb:gold-on", function () { try { TSB_GOLD.check().then(render); } catch (e) {} });
    if (/#(goldPricing|gActBox|goldCompare|goldGrid)/.test(location.hash)) expand(location.hash);
  }

  function boot() {
    themeColor();
    if (page === "index.html" && document.getElementById("grid")) initIndex();
    else if (page === "book.html") { initBook(); polishBook(); }
    else if (page === "about.html") initAbout();
    else if (page === "you.html") initYou();
    else if (page === "gold.html") { root.classList.add("fv-gold"); polishGold(); }
    else if (page === "podcasts.html") root.classList.add("fv-listen");
    else if (page === "reader.html") root.classList.add("fv-reader");
    polishNav();
    watchCalm();
  }
  window.TSB_FILM = { version: "331", weekMinutes: weekMinutes, todaysPick: todaysPick };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
