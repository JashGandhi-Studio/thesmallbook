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
    var save = savedId(), sp = byId(save), h = "";
    if (sp) {
      var done = sp.books.filter(function (b) { return lessonsDone(b) > 0; }).length;
      h += '<button class="pk-chip pk-chip--mine" data-open="' + sp.id + '">' +
        '<span class="pk-chip__emo" style="background:' + sp.hue + '">' + sp.emoji + "</span>" +
        "<span><b>MY JOURNEY</b><i>" + esc(sp.title) + " · " + done + "/" + sp.books.length + " started</i></span>" +
        '<span class="pk-chip__go">OPEN \u2192</span></button>';
    }
    PACKS.forEach(function (p) {
      if (p.id === save) return;
      h += '<button class="pk-chip" data-open="' + p.id + '">' +
        '<span class="pk-chip__emo" style="background:' + p.hue + '">' + p.emoji + "</span>" +
        "<span><b>" + esc(p.title) + "</b><i>" + p.books.length + " books · " + p.days + " days</i></span>" +
        '<span class="pk-chip__go">' + (save ? "" : "PICK") + "\u2192</span></button>";
    });
    host.innerHTML = '<div class="pk-head"><span class="pk-head__t">\uD83D\uDCD6 READING JOURNEYS</span>' +
      '<span class="pk-head__s">' + (save ? "your pack waits on the shelf below" : "a shelf a day, a book a week") + "</span></div>" +
      '<div class="pk-strip">' + h + "</div>";
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
    var w = document.createElement("div");
    w.id = "tsbPackSheet";
    var rows = "", day = 0;
    books.forEach(function (b) {
      day++;
      var d = lessonsDone(b.id), t = lessonsTotal(b.id);
      var pct = t ? Math.round(d / t * 100) : 0;
      var tick = pct === 100 ? '<span class="pk-day__tick is-full">\u2713 DONE</span>'
        : d > 0 ? '<span class="pk-day__tick">' + pct + "%</span>"
        : '<span class="pk-day__tick pk-day__tick--go">START</span>';
      rows += '<a class="pk-day" href="book.html?id=' + b.id + '">' +
        '<span class="pk-day__n" style="background:' + p.hue + '">DAY ' + day + "</span>" +
        '<span class="pk-day__cov"><img src="' + esc(b.cover) + '" alt="" loading="lazy"></span>' +
        '<span class="pk-day__mid"><b>' + esc(b.title) + "</b><i>" + esc(b.author) + " · " + esc(b.readTime) + " · " + b.lessons.length + " lessons</i>" +
        '<span class="pk-day__bar"><i style="width:' + pct + '%;background:' + p.hue + '"></i></span></span>' + tick + "</a>";
    });
    w.innerHTML =
      '<div class="pk-sheet" role="dialog" aria-modal="true" aria-label="' + esc(p.title) + '">' +
        '<div class="pk-sheet__top" style="background:' + p.hue + '">' +
          '<button class="pk-sheet__x" id="pkClose" aria-label="Close">\u2715</button>' +
          '<span class="pk-sheet__emo">' + p.emoji + "</span>" +
          '<h2 class="pk-sheet__t">' + esc(p.title) + "</h2>" +
          '<p class="pk-sheet__l">' + esc(p.line) + "</p>" +
          '<span class="pk-sheet__meta">' + books.length + " BOOKS · " + p.days + " DAYS · " + esc(p.tag).toUpperCase() + "</span>" +
        "</div>" +
        '<div class="pk-sheet__acts">' +
          '<button class="pk-save" id="pkSave">' + (isSaved ? "\u2713 ON YOUR SHELF" : "SAVE THIS JOURNEY") + "</button>" +
          (isSaved ? '<button class="pk-unsave" id="pkUnsave">Remove</button>' : "") +
        "</div>" +
        '<div class="pk-shelfwrap">' +
          '<div class="pk-shelfrow">' +
            books.map(function (b) {
              return '<a class="pk-vol" href="book.html?id=' + b.id + '" title="' + esc(b.title) + '">' +
                '<img src="' + esc(b.cover) + '" alt=""><i>DAY ' + (books.indexOf(b) + 1) + "</i></a>";
            }).join("") +
          "</div>" +
          '<span class="pk-plank" style="background:' + p.hue + '"></span>' +
        "</div>" +
        '<div class="pk-days">' + rows + "</div>" +
        '<p class="pk-note">One short sitting a day finishes the journey in ' + p.days + " days. Your progress ticks come from your real reading.</p>" +
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
