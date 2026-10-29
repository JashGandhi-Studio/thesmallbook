/* ============================================================
   THESMALLBOOK - REAL 3D BOOK (v325, smoother physics v327)
   A cover becomes an object: front, back with the book's one idea,
   a coloured spine with its title, page edges on three sides, light
   that moves as it turns, a contact shadow, flick-to-spin with
   inertia, and a soft settle to the front or the back cover.
   API:
     TSB3D.wrap(img, opts)   upgrade an existing <img> (keeps the element)
     TSB3D.make(book, opts)  build a new 3D book element for a book object
   opts: { w, rest, interactive, float, title, author, line, id, lessons }
   ============================================================ */
window.TSB3D = (function () {
  "use strict";
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var CSS_ID = "tsb3d-css";

  function css() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement("style");
    s.id = CSS_ID;
    s.textContent = [
      ".bk3{position:relative;width:var(--w);height:var(--h);perspective:1100px;touch-action:pan-y;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}",
      ".bk3.is-live{cursor:grab}.bk3.is-held{cursor:grabbing}",
      ".bk3__obj{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}",
      ".bk3__f{position:absolute;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}",
      ".bk3__f::after{content:'';position:absolute;inset:0;background:#000;opacity:var(--sh,0);pointer-events:none}",
      ".bk3__front{inset:0;transform:translateZ(calc(var(--d)/2));border-radius:2px 7px 7px 2px;background:var(--bg)}",
      ".bk3__front img{display:block;width:100%;height:100%;object-fit:cover;border:0!important;border-radius:inherit!important;box-shadow:none!important;margin:0!important;-webkit-user-drag:none;pointer-events:none}",
      ".bk3__gloss{position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.34) 42%,rgba(255,255,255,.06) 52%,transparent 64%);background-size:320% 100%;background-position:var(--gx,60%) 0;mix-blend-mode:soft-light}",
      ".bk3__hinge{position:absolute;left:0;top:0;bottom:0;width:7%;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.22),rgba(255,255,255,.18) 45%,rgba(0,0,0,.08) 70%,transparent)}",
      ".bk3__back{inset:0;transform:rotateY(180deg) translateZ(calc(var(--d)/2));border-radius:7px 2px 2px 7px;background:var(--bg);color:var(--fg);padding:14% 12%;box-sizing:border-box;display:flex;flex-direction:column}",
      ".bk3__back b{font:600 7px/1 'Space Grotesk',sans-serif;letter-spacing:.24em;text-transform:uppercase;opacity:.7}",
      ".bk3__back p{font-family:Newsreader,Georgia,serif;font-weight:500;font-size:calc(var(--w)*.068);line-height:1.32;margin:12% 0 0;letter-spacing:-.005em}",
      ".bk3__back i{margin-top:auto;align-self:flex-start;width:34%;height:9%;background:repeating-linear-gradient(90deg,currentColor 0 1.5px,transparent 1.5px 3px,currentColor 3px 4px,transparent 4px 6.5px);opacity:.55;border-radius:1px}",
      ".bk3__spine{top:0;bottom:0;left:calc(50% - var(--d)/2);width:var(--d);transform:rotateY(-90deg) translateZ(calc(var(--w)/2));background:linear-gradient(90deg,rgba(0,0,0,.18),rgba(255,255,255,.12) 30%,rgba(0,0,0,.02) 60%,rgba(0,0,0,.2)),var(--bg);color:var(--fg);display:flex;align-items:center;justify-content:center}",
      ".bk3__spine span{writing-mode:vertical-rl;transform:rotate(180deg);font-family:Newsreader,Georgia,serif;font-weight:600;font-size:calc(var(--d)*.42);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-height:78%;letter-spacing:-.005em}",
      ".bk3__pages{top:1.2%;bottom:1.2%;left:calc(50% - var(--d)/2);width:calc(var(--d) - 2px);transform:rotateY(90deg) translateZ(calc(var(--w)/2 - 3px));background:repeating-linear-gradient(90deg,#f6efdf 0 1px,#e6dcc6 1px 2px),#f3ecdb;box-shadow:inset 0 0 6px rgba(0,0,0,.12)}",
      ".bk3__top,.bk3__bot{left:2px;right:4px;top:calc(50% - var(--d)/2);height:calc(var(--d) - 2px);background:repeating-linear-gradient(0deg,#f6efdf 0 1px,#e3d8c1 1px 2px),#f3ecdb}",
      ".bk3__top{transform:rotateX(90deg) translateZ(calc(var(--h)/2 - 2px))}",
      ".bk3__bot{transform:rotateX(-90deg) translateZ(calc(var(--h)/2 - 2px))}",
      ".bk3__shadow{position:absolute;left:8%;right:8%;bottom:calc(var(--h)*-.07);height:calc(var(--h)*.09);border-radius:50%;background:radial-gradient(closest-side,rgba(22,19,15,.38),rgba(22,19,15,0));filter:blur(3px);transform:scaleX(var(--ssx,1));opacity:var(--so,1);pointer-events:none}",
      "html.dark .bk3__shadow,[data-theme=dark] .bk3__shadow{background:radial-gradient(closest-side,rgba(0,0,0,.6),rgba(0,0,0,0))}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function stemOf(src) {
    var m = String(src || "").match(/covers\/([^\/?#]+)\.(jpg|jpeg|png|webp)/i);
    return m ? m[1] : "";
  }
  function colours(src) {
    var ed = window.TSB_ED || {};
    var raw = ed[stemOf(src)] || "", v = "";
    for (var i = 0; i < raw.length; i++) v += (raw.charCodeAt(i) - 97).toString(16);
    if (!v || v.length < 18) return { bg: "#d9cfbb", fg: "#16130F", ac: "#857C6E" };
    return { bg: "#" + v.slice(0, 6), fg: "#" + v.slice(6, 12), ac: "#" + v.slice(12, 18) };
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function face(cls, html) { var d = document.createElement("div"); d.className = "bk3__f " + cls; if (html) d.innerHTML = html; d.setAttribute("aria-hidden", "true"); return d; }

  function build(root, img, o) {
    css();
    var w = o.w || img.getBoundingClientRect().width || 200;
    var ratio = (img.naturalWidth && img.naturalHeight) ? img.naturalHeight / img.naturalWidth : 1.5;
    if (!isFinite(ratio) || ratio < 0.9 || ratio > 1.8) ratio = 1.5;
    var d = Math.round(Math.max(10, Math.min(44, w * (0.09 + Math.min(12, o.lessons || 7) * 0.006))));
    var col = colours(img.getAttribute("src"));
    root.classList.add("bk3");
    root.style.setProperty("--w", w + "px");
    root.style.setProperty("--h", Math.round(w * ratio) + "px");
    root.style.setProperty("--d", d + "px");
    root.style.setProperty("--bg", col.bg);
    root.style.setProperty("--fg", col.fg);
    var obj = document.createElement("div"); obj.className = "bk3__obj";
    var front = face("bk3__front");
    front.appendChild(img);
    front.insertAdjacentHTML("beforeend", "<span class=\"bk3__hinge\"></span><span class=\"bk3__gloss\"></span>");
    var back = face("bk3__back", "<b>TheSmallBook</b><p>" + esc(o.line || "") + "</p><i></i>");
    var spine = face("bk3__spine", "<span>" + esc(o.title || "") + "</span>");
    var pages = face("bk3__pages"), top = face("bk3__top"), bot = face("bk3__bot");
    [front, back, spine, pages, top, bot].forEach(function (f) { obj.appendChild(f); });
    root.appendChild(obj);
    var sh = document.createElement("div"); sh.className = "bk3__shadow"; root.appendChild(sh);
    img.setAttribute("draggable", "false");

    /* keep colours in sync if the page swaps the cover later */
    try {
      new MutationObserver(function () {
        var c = colours(img.getAttribute("src"));
        root.style.setProperty("--bg", c.bg); root.style.setProperty("--fg", c.fg);
        if (img.naturalWidth) {
          var r = img.naturalHeight / img.naturalWidth;
          if (isFinite(r) && r > .9 && r < 1.8) root.style.setProperty("--h", Math.round(w * r) + "px");
        }
      }).observe(img, { attributes: true, attributeFilter: ["src"] });
      img.addEventListener("load", function () {
        var r = img.naturalHeight / img.naturalWidth;
        if (isFinite(r) && r > .9 && r < 1.8) root.style.setProperty("--h", Math.round(w * r) + "px");
      });
    } catch (e) {}

    /* ---------- pose + light ---------- */
    var REST = o.rest == null ? 26 : o.rest;
    var st = { ry: REST, rx: 5, vy: 0, av: 0, spin: false, y: 0, held: false, drag: null, t0: performance.now(), raf: 0, hover: null, target: REST, visible: true };
    function shade(el, a) { el.style.setProperty("--sh", a.toFixed(3)); }
    function apply() {
      obj.style.transform = "translateY(" + st.y.toFixed(2) + "px) rotateX(" + st.rx.toFixed(2) + "deg) rotateY(" + st.ry.toFixed(2) + "deg)";
      var r = st.ry * Math.PI / 180, L = -0.5; /* light from the front-left */
      var lf = Math.cos(r - L), lb = Math.cos(r + Math.PI - L), ls = Math.cos(r - Math.PI / 2 - L), lp = Math.cos(r + Math.PI / 2 - L);
      shade(front, Math.max(0, 0.32 - lf * 0.32)); shade(back, Math.max(0, 0.32 - lb * 0.32));
      shade(spine, Math.max(0, 0.30 - ls * 0.3)); shade(pages, Math.max(0, 0.26 - lp * 0.26));
      shade(top, 0.04); shade(bot, 0.3);
      root.style.setProperty("--gx", (60 + Math.sin(r) * 55).toFixed(1) + "%");
      var c = Math.abs(Math.cos(r));
      root.style.setProperty("--ssx", (0.55 + 0.45 * c + (d / w) * (1 - c) * 2).toFixed(3));
      root.style.setProperty("--so", (0.75 - st.y * 0.03).toFixed(3));
    }
    function norm(a) { while (a > 180) a -= 360; while (a < -180) a += 360; return a; }
    /* v327: frame-rate independent motion. A spring settles the book (a little
       overshoot, like a real object), a flick spins it with weight, and when it
       rests it breathes: a slow sway and a soft bob, like the redesign film. */
    var last = 0;
    function loop(now) {
      st.raf = 0;
      if (!st.visible) return;
      var dt = last ? Math.min(0.05, Math.max(0.001, (now - last) / 1000)) : 1 / 60;
      last = now;
      var f = dt * 60, t = (now - st.t0) / 1000, idle = o.float !== false && !reduce;
      if (!st.held) {
        if (st.spin && Math.abs(st.vy) > 0.25) {   /* inertia after a flick */
          st.ry += st.vy * f; st.vy *= Math.pow(0.955, f);
          st.target = null;
        } else {
          if (st.spin) { st.av = st.vy * 60; st.spin = false; }
          if (st.target == null) {                /* settle to the front or the back cover */
            var rel = norm(st.ry - REST);
            st.target = st.ry - rel + (Math.abs(rel) > 90 ? (rel > 0 ? 180 : -180) : 0);
          }
          var goal = st.target + (st.hover ? st.hover.x * 22 : idle ? Math.sin(t * 0.55) * 7 + Math.sin(t * 0.23) * 3 : 0);
          st.av += (38 * (goal - st.ry) - 9 * st.av) * dt;
          st.ry += st.av * dt;
          st.vy = 0;
        }
        var gx = st.hover ? 5 - st.hover.y * 12 : 5 + (idle ? Math.sin(t * 0.45) * 2.2 : 0);
        st.rx += (gx - st.rx) * (1 - Math.pow(0.92, f));
        st.y = (idle && !st.hover) ? Math.sin(t * 0.9) * 2.5 - 1 : st.y * Math.pow(0.9, f);
      }
      apply();
      st.raf = requestAnimationFrame(loop);
    }
    function kick() { if (!st.raf && !reduce) { last = 0; st.raf = requestAnimationFrame(loop); } }
    /* a tap (no drag) turns the book over to read the back */
    function flip() { st.spin = false; st.vy = 0; var rel = norm(st.ry - REST); st.target = st.ry - rel + (Math.abs(rel) > 90 ? 0 : 180); kick(); }
    try { document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); }); } catch (eV) {}

    /* entrance: swings in from edge-on */
    if (!reduce && o.entrance !== false) { st.ry = REST + 75; st.target = REST; }
    apply();

    if (o.interactive !== false) {
      root.classList.add("is-live");
      root.setAttribute("role", "img");
      root.setAttribute("aria-label", (o.title ? o.title + ", " : "") + "3D book. Drag to spin it, tap to turn it over.");
      var lastX = 0, lastT = 0;
      root.addEventListener("pointerdown", function (e) {
        st.held = true; st.drag = { x: e.clientX, y: e.clientY, ry: st.ry, rx: st.rx, t: performance.now(), moved: 0 }; st.vy = 0; st.av = 0;
        lastX = e.clientX; lastT = performance.now();
        root.classList.add("is-held");
        try { root.setPointerCapture(e.pointerId); } catch (e2) {}
        kick();
      });
      root.addEventListener("pointermove", function (e) {
        if (st.held && st.drag) {
          st.drag.moved = Math.max(st.drag.moved, Math.abs(e.clientX - st.drag.x) + Math.abs(e.clientY - st.drag.y));
          st.ry = st.drag.ry + (e.clientX - st.drag.x) * 0.7;
          st.rx = Math.max(-18, Math.min(18, st.drag.rx - (e.clientY - st.drag.y) * 0.18));
          var now = performance.now(), dt = Math.max(8, now - lastT);
          st.vy = (e.clientX - lastX) * 0.7 * (16 / dt);
          lastX = e.clientX; lastT = now;
          apply();
        } else if (e.pointerType === "mouse") {
          var r = root.getBoundingClientRect();
          st.hover = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
          kick();
        }
      });
      function end() {
        if (!st.held) return;
        var tap = st.drag && st.drag.moved < 6 && performance.now() - st.drag.t < 350;
        st.held = false; st.drag = null; root.classList.remove("is-held");
        if (tap) { flip(); return; }
        if (performance.now() - lastT > 80) st.vy = 0;
        st.vy = Math.max(-26, Math.min(26, st.vy));
        st.spin = Math.abs(st.vy) > 0.25; st.target = null; kick();
      }
      root.addEventListener("pointerup", end);
      root.addEventListener("pointercancel", end);
      root.addEventListener("mouseleave", function () { st.hover = null; kick(); });
      root.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { st.vy = e.key === "ArrowLeft" ? -9 : 9; st.spin = true; st.target = null; kick(); }
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
      });
      root.tabIndex = 0;
    }
    try {
      new IntersectionObserver(function (en) {
        st.visible = en[0].isIntersecting;
        if (st.visible) kick();
      }).observe(root);
    } catch (e3) { kick(); }
    kick();
    return root;
  }

  function wrap(img, o) {
    o = o || {};
    if (!img || img.closest(".bk3")) return null;
    var root = document.createElement("div");
    img.parentNode.insertBefore(root, img);
    return build(root, img, o);
  }
  function make(book, o) {
    o = o || {};
    var img = new Image();
    img.src = book.cover; img.alt = (book.title || "Book") + " cover";
    var root = document.createElement("div");
    o.title = o.title || book.title; o.line = o.line || book.oneLiner || book.tagline || "";
    o.lessons = o.lessons || (book.lessons ? book.lessons.length : 7);
    return build(root, img, o);
  }
  return { wrap: wrap, make: make, colours: colours };
})();
