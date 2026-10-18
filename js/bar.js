/* ============================================================
   THESMALLBOOK, PREMIUM BOTTOM ACTION BAR v2 (mobile-first)
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
   NON-NEGOTIABLE RULES (design spec, do not break):
   1. The bar is centred with left:50% → EVERY rule that
      re-declares transform on .tsb-bar must re-state
      translateX(-50%), or the bar slides diagonally off-screen.
   2. Animate transform & opacity ONLY, never bottom/height/width.
   3. The active state is painted ONLY by .tsb-bar__item::before.
      Never set a background on the item itself (double-layering).
   4. `contain: layout paint` stays on the bar (see CSS).
   5. Scrolling pages get padding-bottom:
      calc(var(--bar-total) + 24px), via html.tsb-hasbar (CSS).
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_BAR) return;
  window.TSB_BAR = true;

  var path = (location.pathname.split("/").pop() || "").toLowerCase();
  if (!path) path = "index.html";

  /* ---------- outline icons (stroke = currentColor) ---------- */
  var SVG_OPEN = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var ICO = {
    home: SVG_OPEN + '<path d="M3 10.4 12 3l9 7.4"/><path d="M5.6 8.9V21h12.8V8.9"/><path d="M9.9 21v-6.3h4.2V21"/></svg>',
    audio: SVG_OPEN + '<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="17" y="12" width="4" height="9" rx="1"/></svg>',
    stories: SVG_OPEN + '<path d="M12 6.9C10.6 5.1 8.4 4.1 5.7 4.1H2.9v13.5h3.3c2.5 0 4.5 1 5.8 2.8 1.3-1.8 3.3-2.8 5.8-2.8h3.3V4.1h-2.8c-2.7 0-4.9 1-6.3 2.8Z"/><path d="M12 6.9v13.5"/></svg>',
    you:  SVG_OPEN + '<circle cx="12" cy="7.6" r="3.6"/><path d="M4.9 20.4v-1.1a5.4 5.4 0 0 1 5.4-5.4h3.4a5.4 5.4 0 0 1 5.4 5.4v1.1"/></svg>',
    messages: SVG_OPEN + '<line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
    continue: SVG_OPEN + '<circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon></svg>',
    library: SVG_OPEN + '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    scan: SVG_OPEN + '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    notes: SVG_OPEN + '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
    graveyard: SVG_OPEN + '<path d="M18 2H6a2 2 0 0 0-2 2v18h16V4a2 2 0 0 0-2-2z"></path><line x1="12" y1="7" x2="12" y2="13"></line><line x1="9" y1="10" x2="15" y2="10"></line></svg>',
    ask: SVG_OPEN + '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="13" y2="13"></line></svg>',
    plus: '<div class="tsb-bar__plus"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>'
  };

  /* Available customizable item definitions */
  var ITEM_DEFS = {
    home:      { id: "home", url: "index.html", lbl: "Home", ico: ICO.home, cls: "tsb-bar__item--home" },
    audio:     { id: "audio", url: "podcasts.html", lbl: "Audio Room", ico: ICO.audio, cls: "tsb-bar__item--audio" },
    stories:   { id: "stories", url: "stories.html", lbl: "Stories", ico: ICO.stories, cls: "tsb-bar__item--stories" },
    you:       { id: "you", url: "login.html", lbl: "You", ico: ICO.you, cls: "tsb-bar__item--you" },
    messages:  { id: "messages", url: "dm.html", lbl: "Messages", ico: ICO.messages, cls: "tsb-bar__item--messages" },
    ask:       { id: "ask", url: "chat.html", lbl: "Ask Library", ico: ICO.ask, cls: "tsb-bar__item--ask" },
    continue:  { id: "continue", url: "book.html?resume=1", lbl: "Continue", ico: ICO.continue, cls: "tsb-bar__item--continue" },
    library:   { id: "library", url: "index.html#library", lbl: "Library", ico: ICO.library, cls: "tsb-bar__item--library" },
    scan:      { id: "scan", url: "scan.html", lbl: "Scan", ico: ICO.scan, cls: "tsb-bar__item--scan" },
    notes:     { id: "notes", url: "notes.html", lbl: "Notebook", ico: ICO.notes, cls: "tsb-bar__item--notes" },
    graveyard: { id: "graveyard", url: "graveyard.html", lbl: "Graveyard", ico: ICO.graveyard, cls: "tsb-bar__item--graveyard" },
    plus:      { id: "plus", url: "stories.html#write", lbl: "Plus", ico: ICO.plus, cls: "tsb-bar__item--plus", isPlus: true }
  };

  /* ---------- active tab for this page (follows your selection) ---------- */
  function pageName() {
    return (location.pathname.split("/").pop() || "").toLowerCase() || "index.html";
  }
  function currentActive() {
    var p = pageName();
    if (p === "index.html") return "home";
    if (p === "podcasts.html") return "audio";
    if (p === "stories.html" || p === "story.html" || p === "write.html") return "stories";
    if (p === "login.html" || p === "settings.html" || p === "profile.html" || p === "you.html") return "you";
    if (p === "dm.html") return "messages";
    if (p === "chat.html") return "ask";
    if (p === "notes.html") return "notes";
    if (p === "scan.html") return "scan";
    if (p === "graveyard.html") return "graveyard";
    return "";
  }
  var active = currentActive();

  /* Load active custom slots or fallback to clean 4-item bar */
  function getActiveSlots() {
    try {
      var saved = JSON.parse(localStorage.getItem("tsb_custom_bar"));
      if (Array.isArray(saved) && saved.length >= 4) {
        var valid = saved.filter(function (k) { return !!ITEM_DEFS[k]; });
        if (valid.length >= 4) return valid;
      }
    } catch (e) {}
    return ["home", "audio", "stories", "you"];
  }

  var activeSlots = getActiveSlots();

  var bar = document.createElement("nav");
  bar.id = "tsbBar";
  bar.className = "tsb-bar tsb-bar--off ed-mobile-nav"; /* parked below the screen */
  bar.setAttribute("aria-label", "Main");

  /* Tab labels preference: icons-only vs full labels */
  var barLabelsPref = "";
  try { barLabelsPref = localStorage.getItem("tsb_bar_labels") || "labels"; } catch (ePref) {}
  if (barLabelsPref === "icons") {
    bar.classList.add("tsb-bar--icons-only");
    document.documentElement.setAttribute("data-bar-labels", "icons");
  }

  function buildBarHtml(slots) {
    return slots.map(function (key) {
      var def = ITEM_DEFS[key] || ITEM_DEFS.home;
      var isAct = active === def.id;
      if (def.isPlus) {
        return '<a class="tsb-bar__item tsb-bar__item--plus' + (isAct ? " is-active" : "") + '" data-tab="' + def.id + '" href="' + def.url + '" draggable="false" aria-label="' + def.lbl + '">' + def.ico + '</a>';
      }
      return '<a class="tsb-bar__item ' + (def.cls || "") + (isAct ? " is-active" : "") + '" data-tab="' + def.id + '" href="' + def.url + '" draggable="false"' + (isAct ? ' aria-current="page"' : "") + '>' +
        def.ico + '<span class="tsb-bar__lbl">' + def.lbl + '</span></a>';
    }).join("");
  }

  bar.innerHTML = buildBarHtml(activeSlots);

  document.body.appendChild(bar);
  document.documentElement.classList.add("tsb-hasbar");

  /* the highlight follows what you actually selected, live */
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

    /* CONTINUE READING: resume last read book or go to library */
    if (id === "continue") {
      e.preventDefault();
      var last = null;
      try { last = localStorage.getItem("tsb_last_book"); } catch (eL) {}
      if (last) { location.href = "book.html?id=" + encodeURIComponent(last); }
      else { location.href = "index.html#library"; }
      return;
    }

    /* YOU: always allow direct navigation to account / login page */
    if (id === "you") {
      return; /* direct link to login.html */
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

    /* tapping the tab you're already on (Home/Audiobooks/Stories/You):
       1st tap glides to top silently, a quick 2nd tap says "you're here" */
    if (item.classList.contains("is-active")) {
      e.preventDefault();
      sameTabTap(id);
      return;
    }

    /* Optimistic UI: instant tab highlight & gentle tactile haptic */
    setActive(id);
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (err) {}
    /* Native immediate browser navigation proceeds smoothly */
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

  /* clean paper toast, matches the app, never a black box */
  var NAMES = { home: "Home", audio: "Audiobooks", stories: "Stories", you: "You" };
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
     visible there, tucking it would leave a dead empty strip */
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
          /* settled at the page end, tuck again */
          if (!hidden) setBarOff(true);
          return;
        }
        if (dy > 0 && !hidden) setBarOff(true);
        else if (dy < 0 && hidden) setBarOff(false);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  bar.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    return false;
  });

  /* Fast optimistic link prefetch for idle tab switching */
  (function initTabPreload() {
    var cur = pageName();
    var slots = getActiveSlots();
    var TABS_URLS = slots.map(function (k) {
      return (ITEM_DEFS[k] && ITEM_DEFS[k].url) || "index.html";
    });

    try {
      TABS_URLS.forEach(function (u) {
        if (u === cur) return;
        if (!document.querySelector('link[rel="prefetch"][href="' + u + '"]')) {
          var l = document.createElement("link");
          l.rel = "prefetch";
          l.href = u;
          l.as = "document";
          document.head.appendChild(l);
        }
      });
    } catch (e2) {}
  })();
})();
