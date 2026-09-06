/* ============================================================
   THESMALLBOOK — 🎁 FRIENDLY GUEST GATE (gate.js)
   Guests browse the whole library freely at first.
   After ~10 minutes of browsing OR ~6 opened books, ONE clean
   card appears: everything is free forever — sign in to keep
   reading. Never blocks the very first session instantly,
   never nags signed-in readers, snoozes for 3 minutes.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_GATE) return;
  window.TSB_GATE = true;

  var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (/login\.html|settings\.html|scan\.html|404\.html/.test(path)) return;

  var GRACE_MS = 10 * 60 * 1000; /* 10 minutes of browsing */
  var READ_LIMIT = 6;            /* …or six opened books   */

  function lsGet(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function signedIn() {
    try {
      var s = JSON.parse(localStorage.getItem("tsb_auth_session"));
      if (s && (s.user || s.access_token)) return true;
    } catch (e) {}
    try { if (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) return true; } catch (e2) {}
    return false;
  }

  /* first-ever visit starts the grace clock */
  var start = lsGet("tsb_guest_start", 0);
  if (!start) { start = Date.now(); lsSet("tsb_guest_start", start); }

  /* every opened book counts as a read */
  if (path === "book.html") lsSet("tsb_reads", lsGet("tsb_reads", 0) + 1);

  function due() {
    if (signedIn()) return false;
    try { if (sessionStorage.getItem("tsb_gate_done")) return false; } catch (e) {}
    var snooze = lsGet("tsb_gate_snooze", 0);
    if (snooze && Date.now() - snooze < 3 * 60 * 1000) return false;
    return (Date.now() - start >= GRACE_MS) || lsGet("tsb_reads", 0) >= READ_LIMIT;
  }

  function show() {
    if (!due() || document.querySelector(".gatewrap")) return;
    var w = document.createElement("div");
    w.className = "gatewrap";
    w.innerHTML =
      '<div class="gate" role="dialog" aria-modal="true" aria-label="Sign in to keep reading">' +
        '<div class="gate__icon">📚</div>' +
        "<h2>You’ve read a whole stack!</h2>" +
        "<p>Every book here is <b>free forever</b> — no card, no catch, no ads. " +
        "Sign in (10 seconds with Google) and the library stays open, with your progress saved.</p>" +
        '<a class="gate__cta" href="login.html">Sign in — it’s free →</a>' +
        '<button class="gate__later" data-later>5 more minutes</button>' +
        '<p class="gate__tiny">Reading as a guest stays possible after sign-in too — this just keeps your shelf safe.</p>' +
      "</div>";
    document.body.appendChild(w);
    requestAnimationFrame(function () { w.classList.add("on"); });
    w.addEventListener("click", function (e) {
      if (e.target.closest("[data-later]")) {
        lsSet("tsb_gate_snooze", Date.now());
        w.classList.remove("on");
        window.setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 260);
      }
    });
  }

  /* first nudge a few seconds in, then whenever the tab wakes up */
  window.setTimeout(show, 5000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) show(); });
  window.addEventListener("pageshow", function () { window.setTimeout(show, 1500); });
})();
