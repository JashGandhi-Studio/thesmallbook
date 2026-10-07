/* ============================================================
   THESMALLBOOK, ⏳ THE FREE TASTER (js/trial.js) v306
   After onboarding, every guest reads free for 15 minutes.
     · 0-15 min  → nothing, just reading (no mid-way pop-ups)
     · 15 min    → ONE friendly card (gate.js renders it)
   Rules:
     · the clock only runs while the tab is VISIBLE (no cheating
       the timer by hiding the tab, no punishment for switching)
     · the used time is SAVED, so a refresh does not refill it
     · signed-in readers never see any of this, signing in
       stops the clock and dismantles the gate instantly
     · the gate is a real page-level card, never an alert()
   ============================================================ */
(function () {
  var LIMIT = 15 * 60;          /* the full taster */

  /* storage that never dies (same ladder as onboard.js) */
  function get(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); if (v !== null && v !== undefined) return v; } catch (e) {}
    return d;
  }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function signedIn() {
    try { if (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) return true; } catch (e) {}
    try {
      var s = JSON.parse(localStorage.getItem("tsb_auth_session"));
      if (s && (s.user || s.access_token)) return true;
    } catch (e) {}
    return false;
  }
  function onboarded() { return get("tsb_onboarded", false) === true; }

  if (/login\.html|settings\.html|404\.html|chat\.html/.test(location.pathname)) return;

  var st = get("tsb_trial", null) || { used: 0, w1: false, w2: false };
  var dead = false;             /* gate built, stop counting */
  var box = null;

  /* ---------- the card ---------- */
  function card(inner, actions) {
    if (box) box.parentNode.removeChild(box);
    box = document.createElement("div");
    box.className = "trialwrap";
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML =
      '<div class="trial">' +
        '<span class="trial__deco trial__deco--sq" aria-hidden="true"></span>' +
        '<span class="trial__deco trial__deco--ring" aria-hidden="true"></span>' +
        '<div class="trial__chip">📕</div>' +
        inner +
        '<div class="trial__acts">' + actions + "</div>" +
      "</div>";
    document.body.appendChild(box);
    document.documentElement.classList.add("trial-lock");
    var reveal = function () { if (box) box.classList.add("trial--on"); };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(function () { requestAnimationFrame(reveal); });
    else setTimeout(reveal, 30);
    return box;
  }
  function undress() {
    if (!box) return;
    var b = box; box = null;
    b.classList.remove("trial--on");
    document.documentElement.classList.remove("trial-lock");
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 320);
  }

  function gate() {
    dead = true;
    /* ONE card, the friendly one. gate.js owns the copy and the styles. */
    try { if (window.TSB_GATE && TSB_GATE.show) { TSB_GATE.show(); return; } } catch (e) {}
    card(
      '<span class="trial__eyebrow">THE FREE TASTER IS OVER</span>' +
      '<h2 class="trial__t">You\u2019ve had 15 good minutes.</h2>' +
      '<p class="trial__s">The library stays open, but your <b>shelf</b>, your <b>streak</b>, your <b>@name</b> and everything you read today need one thing: an account. It takes 30 seconds and it is free.</p>' +
      '<ul class="trial__list">' +
        "<li>📚 Your shelf and streak, saved</li>" +
        "<li>✍️ Post stories, follow writers</li>" +
        "<li>🔒 No spam, we never post for you</li>" +
      "</ul>",
      '<a class="trial__go" href="login.html">CREATE MY FREE ACCOUNT →</a>' +
      '<a class="trial__ghost" href="login.html">I already have one, sign in</a>'
    );
  }

  /* ---------- the clock ---------- */
  function tick() {
    if (dead || signedIn() || !onboarded()) return;
    if (document.visibilityState !== "visible") return;
    st.used += 1;
    if (st.used >= LIMIT) { set("tsb_trial", st); gate(); return; }
    if (st.used % 5 === 0) set("tsb_trial", st);
  }

  function boot() {
    if (!onboarded() || signedIn()) return;
    if (st.used >= LIMIT) { gate(); return; }
    setInterval(tick, 1000);
  }

  /* signing in ends the taster forever */
  window.addEventListener("tsb:auth", function () {
    try { if (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) { dead = true; undress(); } } catch (e) {}
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
