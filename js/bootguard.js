/* ============================================================
   THESMALLBOOK, BOOT GUARD (v274, two-phase)
   Loaded FIRST on every page. Two jobs, both safe by design:

   1. NEW BUILD SINCE LAST VISIT: TWO PHASES, never overlapping.
      Phase A: unregister every service worker, then ONE reload.
      Phase B (the load after that): delete every cache. The page
      is already fresh from the network by then, so deleting
      cannot race a navigation. A deploy can never half-serve
      old code under new HTML again, and the page can never
      reload twice in a row.

   2. THE WATCHDOG: if the page has not signalled a healthy boot
      (window.TSB_BOOT_OK, set by prefs.js) within 9 seconds,
      do Phase A once; if a later load still fails, say it
      honestly with a one-tap fix button. Never a silent hang.
   ============================================================ */
/* v385 · TSB_LFILL ARRIVES BEFORE ITS DEFINITION
   A lesson file calls window.TSB_LFILL the moment it executes. If it executes
   before js/data.js has defined that function, the call is a ReferenceError and
   the book's text is lost for the life of the page. This stub holds the payload
   and hands it to the real function as soon as it exists. */
(function () {
  if (typeof window === "undefined" || window.TSB_LFILL_QUEUE) return;
  window.TSB_LFILL_QUEUE = [];
  var held = window.TSB_LFILL;
  window.TSB_LFILL = function (id, body, ext) { window.TSB_LFILL_QUEUE.push([id, body, ext]); };
  window.TSB_LFILL_HOLD = held;
})();

/* v415 · STORAGE GUARD (v419: honest, once a day, and escapable)
   Every module in this app wraps its localStorage writes in a quiet
   try/catch, which kept crashes away but also kept the truth away: when a
   phone's storage fills up (about 5 MB, and note photos live there until
   they upload), saves began failing with nobody told. This guard wraps
   setItem once, app-wide: a quota failure is recorded, announced with one
   honest banner, and rethrown so existing callers behave exactly as
   before. window.TSB_STORAGE.usage() reports real bytes used.

   v419: the first version cried wolf. Its "warned" flag lived only in
   memory, so the banner returned on every page load, and ANY setItem
   throw - a private-mode refusal, a bad key - counted as a full disk.
   Now the banner belongs to real quota failures only, shows at most
   once per session and once per day (the dismissal is remembered in
   tsb_storage_warned_at, and "Don't show again" is permanent), says how
   much room is actually used, and offers one tap that frees only what
   the app can regenerate - service-worker caches, the on-device
   telemetry log, served history and reading positions untouched for
   90 days. Notes, highlights, progress, bookmarks and sign-in are
   never touched: they are the reader's work, not the app's litter. */
(function () {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (window.TSB_STORAGE) return;
  var WARN_KEY = "tsb_storage_warned_at";
  var MUTE_KEY = "tsb_storage_muted";
  var SHOWN_KEY = "tsb_storage_shown";
  var DAY = 24 * 60 * 60 * 1000;
  var BUDGET = 5 * 1024 * 1024;              /* the ~5 MB this origin gets */
  var state = { full: false, warned: false, lastError: "" };
  function usage() {
    var bytes = 0, keys = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i) || "";
        bytes += (k.length + (localStorage.getItem(k) || "").length) * 2;
        keys++;
      }
    } catch (e) {}
    return { bytes: bytes, keys: keys, full: state.full, budget: BUDGET, ratio: bytes / BUDGET };
  }
  function isQuota(err) {
    if (!err) return false;
    var n = String(err.name || ""), c = err.code;
    return n === "QuotaExceededError" || n === "NS_ERROR_DOM_QUOTA_REACHED" || c === 22 || c === 1014;
  }
  function suppressed() {
    try { if (localStorage.getItem(MUTE_KEY) === "1") return true; } catch (e) {}
    try { if (sessionStorage.getItem(SHOWN_KEY) === "1") return true; } catch (e) {}
    try {
      var t = +(localStorage.getItem(WARN_KEY) || 0);
      return !!t && (Date.now() - t) < DAY;
    } catch (e) { return false; }
  }
  function remember(permanent) {
    try { localStorage.setItem(WARN_KEY, String(Date.now())); } catch (e) {}
    if (permanent) { try { localStorage.setItem(MUTE_KEY, "1"); } catch (e) {} }
    try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch (e) {}
  }
  /* only what the app can regenerate: caches, the device telemetry log,
     served history (it re-syncs from the account), and positions whose
     own timestamps prove they have been untouched for 90 days. Anything
     without a trustworthy timestamp stays. This NEVER touches notes,
     highlights, progress, bookmarks or the sign-in session. */
  function freeSpace(done) {
    var freed = 0;
    try { var t = localStorage.getItem("tsb_telemetry_v1"); if (t) { freed += t.length * 2; localStorage.removeItem("tsb_telemetry_v1"); } } catch (e) {}
    try { var sv = localStorage.getItem("tsb_served"); if (sv) { freed += sv.length * 2; localStorage.removeItem("tsb_served"); } } catch (e) {}
    try {
      var cut = Date.now() - 90 * DAY, doomed = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i) || "";
        if (!/_pos(_|$)/.test(k) && k.indexOf("_pos_") < 0) continue;
        var stamp = 0, up = localStorage.getItem(k + "_updated") || localStorage.getItem(k.replace(/_pos_/, "_pos_updated_"));
        if (up) stamp = +up || Date.parse(up) || 0;
        if (!stamp) {
          try { var v = JSON.parse(localStorage.getItem(k) || "null"); if (v && typeof v === "object") stamp = +(v.t || v.at || v.updated || 0); } catch (e2) {}
        }
        if (stamp && stamp < cut) doomed.push(k);
      }
      doomed.forEach(function (k) {
        try { freed += ((localStorage.getItem(k) || "").length) * 2; localStorage.removeItem(k); } catch (e) {}
      });
    } catch (e) {}
    function finish() { if (done) done({ freedBytes: freed, usage: usage() }); }
    try {
      if (window.caches && caches.keys) {
        caches.keys().then(function (ks) {
          ks.forEach(function (k) { try { caches.delete(k); } catch (e) {} });
          finish();
        }).catch(finish);
      } else finish();
    } catch (e) { finish(); }
  }
  function fmt(bytes) {
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
  }
  function warn() {
    if (state.warned) return;
    state.warned = true;
    try { window.dispatchEvent(new CustomEvent("tsb:storage-full", { detail: usage() })); } catch (e) {}
    if (suppressed()) return;
    function show() {
      if (!document.body || document.getElementById("tsbStorageWarn")) return;
      var desktop = false;
      try { desktop = !!(window.matchMedia && window.matchMedia("(min-width: 700px)").matches); } catch (e) {}
      var d = document.createElement("div");
      d.id = "tsbStorageWarn";
      d.setAttribute("role", "alert");
      d.style.cssText = "position:fixed;z-index:9990;background:#16130F;color:#FFFDF7;border-radius:16px;padding:12px 14px;font:400 13.5px/1.45 system-ui,sans-serif;box-shadow:0 14px 34px -12px rgba(0,0,0,.65);" +
        (desktop ? "right:18px;bottom:18px;width:360px;max-width:calc(100vw - 36px)" : "left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom, 0px) + 86px)");
      d.innerHTML = "<b style=\"display:block;margin-bottom:2px\">This device is out of room for the app</b>" +
        "New saves cannot be kept on this phone until space frees up. Sign in so your work lives in your account, and download a copy from Settings, under Data &amp; library." +
        "<span class=\"tsb-storage-usage\" style=\"display:block;margin-top:7px;opacity:.85\"></span>" +
        "<span style=\"display:flex;gap:8px;flex-wrap:wrap;margin-top:9px\">" +
        "<button type=\"button\" data-act=\"free\" style=\"font:inherit;font-weight:800;background:#FFC800;color:#16130F;border:0;border-radius:999px;padding:7px 14px;cursor:pointer\">Free space</button>" +
        "<button type=\"button\" data-act=\"ok\" style=\"font:inherit;font-weight:700;background:transparent;color:#FFFDF7;border:1px solid rgba(255,253,247,.45);border-radius:999px;padding:7px 14px;cursor:pointer\">Got it</button>" +
        "<button type=\"button\" data-act=\"mute\" style=\"font:inherit;background:transparent;color:#FFFDF7;opacity:.75;border:0;padding:7px 4px;cursor:pointer;text-decoration:underline\">Don\u2019t show again</button></span>";
      var line = d.querySelector(".tsb-storage-usage");
      function paintUsage() { var u = usage(); if (line) line.textContent = "About " + fmt(u.bytes) + " of ~5 MB is used on this device."; }
      paintUsage();
      d.querySelector("[data-act=ok]").addEventListener("click", function () { remember(false); d.remove(); });
      d.querySelector("[data-act=mute]").addEventListener("click", function () { remember(true); d.remove(); });
      d.querySelector("[data-act=free]").addEventListener("click", function () {
        freeSpace(function () {
          paintUsage();
          if (line) line.textContent += " Freed what the app can rebuild - your books, notes and progress were not touched.";
        });
      });
      document.body.appendChild(d);
      try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch (e) {}
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show);
    else show();
  }
  window.TSB_STORAGE = { usage: usage, state: state, freeSpace: freeSpace };
  try {
    var proto = Object.getPrototypeOf(localStorage);
    var orig = proto && proto.setItem;
    if (orig && !orig.__tsbGuarded) {
      var wrapped = function (k, v) {
        try { return orig.call(this, k, v); }
        catch (err) {
          /* v419: only a real quota failure means a full device. A
             private-mode refusal or a bad key is not a storage crisis
             and must never raise the banner. */
          if (isQuota(err)) {
            state.full = true;
            state.lastError = String((err && err.name) || err || "quota");
            warn();
          }
          throw err;
        }
      };
      wrapped.__tsbGuarded = true;
      proto.setItem = wrapped;
    }
  } catch (e) {}
})();

(function () {
  "use strict";

  var BUILD = "420";
window.TSB_BUILD = BUILD;   /* v322: every page knows its era - the tutorial replays once per era */

  /* v400: ONE place owns the version number.
     About, Legal and Settings each printed their own, and all three were
     wrong: the changelog had sat at v361 with build 333 entries while the
     app was on 399. Anything carrying data-tsb-build is now stamped from
     this constant at load, so the printed version cannot drift again.
     Historical changelog entries keep their own numbers on purpose. */
  function stampBuild() {
    var full = "tsb-v" + BUILD;
    /* an element that carries the version alone */
    var els = document.querySelectorAll("[data-tsb-build]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.getAttribute("data-tsb-build") === "plain") el.textContent = "v" + BUILD;
      else el.textContent = full;
    }
    /* an element that carries the version inside a sentence - the HTML already
       prints the right build, this only repairs it if the two ever drift */
    var txt = document.querySelectorAll("[data-tsb-build-text], .youfine");
    for (var j = 0; j < txt.length; j++) {
      var t = txt[j].textContent;
      if (t && t.indexOf("tsb-v") >= 0) txt[j].textContent = t.replace(/tsb-v[0-9]{3}/g, full);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", stampBuild);
  } else {
    stampBuild();
  }
  var PHASE_A = "tsb_purge_a";

  /* returns through done(hadWorker). No worker anywhere = nothing to
     purge and NO reload (a page without a worker cannot half-serve). */
  function unregisterSW(done) {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function (rs) {
          var had = (rs || []).length > 0;
          for (var i = 0; i < (rs || []).length; i++) { try { rs[i].unregister(); } catch (e) {} }
          done(had);
        }).catch(function () { done(false); });
      } else done(false);
    } catch (e) { done(false); }
  }

  function deleteCaches(done) {
    try {
      if (window.caches && caches.keys) {
        caches.keys().then(function (ks) {
          for (var j = 0; j < ks.length; j++) { try { caches.delete(ks[j]); } catch (e) {} }
          done();
        }).catch(done);
      } else done();
    } catch (e) { done(); }
  }

  /* ---- the healthy path: one build change, two clean phases ---- */
  var seen = null;
  try { seen = localStorage.getItem("tsb_build_seen"); } catch (e) {}
  if (seen !== BUILD) {
    try { localStorage.setItem("tsb_build_seen", BUILD); } catch (e) {}
    try { sessionStorage.setItem(PHASE_A, "1"); } catch (e) {}
    unregisterSW(function (had) {
      if (had) location.reload();                        /* phase A: reload once */
      else { try { sessionStorage.removeItem(PHASE_A); } catch (e) {} }
    });
    return;
  }
  /* phase B: the worker is already gone, the code is already fresh */
  try {
    if (sessionStorage.getItem(PHASE_A)) {
      sessionStorage.removeItem(PHASE_A);
      deleteCaches(function () {});
    }
  } catch (e) {}

  /* ---- the watchdog ---- */
  window.setTimeout(function () {
    if (window.TSB_BOOT_OK) return;
    var KEY = "tsb_boot_retried";
    var tried = null;
    try { tried = sessionStorage.getItem(KEY); } catch (e) {}
    if (!tried) {
      try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
      unregisterSW(function (had) {
        if (had) location.reload();                      /* one recovery, never a loop */
      });
      return;
    }
    /* second failure this visit: an honest banner with a one-tap fix */
    try {
      var b = document.createElement("div");
      b.setAttribute("style", "position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;background:#111;color:#fff;border:2px solid #ffc800;border-radius:17px;padding:12px 14px;font:600 13px/1.5 Arial,sans-serif;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.4)");
      b.innerHTML = "<b style=\"color:#ffc800\">Load trouble detected.</b><br>Old saved files are in the way of the update. Tap here to clear them and reload.";
      b.onclick = function () {
        try { sessionStorage.removeItem(KEY); } catch (e) {}
        if (b.parentNode) b.parentNode.removeChild(b);
        unregisterSW(function () { deleteCaches(function () { location.reload(); }); });
      };
      (document.body || document.documentElement).appendChild(b);
    } catch (e) {}
  }, 9000);
})();
