/* ==========================================================================
   v353 · Pip, and the shelf that behaves like a shelf
   ---------------------------------------------------------------
   TSB_PIP      the little book with a face (welcome + sign-in screens)
   TSB_SHELF3D  the You shelf: real books standing on real planks. Tap one and
                it is pulled off the shelf by a spring (nothing linear), floats
                out to the middle of the screen, and swings itself open on its
                spine. Then the book page takes over.
   No libraries. One rAF loop per flight, killed when it settles.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------- Pip ---------------- */
  function pip(cls) {
    return '<div class="pip' + (cls ? " " + cls : "") + '" aria-hidden="true">' +
      '<div class="pip__body">' +
        '<div class="pip__sheen"></div>' +
        '<span class="pip__page"></span>' +
        '<div class="pip__face">' +
          '<span class="pip__eye"><b></b><span class="pip__lid"></span></span>' +
          '<span class="pip__eye"><b></b><span class="pip__lid"></span></span>' +
          '<span class="pip__brow pip__brow--l"></span><span class="pip__brow pip__brow--r"></span>' +
        '</div>' +
        '<span class="pip__mouth"></span>' +
        '<span class="pip__feet"><i></i><i></i></span>' +
      '</div>' +
      '<span class="pip__shadow"></span>' +
    '</div>';
  }
  window.TSB_PIP = pip;
  /* v363 · PIP LOOKS AT YOUR HAND.
     Every rendered Pip follows the pointer, so the character is watching the
     reader rather than the middle of the room. The pupils lean toward the
     pointer, the head tilts a little, and a tap lifts Pip up out of the flow
     for a beat and puts it back. One passive listener, no rAF loop while the
     pointer is still. */
  var WATCH = { bound: false, x: 0, y: 0, has: false };
  function eyes() { return document.querySelectorAll(".pip"); }
  function look() {
    if (!WATCH.has) return;
    eyes().forEach(function (pipEl) {
      var r = pipEl.getBoundingClientRect();
      if (!r.width || r.bottom < -200 || r.top > window.innerHeight + 200) return;
      var cx = r.left + r.width / 2, cy = r.top + r.height * 0.4;
      var dx = Math.max(-1, Math.min(1, (WATCH.x - cx) / (window.innerWidth * 0.5)));
      var dy = Math.max(-1, Math.min(1, (WATCH.y - cy) / (window.innerHeight * 0.5)));
      pipEl.querySelectorAll(".pip__eye b").forEach(function (b) {
        b.style.animation = "none";
        b.style.transform = "translate(" + (dx * 26) + "%, " + (dy * 26) + "%)";
      });
      var face = pipEl.querySelector(".pip__face");
      if (face) {
        face.style.transform = "rotate(" + (dx * 3.5).toFixed(1) + "deg) translateX(" + (dx * 4).toFixed(1) + "px)";
        face.style.transformOrigin = "50% 100%";
      }
    });
  }
  function watch() {
    if (WATCH.bound) return; WATCH.bound = true;
    window.addEventListener("pointermove", function (e) {
      WATCH.x = e.clientX; WATCH.y = e.clientY; WATCH.has = true;
      if (!WATCH.queued) { WATCH.queued = true; requestAnimationFrame(function () { WATCH.queued = false; look(); }); }
    }, { passive: true });
    document.addEventListener("pointerdown", function (e) {
      var pipEl = e.target && e.target.closest ? e.target.closest(".pip") : null;
      if (!pipEl) return;
      pipEl.classList.remove("pip--up");
      void pipEl.offsetWidth;
      pipEl.classList.add("pip--up");
      setTimeout(function () { pipEl.classList.remove("pip--up"); }, 900);
    }, true);
    document.addEventListener("click", function (e) {
      var pipEl = e.target && e.target.closest ? e.target.closest(".pip") : null;
      if (!pipEl) return;
      pipEl.classList.remove("pip--up"); void pipEl.offsetWidth; pipEl.classList.add("pip--up");
      setTimeout(function () { pipEl.classList.remove("pip--up"); }, 900);
    }, true);
  }
  if (typeof window !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch);
    else watch();
    setTimeout(watch, 1200);
  }

  /* ---------------- the shelf ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function cover(b) { return (b && b.cover) || ("assets/covers/" + (b && b.id) + ".jpg"); }

  var reduce = false;
  try { reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}

  function bookBtn(b, i) {
    return '<button class="bk3d" type="button" data-bk="' + esc(b.id) + '" style="--i:' + i + '" ' +
      'aria-label="Open ' + esc(b.title) + '">' +
      '<span class="bk3d__inner"><b>' + esc((b.title || "").slice(0, 60)) + '</b>' +
        '<span>' + esc((b.author || "TheSmallBook").slice(0, 34)) + '</span>' +
        '<i>' + esc((b.lessons && b.lessons.length) || b.mins || 8) + ' min</i></span>' +
      '<span class="bk3d__side"></span><span class="bk3d__top"></span>' +
      '<span class="bk3d__front"><img src="' + cover(b) + '" alt="" loading="lazy" decoding="async"><i class="bk3d__coverback"></i></span>' +
    '</button>';
  }

  /* two rows of six, the rest counted under the shelf */
  function html(list, opts) {
    opts = opts || {};
    if (!list || !list.length) {
      return '<div class="sh3d sh3d--empty"><div><p>Nothing on the shelf yet.<br>Open a book and it lands here.</p>' +
        '<a href="index.html">Find today&rsquo;s pick</a></div></div>';
    }
    var per = opts.per || 6;
    var rows = [], shown = list.slice(0, per * 2), hidden = list.length - shown.length;
    for (var r = 0; r * per < shown.length; r++) {
      var slice = shown.slice(r * per, r * per + per);
      rows.push('<div class="sh3d__row">' + slice.map(function (b, i) { return bookBtn(b, r * per + i); }).join("") +
        '</div><div class="sh3d__plank"></div>');
    }
    return '<div class="sh3d" data-sh3d>' +
      '<div class="sh3d__wood"></div>' + rows.join("") +
      (hidden > 0 ? '<a class="sh3d__more" href="index.html#library"><b>' + hidden + '</b> more on the shelf</a>' : '') +
    '</div>';
  }

  /* ---------------- the flight ---------------- */
  var busy = false;

  /* v357 · A SPRING THAT LANDS, NOT ONE THAT WOBBLES.
     The old loop was an under damped spring: on a slow phone it overshot the
     face, came back, and settled with a visible shiver. This is a critically
     damped spring integrated against real time, so a slow frame is a longer
     step rather than a bigger wobble, and the last millimetre is swallowed
     instead of shown. */
  function spring(cfg) {
    var pos = { x: 0, y: 0, z: 0, s: 1, r: 0 }, vel = { x: 0, y: 0, z: 0, s: 0, r: 0 };
    var t = cfg.to, done = false;
    var KEYS = ["x", "y", "z", "s", "r"];
    /* stiffness in Hz, damping ratio 1 is no overshoot. A flight across the
       screen wants a slightly softer, slower tail than a small nudge. */
    var hz = cfg.hz || 2.6, zeta = cfg.zeta || 1.0;
    var omega = 2 * Math.PI * hz;
    var last = performance.now();
    function frame(now) {
      if (done) return;
      /* v357: a slow frame is not a slower animation. The elapsed time is cut
         into steps of at most one 60 Hz frame, so a phone that drops to 20 fps
         sees fewer frames of the same flight, not a drag that takes twice as
         long, and never a spring that blows up on a long step. */
      var total = Math.min(0.26, Math.max(0.001, (now - last) / 1000)); last = now;
      var steps = Math.max(1, Math.ceil(total / 0.0166));
      var dt = total / steps;
      var settled = true;
      KEYS.forEach(function (key) {
        var to = t[key] == null ? pos[key] : t[key];
        for (var n = 0; n < steps; n++) {
          var accel = omega * omega * (to - pos[key]) - 2 * zeta * omega * vel[key];
          vel[key] += accel * dt;
          pos[key] += vel[key] * dt;
        }
        /* a value that is close and slow is simply placed: no tail, no blur */
        if (Math.abs(to - pos[key]) < 0.35 && Math.abs(vel[key]) < 12) {
          pos[key] = to; vel[key] = 0;
        } else settled = false;
      });
      cfg.paint(pos);
      if (settled) {
        KEYS.forEach(function (k) { pos[k] = t[k] == null ? pos[k] : t[k]; });
        cfg.paint(pos);
        done = true; if (cfg.done) cfg.done(); return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return {
      stop: function () { done = true; },
      pos: pos,
      /* a flick adds momentum to the same flight instead of starting a new one */
      kick: function (v) { vel.x += v || 0; }
    };
  }

  function fly(btn) {
    if (busy) return;
    busy = true;
    var id = btn.getAttribute("data-bk");
    var r = btn.getBoundingClientRect();
    var clone = btn.cloneNode(true);
    clone.removeAttribute("data-bk");
    clone.className = "bk3d bk3d-fly";
    clone.style.left = r.left + "px";
    clone.style.top = r.top + "px";
    clone.style.width = r.width + "px";
    clone.style.height = r.height + "px";
    document.body.appendChild(clone);
    btn.style.visibility = "hidden";

    var veil = document.createElement("div");
    veil.className = "bk3d-veil";
    document.body.appendChild(veil);
    requestAnimationFrame(function () { veil.classList.add("is-on"); });

    var W = window.innerWidth, H = window.innerHeight;
    var scale = Math.max(1.7, Math.min(3.4, (Math.min(W, H) * 0.58) / r.width));
    var tx = W / 2 - (r.left + r.width / 2);
    var ty = H * 0.44 - (r.top + r.height / 2);

    function paint(p) {
      clone.style.transform = "translate3d(" + p.x.toFixed(2) + "px," + p.y.toFixed(2) + "px," + p.z.toFixed(1) + "px) " +
        "rotateY(" + (-8 + p.r).toFixed(2) + "deg) rotateZ(" + (p.r * 0.5).toFixed(2) + "deg) scale(" + p.s.toFixed(3) + ")";
      clone.style.filter = p.z > 40 ? "drop-shadow(0 " + (28 + p.z * 0.3).toFixed(0) + "px 44px rgba(0,0,0,.55))" : "none";
    }

    function open() {
      clone.classList.add("is-open");
      /* the cover swings on its spine; the page underneath catches the light */
      var page = clone.querySelector(".bk3d__inner");
      if (page && !reduce) {
        page.animate(
          [{ filter: "brightness(.82)" }, { filter: "brightness(1)" }],
          { duration: 720, easing: "cubic-bezier(.2,.9,.2,1)" }
        );
      }
      setTimeout(function () {
        clone.animate(
          [{ transform: clone.style.transform + " scale(1)", opacity: 1 },
           { transform: clone.style.transform + " scale(1.35)", opacity: 0 }],
          { duration: 420, easing: "cubic-bezier(.4,0,.7,.2)", fill: "forwards" }
        );
        veil.classList.add("is-out");
        setTimeout(function () {
          window.location.href = "book.html?id=" + encodeURIComponent(id);
        }, 360);
      }, 1150);
    }

    function close() {
      /* put it back on the shelf, the way it came */
      spring({
        to: { x: 0, y: 0, z: 0, s: 1, r: 0 }, hz: 3.4, zeta: 1, paint: paint,
        done: function () {
          if (clone.parentNode) clone.parentNode.removeChild(clone);
          if (veil.parentNode) veil.parentNode.removeChild(veil);
          btn.style.visibility = "";
          busy = false;
        }
      });
      document.removeEventListener("pointerdown", away, true);
    }
    function away(e) {
      if (e.target === veil || e.target === clone || clone.contains(e.target)) return;
      e.stopPropagation(); e.preventDefault();
      close();
    }
    document.addEventListener("pointerdown", away, true);

    if (reduce) { window.location.href = "book.html?id=" + encodeURIComponent(id); return; }

    /* the pull: a spring, deliberately over-damped on the way out so it reads
       as weight, then the settle happens while the cover is already swinging */
    spring({
      to: { x: tx, y: ty, z: 210, s: scale, r: -10 }, hz: 2.4, zeta: 1.05, paint: paint,
      done: open
    });
  }

  function bind(root) {
    if (!root || root.__b3d) return;
    root.__b3d = true;
    root.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-bk]") : null;
      if (!b) return;
      e.preventDefault();
      fly(b);
    });
    /* the light follows the finger a little, so the shelf is not flat */
    root.addEventListener("pointermove", function (e) {
      var row = e.target.closest ? e.target.closest(".sh3d__row") : null;
      if (!row) return;
      var r = row.getBoundingClientRect();
      var t = (e.clientX - r.left) / r.width - 0.5;
      row.style.perspectiveOrigin = (50 + t * 16).toFixed(1) + "% 46%";
    });
  }

  window.TSB_SHELF3D = {
    html: html,
    bind: bind,
    mount: function (host, list, opts) {
      if (!host) return;
      host.innerHTML = html(list, opts);
      bind(host);
    }
  };
})();
