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
    random: SVG_OPEN + '<rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8" cy="8" r="1.5" fill="currentColor"></circle><circle cx="16" cy="8" r="1.5" fill="currentColor"></circle><circle cx="12" cy="12" r="1.5" fill="currentColor"></circle><circle cx="8" cy="16" r="1.5" fill="currentColor"></circle><circle cx="16" cy="16" r="1.5" fill="currentColor"></circle></svg>',
    graveyard: SVG_OPEN + '<path d="M18 2H6a2 2 0 0 0-2 2v18h16V4a2 2 0 0 0-2-2z"></path><line x1="12" y1="7" x2="12" y2="13"></line><line x1="9" y1="10" x2="15" y2="10"></line></svg>',
    ask: SVG_OPEN + '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="13" y2="13"></line></svg>',
    plus: '<div class="tsb-bar__plus"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>'
  };

  /* Available customizable item definitions */
  var ITEM_DEFS = {
    home:      { id: "home", url: "index.html", lbl: "Today", ico: ICO.home, cls: "tsb-bar__item--home" },
    audio:     { id: "audio", url: "podcasts.html", lbl: "Listen", ico: ICO.audio, cls: "tsb-bar__item--audio" },
    stories:   { id: "stories", url: "stories.html", lbl: "Stories", ico: ICO.stories, cls: "tsb-bar__item--stories" },
    you:       { id: "you", url: "you.html", lbl: "You", ico: ICO.you, cls: "tsb-bar__item--you" },
    messages:  { id: "messages", url: "dm.html", lbl: "Messages", ico: ICO.messages, cls: "tsb-bar__item--messages" },
    ask:       { id: "ask", url: "chat.html", lbl: "Ask Library", ico: ICO.ask, cls: "tsb-bar__item--ask" },
    continue:  { id: "continue", url: "book.html?resume=1", lbl: "Continue", ico: ICO.continue, cls: "tsb-bar__item--continue" },
    library:   { id: "library", url: "index.html#library", lbl: "Library", ico: ICO.library, cls: "tsb-bar__item--library" },
    scan:      { id: "scan", url: "scan.html", lbl: "Scan", ico: ICO.scan, cls: "tsb-bar__item--scan" },
    notes:     { id: "notes", url: "notes.html", lbl: "Notebook", ico: ICO.notes, cls: "tsb-bar__item--notes" },
    random:    { id: "random", url: "random.html", lbl: "3D Discovery", ico: ICO.random, cls: "tsb-bar__item--random" },
    graveyard: { id: "graveyard", url: "graveyard.html", lbl: "Graveyard", ico: ICO.graveyard, cls: "tsb-bar__item--graveyard" },
    plus:      { id: "plus", url: "stories.html#write", lbl: "Plus", ico: ICO.plus, cls: "tsb-bar__item--plus", isPlus: true }
  };

  /* ---------- active tab for this page (follows your selection) ---------- */
  function pageName() {
    return (location.pathname.split("/").pop() || "").toLowerCase() || "index.html";
  }
  function currentActive() {
    var p = pageName();
    if (p === "index.html") return /^#(library|grid|filters|searchWrap|shelf)/.test(location.hash) ? "library" : "home";
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

  function checkIsGold() {
    /* v331: only the server answer counts (js/gold.js). Storage flags grant nothing. */
    try { return !!(window.TSB_GOLD && typeof window.TSB_GOLD.isGold === "function" && window.TSB_GOLD.isGold()); } catch (e) { return false; }
  }

  /* Load active custom slots or fallback to clean 4-item bar */
  function getActiveSlots() {
    var gold = checkIsGold();
    try {
      var saved = JSON.parse(localStorage.getItem("tsb_custom_bar"));
      if (Array.isArray(saved) && saved.length >= 4) {
        var valid = saved.filter(function (k) { return !!ITEM_DEFS[k]; });
        if (valid.length >= 4) {
          /* v331: the fifth button is Gold, decided by the server */
          return valid.slice(0, gold ? 5 : 4);
        }
      }
    } catch (e) {}
    /* v326: the film's four tabs: Today, Library, Listen, You */
    return ["home", "library", "audio", "you"];
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
  /* v331 · the bar studio: look (glass, solid, ink, floating), labels
     (titles, icons, active only) and behaviour (hide on scroll, always on).
     Read once here and again whenever Settings calls TSB_BARCTL.apply(). */
  var barBehave = "auto";
  function readLook() {
    var R = document.documentElement, look = "float", lbl = "labels";
    try { look = localStorage.getItem("tsb_bar_look") || "float"; } catch (e) {}
    try { lbl = localStorage.getItem("tsb_bar_labels") || "labels"; } catch (e) {}
    try { barBehave = localStorage.getItem("tsb_bar_behave") || "auto"; } catch (e) {}
    if (["glass", "solid", "ink", "float"].indexOf(look) < 0) look = "float";
    R.setAttribute("data-bar-look", look);
    R.setAttribute("data-bar-behave", barBehave);
    barLabelsPref = lbl;
    bar.classList.toggle("tsb-bar--icons-only", lbl === "icons");
    bar.classList.toggle("tsb-bar--active-only", lbl === "active");
    if (lbl === "icons") R.setAttribute("data-bar-labels", "icons"); else if (lbl === "active") R.setAttribute("data-bar-labels", "active"); else R.removeAttribute("data-bar-labels");
  }
  readLook();

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

  /* v324 · the pill SLIDES: the active ::before starts where the old one
     stood (same page or the page you just left) and springs into place.
     Still painted only by ::before, per the bar rules above. */
  function slidePill(fromLeft) {
    var act = bar.querySelector(".tsb-bar__item.is-active");
    if (!act || typeof fromLeft !== "number" || isNaN(fromLeft)) return;
    var dx = Math.round(fromLeft - act.getBoundingClientRect().left);
    if (!dx || Math.abs(dx) > 600) return;
    act.style.setProperty("--pill-from", dx + "px");
    act.classList.remove("pill-slide"); void act.offsetWidth; act.classList.add("pill-slide");
  }
  try {
    var pillFrom = parseFloat(sessionStorage.getItem("tsb_pill_from"));
    sessionStorage.removeItem("tsb_pill_from");
    if (!isNaN(pillFrom)) requestAnimationFrame(function () { slidePill(pillFrom); });
  } catch (ePill) {}
  window.addEventListener("pagehide", function () {
    try { var a = bar.querySelector(".tsb-bar__item.is-active"); if (a) sessionStorage.setItem("tsb_pill_from", String(a.getBoundingClientRect().left)); } catch (eP) {}
  });

  /* the highlight follows what you actually selected, live */
  function setActive(id) {
    var was = bar.querySelector(".tsb-bar__item.is-active");
    var wasLeft = was ? was.getBoundingClientRect().left : NaN;
    if (was && was.getAttribute("data-tab") !== id) { try { sessionStorage.setItem("tsb_pill_from", String(wasLeft)); } catch (eS) {} }
    bar.querySelectorAll(".tsb-bar__item").forEach(function (it) {
      var on = it.getAttribute("data-tab") === id;
      it.classList.toggle("is-active", on);
      if (on) it.setAttribute("aria-current", "page");
      else it.removeAttribute("aria-current");
    });
    slidePill(wasLeft);
  }
  window.addEventListener("hashchange", function () {
    if (pageName() === "index.html") setActive(currentActive());
  });
  function rebuild() {
    activeSlots = getActiveSlots();
    bar.innerHTML = buildBarHtml(activeSlots);
    readLook();
    if (barBehave === "fixed") setBarOff(false);
  }
  /* Gold arrives after the first paint: a saved fifth button appears then */
  window.addEventListener("tsbgold", rebuild);
  window.TSB_BARCTL = { apply: rebuild, slots: function () { return activeSlots.slice(); }, defs: function () { return ITEM_DEFS; }, isGold: checkIsGold };

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
        if (barBehave === "fixed" || !pageScrolls() || !atPageBottom()) setBarOff(false);
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
        if (!pageScrolls() || barBehave === "fixed") { if (hidden) setBarOff(false); return; }
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



  /* ---------- Apple-Grade Live Drag-and-Drop & Customization Engine ---------- */
  var isEditMode = false;
  var selectedSlotIdx = 0;
  var liveDock = null;

  function injectLiveDockStyles() {
    if (document.getElementById("tsb-livedock-styles")) return;
    var st = document.createElement("style");
    st.id = "tsb-livedock-styles";
    st.textContent = `
      @keyframes tsbJiggle {
        0% { transform: rotate(-1.5deg) scale(0.98); }
        100% { transform: rotate(1.5deg) scale(1.02); }
      }
      .tsb-bar.tsb-bar--reordering .tsb-bar__item:not(.tsb-bar__item--floating) {
        animation: tsbJiggle 0.28s ease-in-out infinite alternate;
        cursor: grab;
      }
      .tsb-bar__item.tsb-bar__item--selected {
        outline: 3px solid var(--yellow, #ffc800) !important;
        outline-offset: -3px;
        background: rgba(255, 200, 0, 0.15) !important;
      }
      .tsb-livedock {
        position: fixed; left: 50%; transform: translateX(-50%);
        bottom: calc(var(--tsb-bar-h, 58px) + var(--tsb-bar-gap, 10px) + env(safe-area-inset-bottom, 0px) + 14px);
        width: min(520px, calc(100vw - 24px));
        background: var(--paper, #fffdf5); color: var(--ink, #111);
        border: var(--bw) solid var(--edge); border-radius: 18px;
        box-shadow: 0 16px 36px rgba(0,0,0,0.32), var(--sh-3);
        padding: 12px 14px 14px; box-sizing: border-box; z-index: 99998;
        font-family: -apple-system, BlinkMacSystemFont, "Space Grotesk", "Segoe UI", sans-serif;
        animation: tsbDockPop .25s cubic-bezier(.16,1,.3,1);
      }
      @keyframes tsbDockPop {
        from { opacity: 0; transform: translateX(-50%) translateY(16px) scale(.95); }
        to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
      }
      .tsb-livedock__top {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 10px; gap: 8px;
      }
      .tsb-livedock__title {
        font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 13px; letter-spacing: .4px; color: var(--ink, #111);
      }
      .tsb-livedock__seg {
        display: inline-flex; gap: 3px; background: #e5e0d3; padding: 3px;
        border-radius: 13px; border: 1px solid var(--edge);
      }
      .tsb-livedock__segbtn {
        border: none; background: transparent; padding: 4px 8px;
        border-radius: 9px; font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 10.5px; color: #555; cursor: pointer;
      }
      .tsb-livedock__segbtn.active {
        background: #fff; color: #111; box-shadow: var(--sh-1);
        border: 1px solid var(--edge);
      }
      .tsb-livedock__done {
        background: var(--yellow, #ffc800); border: var(--bw) solid var(--edge);
        border-radius: 12px; font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 11.5px; padding: 5px 12px; cursor: pointer; box-shadow: var(--sh-1);
        transition: transform .1s;
      }
      .tsb-livedock__done:hover { transform: translate(-1px, -1px); }
      .tsb-livedock__hint {
        font-size: 11.5px; color: #666; font-weight: 600; margin-bottom: 8px;
      }
      .tsb-livedock__shelf {
        display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;
        -webkit-overflow-scrolling: touch; scrollbar-width: none;
      }
      .tsb-livedock__shelf::-webkit-scrollbar { display: none; }
      .tsb-shelf-item {
        flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px;
        background: #fff; border: var(--bw) solid var(--edge); border-radius: 14px;
        padding: 6px 10px; font-size: 12px; font-weight: 700; cursor: pointer;
        box-shadow: var(--sh-1); transition: transform .1s;
      }
      .tsb-shelf-item:hover { background: var(--yellow, #ffc800); transform: translate(-1px,-1px); }
      .tsb-shelf-item.is-inbar { opacity: 0.55; }
      .tsb-livedock__slotbar {
        display: flex; align-items: center; justify-content: space-between;
        background: #f0ebe1; border: 1px solid var(--edge); border-radius: 14px;
        padding: 6px 10px; margin-bottom: 8px; font-size: 11px; font-weight: 700;
      }
      .tsb-livedock__slotstatus {
        display: flex; align-items: center; gap: 5px; color: var(--ink, #111);
      }
      .tsb-livedock__slotbtn {
        background: #fff; border: 1px solid var(--edge); border-radius: 9px;
        padding: 4px 8px; font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 10.5px; cursor: pointer; box-shadow: var(--sh-1);
        transition: transform .1s;
      }
      .tsb-livedock__slotbtn:hover { transform: translate(-1px, -1px); }
      .tsb-livedock__slotbtn--gold {
        background: var(--yellow, #ffc800); color: #111;
      }
      .tsb-gold-bar-modal {
        position: fixed; inset: 0; z-index: 999999;
        display: flex; align-items: center; justify-content: center;
        padding: 20px; box-sizing: border-box;
      }
      .tsb-gold-bar-backdrop {
        position: absolute; inset: 0; background: rgba(0,0,0,0.68);
        backdrop-filter: blur(4px);
      }
      .tsb-gold-bar-card {
        position: relative; width: min(420px, 100%);
        background: var(--paper, #fffdf5); border: var(--bw) solid var(--edge);
        border-radius: 18px; padding: 22px 20px; box-sizing: border-box;
        box-shadow: 0 20px 48px rgba(0,0,0,0.4), var(--sh-3);
        text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Space Grotesk", sans-serif;
      }
      .tsb-gold-bar-crown { font-size: 32px; margin-bottom: 6px; }
      .tsb-gold-bar-tag {
        font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 10px; letter-spacing: 1px; color: #b45309; margin-bottom: 4px;
      }
      .tsb-gold-bar-h3 {
        font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 18px; color: var(--ink, #111); margin: 0 0 8px;
      }
      .tsb-gold-bar-p {
        font-size: 12.5px; line-height: 1.5; color: #444; margin: 0 0 14px;
      }
      .tsb-gold-bar-perks {
        background: #f7f3e8; border: 2px dashed var(--ink, #111); border-radius: 17px;
        padding: 10px 14px; margin-bottom: 16px; text-align: left;
      }
      .tsb-gold-bar-perk {
        font-size: 12px; font-weight: 700; color: #111; margin: 4px 0;
      }
      .tsb-gold-bar-btns {
        display: flex; flex-direction: column; gap: 8px;
      }
      .tsb-gold-bar-cta {
        display: block; background: var(--yellow, #ffc800); color: #111;
        border: var(--bw) solid var(--edge); border-radius: 14px;
        padding: 10px 14px; font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 12.5px; text-decoration: none; box-shadow: var(--sh-2);
        font-weight: 900;
      }
      .tsb-gold-bar-dismiss {
        background: transparent; border: none; font-size: 12px; color: #666;
        cursor: pointer; text-decoration: underline; padding: 4px;
      }
    `;
    document.head.appendChild(st);
  }

  function enterEditMode() {
    if (isEditMode) return;
    isEditMode = true;
    injectLiveDockStyles();
    bar.classList.add("tsb-bar--reordering");
    try { if (navigator.vibrate) navigator.vibrate([35, 50]); } catch (e) {}

    renderLiveDock();
    updateSlotHighlight();
  }

  function exitEditMode() {
    if (!isEditMode) return;
    isEditMode = false;
    bar.classList.remove("tsb-bar--reordering");
    bar.querySelectorAll(".tsb-bar__item").forEach(function (it) {
      it.classList.remove("tsb-bar__item--selected", "tsb-bar__item--floating");
      it.style.transform = "";
    });
    if (liveDock) {
      try { liveDock.remove(); } catch (e) {}
      liveDock = null;
    }
    setActive(currentActive());
  }

  function updateSlotHighlight() {
    var items = bar.querySelectorAll(".tsb-bar__item");
    items.forEach(function (it, idx) {
      it.classList.toggle("tsb-bar__item--selected", idx === selectedSlotIdx);
    });
  }


  function showGoldModal() {
    var old = document.getElementById("tsbGoldBarModal");
    if (old) old.remove();

    var modal = document.createElement("div");
    modal.id = "tsbGoldBarModal";
    modal.className = "tsb-gold-bar-modal";
    modal.innerHTML = `
      <div class="tsb-gold-bar-backdrop"></div>
      <div class="tsb-gold-bar-card">
        <div class="tsb-gold-bar-crown">👑</div>
        <div class="tsb-gold-bar-tag">THESMALLBOOK GOLD</div>
        <h3 class="tsb-gold-bar-h3">Unlock 5 Action Buttons</h3>
        <p class="tsb-gold-bar-p">
          Everyone picks and orders 4 buttons. A fifth button comes with Gold (&#8377;99 a month or &#8377;999 a year).
        </p>
        <div class="tsb-gold-bar-perks">
          <div class="tsb-gold-bar-perk">✓ A fifth button in your bar</div>
          <div class="tsb-gold-bar-perk">✓ Natural voices for every book</div>
          <div class="tsb-gold-bar-perk">✓ Unlimited PDF cheat-sheets</div>
          <div class="tsb-gold-bar-perk">✓ Every deep dive</div>
        </div>
        <div class="tsb-gold-bar-btns">
          <a href="gold.html#goldPricing" class="tsb-gold-bar-cta">UNLOCK WITH GOLD · ₹99 →</a>
          <button type="button" class="tsb-gold-bar-dismiss" id="tsbGoldModalDismiss">Keep 4 Buttons</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".tsb-gold-bar-backdrop").onclick = function () { modal.remove(); };
    modal.querySelector("#tsbGoldModalDismiss").onclick = function () { modal.remove(); };
  }

  function renderLiveDock() {
    if (liveDock) {
      try { liveDock.remove(); } catch (e) {}
      liveDock = null;
    }

    var dock = document.createElement("div");
    dock.className = "tsb-livedock";
    dock.id = "tsbLiveDock";

    var isIcons = bar.classList.contains("tsb-bar--icons-only") || barLabelsPref === "icons";
    var activeSlotName = (ITEM_DEFS[activeSlots[selectedSlotIdx]] && ITEM_DEFS[activeSlots[selectedSlotIdx]].lbl) || "Slot";
    var isGold = checkIsGold();
    var hasFive = activeSlots.length >= 5;

    var slotBarHtml = hasFive
      ? `<div class="tsb-livedock__slotbar">
          <div class="tsb-livedock__slotstatus"><b>5 buttons</b> · Gold</div>
          <button type="button" class="tsb-livedock__slotbtn" id="tsbDockSlotToggle">Switch to 4</button>
        </div>`
      : `<div class="tsb-livedock__slotbar">
          <div class="tsb-livedock__slotstatus"><b>4 buttons</b> · Gold adds a fifth</div>
          <button type="button" class="tsb-livedock__slotbtn tsb-livedock__slotbtn--gold" id="tsbDockSlotToggle">+ Add 5th Button · Gold ₹99</button>
        </div>`;

    dock.innerHTML = `
      <div class="tsb-livedock__top">
        <span class="tsb-livedock__title">CUSTOMIZE ACTION BAR</span>
        <div class="tsb-livedock__seg">
          <button type="button" class="tsb-livedock__segbtn ${!isIcons ? 'active' : ''}" id="tsbDockSegLabels">Titles</button>
          <button type="button" class="tsb-livedock__segbtn ${isIcons ? 'active' : ''}" id="tsbDockSegIcons">Icons</button>
        </div>
        <button type="button" class="tsb-livedock__done" id="tsbDockDone">✓ Done</button>
      </div>
      ${slotBarHtml}
      <div class="tsb-livedock__hint">
        Drag tabs below to reorder · Or tap a tool to replace <b>${activeSlotName}</b>:
      </div>
      <div class="tsb-livedock__shelf" id="tsbDockShelf">
        ${Object.keys(ITEM_DEFS).map(function (k) {
          var def = ITEM_DEFS[k];
          var inBar = activeSlots.indexOf(k) >= 0;
          return `
            <button type="button" class="tsb-shelf-item ${inBar ? 'is-inbar' : ''}" data-tool="${k}">
              <span>${def.lbl}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;

    document.body.appendChild(dock);
    liveDock = dock;

    var segLabels = dock.querySelector("#tsbDockSegLabels");
    var segIcons = dock.querySelector("#tsbDockSegIcons");
    if (segLabels && segIcons) {
      segLabels.addEventListener("click", function () {
        bar.classList.remove("tsb-bar--icons-only");
        document.documentElement.removeAttribute("data-bar-labels");
        barLabelsPref = "labels";
        try { localStorage.setItem("tsb_bar_labels", "labels"); } catch (e) {}
        try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
        renderLiveDock();
      });
      segIcons.addEventListener("click", function () {
        bar.classList.add("tsb-bar--icons-only");
        document.documentElement.setAttribute("data-bar-labels", "icons");
        barLabelsPref = "icons";
        try { localStorage.setItem("tsb_bar_labels", "icons"); } catch (e) {}
        try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
        renderLiveDock();
      });
    }

    var doneBtn = dock.querySelector("#tsbDockDone");
    if (doneBtn) doneBtn.addEventListener("click", exitEditMode);

    var slotToggleBtn = dock.querySelector("#tsbDockSlotToggle");
    if (slotToggleBtn) {
      slotToggleBtn.addEventListener("click", function () {
        if (activeSlots.length >= 5) {
          activeSlots = activeSlots.slice(0, 4);
          try { localStorage.setItem("tsb_custom_bar", JSON.stringify(activeSlots)); } catch (e) {}
          bar.innerHTML = buildBarHtml(activeSlots);
          if (selectedSlotIdx >= 4) selectedSlotIdx = 3;
          try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
          updateSlotHighlight();
          renderLiveDock();
          cleanToast("Action bar switched to 4 buttons.");
        } else {
          if (!checkIsGold()) {
            showGoldModal();
            return;
          }
          var candidates = ["ask", "plus", "messages", "library", "notes", "random", "graveyard", "scan", "continue"];
          var nextTool = "ask";
          for (var c = 0; c < candidates.length; c++) {
            if (activeSlots.indexOf(candidates[c]) === -1) {
              nextTool = candidates[c];
              break;
            }
          }
          activeSlots.push(nextTool);
          try { localStorage.setItem("tsb_custom_bar", JSON.stringify(activeSlots)); } catch (e) {}
          bar.innerHTML = buildBarHtml(activeSlots);
          selectedSlotIdx = activeSlots.length - 1;
          try { if (navigator.vibrate) navigator.vibrate([25, 30]); } catch (e) {}
          updateSlotHighlight();
          renderLiveDock();
          cleanToast("5th button added to your action bar! ✨");
        }
      });
    }

    dock.querySelectorAll("[data-tool]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var toolKey = btn.getAttribute("data-tool");
        if (toolKey && ITEM_DEFS[toolKey]) {
          /* Never duplicate a destination. If Stories already has a place and
             a reader chooses it for You's spot, Stories moves to You's old
             spot. This keeps the bar a true set of shortcuts. */
          var existing = activeSlots.indexOf(toolKey);
          if (existing >= 0 && existing !== selectedSlotIdx) {
            var displaced = activeSlots[selectedSlotIdx];
            activeSlots[selectedSlotIdx] = toolKey;
            activeSlots[existing] = displaced;
            cleanToast((ITEM_DEFS[toolKey].lbl || toolKey) + " and " + (ITEM_DEFS[displaced].lbl || displaced) + " swapped places.");
          } else if (existing < 0) {
            activeSlots[selectedSlotIdx] = toolKey;
            cleanToast((ITEM_DEFS[toolKey].lbl || toolKey) + " replaced this spot.");
          }
          try { localStorage.setItem("tsb_custom_bar", JSON.stringify(activeSlots)); } catch (e) {}
          bar.innerHTML = buildBarHtml(activeSlots);
          try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
          updateSlotHighlight();
          renderLiveDock();
        }
      });
    });
  }

  /* ---------- Smooth Live Drag & Drop Interaction ---------- */
  var dragItem = null;
  var dragIdx = -1;
  var startX = 0;
  var initialLeft = 0;
  var longTimer = null;
  var suppressClick = false;

  function onTouchStart(e) {
    var item = e.target && e.target.closest ? e.target.closest(".tsb-bar__item") : null;
    if (!item) return;

    var touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX;

    if (!isEditMode) {
      longTimer = setTimeout(function () {
        longTimer = null;
        suppressClick = true;
        var items = Array.from(bar.querySelectorAll(".tsb-bar__item"));
        selectedSlotIdx = items.indexOf(item);
        enterEditMode();
      }, 400);
      return;
    }

    /* Already in edit mode: start dragging immediately */
    var items = Array.from(bar.querySelectorAll(".tsb-bar__item"));
    dragIdx = items.indexOf(item);
    selectedSlotIdx = dragIdx;
    updateSlotHighlight();
    renderLiveDock();

    dragItem = item;
    dragItem.classList.add("tsb-bar__item--floating");
    initialLeft = dragItem.getBoundingClientRect().left;
  }

  function onTouchMove(e) {
    var touch = e.touches ? e.touches[0] : e;
    var currentX = touch.clientX;
    var dx = currentX - startX;

    if (!isEditMode) {
      if (Math.abs(dx) > 10) {
        if (longTimer) { clearTimeout(longTimer); longTimer = null; }
      }
      return;
    }

    if (!dragItem) return;
    if (e.cancelable) e.preventDefault();

    dragItem.style.transform = "translate3d(" + dx + "px, -12px, 0) scale(1.1)";

    /* Detect hover over other slots and swap live */
    var items = Array.from(bar.querySelectorAll(".tsb-bar__item"));
    var barRect = bar.getBoundingClientRect();
    var slotWidth = barRect.width / items.length;
    var relativeX = currentX - barRect.left;
    var targetIdx = Math.floor(relativeX / slotWidth);
    targetIdx = Math.max(0, Math.min(items.length - 1, targetIdx));

    if (targetIdx !== dragIdx && targetIdx >= 0 && targetIdx < activeSlots.length) {
      var tmp = activeSlots[dragIdx];
      activeSlots[dragIdx] = activeSlots[targetIdx];
      activeSlots[targetIdx] = tmp;

      dragIdx = targetIdx;
      selectedSlotIdx = targetIdx;

      try { localStorage.setItem("tsb_custom_bar", JSON.stringify(activeSlots)); } catch (e) {}
      bar.innerHTML = buildBarHtml(activeSlots);
      updateSlotHighlight();
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}

      /* re-bind dragItem to newly positioned element */
      var newItems = Array.from(bar.querySelectorAll(".tsb-bar__item"));
      dragItem = newItems[targetIdx];
      if (dragItem) {
        dragItem.classList.add("tsb-bar__item--floating");
        dragItem.style.transform = "translate3d(" + dx + "px, -12px, 0) scale(1.1)";
      }
    }
  }

  function onTouchEnd() {
    if (longTimer) { clearTimeout(longTimer); longTimer = null; }
    if (dragItem) {
      dragItem.classList.remove("tsb-bar__item--floating");
      dragItem.classList.add("tsb-bar__item--dropping");
      dragItem.style.transform = "";
      setTimeout(function () {
        if (dragItem) dragItem.classList.remove("tsb-bar__item--dropping");
        dragItem = null;
      }, 200);
      try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
    }
  }

  bar.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });

  bar.addEventListener("mousedown", onTouchStart);
  window.addEventListener("mousemove", onTouchMove);
  window.addEventListener("mouseup", onTouchEnd);

  bar.addEventListener("click", function (e) {
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
      return false;
    }
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      var item = e.target && e.target.closest ? e.target.closest(".tsb-bar__item") : null;
      if (item) {
        var items = Array.from(bar.querySelectorAll(".tsb-bar__item"));
        selectedSlotIdx = items.indexOf(item);
        updateSlotHighlight();
        renderLiveDock();
      }
      return false;
    }
  }, true);

  /* Tap outside dock or bar to exit edit mode */
  document.addEventListener("click", function (e) {
    if (isEditMode) {
      if (!bar.contains(e.target) && (!liveDock || !liveDock.contains(e.target))) {
        exitEditMode();
      }
    }
  });
})();

