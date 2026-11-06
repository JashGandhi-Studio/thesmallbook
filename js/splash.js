/* ==========================================================================
   v357 · THE OPENING, ONE TIMELINE
   --------------------------------------------------------------------------
   A character, not a logo. Pip, a little book with eyes, drops onto a shelf,
   squashes, blinks, looks around, hops, throws three pages, swings itself
   open and then rises out of the way while the full name sets underneath it:
   TheSmallBook, in the same serif as the brand, Small in italic.
   The frame is held, then the yellow field lifts and the app is underneath.

   HOW IT IS BUILT
   - One score object, one clock. Every delay is a single number in SCORE,
     written into CSS variables, so the whole opening is retimed by editing
     one map instead of six keyframe blocks that drift apart.
   - Start on a frame the browser has actually painted. Animations begin on
     the second rAF after paint, so the first move is never dropped.
   - Only transform, opacity and clip-path move, and the full screen field is
     promoted once, so the app can boot behind it without stealing frames.
   - The first cover and the reader font are warmed while it plays, so the
     app is ready at the exact moment the field lifts.
   - Removed by the timeline or by a touch, never by a promise from the app.
   ========================================================================== */
(function () {
  var el = document.getElementById("tsbSplash");
  if (!el) return;
  if (el.getAttribute("data-v") === "357") return;
  el.setAttribute("data-v", "357");

  var reduced = false, coarse = false;
  try { reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}
  try { coarse = !!(window.matchMedia && window.matchMedia("(hover: none)").matches); } catch (e) {}

  /* ---------------------------------------------------------------------
     THE SCORE, milliseconds from the first painted frame. Change a number
     here and everything that depends on it moves with it.
     --------------------------------------------------------------------- */
  var SCORE = {
    glow:   30,     /* the light comes up */
    shelf:  100,    /* the shelf draws itself */
    drop:   130,    /* Pip falls */
    blink:  560,
    look:   680,
    hop:    900,    /* the hop, the bookmark, the thrown pages */
    open:   950,    /* the pages swing open */
    smile:  1020,
    rise:   1120,   /* Pip steps out of the way of the name */
    name:   1150,   /* the name starts to set, while he is still on screen */
    rule:   1720,
    tag:    1900,
    hold:   3900,   /* the frame the opening exists for */
    lift:   4400,   /* the field lifts away */
    end:    5100
  };

  var LETTER_STAGGER = 26;   /* ms between letters of the name */
  var WORD = "TheSmallBook";
  var ITALIC_FROM = 3, ITALIC_TO = 7;   /* "Small", always italic */

  if (reduced) {
    SCORE = { glow: 0, shelf: 0, drop: 0, blink: 0, look: 0, hop: 0, open: 0, smile: 0,
              rise: 0, name: 0, rule: 0, tag: 0, hold: 0, lift: 520, end: 900 };
  }

  var letters = "";
  for (var i = 0; i < WORD.length; i++) {
    var ch = WORD.charAt(i);
    var italic = i >= ITALIC_FROM && i <= ITALIC_TO;
    letters += '<span style="--i:' + i + '">' + (italic ? "<i>" + ch + "</i>" : ch) + "</span>";
  }

  /* v391: the character is gone. A reader does not need a singing book before
     their book. What is left is the mark, the name, the promise and a line that
     fills while the app boots behind it. */
  el.innerHTML =
    '<div class="spx">' +
      '<svg class="spx-mark" viewBox="0 0 48 48" aria-hidden="true">' +
        '<path d="M24 13.4c-3.4-2.8-7.8-3.9-12.7-3.9v22.6c4.9 0 9.3 1.1 12.7 3.9 3.4-2.8 7.8-3.9 12.7-3.9V9.5c-4.9 0-9.3 1.1-12.7 3.9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M24 13.4v22.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>' +
      '<div class="spx-name">The<i>Small</i>Book</div>' +
      '<div class="spx-rule"></div>' +
      '<div class="spx-tag">big books &middot; small reads</div>' +
      '<div class="sp-bar" aria-hidden="true"><i></i></div>' +
    '</div>';

  /* one place writes the clock, so nothing can drift */
  function ms(n) { return (n / 1000).toFixed(3) + "s"; }
  el.style.setProperty("--sp-glow", ms(SCORE.glow));
  el.style.setProperty("--sp-shelf", ms(SCORE.shelf));
  el.style.setProperty("--sp-drop", ms(SCORE.drop));
  el.style.setProperty("--sp-blink", ms(SCORE.blink));
  el.style.setProperty("--sp-pupil", ms(SCORE.blink - 360 > 0 ? SCORE.blink - 360 : 0));
  el.style.setProperty("--sp-look", ms(SCORE.look));
  el.style.setProperty("--sp-hop", ms(SCORE.hop));
  el.style.setProperty("--sp-open", ms(SCORE.open));
  el.style.setProperty("--sp-smile", ms(SCORE.smile));
  el.style.setProperty("--sp-rise", ms(SCORE.rise));
  el.style.setProperty("--sp-name", ms(SCORE.name));
  el.style.setProperty("--sp-rule", ms(SCORE.rule));
  el.style.setProperty("--sp-tag", ms(SCORE.tag));

  /* the reader's name, if the app already knows it, sets under the tagline
     a beat later. Never a placeholder, never a blank line. */
  var who = "";
  try {
    var s = JSON.parse(localStorage.getItem("tsb_auth_session") || "null");
    who = (s && s.user && ((s.user.user_metadata || {}).full_name || (s.user.user_metadata || {}).name)) || "";
  } catch (e) {}
  if (!who) { try { who = localStorage.getItem("tsb_name") || ""; } catch (e) {} }
  who = String(who || "").trim().split(/\s+/)[0];
  if (who && who.length > 1 && who.length < 18 && !reduced) {
    var greet = document.createElement("div");
    greet.className = "sp-who";
    greet.textContent = "for " + who;
    greet.style.cssText = "position:relative;margin-top:min(4vw,14px);text-align:center;" +
      "font:500 12px/1 'Space Grotesk',system-ui;letter-spacing:.02em;color:rgba(22,19,15,.52);opacity:0";
    el.appendChild(greet);
    setTimeout(function () {
      greet.style.transition = "opacity .5s ease";
      greet.style.opacity = "1";
    }, SCORE.tag + 240);
  }

  /* ---------------------------------------------------------------------
     WARM WHAT THE APP NEEDS, WHILE THE OPENING PLAYS.
     The first cover and the two faces the first screen uses. No fetch of
     anything the opening itself would need to wait for.
     --------------------------------------------------------------------- */
  function warm() {
    var covers = [];
    try {
      var slots = JSON.parse(localStorage.getItem("tsb_taste_slots") || "null");
      if (slots && slots.ids && slots.ids.length) covers = slots.ids.slice(0, 3);
    } catch (e) {}
    if (!covers.length) covers = ["atomic-habits", "deep-work", "rich-dad-poor-dad"];
    covers.forEach(function (id) { var im = new Image(); im.src = "assets/covers/" + id + ".jpg"; });
    try {
      if (document.fonts && document.fonts.load) {
        document.fonts.load('400 48px "Newsreader"');
        document.fonts.load('italic 400 48px "Newsreader"');
      }
    } catch (e) {}
  }

  /* ---------------------------------------------------------------------
     THE CLOCK. Animations start on the frame after the first paint.
     --------------------------------------------------------------------- */
  var gone = false, liftAt = null;
  function lift() {
    if (gone || el.classList.contains("sp-lift")) return;
    el.classList.add("sp-lift");
    try { window.dispatchEvent(new CustomEvent("tsb:splash-lift")); } catch (e) {}
    /* the app is visible under the lifting field: unlock scroll now, not at
       the end, so the two halves overlap instead of stepping */
    try { document.documentElement.classList.remove("tsb-loading"); } catch (e) {}
  }
  function kill() {
    if (gone) return;
    gone = true;
    try { el.remove(); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("tsb:splash-done")); } catch (e) {}
    try { if (window.TSB_SPLASH) window.TSB_SPLASH.done = true; } catch (e) {}
  }

  function start() {
    warm();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add("sp-run");
        liftAt = setTimeout(lift, SCORE.lift);
        setTimeout(kill, SCORE.end);
      });
    });
  }
  start();

  /* skipping: any touch, wheel or key. The lift is still animated, so a tap
     never cuts to a hard edge. */
  function skip() { if (gone) return; if (liftAt) clearTimeout(liftAt); lift(); setTimeout(kill, 240); }
  ["pointerdown", "wheel", "touchstart", "keydown", "click"].forEach(function (ev) {
    window.addEventListener(ev, skip, { once: true, passive: true });
  });

  /* a tab that was left in the background must not come back mid scene */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !gone && document.documentElement.classList.contains("tsb-loading")) skip();
  });

  window.TSB_SPLASH = { score: SCORE, skip: skip, done: false, coarse: coarse };
})();
