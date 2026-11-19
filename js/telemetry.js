/* ============================================================
   THESMALLBOOK, real telemetry (telemetry.js) · v418
   The app used to have no honest numbers of its own: anything
   an admin view could show would have been invented. This
   module keeps a small, real event log on the device instead.

   • log(name, data)   appends one event (book opened, lesson
                       finished, listen started, note written)
                       to tsb_telemetry_v1, capped at 400.
   • events()          the raw log, newest last.
   • summary()         the numbers an admin view may show,
                       every one computed from the reader's
                       own stored state. Nothing is estimated,
                       seeded or rounded into existence.

   The log stays on the device (TSB.store marks it "device");
   if a server rollup is ever wanted, summary() is the shape
   it should send, aggregates only, never the raw trail.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB && window.TSB.telemetry) return;

  var KEY = "tsb_telemetry_v1";
  var CAP = 400;

  function store() { return (window.TSB && window.TSB.store) || null; }
  function read() {
    var s = store();
    var v = s ? s.get(KEY, []) : null;
    if (!Array.isArray(v)) {
      try { v = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { v = []; }
    }
    return Array.isArray(v) ? v : [];
  }
  function write(arr) {
    var s = store();
    if (s) { s.set(KEY, arr); return; }
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) {}
  }

  function log(name, data) {
    try {
      var arr = read();
      var clean = {};
      if (data && typeof data === "object") {
        Object.keys(data).slice(0, 6).forEach(function (k) {
          var v = data[k];
          if (typeof v === "string") clean[k] = v.slice(0, 80);
          else if (typeof v === "number" || typeof v === "boolean") clean[k] = v;
        });
      }
      arr.push({ t: Date.now(), e: String(name || "event"), d: clean });
      if (arr.length > CAP) arr = arr.slice(arr.length - CAP);
      write(arr);
      return true;
    } catch (e) { return false; }
  }

  function jget(key, def) {
    var s = store();
    if (s) return s.get(key, def);
    try { var v = localStorage.getItem(key); return v === null ? def : JSON.parse(v); } catch (e) { return def; }
  }

  function summary() {
    var progress = jget("tsb_progress", {}) || {};
    var lessons = 0;
    Object.keys(progress).forEach(function (k) { lessons += (progress[k] || []).length; });
    var minLog = jget("tsb_min_log", {}) || {};
    var minutes = 0;
    Object.keys(minLog).forEach(function (k) { minutes += +(minLog[k] || 0); });
    var streak = jget("tsb_streak", {}) || {};
    var ev = read();
    var byEvent = {};
    ev.forEach(function (x) { byEvent[x.e] = (byEvent[x.e] || 0) + 1; });
    return {
      lessonsRead: lessons,
      booksFinished: (jget("tsb_read_books", []) || []).length,
      minutesRead: minutes,
      daysRead: (jget("tsb_days", []) || []).length,
      streakDays: +(streak.count || 0),
      bookmarks: (jget("tsb_bookmarks", []) || []).length,
      eventsLogged: ev.length,
      eventsByName: byEvent,
      lastEventAt: ev.length ? ev[ev.length - 1].t : 0
    };
  }

  window.TSB = window.TSB || {};
  window.TSB.telemetry = { log: log, events: read, summary: summary, KEY: KEY };
})();
