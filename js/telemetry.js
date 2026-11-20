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
   summary() is the shape an admin view reads.

   v419: flush() offers the batch to the server rollup
   (public.events, RUN-THIS-v419.sql) - event names and counts the
   app already records here, nothing about the reader's words,
   nothing that tracks across sites, no advertising profile.
   It sends at most every 30 seconds and once more as the page
   hides, only what has not already been sent (a watermark, so a
   crash can duplicate a batch but never lose one quietly into a
   second identity), and it is a silent no-op when signed out,
   offline, or when the table is not there yet.
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

  var SENT_KEY = "tsb_telemetry_sent";
  function sentAt() { try { return +(localStorage.getItem(SENT_KEY) || 0); } catch (e) { return 0; } }
  function markSent(t) { try { localStorage.setItem(SENT_KEY, String(t)); } catch (e) {} }

  var flushing = false;
  function flush() {
    if (flushing) return Promise.resolve(false);
    var cfg = window.TSB_CONFIG || window.CFG || {};
    var base = (cfg.SUPABASE_URL || "").replace(/\/$/, "");
    var anon = cfg.SUPABASE_ANON_KEY || "";
    if (!base || !anon) return Promise.resolve(false);
    var since = sentAt();
    var batch = read().filter(function (x) { return x.t > since; }).slice(0, 100);
    if (!batch.length) return Promise.resolve(false);
    var uid = null, tok = anon;
    try {
      var sess = JSON.parse(localStorage.getItem("tsb_auth_session") || "null");
      if (sess && sess.user && sess.user.id) { uid = sess.user.id; tok = sess.access_token || anon; }
    } catch (e) {}
    if (!uid) return Promise.resolve(false);   /* signed-in readers only */
    var rows = batch.map(function (x) {
      return { user_id: uid, name: String(x.e || "event").slice(0, 60), props: x.d || {}, at: new Date(x.t).toISOString() };
    });
    flushing = true;
    return fetch(base + "/rest/v1/events", {
      method: "POST",
      headers: { apikey: anon, Authorization: "Bearer " + tok, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(rows),
      keepalive: true
    }).then(function (r) {
      flushing = false;
      if (r.ok) { markSent(batch[batch.length - 1].t); return true; }
      return false;
    }).catch(function () { flushing = false; return false; });
  }

  /* batch quietly: every 30 s while the page lives, and once more
     as it hides, so a short visit still lands */
  try {
    setInterval(function () { if (!document.hidden) flush(); }, 30000);
    document.addEventListener("visibilitychange", function () { if (document.hidden) flush(); });
    window.addEventListener("pagehide", function () { flush(); });
  } catch (e) {}

  window.TSB = window.TSB || {};
  window.TSB.telemetry = { log: log, events: read, summary: summary, flush: flush, KEY: KEY };
})();
