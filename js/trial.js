/* ============================================================
   THESMALLBOOK, ⏳ THE FREE TASTER (js/trial.js) v265
   After onboarding, every guest reads free for 15 minutes.
     · 0–5 min   → nothing, just reading
     · 5 min     → a polite pop-up: 10 minutes left
     · 10 min    → another pop-up: 5 minutes left
     · 15 min    → THE GATE, sign in to keep going
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
  var WARN1 = 5 * 60;           /* first pop-up  */
  var WARN2 = 10 * 60;          /* second pop-up */

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

  function minutesLeft() { return Math.max(0, Math.ceil((LIMIT - st.used) / 60)); }

  function warn(which) {
    var left = minutesLeft();
    var head = which === 1 ? "⏳ 5 minutes flown" : "⏳ 10 minutes flown";
    var line = which === 1
      ? "You are reading on the house. <b>" + left + " minutes</b> of the free taster are left, your shelf, streak and progress wait behind one sign-in."
      : "<b>" + left + " minutes</b> left on the house. Sign in now and everything you\u2019ve read today stays yours forever.";
    var btn = which === 1 ? "KEEP READING, " + left + " MIN LEFT" : "USE MY LAST " + left + " MINUTES";
    card(
      '<h2 class="trial__t">' + head + "</h2>" +
      '<p class="trial__s">' + line + "</p>",
      '<button class="trial__go" data-trial-cont>' + btn + "</button>" +
      '<a class="trial__ghost" href="login.html">Sign in now →</a>'
    );
    box.querySelector("[data-trial-cont]").addEventListener("click", undress);
  }

  function gate() {
    dead = true;
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
    if (st.used >= WARN2 && !st.w2) { st.w2 = true; set("tsb_trial", st); warn(2); return; }
    if (st.used >= WARN1 && !st.w1) { st.w1 = true; set("tsb_trial", st); warn(1); return; }
    if (st.used % 5 === 0) set("tsb_trial", st);
  }

  function boot() {
    if (!onboarded() || signedIn()) return;
    if (st.used >= LIMIT) { gate(); return; }
    if (st.used >= WARN2 && !st.w2) { st.w2 = true; warn(2); }
    else if (st.used >= WARN1 && !st.w1) { st.w1 = true; warn(1); }
    setInterval(tick, 1000);
  }

  /* signing in ends the taster forever */
  window.addEventListener("tsb:auth", function () {
    try { if (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) { dead = true; undress(); } } catch (e) {}
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
