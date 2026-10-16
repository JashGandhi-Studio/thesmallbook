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
    plus: '<div class="tsb-bar__plus"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>'
  };

  /* Available customizable item definitions */
  var ITEM_DEFS = {
    home:      { id: "home", url: "index.html", lbl: "Home", ico: ICO.home, cls: "tsb-bar__item--home" },
    audio:     { id: "audio", url: "podcasts.html", lbl: "Audio Room", ico: ICO.audio, cls: "tsb-bar__item--audio" },
    stories:   { id: "stories", url: "stories.html", lbl: "Stories", ico: ICO.stories, cls: "tsb-bar__item--stories" },
    you:       { id: "you", url: "login.html", lbl: "You", ico: ICO.you, cls: "tsb-bar__item--you" },
    messages:  { id: "messages", url: "dm.html", lbl: "Messages", ico: ICO.messages, cls: "tsb-bar__item--messages" },
    ask:       { id: "ask", url: "chat.html", lbl: "Ask Library", ico: ICO.messages, cls: "tsb-bar__item--ask" },
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
        return '<a class="tsb-bar__item tsb-bar__item--plus' + (isAct ? " is-active" : "") + '" data-tab="' + def.id + '" href="' + def.url + '" aria-label="' + def.lbl + '">' + def.ico + '</a>';
      }
      return '<a class="tsb-bar__item ' + (def.cls || "") + (isAct ? " is-active" : "") + '" data-tab="' + def.id + '" href="' + def.url + '"' + (isAct ? ' aria-current="page"' : "") + '>' +
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

  /* Suppress tab jump right after drag-and-drop reorder */
  var suppressClickUntil = 0;

  /* ---------- taps ---------- */
  bar.addEventListener("click", function (e) {
    if (suppressClickUntil && Date.now() < suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

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

    /* instant view transition navigation if supported */
    var href = item.getAttribute("href");
    if (href && href !== location.pathname && href !== pageName()) {
      if (document.startViewTransition) {
        e.preventDefault();
        try { if (navigator.vibrate) navigator.vibrate(8); } catch (err) {}
        setActive(id);
        document.startViewTransition(function () {
          location.href = href;
        });
        return;
      }
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

  /* ---------- Instagram-style interactive touch swipe navigation between tabs ---------- */
  (function handleIncomingSwipe() {
    try {
      var dir = sessionStorage.getItem("tsb_swipe_dir");
      if (dir) {
        sessionStorage.removeItem("tsb_swipe_dir");
        var startX = dir === "next" ? "45px" : "-45px";
        document.body.style.transform = "translate3d(" + startX + ", 0, 0)";
        document.body.style.opacity = "0.82";
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            document.body.style.transition = "transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.22s ease";
            document.body.style.transform = "translate3d(0, 0, 0)";
            document.body.style.opacity = "1";
            setTimeout(function () {
              document.body.style.transition = "";
              document.body.style.transform = "";
              document.body.style.opacity = "";
            }, 240);
          });
        });
      }
    } catch (e) {}
  })();

  /* ============================================================
     ACUTE PHYSICS DRAG-AND-DROP ACTION BAR REORDERING
     Long-press detection (380ms) with acute haptics, lift/float physics,
     live slot swapping during drag, release snap drop, and persistent
     localStorage sync.
     ============================================================ */
  var updateSwipeNavTabs = null;

  (function initBarDragReorder() {
    var pressTimer = null;
    var draggedEl = null;
    var draggedIdx = -1;
    var startX = 0;
    var startY = 0;
    var isReordering = false;
    var itemRects = [];
    var barItems = [];

    function updateItemRects() {
      barItems = Array.prototype.slice.call(bar.querySelectorAll(".tsb-bar__item"));
      itemRects = barItems.map(function (el) {
        var r = el.getBoundingClientRect();
        return { el: el, left: r.left, width: r.width, cx: r.left + r.width / 2 };
      });
    }

    function cancelLongPress() {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }

    function startReorder(el, clientX, clientY) {
      isReordering = true;
      draggedEl = el;
      draggedIdx = barItems.indexOf(el);
      if (draggedIdx === -1) return;

      try { if (navigator.vibrate) navigator.vibrate(25); } catch (eV) {}

      bar.classList.add("tsb-bar--reordering");
      draggedEl.classList.add("tsb-bar__item--floating");

      updateItemRects();
    }

    function handlePointerDown(e) {
      if (isReordering) return;
      var item = e.target.closest ? e.target.closest(".tsb-bar__item") : null;
      if (!item || !bar.contains(item)) return;

      var pt = e.touches ? e.touches[0] : e;
      startX = pt.clientX;
      startY = pt.clientY;

      updateItemRects();

      cancelLongPress();
      pressTimer = setTimeout(function () {
        pressTimer = null;
        startReorder(item, startX, startY);
      }, 380);
    }

    function handlePointerMove(e) {
      var pt = e.touches ? e.touches[0] : e;
      var cx = pt.clientX;
      var cy = pt.clientY;

      if (pressTimer) {
        if (Math.abs(cx - startX) > 8 || Math.abs(cy - startY) > 8) {
          cancelLongPress();
        }
      }

      if (!isReordering || !draggedEl) return;

      if (e.cancelable) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();

      var dx = cx - startX;
      var rot = Math.max(-5, Math.min(5, dx * 0.08));
      draggedEl.style.transform = "translate3d(" + dx + "px, -16px, 0) scale(1.16) rotate(" + rot + "deg)";

      var currentCenterX = itemRects[draggedIdx].cx + dx;
      for (var i = 0; i < itemRects.length; i++) {
        if (i === draggedIdx) continue;
        var sibling = itemRects[i];
        var dist = currentCenterX - sibling.cx;
        var shouldSwap = false;
        if (i > draggedIdx && dist > -sibling.width * 0.1) {
          shouldSwap = true;
        } else if (i < draggedIdx && dist < sibling.width * 0.1) {
          shouldSwap = true;
        }

        if (shouldSwap) {
          try { if (navigator.vibrate) navigator.vibrate(10); } catch (eV) {}

          var tempSlot = activeSlots[draggedIdx];
          activeSlots[draggedIdx] = activeSlots[i];
          activeSlots[i] = tempSlot;

          var offset = (draggedIdx - i) * sibling.width;
          sibling.el.style.transform = "translate3d(" + offset + "px, 0, 0)";
          sibling.el.style.transition = "transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)";

          draggedIdx = i;
          startX = cx;
          updateItemRects();
          break;
        }
      }
    }

    function handlePointerUp(e) {
      cancelLongPress();
      if (!isReordering || !draggedEl) {
        return;
      }

      suppressClickUntil = Date.now() + 420;
      isReordering = false;

      var el = draggedEl;
      draggedEl = null;

      try { if (navigator.vibrate) navigator.vibrate(15); } catch (eV) {}

      el.classList.add("tsb-bar__item--dropping");
      el.style.transform = "translate3d(0, 0, 0) scale(1) rotate(0)";
      el.style.boxShadow = "none";

      setTimeout(function () {
        bar.classList.remove("tsb-bar--reordering");
        barItems.forEach(function (it) {
          it.classList.remove("tsb-bar__item--floating", "tsb-bar__item--dropping");
          it.style.transform = "";
          it.style.transition = "";
          it.style.boxShadow = "";
        });

        try {
          localStorage.setItem("tsb_custom_bar", JSON.stringify(activeSlots));
        } catch (eS) {}

        bar.innerHTML = buildBarHtml(activeSlots);
        cleanToast("Action bar order saved ✨");

        if (typeof updateSwipeNavTabs === "function") {
          updateSwipeNavTabs();
        }
      }, 250);
    }

    bar.addEventListener("touchstart", handlePointerDown, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp, { passive: true });
    window.addEventListener("touchcancel", handlePointerUp, { passive: true });

    bar.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  })();

  /* ============================================================
     DYNAMIC SWIPING SYNCED WITH CUSTOM BAR & PRELOADING
     ============================================================ */
  (function initSwipeNav() {
    var TABS = [];
    function refreshTabs() {
      var slots = getActiveSlots();
      TABS = slots.map(function (k) { return ITEM_DEFS[k] || ITEM_DEFS.home; });
    }
    refreshTabs();
    updateSwipeNavTabs = refreshTabs;

    var startX = 0, startY = 0, startTime = 0;
    var tracking = false;
    var isHorizontal = false;
    var currentDx = 0;

    function isScrollableX(el) {
      var cur = el;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        if (cur.scrollWidth > cur.clientWidth + 12) {
          try {
            var ov = window.getComputedStyle(cur).overflowX;
            if (ov === "auto" || ov === "scroll") return true;
          } catch (e) {}
        }
        if (cur.classList && (
          cur.classList.contains("cm-rail") ||
          cur.classList.contains("filters") ||
          cur.classList.contains("dailytrio-shelf__scroll") ||
          cur.classList.contains("goldgrid") ||
          cur.classList.contains("goldgrid--collapsed") ||
          cur.classList.contains("tsb-sheet") ||
          cur.classList.contains("pc-rail") ||
          cur.classList.contains("pc-search__chips") ||
          cur.classList.contains("nt-bar")
        )) return true;
        cur = cur.parentElement;
      }
      return false;
    }

    function isInputOrModal(el) {
      if (!el) return false;
      var tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable) return true;
      if (el.closest("dialog[open], .personal-dialog, .tsb-sheetwrap--on, .gold-celebrate, .audio-modal, .aq-panel--open, #tsbCheat, #tsbTourCard")) return true;
      return false;
    }

    window.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { tracking = false; return; }
      var t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      currentDx = 0;
      isHorizontal = false;

      var w = window.innerWidth || document.documentElement.clientWidth;
      if (startX < 16 || startX > w - 16) { tracking = false; return; }
      if (isInputOrModal(e.target) || isScrollableX(e.target)) { tracking = false; return; }

      tracking = true;
    }, { passive: true });

    window.addEventListener("touchmove", function (e) {
      if (!tracking || e.touches.length !== 1) return;
      var t = e.touches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;

      if (!isHorizontal) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
          tracking = false;
          return;
        }
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          isHorizontal = true;
        }
      }

      if (isHorizontal) {
        currentDx = dx;
        var curTab = currentActive();
        var idx = -1;
        for (var i = 0; i < TABS.length; i++) {
          if (TABS[i].id === curTab) { idx = i; break; }
        }

        var dragX = dx;
        if ((idx === 0 && dx > 0) || (idx === TABS.length - 1 && dx < 0)) {
          dragX = dx * 0.25;
        }

        document.body.style.transform = "translate3d(" + dragX + "px, 0, 0)";
        document.body.style.transition = "none";
        document.body.style.willChange = "transform";
        document.documentElement.style.overflowX = "hidden";
      }
    }, { passive: true });

    window.addEventListener("touchend", function (e) {
      if (!tracking || !isHorizontal) {
        if (isHorizontal) {
          document.body.style.transform = "";
          document.body.style.transition = "";
        }
        tracking = false;
        isHorizontal = false;
        return;
      }
      tracking = false;
      isHorizontal = false;

      var dx = currentDx;
      var dt = Date.now() - startTime;
      var w = window.innerWidth || document.documentElement.clientWidth;
      var velocity = Math.abs(dx) / (dt || 1);

      var curTab = currentActive();
      var idx = -1;
      for (var i = 0; i < TABS.length; i++) {
        if (TABS[i].id === curTab) { idx = i; break; }
      }

      var nextIdx = -1;
      var shouldSwitch = (Math.abs(dx) > w * 0.22) || (velocity > 0.42 && Math.abs(dx) > 36);

      if (shouldSwitch) {
        if (dx < 0 && idx < TABS.length - 1) {
          nextIdx = idx + 1;
        } else if (dx > 0 && idx > 0) {
          nextIdx = idx - 1;
        }
      }

      if (nextIdx !== -1 && nextIdx !== idx) {
        var targetTab = TABS[nextIdx];
        if (targetTab.id === "you") {
          var u = null;
          try { u = window.TSB_AUTH && TSB_AUTH.user ? TSB_AUTH.user() : null; } catch (err) {}
          if (!u && window.TSB_AUTH && TSB_AUTH.openSheet) {
            document.body.style.transition = "transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1)";
            document.body.style.transform = "translate3d(0, 0, 0)";
            setTimeout(function () {
              document.body.style.transform = "";
              document.body.style.transition = "";
              document.body.style.willChange = "";
            }, 250);
            try { if (navigator.vibrate) navigator.vibrate(10); } catch (eU) {}
            TSB_AUTH.openSheet();
            return;
          }
        }

        try { if (navigator.vibrate) navigator.vibrate(12); } catch (eV) {}
        setActive(targetTab.id);

        document.body.style.transition = "transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease";
        document.body.style.transform = "translate3d(" + (dx < 0 ? -w : w) + "px, 0, 0)";
        document.body.style.opacity = "0.75";

        try { sessionStorage.setItem("tsb_swipe_dir", dx < 0 ? "next" : "prev"); } catch (eS) {}

        setTimeout(function () {
          location.href = targetTab.url;
        }, 180);
      } else {
        document.body.style.transition = "transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1)";
        document.body.style.transform = "translate3d(0, 0, 0)";
        setTimeout(function () {
          document.body.style.transform = "";
          document.body.style.transition = "";
          document.body.style.willChange = "";
        }, 260);
      }
    }, { passive: true });
  })();

  /* ============================================================
     BACKGROUND TAB PRELOADING & SPECULATION ENGINE
     Every custom tab in the user's bar pre-renders in the background
     so tab navigation is 0-latency and feels native.
     ============================================================ */
  (function initTabPreload() {
    var cur = pageName();
    var slots = getActiveSlots();
    var TABS_URLS = slots.map(function (k) {
      return (ITEM_DEFS[k] && ITEM_DEFS[k].url) || "index.html";
    });

    try {
      if (!document.getElementById("tsb-speculation-rules")) {
        var spec = document.createElement("script");
        spec.id = "tsb-speculation-rules";
        spec.type = "speculationrules";
        spec.textContent = JSON.stringify({
          prerender: [
            { source: "list", urls: TABS_URLS, eagerness: "immediate" }
          ]
        });
        document.head.appendChild(spec);
      }
    } catch (e1) {}

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

    var warmFetch = function () {
      TABS_URLS.forEach(function (u) {
        if (u === cur) return;
        try {
          fetch(u, { priority: "low", cache: "force-cache" }).catch(function () {});
        } catch (e3) {}
      });
    };
    if (window.requestIdleCallback) {
      window.requestIdleCallback(warmFetch, { timeout: 1500 });
    } else {
      setTimeout(warmFetch, 800);
    }
  })();
})();
