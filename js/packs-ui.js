/* ============================================================
   THESMALLBOOK, READING JOURNEYS UI (home strip + pack sheet)
   House style only: paper cards, 3px ink borders, hard shadows.
   Saved pack shows on Home as the first shelf; the sheet shows
   the pack as a proper shelf of standing covers, day by day,
   with live progress from the reader's own progress marks.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_PACKS_UI) return;
  window.TSB_PACKS_UI = true;

  var PACKS = window.TSB_PACKS || [];
  var KEY = "tsb_pack";

  function savedId() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function byId(id) { return PACKS.filter(function (p) { return p.id === id; })[0] || null; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }

  function lessonsDone(bookId) {
    try {
      var TSB = window.TSB;
      if (TSB && TSB.progress && TSB.progress.forBook) return TSB.progress.forBook(bookId).length;
    } catch (e) {}
    try {
      var p = JSON.parse(localStorage.getItem("tsb_progress")) || {};
      return (p[bookId] && p[bookId].length) || 0;
    } catch (e) { return 0; }
  }
  function lessonsTotal(bookId) {
    try {
      var B = (window.BOOKS || []).filter(function (b) { return b.id === bookId; })[0];
      return B ? B.lessons.length : 0;
    } catch (e) { return 0; }
  }

  /* ---------- the strip on Home ---------- */
  function strip() {
    var host = document.getElementById("tsbJourneys");
    if (!host || !PACKS.length) return;
    var save = savedId(), h = "";
    /* v333: each journey shows its real books, fanned like a little stack */
    function bookOf(id) { return (window.BOOKS || []).filter(function (b) { return b.id === id; })[0]; }
    function card(p, mine) {
      var bs = p.books.map(bookOf).filter(Boolean);
      var done = bs.filter(function (b) { return lessonsDone(b.id) > 0; }).length;
      var fan = bs.slice(0, 3).map(function (b, k) { return '<img src="' + esc(b.cover) + '" alt="" loading="lazy" decoding="async" style="--k:' + k + '">'; }).join("");
      return '<button type="button" class="pk-card' + (mine ? " pk-card--mine" : "") + '" data-open="' + esc(p.id) + '" style="--pk:' + esc(p.hue) + '">' +
        '<span class="pk-card__fan">' + fan + "</span>" +
        '<span class="pk-card__tx">' + (mine ? '<em>Your journey</em>' : "") + "<b>" + esc(p.title) + "</b>" +
        "<small>" + (mine ? done + " of " + bs.length + " started" : bs.length + " books \u00b7 " + p.days + " days") + "</small>" +
        (mine ? '<i class="pk-card__bar"><s style="width:' + Math.round(done / Math.max(1, bs.length) * 100) + '%"></s></i>' : "") +
        "</span></button>";
    }
    var sp = byId(save);
    if (sp) h += card(sp, true);
    PACKS.forEach(function (p) { if (p.id !== save) h += card(p, false); });
    host.innerHTML = '<div class="pk-hd"><h3>Reading journeys</h3><p>' + (save ? "Your journey waits here. Pick another anytime." : "A few books in a row, one idea at a time.") + "</p></div>" +
      '<div class="pk-rail">' + h + "</div>";
    host.querySelectorAll("[data-open]").forEach(function (b) {
      b.addEventListener("click", function () { openSheet(b.getAttribute("data-open")); });
    });
  }

  /* ---------- the pack sheet ---------- */
  function closeSheet() {
    var sh = document.getElementById("tsbPackSheet");
    if (sh) sh.remove();
    document.documentElement.classList.remove("pk-lock");
  }

  function openSheet(id) {
    var p = byId(id); if (!p) return;
    closeSheet();
    var isSaved = savedId() === p.id;
    var books = p.books.map(function (bid) { return (window.BOOKS || []).filter(function (b) { return b.id === bid; })[0]; }).filter(Boolean);
    var rows = "", day = 0, doneN = 0, nextSet = false;
    var CHK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    books.forEach(function (b) {
      day++;
      var d = lessonsDone(b.id), t = lessonsTotal(b.id);
      var pct = t ? Math.round(d / t * 100) : 0;
      if (pct === 100) doneN++;
      else if (d > 0) nextSet = true;
      var tick = pct === 100 ? '<span class="pk-day__tick is-full" aria-label="Finished">' + CHK + '</span>'
        : d > 0 ? '<span class="pk-day__tick">' + pct + "%</span>"
        : !nextSet ? (nextSet = true, '<span class="pk-day__tick pk-day__tick--go">Start</span>')
        : '<span class="pk-day__tick pk-day__tick--later" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>';
      rows += '<a class="pk-day' + (pct === 100 ? " is-done" : "") + '" href="book.html?id=' + b.id + '">' +
        '<span class="pk-day__n">Day ' + day + "</span>" +
        '<span class="pk-day__cov"><img src="' + esc(b.cover) + '" alt="" loading="lazy"></span>' +
        '<span class="pk-day__mid"><b>' + esc(b.title) + "</b><i>" + esc(b.author) + " · " + esc(b.readTime) + "</i>" +
        (d > 0 && pct < 100 ? '<span class="pk-day__bar"><i style="width:' + pct + '%"></i></span>' : "") + "</span>" + tick + "</a>";
    });
    var fan = books.slice(0, 5).map(function (b, i) { return '<img src="' + esc(b.cover) + '" alt="" style="--k:' + (i - (Math.min(books.length, 5) - 1) / 2) + '">'; }).join("");
    var w = document.createElement("div");
    w.id = "tsbPackSheet";
    w.innerHTML =
      '<div class="pk-sheet" role="dialog" aria-modal="true" aria-label="' + esc(p.title) + '" style="--pk:' + esc(p.hue) + '">' +
        '<div class="pk-sheet__top">' +
          '<button class="pk-sheet__x" id="pkClose" aria-label="Close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
          '<div class="pk-sheet__fan">' + fan + "</div>" +
          '<span class="pk-sheet__meta">Reading journey · ' + p.days + " days · " + books.length + " books</span>" +
          '<h2 class="pk-sheet__t">' + esc(p.title) + "</h2>" +
          '<p class="pk-sheet__l">' + esc(p.line) + "</p>" +
        "</div>" +
        '<div class="pk-sheet__acts">' +
          '<button class="pk-save' + (isSaved ? " is-saved" : "") + '" id="pkSave">' + (isSaved ? CHK + " On your shelf" : "Save this journey") + "</button>" +
          (isSaved ? '<button class="pk-unsave" id="pkUnsave">Remove</button>' : "") +
        "</div>" +
        (doneN ? '<p class="pk-sheet__prog">' + doneN + " of " + books.length + " finished</p>" : "") +
        '<div class="pk-days">' + rows + "</div>" +
        '<p class="pk-note">One short sitting a day finishes it in ' + p.days + " days. The ticks come from your real reading.</p>" +
      "</div>";
    document.body.appendChild(w);
    document.documentElement.classList.add("pk-lock");
    requestAnimationFrame(function () { w.classList.add("on"); });
    w.querySelector("#pkClose").addEventListener("click", closeSheet);
    w.addEventListener("click", function (e) { if (e.target === w) closeSheet(); });
    w.querySelector("#pkSave").addEventListener("click", function () {
      try { localStorage.setItem(KEY, p.id); } catch (e) {}
      closeSheet(); strip();
      try { if (window.TSB_COMMUNITY && TSB_COMMUNITY.say) TSB_COMMUNITY.say("Saved. Your journey leads Home now."); } catch (e) {}
    });
    var un = w.querySelector("#pkUnsave");
    if (un) un.addEventListener("click", function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      closeSheet(); strip();
    });
    document.addEventListener("keydown", function esc2(e) {
      if (e.key === "Escape") { closeSheet(); document.removeEventListener("keydown", esc2); }
    });
  }

  function boot() {
    var main = document.querySelector("main.grid") || document.getElementById("grid");
    if (!main || document.getElementById("tsbJourneys")) return;
    var host = document.createElement("section");
    host.id = "tsbJourneys";
    host.className = "pk-host";
    main.parentNode.insertBefore(host, main);
    strip();
    /* a saved pack also leads Home as its own shelf row */
    var save = savedId(), sp = byId(save);
    if (sp) {
      var tryRow = window.setInterval(function () {
        try {
          var TSBp = window.TSB && TSB.progress;
          if (!TSBp) return;
          var books = sp.books.map(function (bid) { return (window.BOOKS || []).filter(function (b) { return b.id === bid; })[0]; }).filter(Boolean);
          if (!books.length || !document.getElementById("grid")) return;
          var done = books.filter(function (b) { return lessonsDone(b.id) > 0; }).length;
          var sec = document.createElement("section");
          sec.className = "pk-homelead";
          sec.innerHTML = '<button class="pk-homelead__in" id="pkLead" style="--pk:' + sp.hue + '">' +
            '<span class="pk-homelead__emo">' + sp.emoji + "</span>" +
            '<span class="pk-homelead__mid"><b>MY JOURNEY · ' + esc(sp.title).toUpperCase() + "</b>" +
            "<i>" + done + " of " + books.length + " books started · day " + Math.min(done + 1, books.length) + " is waiting</i></span>" +
            '<span class="pk-homelead__go">CONTINUE \u2192</span></button>';
          var grid = document.getElementById("grid");
          grid.parentNode.insertBefore(sec, grid.firstChild.nextSibling ? grid : grid);
          document.getElementById("pkLead").addEventListener("click", function () { openSheet(sp.id); });
          window.clearInterval(tryRow);
        } catch (e) {}
      }, 600);
      window.setTimeout(function () { window.clearInterval(tryRow); }, 8000);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.TSB_PACKS_UI = { open: openSheet, refresh: strip, close: closeSheet };
})();
