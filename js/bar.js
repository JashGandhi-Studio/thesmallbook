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
  /* v382: the reader can hide tab labels, and the bar has to look intentional
     when they do, so the state lives on the document where the CSS can see it */
  function labelsState() {
    try {
      var rawLabels = localStorage.getItem("tsb_bar_labels");
      var off = rawLabels === "icons" || rawLabels === "0" || localStorage.getItem("tsb_bar_labels") === '"0"';
      document.documentElement.classList.toggle("bar-nolabels", off);
      document.body && document.body.classList.toggle("bar-nolabels", off);
      if (off) document.documentElement.setAttribute("data-bar-labels", "icons");
      else if (rawLabels === "labels" || rawLabels === "1") document.documentElement.removeAttribute("data-bar-labels");
    } catch (e) {}
  }
  try { labelsState(); document.addEventListener("DOMContentLoaded", labelsState); } catch (e) {}

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
    audio:     { id: "audio", url: "audio.html", lbl: "Listen", ico: ICO.audio, cls: "tsb-bar__item--audio" },
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
    if (p === "podcasts.html" || p === "audio.html") return "audio";
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

  /* Load active custom slots or fallback to clean 4-item bar. Saved slots
     are healed, never merely trusted: invalid names and duplicates are
     removed, missing core buttons are restored, and a Gold fifth button
     stays in storage even on a paint that happens before Gold answers. */
  function normalizeSlots(saved, keepFifth) {
    var out = [];
    if (Array.isArray(saved)) {
      saved.forEach(function (k) { if (ITEM_DEFS[k] && out.indexOf(k) < 0) out.push(k); });
    }
    ["home", "library", "audio", "you"].forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    return out.slice(0, keepFifth ? 5 : 4);
  }
  function storedSlots() {
    try { return normalizeSlots(JSON.parse(localStorage.getItem("tsb_custom_bar")), true); } catch (e) { return normalizeSlots(null, true); }
  }
  function saveSlots(forceFour) {
    var out = activeSlots.slice(0, 5);
    var stored = storedSlots();
    if (!forceFour && out.length === 4 && stored.length === 5 && out.indexOf(stored[4]) < 0) out.push(stored[4]);
    try { localStorage.setItem("tsb_custom_bar", JSON.stringify(out)); } catch (e) {}
  }
  function getActiveSlots() {
    var gold = checkIsGold();
    var full = storedSlots();
    /* Heal a corrupt saved set once, while preserving its fifth button. */
    try {
      var raw = JSON.parse(localStorage.getItem("tsb_custom_bar"));
      if (JSON.stringify(raw) !== JSON.stringify(full)) localStorage.setItem("tsb_custom_bar", JSON.stringify(full));
    } catch (e) {}
    /* v331: the fifth button is Gold, decided by the server */
    return full.slice(0, gold ? 5 : 4);
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
    lbl = String(lbl).replace(/^\"|\"$/g, "");
    if (lbl === "0" || lbl === "false") lbl = "icons";
    if (lbl === "1" || lbl === "true") lbl = "labels";
    if (["labels", "icons", "active"].indexOf(lbl) < 0) lbl = "labels";
    try { if (localStorage.getItem("tsb_bar_labels") !== lbl) localStorage.setItem("tsb_bar_labels", lbl); } catch (e) {}
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

  /* v404: the sidebar carries the app's own front door sign, the same mark
     and word the reader sees at the top of every page, not a plain text
     stand-in. It only shows where the bar stands up as a sidebar. */
  try {
    var brand = document.createElement("a");
    brand.className = "tsb-bar__brand";
    brand.href = "index.html";
    brand.setAttribute("aria-label", "TheSmallBook, back to Today");
    brand.innerHTML =
      '<span class="tsb-bar__mark"><svg class="tsb-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path class="tsb-mark__a" d="M32 18c-6-5-13-6-20-6v34c7 0 14 1 20 6V18z"/><path class="tsb-mark__b" d="M32 18c6-5 13-6 20-6v34c-7 0-14 1-20 6V18z"/><path class="tsb-mark__sp" d="M32 18v34"/></svg><img class="tsb-bar__icon" src="assets/brand-book.png" alt="" width="512" height="512"></span>' +
      '<span class="tsb-bar__word">The<span class="tsb-bar__small">Small</span>Book</span>';
    bar.insertBefore(brand, bar.firstChild);
  } catch (eBrand) {}
  document.documentElement.classList.add("tsb-hasbar");

  /* v324 · the pill SLIDES: the active ::before starts where the old one
     stood (same page or the page you just left) and springs into place.
     Still painted only by ::before, per the bar rules above. */
  function slidePill(fromLeft) {
    var act = bar.querySelector(".tsb-bar__item.is-active");
    /* v346 · THE PILL IS ONLY EVER ON THE TAB YOU ARE ON.
       The slide class used to stay behind on the tab you just left, and its
       animation (fill-mode: both) paints the yellow pill there for good. One
       yellow pill, one owner: every other item is cleared first. */
    bar.querySelectorAll(".tsb-bar__item.pill-slide").forEach(function (it) {
      if (it !== act) it.classList.remove("pill-slide");
    });
    if (!act || typeof fromLeft !== "number" || isNaN(fromLeft)) return;
    var dx = Math.round(fromLeft - act.getBoundingClientRect().left);
    if (!dx || Math.abs(dx) > 600) return;
    act.style.setProperty("--pill-from", dx + "px");
    act.classList.remove("pill-slide"); void act.offsetWidth; act.classList.add("pill-slide");
    /* the class is a one-shot: once the spring has landed it goes away, so a
       later repaint (Gold arriving, the bar rebuilt) can never resurrect it */
    clearTimeout(slidePill._t);
    slidePill._t = setTimeout(function () { act.classList.remove("pill-slide"); }, 900);
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
    if (!id) return;
    var was = bar.querySelector(".tsb-bar__item.is-active");
    var wasLeft = was ? was.getBoundingClientRect().left : NaN;
    var moving = !was || was.getAttribute("data-tab") !== id;
    /* v346: the bar's own idea of "where am I" moves with the tap. Before
       this, any rebuild (Gold arriving, Settings applying a new look) painted
       the pill back on Today while the reader stood in the Library. */
    active = id;
    bar.querySelectorAll(".tsb-bar__item").forEach(function (it) {
      var on = it.getAttribute("data-tab") === id;
      it.classList.toggle("is-active", on);
      if (on) it.setAttribute("aria-current", "page");
      else { it.removeAttribute("aria-current"); it.classList.remove("pill-slide"); }
    });
    if (moving) slidePill(wasLeft);
  }
  /* used after a rebuild: same tab, no animation, no jump */
  function repaintActive() {
    var id = active || currentActive();
    bar.querySelectorAll(".tsb-bar__item").forEach(function (it) {
      var on = it.getAttribute("data-tab") === id;
      it.classList.toggle("is-active", on);
      if (on) it.setAttribute("aria-current", "page"); else it.removeAttribute("aria-current");
      if (!on) it.classList.remove("pill-slide");
    });
  }
  window.addEventListener("hashchange", function () {
    if (pageName() === "index.html") setActive(currentActive());
  });
  function rebuild() {
    activeSlots = getActiveSlots();
    bar.innerHTML = buildBarHtml(activeSlots);
    readLook();
    /* v346: a rebuilt bar keeps the reader where they are. Gold landing, a new
       look, a new fifth button - none of them may move the yellow pill. */
    repaintActive();
    if (barBehave === "fixed") setBarOff(false);
  }
  /* ============================================================
     v346 · THE OTHER TABS ARE ALREADY HERE
     Tapping a tab used to mean waiting for a document, its CSS and its data
     before anything moved. The four shelf pages are warmed in idle time once
     the page you are on has settled, so the tap opens instantly.
     ============================================================ */
  try {
    var warmTabs = function () {
      var here = pageName();
      activeSlots.forEach(function (k) {
        var def = ITEM_DEFS[k];
        if (!def || !def.url || def.isPlus) return;
        var file = def.url.split("#")[0].split("?")[0];
        if (!file || file === here) return;
        if (document.querySelector('link[data-tsb-prefetch="' + file + '"]')) return;
        var l = document.createElement("link");
        l.rel = "prefetch"; l.as = "document"; l.href = file;
        l.setAttribute("data-tsb-prefetch", file);
        document.head.appendChild(l);
      });
    };
    var idleTab = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1600); };
    idleTab(warmTabs, { timeout: 3500 });
    /* after a tab has been open a while, warm the rest too */
    setTimeout(warmTabs, 6000);
  } catch (ePrefetch) {}

  /* Gold arrives after the first paint: a saved fifth button appears then */
  window.addEventListener("tsbgold", rebuild);
  window.TSB_BARCTL = {
    apply: rebuild,
    setActive: setActive,
    refresh: repaintActive,
    edit: function () { enterEditMode(); return true; },
    editing: function () { return !!isEditMode; },
    slots: function () { return activeSlots.slice(); },
    defs: function () { return ITEM_DEFS; },
    isGold: checkIsGold
  };

  /* v360 · REMEMBER THE DOOR.
     Open a book from Today and Today is still the tab you are under; open it
     from the Library and the Library is. Recorded on the way in, restored on
     the book page and on the way back. */
  try {
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href*="book.html"]') : null;
      if (!a) return;
      try { sessionStorage.setItem("tsb_from_tab", currentActive()); } catch (eS) {}
    }, true);
    if (/book\.html/.test(location.pathname)) {
      var from = sessionStorage.getItem("tsb_from_tab");
      if (from) setActive(from);
    }
  } catch (e0) {}

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
    var lastY = window.scrollY || 0, anchorY = lastY, ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (isEditMode) { if (hidden) setBarOff(false); anchorY = window.scrollY || 0; return; }
        if (!pageScrolls() || barBehave === "fixed") { if (hidden) setBarOff(false); anchorY = window.scrollY || 0; return; }
        var y = window.scrollY || 0;
        lastY = y;
        if (y < 90) {
          if (hidden) setBarOff(false);
          anchorY = y;
          return;
        }
        /* Direction is judged from the last place the bar changed state,
           not from every tiny scroll frame. Small hand tremor and browser
           rubber-banding therefore cannot make it flap in and out. */
        if (!hidden && y - anchorY > 38) {
          setBarOff(true);
          anchorY = y;
        } else if (hidden && anchorY - y > 14) {
          setBarOff(false);
          anchorY = y;
        } else if (!hidden && y < anchorY) {
          anchorY = y;
        } else if (hidden && y > anchorY) {
          anchorY = y;
        }
        if (y + window.innerHeight >= document.documentElement.scrollHeight - 6) anchorY = y;
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
      /* ======================================================================
         v350 · CUSTOMISE ACTION BAR - a sheet, not a box
         It used to float above the bar as a small square window. It is a
         bottom sheet now: it rises from the floor of the screen, it has a
         handle you can pull down, and every tool is drawn as the button it
         will become - same pill, same edge, same shadow as the bar itself.
         ====================================================================== */
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
        position: fixed; left: 50%; bottom: 0; z-index: 99998;
        transform: translateX(-50%);
        width: min(540px, 100%);
        background: var(--paper, #fffdf5); color: var(--ink, #16130F);
        border: var(--bw, 3px) solid var(--edge, #16130F); border-bottom: 0;
        border-radius: 28px 28px 0 0;
        box-shadow: 0 -22px 60px -26px rgba(22, 19, 15, .55);
        padding: 4px 16px calc(14px + env(safe-area-inset-bottom, 0px));
        box-sizing: border-box;
        font-family: var(--font-body, "Space Grotesk", -apple-system, BlinkMacSystemFont, sans-serif);
        animation: tsbDockIn .34s cubic-bezier(.2, .9, .2, 1);
        will-change: transform;
      }
      @keyframes tsbDockIn {
        from { opacity: .6; transform: translateX(-50%) translateY(104%); }
        to   { opacity: 1;  transform: translateX(-50%) translateY(0); }
      }
      .tsb-livedock__grab {
        display: grid; place-items: center; height: 24px;
        margin: 0 auto 2px; width: 100%; cursor: grab; touch-action: none;
      }
      .tsb-livedock__grab i {
        display: block; width: 44px; height: 5px; border-radius: 99px;
        background: var(--edge, #16130F); opacity: .26;
        transition: opacity .2s, width .2s;
      }
      .tsb-livedock__grab:active i { opacity: .5; width: 58px; }
      .tsb-livedock__top {
        display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;
        padding: 2px 0 10px;
      }
      .tsb-livedock__title {
        flex: 1 1 auto; min-width: 0;
        font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
        color: var(--ink, #16130F);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .tsb-livedock__seg {
        display: inline-flex; gap: 2px; background: rgba(22,19,15,.08);
        padding: 3px; border-radius: 12px; flex: none;
      }
      .tsb-livedock__segbtn {
        border: 0; background: transparent; cursor: pointer;
        font-family: var(--font-body, "Space Grotesk", sans-serif);
        font-size: 11px; font-weight: 700; color: #555;
        padding: 6px 9px; border-radius: 9px;
      }
      .tsb-livedock__segbtn.active {
        background: #fff; color: #16130F; box-shadow: var(--sh-1, 0 2px 0 rgba(0,0,0,.12));
      }
      .tsb-livedock__done {
        flex: none; background: var(--yellow, #ffc800); color: #16130F;
        border: var(--bw, 3px) solid var(--edge, #16130F); border-radius: 12px;
        font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 11px; padding: 8px 12px; cursor: pointer;
        box-shadow: 0 3px 0 var(--edge, #16130F); transition: transform .1s, box-shadow .1s;
      }
      .tsb-livedock__done:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--edge, #16130F); }
      .tsb-livedock__slotbar {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        background: rgba(22,19,15,.055); border-radius: 14px;
        padding: 9px 12px; margin-bottom: 9px;
      }
      .tsb-livedock__slotstatus { font-size: 11.5px; font-weight: 600; color: #555; }
      .tsb-livedock__slotstatus b { color: var(--ink, #16130F); }
      .tsb-livedock__slotbtn {
        border: 2px solid var(--edge, #16130F); background: transparent;
        font-family: var(--font-body, "Space Grotesk", sans-serif);
        font-size: 11px; font-weight: 700; color: var(--ink, #16130F);
        padding: 6px 10px; border-radius: 99px; cursor: pointer; white-space: nowrap;
      }
      .tsb-livedock__slotbtn--gold { background: rgba(255,200,0,.28); border-color: var(--edge, #16130F); }
      .tsb-livedock__hint { font-size: 11.5px; line-height: 1.4; color: #666; margin-bottom: 9px; }
      .tsb-livedock__hint b { color: var(--ink, #16130F); }
      .tsb-livedock__shelf {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
        gap: 8px; max-height: min(42vh, 320px); overflow-y: auto;
        padding: 2px 2px 6px; overscroll-behavior: contain;
        scrollbar-width: none;
      }
      .tsb-livedock__shelf::-webkit-scrollbar { display: none; }
      .tsb-shelf-item {
        position: relative; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 5px;
        min-height: 66px; padding: 9px 6px; cursor: pointer;
        background: #fff; color: var(--ink, #16130F);
        border: 2px solid var(--edge, #16130F); border-radius: 16px;
        box-shadow: 0 3px 0 var(--edge, #16130F);
        transition: transform .1s, box-shadow .1s, background .16s;
        -webkit-tap-highlight-color: transparent;
      }
      .tsb-shelf-item:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--edge, #16130F); }
      .tsb-shelf-item__ico { display: grid; place-items: center; width: 21px; height: 21px; }
      .tsb-shelf-item__ico svg { width: 21px; height: 21px; display: block; }
      .tsb-shelf-item__lbl {
        font-family: var(--font-body, "Space Grotesk", sans-serif);
        font-size: 10.5px; font-weight: 700; letter-spacing: .01em;
        max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .tsb-shelf-item.is-inbar { background: var(--yellow, #ffc800); }
      .tsb-shelf-item__tick {
        position: absolute; top: 4px; right: 7px; font-size: 10px; font-weight: 800; opacity: .55;
      }
      html.dark .tsb-livedock { background: #1B1712; color: #F4EFE6; }
      html.dark .tsb-shelf-item { background: #241F17; color: #F4EFE6; }
      html.dark .tsb-shelf-item.is-inbar { background: #FFC800; color: #16130F; }
      html.dark .tsb-livedock__title { color: #F4EFE6; }
      html.dark .tsb-livedock__slotstatus, html.dark .tsb-livedock__hint { color: #B9B0A2; }
    `;
    document.head.appendChild(st);

    if (!document.getElementById("tsbDockPolish")) {
      var pol = document.createElement("style");
      pol.id = "tsbDockPolish";
      pol.textContent = `
        .tsb-livedock-scrim { position: fixed; inset: 0; z-index: 999998; background: rgba(22,19,15,.34); opacity: 0; transition: opacity .28s ease; -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
        .tsb-livedock-scrim.on { opacity: 1; }
        .tsb-livedock {
          z-index: 999999 !important; position: fixed; left: 50%; bottom: 0;
          transform: translateX(-50%); width: min(520px, 100%);
          background: #fffdf8 !important; color: #16130f !important;
          border-radius: 24px 24px 0 0 !important;
          padding: 10px 16px calc(env(safe-area-inset-bottom, 0px) + 26px) !important;
          box-shadow: 0 -20px 50px -22px rgba(22,19,15,.5) !important;
          max-height: 74vh; overflow-y: auto;
          font-family: 'Space Grotesk', system-ui, sans-serif !important;
        }
        .tsb-livedock__grab { margin: 0 auto 8px !important; width: 40px !important; height: 4px !important; border-radius: 999px !important; background: #ddd3c1 !important }
        .tsb-livedock__top { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 12px !important; margin-bottom: 12px !important }
        .tsb-livedock__title { font: 700 10px/1 'Space Grotesk', system-ui !important; letter-spacing: .18em !important; color: #8a8272 !important }
        .tsb-livedock__done { border: 0 !important; background: #16130f !important; color: #fbf8f1 !important; border-radius: 999px !important; padding: 9px 18px !important; font: 600 13px 'Space Grotesk', system-ui !important; cursor: pointer }
        .tsb-livedock__slots { display: grid !important; grid-template-columns: repeat(5, 1fr) !important; gap: 8px !important; margin-bottom: 14px !important }
        .tsb-slot { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 6px !important;
          padding: 10px 4px !important; border-radius: 14px !important; border: 1.5px solid #eae2d3 !important; background: #fff !important;
          color: #6e6658 !important; cursor: pointer; transition: border-color .15s ease, background-color .15s ease }
        .tsb-slot.is-on { border-color: #16130f !important; background: #fff8dc !important; color: #16130f !important }
        .tsb-slot__ico { display: grid; place-items: center; width: 22px; height: 22px }
        .tsb-slot__ico svg { width: 20px !important; height: 20px !important }
        .tsb-slot__lbl { font: 600 10px/1 'Space Grotesk', system-ui !important; letter-spacing: .01em; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
        .tsb-slot--add { border-style: dashed !important; color: #a29884 !important }
        .tsb-livedock__row { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 10px !important; margin-bottom: 10px !important }
        .tsb-livedock__hint { font: 500 12px/1.35 'Space Grotesk', system-ui !important; color: #6e6658 !important }
        .tsb-livedock__seg { display: inline-flex !important; padding: 3px !important; gap: 2px !important; background: #f1e9da !important; border-radius: 999px !important; flex: none }
        .tsb-livedock__segbtn { border: 0 !important; background: transparent !important; border-radius: 999px !important; padding: 6px 12px !important; font: 600 12px 'Space Grotesk', system-ui !important; color: #6e6658 !important; cursor: pointer }
        .tsb-livedock__segbtn.active { background: #fffdf8 !important; color: #16130f !important; box-shadow: 0 1px 3px rgba(22,19,15,.14) !important }
        .tsb-livedock__shelf { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; padding: 0 !important; overflow: visible !important }
        .tsb-tool { display: flex !important; align-items: center !important; gap: 10px !important; text-align: left !important;
          padding: 11px 12px !important; border-radius: 13px !important; border: 1px solid #eae2d3 !important; background: #fff !important;
          color: #16130f !important; font: 600 13px 'Space Grotesk', system-ui !important; cursor: pointer; transition: transform .12s ease }
        .tsb-tool:active { transform: scale(.97) }
        .tsb-tool__ico { width: 20px; height: 20px; display: grid; place-items: center; color: #8a8272 }
        .tsb-tool__ico svg { width: 19px !important; height: 19px !important }
        html.tsb-bar-editing .tsb-bar__plus { display: none !important }
        html.tsb-bar-editing .tsb-bar { z-index: 1 !important }
        .tsb-livedock__empty { grid-column: 1 / -1; font: 500 12.5px 'Space Grotesk', system-ui; color: #8a8272; margin: 4px 2px 8px }
        html.dark .tsb-livedock { background: #1c1813 !important; color: #efe6d3 !important }
        html.dark .tsb-slot, html.dark .tsb-tool { background: #241f17 !important; border-color: #342d24 !important; color: #efe6d3 !important }
        html.dark .tsb-slot.is-on { background: #2e2716 !important; border-color: #ffc800 !important; color: #ffc800 !important }
        html.dark .tsb-livedock__hint, html.dark .tsb-livedock__empty { color: #a29884 !important }
        html.dark .tsb-livedock__seg { background: #241f17 !important }
        html.dark .tsb-livedock__segbtn.active { background: #342d24 !important; color: #efe6d3 !important }
        html.dark .tsb-livedock__done { background: #ffc800 !important; color: #16130f !important }
`;
      document.head.appendChild(pol);
    }
  }

  var editStartedAt = 0;
  function enterEditMode() {
    if (isEditMode) return;
    isEditMode = true;
    editStartedAt = Date.now();
    document.documentElement.classList.add("tsb-bar-editing");
    injectLiveDockStyles();
    bar.classList.add("tsb-bar--reordering");
    try { if (navigator.vibrate) navigator.vibrate([35, 50]); } catch (e) {}

    renderLiveDock();
    updateSlotHighlight();
  }

  function exitEditMode() {
    if (!isEditMode) return;
    isEditMode = false;
    document.documentElement.classList.remove("tsb-bar-editing");
    bar.classList.remove("tsb-bar--reordering");
    bar.querySelectorAll(".tsb-bar__item").forEach(function (it) {
      it.classList.remove("tsb-bar__item--selected", "tsb-bar__item--floating");
      it.style.transform = "";
    });
    if (liveDock) {
      try { liveDock.remove(); } catch (e) {}
      liveDock = null;
    }
    document.querySelectorAll(".tsb-livedock-scrim").forEach(function (n) { n.remove(); });
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

    var scrim = document.createElement("div");
    scrim.className = "tsb-livedock-scrim";
    document.body.appendChild(scrim);
    setTimeout(function () { scrim.classList.add("on"); }, 10);

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

    /* v358 · COMPACT AND HONEST.
       The old sheet was a wall of twelve tiles with a gold upsell, a drag hint
       and two segmented controls, which is not a customiser, it is a page.
       This one is the bar itself: your four buttons, then the tools that are
       not in it, and one Done. Nothing scrolls on a normal phone. */
    var currentNames = activeSlots.map(function (k) {
      return (ITEM_DEFS[k] && ITEM_DEFS[k].lbl) || k;
    });
    var spare = Object.keys(ITEM_DEFS).filter(function (k) { return activeSlots.indexOf(k) < 0; });

    dock.innerHTML = `
      <div class="tsb-livedock__grab" id="tsbDockGrab" role="button" tabindex="0" aria-label="Drag down to close"><i></i></div>
      <div class="tsb-livedock__top">
        <span class="tsb-livedock__title">YOUR ACTION BAR</span>
        <button type="button" class="tsb-livedock__done" id="tsbDockDone">Done</button>
      </div>
      <div class="tsb-livedock__slots" id="tsbDockSlots">
        ${activeSlots.map(function (k, i) {
          var def = ITEM_DEFS[k] || {};
          return `<button type="button" class="tsb-slot ${i === selectedSlotIdx ? "is-on" : ""}" data-slotpick="${i}" aria-pressed="${i === selectedSlotIdx}">
            <span class="tsb-slot__ico" aria-hidden="true">${def.ico || ""}</span>
            <span class="tsb-slot__lbl">${def.lbl || k}</span>
          </button>`;
        }).join("")}
        ${activeSlots.length < 5 ? `<button type="button" class="tsb-slot tsb-slot--add" id="tsbDockSlotToggle" aria-label="Add a fifth button"><span class="tsb-slot__ico">+</span><span class="tsb-slot__lbl">Add</span></button>` : `<button type="button" class="tsb-slot tsb-slot--add" id="tsbDockSlotToggle" aria-label="Back to four buttons"><span class="tsb-slot__ico">\u2212</span><span class="tsb-slot__lbl">4 only</span></button>`}
      </div>
      <div class="tsb-livedock__row">
        <span class="tsb-livedock__hint">Tap a tool to put it in <b>${currentNames[selectedSlotIdx] || "this slot"}</b></span>
        <div class="tsb-livedock__seg">
          <button type="button" class="tsb-livedock__segbtn ${!isIcons ? 'active' : ''}" id="tsbDockSegLabels">Titles</button>
          <button type="button" class="tsb-livedock__segbtn ${isIcons ? 'active' : ''}" id="tsbDockSegIcons">Icons</button>
        </div>
      </div>
      <div class="tsb-livedock__shelf" id="tsbDockShelf">
        ${spare.map(function (k) {
          var def = ITEM_DEFS[k];
          return `<button type="button" class="tsb-tool" data-tool="${k}">
            <span class="tsb-tool__ico" aria-hidden="true">${def.ico || ""}</span>
            <span class="tsb-tool__lbl">${def.lbl}</span>
          </button>`;
        }).join("") || '<p class="tsb-livedock__empty">Every tool is already on your bar.</p>'}
      </div>
    `;

    document.body.appendChild(dock);
    liveDock = dock;

    /* v350: the sheet is a sheet, not a box: grab it and pull it down to close.
       A short pull springs back, a real pull dismisses. Horizontal movement is
       ignored so a slipped thumb never closes someone's editor. */
    (function dragToClose() {
      var grab = dock.querySelector("#tsbDockGrab");
      var handle = grab || dock;
      var startY = null, dy = 0, active = false;
      function down(e) {
        startY = (e.touches ? e.touches[0].clientY : e.clientY);
        dy = 0; active = true;
        dock.style.transition = "none";
      }
      function move(e) {
        if (!active || startY == null) return;
        var y = (e.touches ? e.touches[0].clientY : e.clientY);
        dy = Math.max(0, y - startY);
        dock.style.transform = "translateX(-50%) translateY(" + dy + "px)";
        if (e.cancelable) e.preventDefault();
      }
      function up() {
        if (!active) return;
        active = false; startY = null;
        dock.style.transition = "";
        dock.style.transform = "";
        if (dy > 84) {
          try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
          exitEditMode();
        }
      }
      handle.addEventListener("pointerdown", down);
      handle.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
      handle.addEventListener("touchstart", down, { passive: true });
      handle.addEventListener("touchmove", move, { passive: false });
      handle.addEventListener("touchend", up);
      handle.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); exitEditMode(); }
      });
    })();

    /* v364: press and hold a chip, then drag it sideways to reorder. Tap still
       selects the slot you are editing. */
    (function dragChips() {
      var chips = Array.prototype.slice.call(dock.querySelectorAll("[data-slotpick]"));
      var from = null, startX = 0, moved = false, holdTimer = null;
      chips.forEach(function (chip) {
        chip.addEventListener("pointerdown", function (e) {
          chip.setPointerCapture && chip.setPointerCapture(e.pointerId);
          startX = e.clientX; moved = false;
          holdTimer = setTimeout(function () { chip.classList.add("is-lifting"); from = chip; }, 180);
        });
        chip.addEventListener("pointermove", function (e) {
          if (from !== chip) {
            if (Math.abs(e.clientX - startX) > 8 && holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
            return;
          }
          moved = true;
          var dx = e.clientX - startX;
          chip.style.transform = "translateX(" + dx + "px) scale(1.06)";
          var over = document.elementFromPoint(e.clientX, e.clientY);
          var target = over && over.closest ? over.closest("[data-slotpick]") : null;
          if (target && target !== chip) {
            var a = parseInt(chip.getAttribute("data-slotpick"), 10), b = parseInt(target.getAttribute("data-slotpick"), 10);
            if (a !== b) {
              var movedSlot = activeSlots.splice(a, 1)[0];
              activeSlots.splice(b, 0, movedSlot);
              selectedSlotIdx = b;
              try { saveSlots(); } catch (eS) {}
              bar.innerHTML = buildBarHtml(activeSlots);
              try { if (navigator.vibrate) navigator.vibrate(8); } catch (eV) {}
              renderLiveDock();
            }
          }
        });
        function end() {
          if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
          chip.classList.remove("is-lifting");
          chip.style.transform = "";
          if (from === chip) { from = null; return; }
        }
        chip.addEventListener("pointerup", end);
        chip.addEventListener("pointercancel", end);
        chip.addEventListener("pointerleave", function () { if (!from) end(); });
        chip.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
      });
    })();

    dock.querySelectorAll("[data-slotpick]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        selectedSlotIdx = parseInt(chip.getAttribute("data-slotpick"), 10) || 0;
        try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
        renderLiveDock();
        updateSlotHighlight();
      });
    });

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
          try { saveSlots(true); } catch (e) {}
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
          try { saveSlots(); } catch (e) {}
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
          try { saveSlots(); } catch (e) {}
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

      try { saveSlots(); } catch (e) {}
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
    if (!isEditMode) return;
    /* v356: the tap that opened the panel used to be the tap that closed it,
       which is why it never stayed open. Give it half a second of immunity,
       and never close on anything that lives inside the bar or the panel. */
    if (Date.now() - editStartedAt < 500) return;
    if (bar.contains(e.target)) return;
    if (liveDock && liveDock.contains(e.target)) return;
    if (e.target.closest && e.target.closest(".tsb-livedock-scrim")) return;
    exitEditMode();
  });
})();

