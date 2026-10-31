/* ============================================================
   THESMALLBOOK · MOTION
   The movement layer. Nothing here owns data, a page or a decision:
   it only makes what the app already does feel physical.

     1. Page changes cross-fade through the View Transition API with a
        short lift, and the bar stays still while the content moves.
     2. Same-page moves (Today to Library, a sheet, a filter) go through
        the same transitions, so the two kinds feel identical.
     3. A finger on any control presses it in by 3% and lets it spring
        back, the way a real button does.
     4. Covers arrive as soft blocks and fade in when the pixels land,
        so a shelf never shows empty boxes.
     5. Everything switches itself off for prefers-reduced-motion, and
        nothing here blocks a tap if it fails.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_MOTION_344) return;
  window.TSB_MOTION_344 = true;

  var reduce = false;
  try { reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}
  var root = document.documentElement;
  var SUPPORTS_VT = typeof document.startViewTransition === "function";

  /* the easing everyone recognises: fast out, settled in */
  var SPRING = "cubic-bezier(.22,1,.36,1)";
  var EXIT = "cubic-bezier(.4,0,1,1)";

  /* ---------- 1 · the stylesheet ---------- */
  var css = document.createElement("style");
  css.id = "tsbMotion344";
  css.textContent = [
    reduce ? "" : "@view-transition { navigation: auto; }",
    reduce ? "" : "::view-transition-old(root),::view-transition-new(root){animation-duration:.34s;animation-timing-function:" + SPRING + "}",
    reduce ? "" : "::view-transition-old(root){animation-name:tsbVoc;animation-duration:.22s;animation-timing-function:" + EXIT + "}",
    reduce ? "" : "::view-transition-new(root){animation-name:tsbVin;animation-duration:.38s;animation-timing-function:" + SPRING + "}",
    reduce ? "" : "@keyframes tsbVin{from{opacity:0;transform:translateY(10px) scale(.994)}to{opacity:1;transform:none}}",
    reduce ? "" : "@keyframes tsbVoc{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-6px) scale(1.002)}}",
    /* the furniture does not travel: bar, header and dock hold their place */
    reduce ? "" : "::view-transition-group(tsb-bar),::view-transition-old(tsb-bar),::view-transition-new(tsb-bar),::view-transition-group(tsb-nav),::view-transition-old(tsb-nav),::view-transition-new(tsb-nav){animation:none}",
    /* a pressed control sinks and comes back on a spring */
    ".m-press{transform:scale(.972)!important;transition:transform .11s " + EXIT + " !important}",
    "[data-m-pressable]{transition:transform .26s " + SPRING + ",box-shadow .26s " + SPRING + "}",
    /* covers: a soft block until the pixels land */
    ".m-shimmer{background:linear-gradient(100deg,#efe7d8 20%,#f8f3ea 42%,#efe7d8 62%) !important;background-size:220% 100% !important;animation:mShim 1.15s linear infinite;color:transparent !important;border-color:transparent !important}",
    ".m-shimmer img{opacity:0}",
    "@keyframes mShim{from{background-position:120% 0}to{background-position:-60% 0}}",
    ".m-arrive{animation:mArrive .42s " + SPRING + " both}",
    "@keyframes mArrive{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}",
    reduce ? ".m-press{transform:none!important}.m-shimmer{animation:none}.m-arrive{animation:none}" : ""
  ].join("");
  (document.head || root).appendChild(css);

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  /* ---------- 2 · name the furniture so it does not cross-fade ---------- */
  function nameFurniture(tries) {
    if (reduce) return;
    tries = tries || 0;
    try {
      var bar = document.getElementById("tsbBar");
      if (bar) bar.style.viewTransitionName = "tsb-bar";
      else if (tries < 40) return setTimeout(function () { nameFurniture(tries + 1); }, 100);
      var nav = document.querySelector("nav.nav, .rnd-nav");
      if (nav && !nav.closest("#tsbBar")) nav.style.viewTransitionName = "tsb-nav";
    } catch (e) {}
  }

  /* ---------- 3 · same-page moves ---------- */
  /* Nothing to do here any more: film.js wraps every hash change in its own
     View Transition. A second transition started on top of that one is what
     made tabs stutter (and what threw "Transition was skipped"), so this
     layer deliberately keeps its hands off navigation. */
  function innerMoves() {}

  /* ---------- 4 · press physics ---------- */
  function pressPhysics() {
    if (reduce) return;
    var PRESSABLE = "button, .btn, .ft-btn, .tsb-bar__item, .f-btn, .fg-plan, .fg-cta, .goldplan-btn, a.ft-card, a.ft-tile, .chip, [role=button], .aq-lib__row, .ft-chip";
    var held = null;
    function clear() {
      if (!held) return;
      held.classList.remove("m-press");
      held = null;
    }
    document.addEventListener("pointerdown", function (e) {
      var el = e.target.closest && e.target.closest(PRESSABLE);
      if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
      if (e.pointerType === "mouse" && e.button > 0) return;
      clear();
      held = el;
      el.setAttribute("data-m-pressable", "");
      el.classList.add("m-press");
    }, true);
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
      document.addEventListener(ev, clear, true);
    });
    window.addEventListener("scroll", clear, { passive: true });
  }

  /* ---------- 5 · covers arrive softly ---------- */
  function coverSettle() {
    var SEL = ".ft-card img, .f-cover img, .ft-row img, .f-libcard img, .fy-shelf img, .ft-orig img, .b3d-cover img";
    function settle(img) {
      var host = img.closest(".ft-card, .f-cover, .ft-row, .f-libcard, .fy-shelf, .ft-orig");
      if (!host) return;
      var done = function () {
        host.classList.remove("m-shimmer");
        img.classList.add("is-ready");
      };
      if (img.complete && img.naturalWidth) { done(); return; }
      /* only a cover you can see earns a placeholder: a shelf of lazy
         images far below the fold should stay quiet, not flicker */
      var near = true;
      try {
        var r = img.getBoundingClientRect();
        near = r.width > 8 && r.height > 8 && r.top < (window.innerHeight || 800) * 2.2;
      } catch (e2) {}
      if (!near) { done(); return; }
      host.classList.add("m-shimmer");
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      /* never leave a shimmer running forever */
      setTimeout(done, 12000);
    }
    function scan(scope) {
      var list = (scope || document).querySelectorAll(SEL);
      for (var i = 0; i < list.length; i++) settle(list[i]);
    }
    ready(function () {
      scan(document);
      if (!("MutationObserver" in window)) return;
      var mo = new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var added = records[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (!n || n.nodeType !== 1) continue;
            if (n.matches && n.matches("img")) settle(n);
            else if (n.querySelectorAll) scan(n);
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    });
  }

  /* ---------- 6 · the arrivals: content that should not pop ---------- */
  function arrivals() {
    if (reduce) return;
    window.addEventListener("tsb:onboarded", function () {
      var main = document.querySelector(".ft, .fl-hd, main");
      if (main) main.classList.add("m-arrive");
    });
  }

  ready(function () {
    try { nameFurniture(); } catch (e1) {}
    try { innerMoves(); } catch (e2) {}
    try { pressPhysics(); } catch (e3) {}
    try { coverSettle(); } catch (e4) {}
    try { arrivals(); } catch (e5) {}
    window.addEventListener("pageshow", function () { try { nameFurniture(); } catch (e6) {} });
  });

  window.TSB_MOTION_SPRING = SPRING;
})();
