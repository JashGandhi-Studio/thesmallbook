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
  function undress() {
    if (!box) {
      document.documentElement.classList.remove("trial-lock");
      return;
    }
    var b = box; box = null;
    b.classList.remove("trial--on");
    document.documentElement.classList.remove("trial-lock");
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 260);
  }

  function dismiss() {
    undress();
    try {
      sessionStorage.setItem("tsb_trial_snooze", String(Date.now()));
      sessionStorage.setItem("tsb_trial_shown", "1");
    } catch (e) {}
    dead = false;
    st.used = 0; /* Reset timer so user gets 15 more minutes of clean, uninterrupted guest reading */
    set("tsb_trial", st);
  }

  function card(inner, actions) {
    if (box) box.parentNode.removeChild(box);
    box = document.createElement("div");
    box.className = "trialwrap";
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML =
      '<div class="trial">' +
        '<button type="button" class="trial__x" id="trialX" aria-label="Close" style="position:absolute;top:14px;right:16px;background:none;border:none;font:800 22px sans-serif;cursor:pointer;color:#111;z-index:10;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:50%;">✕</button>' +
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

    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.closest("#trialX") || e.target.closest("[data-trial-later]")) {
        dismiss();
      }
    });

    return box;
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && box) dismiss();
  });

  function gate() {
    if (dead || signedIn()) return;
    try {
      if (sessionStorage.getItem("tsb_gate_done") || sessionStorage.getItem("tsb_trial_shown")) return;
      sessionStorage.setItem("tsb_trial_shown", "1");
    } catch (e) {}
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
      '<button type="button" class="trial__ghost" data-trial-later style="background:none;border:none;cursor:pointer;width:100%;font:700 12.5px \'Space Grotesk\',sans-serif;color:#6b6656;text-decoration:underline;padding:6px 0 2px;">Keep reading as a guest</button>'
    );
  }

  /* ---------- the clock ---------- */
  function tick() {
    if (dead || signedIn() || !onboarded()) return;
    if (document.visibilityState !== "visible") return;
    try {
      var sn = sessionStorage.getItem("tsb_trial_snooze");
      if (sn && (Date.now() - Number(sn)) < 900000) return;
      if (sessionStorage.getItem("tsb_trial_shown") || sessionStorage.getItem("tsb_gate_done")) return;
    } catch (e) {}
    st.used += 1;
    if (st.used >= LIMIT) { set("tsb_trial", st); gate(); return; }
    if (st.used % 5 === 0) set("tsb_trial", st);
  }

  function boot() {
    if (!onboarded() || signedIn()) return;
    try {
      var sn = sessionStorage.getItem("tsb_trial_snooze");
      if (sn && (Date.now() - Number(sn)) < 900000) return;
      if (sessionStorage.getItem("tsb_trial_shown") || sessionStorage.getItem("tsb_gate_done")) return;
    } catch (e) {}
    if (st.used >= LIMIT) {
      /* If already reached limit but user just refreshed or navigated, don't trap them immediately */
      st.used = 0;
      set("tsb_trial", st);
    }
    setInterval(tick, 1000);
  }

  /* signing in ends the taster forever */
  window.addEventListener("tsb:auth", function () {
    try { if (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) { dead = true; undress(); } } catch (e) {}
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
