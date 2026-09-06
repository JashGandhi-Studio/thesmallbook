/* ============================================================
   THESMALLBOOK — PREMIUM BOTTOM ACTION BAR v2 (mobile-first)
   Home · Read · + (Stories) · Chat · You
   ------------------------------------------------------------
   v2 changes:
   - READ  → jumps straight to the home shelf (#library), no
     manual scroll, never dumps you into a book page.
   - +     → opens the STORIES section.
   - CHAT  → full chat page (chat.html), not a pop-out.
   - YOU   → sign-in sheet first (auth.js openSheet); if already
     signed in → the account page (login.html, signed-in state).
   - Active pill trimmed smaller + premium micro-motion.
   NON-NEGOTIABLE RULES (design spec — do not break):
   1. The bar is centred with left:50% → EVERY rule that
      re-declares transform on .tsb-bar must re-state
      translateX(-50%), or the bar slides diagonally off-screen.
   2. Animate transform & opacity ONLY — never bottom/height/width.
   3. The active state is painted ONLY by .tsb-bar__item::before.
      Never set a background on the item itself (double-layering).
   4. `contain: layout paint` stays on the bar (see CSS).
   5. Scrolling pages get padding-bottom:
      calc(var(--bar-total) + 24px) — via html.tsb-hasbar (CSS).
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_BAR) return;
  window.TSB_BAR = true;

  var path = (location.pathname.split("/").pop() || "").toLowerCase();
  if (!path) path = "index.html";

  /* ---------- outline icons (stroke = currentColor) ---------- */
  var SVG_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var ICO = {
    home: SVG_OPEN + '<path d="M3 10.4 12 3l9 7.4"/><path d="M5.6 8.9V21h12.8V8.9"/><path d="M9.9 21v-6.3h4.2V21"/></svg>',
    read: SVG_OPEN + '<path d="M12 6.9C10.6 5.1 8.4 4.1 5.7 4.1H2.9v13.5h3.3c2.5 0 4.5 1 5.8 2.8 1.3-1.8 3.3-2.8 5.8-2.8h3.3V4.1h-2.8c-2.7 0-4.9 1-6.3 2.8Z"/><path d="M12 6.9v13.5"/></svg>',
    plus: SVG_OPEN + '<path d="M12 5.6v12.8M5.6 12h12.8"/></svg>',
    chat: SVG_OPEN + '<path d="M21 11.6a8.4 8.4 0 0 1-8.5 8.3 8.9 8.9 0 0 1-3.7-.8L3 20.6l1.6-5.5a8 8 0 0 1-.9-3.6 8.4 8.4 0 0 1 8.6-8.2 8.4 8.4 0 0 1 8.7 8.3Z"/></svg>',
    you:  SVG_OPEN + '<circle cx="12" cy="7.6" r="3.6"/><path d="M4.9 20.4v-1.1a5.4 5.4 0 0 1 5.4-5.4h3.4a5.4 5.4 0 0 1 5.4 5.4v1.1"/></svg>'
  };

  /* ---------- active tab for this page (follows your selection) ---------- */
  function pageName() {
    return (location.pathname.split("/").pop() || "").toLowerCase() || "index.html";
  }
  function currentActive() {
    var p = pageName();
    if (p === "index.html") return location.hash === "#library" ? "read" : "home";
    if (p === "book.html") return "read";
    if (p === "stories.html" || p === "story.html") return "scan";
    if (p === "chat.html") return "chat";
    if (p === "login.html" || p === "settings.html") return "you";
    return "";
  }
  var active = currentActive();

  var onIndex = path === "index.html";
  /* chat carries the current book so the page keeps its context chips */
  var bookCtx = "";
  if (path === "book.html") {
    var m = location.search.match(/[?&]id=([\w-]+)/);
    if (m) bookCtx = "?book=" + encodeURIComponent(m[1]);
  }

  var bar = document.createElement("nav");
  bar.id = "tsbBar";
  bar.className = "tsb-bar tsb-bar--off"; /* parked below the screen */
  bar.setAttribute("aria-label", "Main");
  bar.innerHTML =
    '<a class="tsb-bar__item' + (active === "home" ? " is-active" : "") + '" data-tab="home" href="index.html"' + (active === "home" ? ' aria-current="page"' : "") + '>' + ICO.home + '<span class="tsb-bar__lbl">Home</span></a>' +
    '<a class="tsb-bar__item' + (active === "read" ? " is-active" : "") + '" data-tab="read" href="' + (onIndex ? "#library" : "index.html#library") + '"' + (active === "read" ? ' aria-current="page"' : "") + '>' + ICO.read + '<span class="tsb-bar__lbl">Read</span></a>' +
    '<a class="tsb-bar__item tsb-bar__item--plus' + (active === "scan" ? " is-active" : "") + '" data-tab="scan" href="stories.html" aria-label="Stories">' + '<span class="tsb-bar__plus">' + ICO.plus + "</span></a>" +
    '<a class="tsb-bar__item' + (active === "chat" ? " is-active" : "") + '" data-tab="chat" href="chat.html' + bookCtx + '"' + (active === "chat" ? ' aria-current="page"' : "") + '>' + ICO.chat + '<span class="tsb-bar__lbl">Chat</span></a>' +
    '<a class="tsb-bar__item' + (active === "you" ? " is-active" : "") + '" data-tab="you" href="login.html"' + (active === "you" ? ' aria-current="page"' : "") + '>' + ICO.you + '<span class="tsb-bar__lbl">You</span></a>';

  document.body.appendChild(bar);
  document.documentElement.classList.add("tsb-hasbar");

  /* the highlight follows what you actually selected — live */
  function setActive(id) {
    bar.querySelectorAll(".tsb-bar__item").forEach(function (it) {
      var on = it.getAttribute("data-tab") === id;
      it.classList.toggle("is-active", on);
      if (on) it.setAttribute("aria-current", "page");
      else it.removeAttribute("aria-current");
    });
  }
  window.addEventListener("hashchange", function () {
    if (pageName() === "index.html") setActive(currentActive());
  });

  /* ---------- taps ---------- */
  bar.addEventListener("click", function (e) {
    var item = e.target.closest ? e.target.closest(".tsb-bar__item") : null;
    if (!item) return;
    var id = item.getAttribute("data-tab");

    /* YOU: signed-out readers get the premium sign-in sheet first */
    if (id === "you") {
      var u = null;
      try { u = window.TSB_AUTH && TSB_AUTH.user ? TSB_AUTH.user() : null; } catch (err) {}
      if (!u && window.TSB_AUTH && TSB_AUTH.openSheet) {
        e.preventDefault();
        TSB_AUTH.openSheet();
        return;
      }
      return; /* signed in (or auth off) → normal link to the account page */
    }

    /* READ on the home page → glide to the shelf, highlight follows */
    if (id === "read" && pageName() === "index.html") {
      e.preventDefault();
      var lib = document.getElementById("library");
      if (lib) lib.scrollIntoView({ behavior: "smooth", block: "start" });
      try { history.replaceState(null, "", "#library"); } catch (err) {}
      setActive("read");
      return;
    }

    /* HOME on the home page → back to top, highlight follows */
    if (id === "home" && pageName() === "index.html") {
      e.preventDefault();
      try { history.replaceState(null, "", location.pathname); } catch (err) {}
      setActive("home");
      sameTabTap("home");
      return;
    }

    /* tapping the tab you're already on (Home/Read/Stories/Chat/You):
       1st tap glides to top silently, a quick 2nd tap says "you're here" */
    if (item.classList.contains("is-active")) {
      e.preventDefault();
      sameTabTap(id);
    }
  });

  /* double-tap language: first tap = silent glide, second = clean note */
  var lastTap = { id: null, t: 0 };
  function sameTabTap(id) {
    var now = Date.now();
    var dbl = lastTap.id === id && now - lastTap.t < 2500;
    lastTap = { id: id, t: now };
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (dbl) cleanToast("You’re already on " + (NAMES[id] || "this page") + " ✨");
  }

  /* clean paper toast — matches the app, never a black box */
  var NAMES = { home: "Home", read: "Read", scan: "Stories", chat: "Chat", you: "You" };
  function cleanToast(msg) {
    try {
      document.querySelectorAll(".tsb-clean-toast").forEach(function (x) { x.parentNode.removeChild(x); });
      var t = document.createElement("div");
      t.className = "toast tsb-clean-toast";
      t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(function () { t.classList.add("show"); });
      window.setTimeout(function () {
        t.classList.remove("show");
        window.setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 350);
      }, 1900);
    } catch (e) {}
  }

  /* ---------- enter: drops straight up (transform+opacity only) ---------- */
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  function atPageBottom() {
    try {
      return (window.scrollY || 0) + window.innerHeight >= document.documentElement.scrollHeight - 6;
    } catch (e) { return false; }
  }
  /* pages that never scroll (chat, short pages): the bar is ALWAYS
     visible there — tucking it would leave a dead empty strip */
  function pageScrolls() {
    try { return document.documentElement.scrollHeight > window.innerHeight + 8; } catch (e) { return true; }
  }
  var hidden = false;
  function setBarOff(off) {
    hidden = off;
    bar.classList.toggle("tsb-bar--off", off);
    /* floating widgets (podcast player, lesson fab) ride this class:
       bar tucked → they glide down; bar back → they glide up */
    document.documentElement.classList.toggle("tsb-bar-hidden", off);
  }
  window.setTimeout(function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        /* resting at the very end of a page → stay tucked so the
           footer's last line is fully readable; any scroll-up brings it back */
        if (!pageScrolls() || !atPageBottom()) setBarOff(false);
      });
    });
  }, 260);

  /* ---------- hide on scroll-down, reveal on scroll-up (rAF-smooth) ---------- */
  if (!reduce) {
    var lastY = window.scrollY || 0;
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (!pageScrolls()) { if (hidden) setBarOff(false); return; }
        var y = window.scrollY || 0;
        var dy = y - lastY;
        if (Math.abs(dy) < 6) return;
        lastY = y;
        if (y < 90) {
          if (hidden) setBarOff(false);
          return;
        }
        if (y + window.innerHeight >= document.documentElement.scrollHeight - 6 && Math.abs(dy) < 40) {
          /* settled at the page end — tuck again */
          if (!hidden) setBarOff(true);
          return;
        }
        if (dy > 0 && !hidden) setBarOff(true);
        else if (dy < 0 && hidden) setBarOff(false);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();
