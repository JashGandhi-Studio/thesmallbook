/* ============================================================
   THESMALLBOOK, TIME (js/timeline.js) · v404
   The screen-time idea, for a reading app.

   Every day keeps a small record: minutes spent in the app, how
   many pages were read, which books they were, and how long you
   listened. The You page grows a strip of days. Tap a day and it
   opens: the time, the books, the pages, the listening. The
   corner of the card opens the whole month.

   Where the history comes from
     · minutes: tsb_min_log, which this app has been writing since
       long before today, so the bars go back to your first day
     · pages and books: recorded here, from this build on
   Nothing here leaves the phone. It is not sent anywhere, and
   clearing your browser data clears it.

   Conventions: no em dashes, no optional chaining, no bare catch.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_TIME) return;

  var LOG = "tsb_min_log";          /* day -> seconds, written by film.js */
  var ACT = "tsb_day_acts";         /* day -> { p: pages, b: {id: n}, l: listen secs } */
  var FAV = "tsb_fav_days";         /* day keys the reader chose to keep marked */
  var COUNTED = "tsb_time_counted_pages"; /* this tab session only, stops refresh duplicates */
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function jget(k, d) {
    try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
  }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function key(d) {
    var x = d || new Date();
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  }
  function dayAt(k) { var p = String(k).split("-"); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0); }
  function today() { return key(new Date()); }

  function mins(k) {
    var log = jget(LOG, {}) || {};
    return Math.round((log[k] || 0) / 60);
  }
  function acts() { var a = jget(ACT, {}); return a && typeof a === "object" ? a : {}; }
  function actsOn(k) {
    var a = acts()[k];
    if (!a || typeof a !== "object") return { p: 0, b: {}, l: 0 };
    return { p: Number(a.p) || 0, b: a.b && typeof a.b === "object" ? a.b : {}, l: Number(a.l) || 0 };
  }
  function favouriteDays() {
    var a = jget(FAV, []);
    if (!Array.isArray(a)) return [];
    return a.filter(function (k, i) { return /^\d{4}-\d{2}-\d{2}$/.test(k) && a.indexOf(k) === i; }).sort();
  }
  function isFavourite(k) { return favouriteDays().indexOf(k) >= 0; }
  function toggleFavourite(k) {
    var a = favouriteDays(), i = a.indexOf(k), on = i < 0;
    if (on) a.push(k); else a.splice(i, 1);
    jset(FAV, a.sort());
    return on;
  }
  function favMark() {
    return '<svg class="tm-favico" viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M12 2.6l2.8 5.9 6.5.8-4.8 4.5 1.3 6.4L12 17l-5.8 3.2 1.3-6.4L2.7 9.3l6.5-.8z"/></svg>';
  }

  /* ---------- recording ---------- */
  function bump(k, bookId, pages, listenSecs) {
    var all = acts();
    var d = all[k];
    if (!d || typeof d !== "object") d = { p: 0, b: {}, l: 0 };
    if (pages) d.p = (Number(d.p) || 0) + pages;
    if (listenSecs) d.l = (Number(d.l) || 0) + listenSecs;
    if (bookId) d.b[bookId] = (Number(d.b[bookId]) || 0) + (pages || 1);
    all[k] = d;
    var keys = Object.keys(all).sort();
    while (keys.length > 400) { delete all[keys.shift()]; }
    jset(ACT, all);
    paintSoon();
  }
  var countedPages = {};
  try { countedPages = JSON.parse(sessionStorage.getItem(COUNTED) || "{}") || {}; } catch (e) { countedPages = {}; }
  function pageRead(bookId) {
    if (!bookId) return;
    var pageNo = "";
    try {
      if (window.TSB_READER && window.TSB_READER.bookId === bookId) pageNo = String(window.TSB_READER.cur);
    } catch (e) {}
    if (pageNo !== "") {
      var sig = today() + "|" + bookId + "|" + pageNo;
      if (countedPages[sig]) return;
      countedPages[sig] = 1;
      try { sessionStorage.setItem(COUNTED, JSON.stringify(countedPages)); } catch (e2) {}
    }
    bump(today(), bookId, 1, 0);
  }
  function listened(bookId, secs) { if (secs && secs > 0) bump(today(), bookId || "", 0, Math.round(secs)); }

  /* the reader tells us when a page turns to a new lesson */
  window.addEventListener("tsb:page", function (e) {
    var d = (e && e.detail) || {};
    if (d.bookId) pageRead(d.bookId);
  });
  /* The player is sampled every five seconds. A phone may throttle the
     timer while narration continues, so a segment can cover up to ninety
     seconds; a pause or a change of book closes the segment honestly. */
  var tick = null, lastMark = 0, lastBook = "";
  function watchPlayer() {
    if (tick) return;
    tick = setInterval(function () {
      var playing = false, bookId = "";
      try {
        var st = window.TSB_AUDIO && window.TSB_AUDIO.state ? window.TSB_AUDIO.state() : null;
        if (st && st.playing) { playing = true; bookId = st.bookId || ""; }
      } catch (e) {}
      var now = Date.now();
      if (!playing) { lastMark = 0; lastBook = ""; return; }
      if (lastMark) listened(lastBook || bookId, Math.min(90, (now - lastMark) / 1000));
      lastMark = now;
      lastBook = bookId;
    }, 5000);
  }
  try { watchPlayer(); } catch (e) {}

  /* ---------- painting ---------- */
  var host = null, monthView = false, cursor = null, jumpOpen = false;
  var suppressDayKey = "", suppressDayUntil = 0, suppressNavUntil = 0;

  function bookName(id) {
    try {
      var B = window.BOOKS || [];
      for (var i = 0; i < B.length; i++) if (B[i].id === id) return B[i].title;
    } catch (e) {}
    return String(id || "").replace(/-/g, " ");
  }

  function weekBars() {
    var out = [], d = new Date(), dow = (d.getDay() + 6) % 7;   /* Monday first */
    for (var i = 0; i < 7; i++) {
      var x = new Date(d);
      x.setDate(d.getDate() - dow + i);
      out.push({ k: key(x), d: x, m: mins(key(x)), future: x > d && key(x) !== today() });
    }
    return out;
  }

  function fmtMin(m) {
    if (!m) return "0 min";
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60), r = m % 60;
    return h + " h" + (r ? " " + r + " min" : "");
  }

  function stripHtml() {
    var bars = weekBars();
    var max = 1;
    bars.forEach(function (b) { if (b.m > max) max = b.m; });
    var total = bars.reduce(function (a, b) { return a + b.m; }, 0);
    var best = bars.slice().sort(function (a, b) { return b.m - a.m; })[0];
    var html = '<div class="tm-card tm-week">' +
      '<div class="tm-head">' +
        '<div><p class="tm-kick">YOUR TIME</p>' +
        '<h2 class="tm-title">' + (total ? fmtMin(total) + " <i>this week</i>" : "Your first minute <i>is close</i>") + "</h2></div>" +
        '<button class="tm-more" type="button" data-tm-month aria-label="See the whole month">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>' +
          "<span>Month</span></button>" +
      "</div>" +
      '<p class="tm-sub">' + (total ? "Tap a day to see what you read. Heaviest day: " + DOW[best.d.getDay()] + ", " + fmtMin(best.m) + "." : "Read one page and this fills up.") + "</p>" +
      '<div class="tm-bars" role="list">' +
      bars.map(function (b) {
        var h = Math.max(3, Math.round((b.m / max) * 100));
        var on = b.k === today();
        return '<button class="tm-bar' + (on ? " on" : "") + (b.m ? " has" : "") + (isFavourite(b.k) ? " fav" : "") + '" type="button" role="listitem" data-tm-day="' + b.k + '"' + (b.future ? " disabled" : "") + ' aria-label="' + DOW[b.d.getDay()] + " " + b.d.getDate() + ", " + fmtMin(b.m) + (isFavourite(b.k) ? ", favourite date" : "") + '">' +
          '<span class="tm-bar__v">' + (b.m ? b.m : "") + "</span>" +
          (isFavourite(b.k) ? '<span class="tm-bar__fav">' + favMark() + "</span>" : "") +
          '<span class="tm-bar__f" style="height:' + (b.future ? 3 : h) + '%"></span>' +
          '<span class="tm-bar__d">' + DOW[b.d.getDay()].charAt(0) + "</span>" +
        "</button>";
      }).join("") +
      "</div>" +
      '<div class="tm-foot">' +
        '<span>Today <b>' + fmtMin(mins(today())) + "</b></span>" +
        '<span><b>' + bars.filter(function (b) { return b.m > 0; }).length + "</b> of 7 days read</span>" +
        '<span><b>' + fmtMin(Math.round(total / 7)) + "</b> a day</span>" +
      "</div>" +
    "</div>";
    return html;
  }

  function daySheetHtml(k) {
    var a = actsOn(k), m = mins(k);
    var ids = Object.keys(a.b).sort(function (x, y) { return a.b[y] - a.b[x]; });
    var d = dayAt(k);
    var isToday = k === today();
    var body = "";
    if (!m && !ids.length) {
      body = '<p class="tm-empty">Nothing recorded on this day.</p>';
    } else {
      body =
        '<div class="tm-day__stats">' +
          '<div><b>' + fmtMin(m) + "</b><span>in the app</span></div>" +
          '<div><b>' + a.p + "</b><span>" + (a.p === 1 ? "page read" : "pages read") + "</span></div>" +
          '<div><b>' + (a.l ? fmtMin(Math.round(a.l / 60)) : "0 min") + "</b><span>listened</span></div>" +
        "</div>" +
        (ids.length
          ? '<p class="tm-day__lab">WHAT YOU READ</p><ul class="tm-list">' + ids.map(function (id) {
              var n = a.b[id];
              return "<li>" + '<a href="book.html?id=' + encodeURIComponent(id) + '">' + esc(bookName(id)) + "</a>" +
                "<i>" + n + (n === 1 ? " page" : " pages") + "</i></li>";
            }).join("") + "</ul>"
          : '<p class="tm-empty">No pages recorded, only time in the app.</p>');
    }
    return '<div class="tm-day" role="dialog" aria-modal="true" aria-label="' + esc(fmtDate(d)) + '">' +
      '<div class="tm-day__card">' +
        '<div class="tm-day__top"><span class="tm-day__k">' + (isToday ? "TODAY" : esc(String(d.getFullYear()))) + "</span>" +
          '<button class="tm-x" type="button" data-tm-close aria-label="Close">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<h3 class="tm-day__t">' + esc(fmtDate(d)) + "</h3>" +
        '<button class="tm-favbtn' + (isFavourite(k) ? " on" : "") + '" type="button" data-tm-fav="' + k + '" aria-pressed="' + (isFavourite(k) ? "true" : "false") + '">' + favMark() + "<span>" + (isFavourite(k) ? "Favourite date" : "Mark as favourite") + "</span></button>" +
        body +
        '<button class="tm-done" type="button" data-tm-close>Done</button>' +
      "</div></div>";
  }

  function fmtDate(d) {
    return DOW[d.getDay()] + ", " + d.getDate() + " " + MON[d.getMonth()];
  }

  function monthHtml() {
    var base = cursor || new Date();
    var y = base.getFullYear(), m = base.getMonth();
    var first = new Date(y, m, 1, 12);
    var daysIn = new Date(y, m + 1, 0).getDate();
    var lead = (first.getDay() + 6) % 7;
    var cells = [], total = 0, readDays = 0, pages = 0;
    for (var i = 0; i < lead; i++) cells.push('<span class="tm-mo__pad"></span>');
    for (var d = 1; d <= daysIn; d++) {
      var k = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      var mm = mins(k), aa = actsOn(k);
      total += mm; pages += aa.p;
      if (mm > 0 || aa.p > 0) readDays += 1;
      var lvl = mm === 0 ? 0 : mm < 10 ? 1 : mm < 25 ? 2 : mm < 50 ? 3 : 4;
      var future = k > today();
      cells.push('<button class="tm-mo__d l' + lvl + (k === today() ? " on" : "") + (future ? " future" : "") + (isFavourite(k) ? " fav" : "") + '" type="button" data-tm-day="' + k + '"' + (future ? " disabled" : "") + ' aria-label="' + d + " " + MON[m] + (isFavourite(k) ? ", favourite date" : "") + '"><span>' + d + "</span>" + (isFavourite(k) ? favMark() : "") + "</button>");
    }
    var years = [];
    var seenYears = {};
    Object.keys(jget(LOG, {}) || {}).concat(Object.keys(acts())).concat(favouriteDays()).forEach(function (k) {
      var yy = Number(String(k).slice(0, 4));
      if (yy && !seenYears[yy]) { seenYears[yy] = 1; years.push(yy); }
    });
    for (var yi = new Date().getFullYear() - 5; yi <= new Date().getFullYear(); yi++) if (!seenYears[yi]) { seenYears[yi] = 1; years.push(yi); }
    years.sort(function (a, b) { return a - b; });
    var jump = jumpOpen ? '<div class="tm-jump"><label><span>Month</span><select data-tm-jump-month aria-label="Choose month">' +
      MON.map(function (name, i) { return '<option value="' + i + '"' + (i === m ? " selected" : "") + ">" + name + "</option>"; }).join("") + '</select></label>' +
      '<label><span>Year</span><select data-tm-jump-year aria-label="Choose year">' +
      years.map(function (yy) { return '<option value="' + yy + '"' + (yy === y ? " selected" : "") + ">" + yy + "</option>"; }).join("") + '</select></label>' +
      '<button type="button" data-tm-jump-go>Go</button><button type="button" data-tm-jump-today>This month</button></div>' : "";
    return '<div class="tm-month" role="dialog" aria-modal="true" aria-label="Your reading month">' +
      '<div class="tm-month__card">' +
        '<div class="tm-month__top">' +
          '<button class="tm-nav" type="button" data-tm-prev aria-label="Earlier month. Hold for a year.">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>' +
          '<button class="tm-month__title" type="button" data-tm-jump aria-expanded="' + (jumpOpen ? "true" : "false") + '" aria-label="Jump to a month">' + MON[m] + " " + y + '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
          '<button class="tm-nav" type="button" data-tm-next aria-label="Later month. Hold for a year."' + (y === new Date().getFullYear() && m === new Date().getMonth() ? " disabled" : "") + ">" +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>' +
        "</div>" + jump +
        '<div class="tm-month__grid">' + ["M", "T", "W", "T", "F", "S", "S"].map(function (x) { return '<span class="tm-mo__h">' + x + "</span>"; }).join("") + cells.join("") + "</div>" +
        '<div class="tm-month__legend"><span>Hold a day to mark it</span><span class="tm-mo__d l0"></span>less<span class="tm-mo__d l2"></span><span class="tm-mo__d l4"></span>more</div>' +
        '<div class="tm-day__stats tm-day__stats--mo">' +
          "<div><b>" + fmtMin(total) + "</b><span>this month</span></div>" +
          "<div><b>" + readDays + "</b><span>days read</span></div>" +
          "<div><b>" + pages + "</b><span>pages</span></div>" +
        "</div>" +
        '<button class="tm-done" type="button" data-tm-close>Done</button>' +
      "</div></div>";
  }

  function paint() {
    if (!host) host = document.getElementById("tsbTime");
    if (!host) return;
    host.innerHTML = stripHtml();
  }
  var soon = null;
  function paintSoon() {
    if (soon) return;
    soon = setTimeout(function () { soon = null; if (!monthView && !cursor) paint(); }, 600);
  }

  function showDay(k) {
    var old = document.querySelectorAll(".tm-day");
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    var el = document.createElement("div"); el.innerHTML = daySheetHtml(k); document.body.appendChild(el.firstChild);
  }
  function openDay(k) { cursor = null; showDay(k); }
  function showMonth() {
    closeAll();
    monthView = true;
    var el = document.createElement("div"); el.innerHTML = monthHtml(); document.body.appendChild(el.firstChild);
  }
  function openMonth() { cursor = new Date(); jumpOpen = false; showMonth(); }
  function closeAll() {
    var a = document.querySelectorAll(".tm-day, .tm-month");
    for (var i = 0; i < a.length; i++) a[i].parentNode.removeChild(a[i]);
    monthView = false;
  }
  function moveMonth(delta) {
    var b = cursor || new Date();
    var next = new Date(b.getFullYear(), b.getMonth() + delta, 1, 12);
    var thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
    if (next > thisMonth) next = thisMonth;
    cursor = next;
    showMonth();
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var favBtn = t.closest("[data-tm-fav]");
    if (favBtn) {
      var fk = favBtn.getAttribute("data-tm-fav");
      toggleFavourite(fk);
      showDay(fk);
      paint();
      return;
    }
    if (t.closest("[data-tm-jump-today]")) { cursor = new Date(); jumpOpen = false; showMonth(); return; }
    if (t.closest("[data-tm-jump-go]")) {
      var card = t.closest(".tm-month__card");
      var mSel = card ? card.querySelector("[data-tm-jump-month]") : null;
      var ySel = card ? card.querySelector("[data-tm-jump-year]") : null;
      var target = new Date(mSel ? Number(ySel.value) : new Date().getFullYear(), mSel ? Number(mSel.value) : new Date().getMonth(), 1, 12);
      var thisMonth2 = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
      cursor = target > thisMonth2 ? thisMonth2 : target;
      jumpOpen = false;
      showMonth();
      return;
    }
    if (t.closest("[data-tm-jump]")) { jumpOpen = !jumpOpen; showMonth(); return; }
    var dayBtn = t.closest("[data-tm-day]");
    if (dayBtn) {
      var k = dayBtn.getAttribute("data-tm-day");
      if (suppressDayKey === k && Date.now() < suppressDayUntil) return;
      if (dayBtn.closest(".tm-month")) { closeAll(); openDay(k); }
      else openDay(k);
      return;
    }
    if (t.closest("[data-tm-month]")) { openMonth(); return; }
    if (t.closest("[data-tm-close]")) { closeAll(); return; }
    if (t.closest("[data-tm-prev]")) { if (Date.now() < suppressNavUntil) return; moveMonth(-1); return; }
    if (t.closest("[data-tm-next]")) { if (Date.now() < suppressNavUntil) return; moveMonth(1); return; }
    var sheet = t.closest(".tm-day, .tm-month");
    if (sheet && t === sheet) closeAll();
  }, true);

  var pressTimer = null;
  function clearPress() { if (pressTimer) clearTimeout(pressTimer); pressTimer = null; }
  document.addEventListener("pointerdown", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var nav = t.closest("[data-tm-prev], [data-tm-next]");
    if (nav && !nav.disabled) {
      var delta = nav.hasAttribute("data-tm-prev") ? -12 : 12;
      clearPress();
      pressTimer = setTimeout(function () {
        suppressNavUntil = Date.now() + 800;
        moveMonth(delta);
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (err) {}
      }, 620);
      return;
    }
    var dayBtn = t.closest("[data-tm-day]");
    if (!dayBtn || dayBtn.disabled) return;
    var k = dayBtn.getAttribute("data-tm-day");
    clearPress();
    pressTimer = setTimeout(function () {
      suppressDayKey = k;
      suppressDayUntil = Date.now() + 800;
      toggleFavourite(k);
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (err) {}
      if (dayBtn.closest(".tm-month")) showMonth(); else paint();
    }, 620);
  }, true);
  ["pointerup", "pointercancel", "pointermove"].forEach(function (name) { document.addEventListener(name, clearPress, true); });

  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });

  /* the card belongs with the numbers, not at the foot of the page under the
     settings list: identity, the year, the three stats, then your time */
  function place() {
    try {
      var hostEl = document.getElementById("tsbTime");
      var main = document.getElementById("filmYou");
      if (!hostEl || !main) return;
      var stats = main.querySelector(".fy-stats");
      if (!stats) return;
      var anchor = stats.nextSibling;
      if (anchor === hostEl) return;
      main.insertBefore(hostEl, anchor);
    } catch (e) {}
  }
  function boot() {
    place();
    setTimeout(place, 1200);
    setTimeout(place, 3000);
    paint();
    /* the You page paints itself after this script, so paint once more when
       it settles, and keep the strip fresh when the day rolls over */
    setTimeout(paint, 900);
    setTimeout(paint, 2600);
    setInterval(function () { if (!document.querySelector(".tm-day, .tm-month")) paint(); }, 60000);
  }
  if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(boot, 400);
  else document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 400); });

  window.TSB_TIME = {
    paint: paint,
    pageRead: pageRead,
    listened: listened,
    day: dayAt,
    minutesOn: mins,
    actsOn: actsOn,
    favouriteDays: favouriteDays,
    toggleFavourite: toggleFavourite,
    version: 404
  };
})();
