/* =====================================================================
   TheSmallBook v324 · soft-motion.js
   The motion layer from the redesign, kept separate from app logic.
   Nothing here owns data or navigation: it only decorates what the
   other scripts already render, and every effect switches itself off
   under prefers-reduced-motion.
     1. Book page: the cover becomes a real 3D book (spine, page edges,
        back) that you can tilt or spin with a finger.
     2. Cover morph: tapping a cover on any shelf flies it into the
        book page (cross-document View Transitions, where supported).
     3. Share: the share sheet opens as a circle growing out of the
        button you tapped.
     4. Gentle scroll reveals for sections below the fold.
   ===================================================================== */
(function () {
  "use strict";
  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var root = document.documentElement;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  /* ---------- 1. the 3D book ---------- */
  function build3dCover() {
    var box = document.querySelector(".bookhero__coverbox");
    var img = document.getElementById("cover");
    if (!box || !img || box.querySelector(".bk3") || !window.TSB3D) return;
    var id = "";
    try { id = new URLSearchParams(location.search).get("id") || ""; } catch (e0) {}
    var book = null;
    try { if (typeof BOOKS !== "undefined") { for (var i = 0; i < BOOKS.length; i++) if (BOOKS[i].id === id) { book = BOOKS[i]; break; } } } catch (e1) {}
    var w = Math.min(236, Math.max(150, (box.getBoundingClientRect().width || 236) - 60));
    box.classList.add("b3d-box");
    window.TSB3D.wrap(img, {
      w: w,
      title: book ? book.title : (document.title || "").split(" - ")[0],
      line: book ? (book.oneLiner || book.tagline || "") : "",
      lessons: book && book.lessons ? book.lessons.length : 7
    });
  }

  /* ---------- 2. cover morph between pages ---------- */
  function wireCoverMorph() {
    if (reduce) return;
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href*="book.html?id="]') : null;
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var img = a.querySelector("img");
      if (!img) return;
      var olds = document.querySelectorAll("[data-vt-cover]");
      for (var i = 0; i < olds.length; i++) { olds[i].style.viewTransitionName = ""; olds[i].removeAttribute("data-vt-cover"); }
      img.style.viewTransitionName = "tsb-cover";
      img.setAttribute("data-vt-cover", "1");
    }, true);
    /* coming back (bfcache) must not leave a stale name behind */
    window.addEventListener("pageshow", function () {
      var olds = document.querySelectorAll("[data-vt-cover]");
      for (var i = 0; i < olds.length; i++) { olds[i].style.viewTransitionName = ""; olds[i].removeAttribute("data-vt-cover"); }
    });
  }

  /* ---------- 3. share sheet grows out of the button ---------- */
  function wireShareReveal() {
    if (reduce) return;
    var t = null;
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("#shareLinkBtn, #shareBtn, [data-share-origin]") : null;
      if (!b) return;
      var r = b.getBoundingClientRect();
      root.style.setProperty("--sm-rx", Math.round(r.left + r.width / 2) + "px");
      root.style.setProperty("--sm-ry", Math.round(r.top + r.height / 2) + "px");
      root.classList.add("sm-radial");
      clearTimeout(t);
      t = setTimeout(function () { root.classList.remove("sm-radial"); }, 1000);
    }, true);
  }

  /* ---------- 4. scroll reveals ---------- */
  function wireReveals() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var picks = document.querySelectorAll("main > section, body > section, .section, .shelf-row, .reveal-soft");
    var vh = window.innerHeight || 800, list = [];
    for (var i = 0; i < picks.length; i++) {
      var el = picks[i];
      if (el.closest(".modal, .langsheet, .tsb-bar, [role=dialog]")) continue;
      if (el.getBoundingClientRect().top < vh * 0.92) continue;
      el.classList.add("sm-rv");
      list.push(el);
    }
    if (!list.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("sm-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    list.forEach(function (el) { io.observe(el); });
    /* failsafe: nothing may stay hidden */
    setTimeout(function () { list.forEach(function (el) { el.classList.add("sm-in"); }); }, 6000);
  }

  /* ---------- 5. reader: a hairline that fills as you turn pages ---------- */
  function wireReaderProgress() {
    var pos = document.getElementById("rmPos"), foot = document.querySelector(".rm-footer");
    if (!pos || !foot) return;
    function paint() {
      var m = (pos.textContent || "").match(/(\d+)\D+(\d+)/);
      if (m) foot.style.setProperty("--rm-p", Math.min(1, (+m[1]) / Math.max(1, +m[2])));
    }
    paint();
    if ("MutationObserver" in window) new MutationObserver(paint).observe(pos, { childList: true, characterData: true, subtree: true });
  }

  ready(function () {
    try { wireReaderProgress(); } catch (e5) {}
    try { build3dCover(); } catch (e1) {}
    try { wireCoverMorph(); } catch (e2) {}
    try { wireShareReveal(); } catch (e3) {}
    try { wireReveals(); } catch (e4) {}
  });

  window.TSB_MOTION = { reduce: reduce, build3dCover: build3dCover };
})();
