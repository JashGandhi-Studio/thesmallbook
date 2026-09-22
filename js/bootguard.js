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
(function () {
  "use strict";

  var BUILD = "275";
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
      b.setAttribute("style", "position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;background:#111;color:#fff;border:2px solid #ffc800;border-radius:12px;padding:12px 14px;font:600 13px/1.5 Arial,sans-serif;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.4)");
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
