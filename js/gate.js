/* ============================================================
   THESMALLBOOK, 🎁 FRIENDLY GUEST GATE (gate.js)
   ONE popup per session, ever. It does not fire by itself:
   the 15-minute free-taster clock (trial.js) calls TSB_GATE.show()
   at the 15-minute mark, and this module renders the single
   friendly card. No "+5 minutes" extend, no mid-reading nudges.
   Dismiss once per session, signed-in readers never see it.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_GATE) return;
  window.TSB_GATE = true;

  var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (/login\.html|settings\.html|scan\.html|404\.html/.test(path)) return;

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

  function due() {
    if (signedIn()) return false;
    try { if (sessionStorage.getItem("tsb_gate_done")) return false; } catch (e) {}
    return true;
  }

  function show() {
    if (!due() || document.querySelector(".gatewrap")) return;
    try { sessionStorage.setItem("tsb_gate_done", "1"); } catch (e2) {}
    var w = document.createElement("div");
    w.className = "gatewrap";
    w.innerHTML =
      '<div class="gate" role="dialog" aria-modal="true" aria-label="Sign in to keep reading">' +
        '<div class="gate__icon">📚</div>' +
        "<h2>You’ve read a whole stack!</h2>" +
        "<p>Every book here is <b>free to read</b>, no card, no catch, no ads. " +
        "Sign in (10 seconds with Google) and the library stays open, with your progress saved.</p>" +
        '<a class="gate__cta" href="login.html">Sign in, it’s free →</a>' +
        '<button class="gate__later" data-later>Keep reading as a guest</button>' +
        '<p class="gate__tiny">Reading as a guest stays possible after sign-in too, this just keeps your shelf safe.</p>' +
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

  /* the only trigger: the 15-minute free-taster clock in trial.js */
  window.TSB_GATE = { show: show };
})();
