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

  /* ---------- Apple-Grade Action Bar Customizer Sheet & Long-Press Engine ---------- */
  function injectBarSheetStyles() {
    if (document.getElementById("tsb-barsheet-styles")) return;
    var st = document.createElement("style");
    st.id = "tsb-barsheet-styles";
    st.textContent = `
      .tsb-barsheet-overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(17, 17, 17, 0.65);
        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        display: flex; align-items: flex-end; justify-content: center;
        animation: tsbSheetFadeIn .22s cubic-bezier(.16,1,.3,1);
      }
      @keyframes tsbSheetFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .tsb-barsheet {
        width: 100%; max-width: 480px; max-height: 85vh;
        background: var(--paper, #fffdf5); color: var(--ink, #111);
        border: 3.5px solid var(--ink, #111); border-bottom: none;
        border-radius: 24px 24px 0 0; box-shadow: 0 -12px 36px rgba(0,0,0,0.3);
        padding: 10px 18px 24px; box-sizing: border-box; overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        animation: tsbSheetSlideUp .28s cubic-bezier(.16,1,.3,1);
        font-family: -apple-system, BlinkMacSystemFont, "Space Grotesk", "Segoe UI", sans-serif;
      }
      @keyframes tsbSheetSlideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      .tsb-sheet-handle {
        width: 38px; height: 5px; border-radius: 999px;
        background: rgba(0, 0, 0, 0.22); margin: 4px auto 14px;
      }
      .tsb-sheet-head {
        text-align: center; margin-bottom: 16px;
      }
      .tsb-sheet-title {
        font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 17px; margin: 0 0 4px; color: var(--ink, #111); letter-spacing: .3px;
      }
      .tsb-sheet-sub {
        font-size: 12px; color: #666; margin: 0; font-weight: 600;
      }
      
      /* Apple-style segmented picker for action titles */
      .tsb-sheet-seg {
        display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
        background: #e5e0d3; padding: 4px; border-radius: 12px;
        border: 2px solid var(--ink, #111); margin-bottom: 16px;
      }
      .tsb-sheet-segbtn {
        border: none; background: transparent; padding: 8px 12px;
        border-radius: 8px; font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 11.5px; color: #555; cursor: pointer; transition: all .15s ease;
      }
      .tsb-sheet-segbtn.active {
        background: #fff; color: #111; box-shadow: 2px 2px 0 var(--ink, #111);
        border: 1.5px solid var(--ink, #111);
      }
      
      /* Slot shift rows */
      .tsb-slot-list {
        display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;
      }
      .tsb-slot-row {
        display: flex; align-items: center; justify-content: space-between;
        background: #fff; border: 2.5px solid var(--ink, #111);
        border-radius: 12px; padding: 8px 12px; box-shadow: 3px 3px 0 var(--ink, #111);
      }
      .tsb-slot-info {
        display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 13px;
      }
      .tsb-slot-num {
        font-size: 10.5px; opacity: 0.6; font-family: var(--font-head, "Archivo Black", sans-serif);
      }
      .tsb-slot-actions {
        display: flex; align-items: center; gap: 5px;
      }
      .tsb-slot-btn {
        border: 1.5px solid var(--ink, #111); background: #f0ede4;
        color: #111; border-radius: 6px; padding: 5px 9px; cursor: pointer;
        font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 11px; transition: transform .1s;
      }
      .tsb-slot-btn:hover { transform: translate(-1px,-1px); box-shadow: 2px 2px 0 var(--ink, #111); }
      .tsb-slot-btn:active { transform: translate(1px,1px); }
      
      /* Swap Pool */
      .tsb-pool-grid {
        display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;
        margin-top: 10px; padding-top: 10px; border-top: 2px dashed #ddd;
      }
      .tsb-pool-item {
        border: 1.5px solid var(--ink, #111); background: var(--paper, #fffdf5);
        border-radius: 8px; padding: 6px 4px; text-align: center;
        font-size: 10.5px; font-weight: 700; cursor: pointer;
      }
      .tsb-pool-item:hover { background: var(--yellow, #ffc800); }
      
      .tsb-sheet-done-btn {
        display: block; width: 100%; border: 3px solid var(--ink, #111);
        background: var(--yellow, #ffc800); color: #111;
        font-family: var(--font-head, "Archivo Black", sans-serif);
        font-size: 14px; letter-spacing: .5px; padding: 12px; border-radius: 12px;
        box-shadow: 4px 4px 0 var(--ink, #111); cursor: pointer; text-align: center;
        box-sizing: border-box; transition: transform .1s;
      }
      .tsb-sheet-done-btn:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0 var(--ink, #111); }
    `;
    document.head.appendChild(st);
  }

  var activeSheetOverlay = null;

  function openBarCustomizerSheet(selectedId) {
    injectBarSheetStyles();
    if (activeSheetOverlay) {
      try { activeSheetOverlay.remove(); } catch (e) {}
      activeSheetOverlay = null;
    }

    var ov = document.createElement("div");
    ov.className = "tsb-barsheet-overlay";
    ov.id = "tsbBarSheetOverlay";

    function renderSheetContent() {
      var isIcons = bar.classList.contains("tsb-bar--icons-only") || barLabelsPref === "icons";

      ov.innerHTML = `
        <div class="tsb-barsheet" role="dialog" aria-modal="true" aria-labelledby="tsbSheetTitle">
          <div class="tsb-sheet-handle"></div>
          <div class="tsb-sheet-head">
            <h2 class="tsb-sheet-title" id="tsbSheetTitle">Customize Action Bar</h2>
            <p class="tsb-sheet-sub">Shift positions, swap tools, or toggle titles</p>
          </div>

          <!-- Titles Switcher -->
          <div class="tsb-sheet-seg">
            <button type="button" class="tsb-sheet-segbtn ${!isIcons ? 'active' : ''}" id="tsbSegLabels">
              🏷️ Show Labels
            </button>
            <button type="button" class="tsb-sheet-segbtn ${isIcons ? 'active' : ''}" id="tsbSegIcons">
              ✦ Icons Only
            </button>
          </div>

          <!-- Active Slots Shifting -->
          <div class="tsb-slot-list" id="tsbSlotList">
            ${activeSlots.map(function (k, idx) {
              var def = ITEM_DEFS[k] || ITEM_DEFS.home;
              var canLeft = idx > 0;
              var canRight = idx < activeSlots.length - 1;
              return `
                <div class="tsb-slot-row">
                  <div class="tsb-slot-info">
                    <span class="tsb-slot-num">#${idx + 1}</span>
                    <span>${def.lbl}</span>
                  </div>
                  <div class="tsb-slot-actions">
                    ${canLeft ? `<button type="button" class="tsb-slot-btn" data-shift-left="${idx}" title="Shift Left">◀</button>` : ''}
                    ${canRight ? `<button type="button" class="tsb-slot-btn" data-shift-right="${idx}" title="Shift Right">▶</button>` : ''}
                    <button type="button" class="tsb-slot-btn" data-swap-slot="${idx}" style="background:var(--yellow,#ffc800);" title="Swap Tool">⇄</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <div id="tsbSwapContainer" hidden>
            <div style="font-size:11px; font-weight:700; color:#666; margin-bottom:6px;">Choose tool to place in slot:</div>
            <div class="tsb-pool-grid">
              ${Object.keys(ITEM_DEFS).map(function (k) {
                var it = ITEM_DEFS[k];
                var inBar = activeSlots.indexOf(k) >= 0;
                return `<button type="button" class="tsb-pool-item" data-choose-tool="${k}" style="${inBar ? 'opacity:0.6;' : ''}">${it.lbl}</button>`;
              }).join("")}
            </div>
          </div>

          <button type="button" class="tsb-sheet-done-btn" id="tsbSheetDone" style="margin-top:14px;">
            ✓ Done
          </button>
        </div>
      `;

      /* Event listeners inside sheet */
      var btnLabels = ov.querySelector("#tsbSegLabels");
      var btnIcons = ov.querySelector("#tsbSegIcons");
      if (btnLabels && btnIcons) {
        btnLabels.addEventListener("click", function () {
          bar.classList.remove("tsb-bar--icons-only");
          document.documentElement.removeAttribute("data-bar-labels");
          barLabelsPref = "labels";
          try { localStorage.setItem("tsb_bar_labels", "labels"); } catch (e) {}
          try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
          renderSheetContent();
        });
        btnIcons.addEventListener("click", function () {
          bar.classList.add("tsb-bar--icons-only");
          document.documentElement.setAttribute("data-bar-labels", "icons");
          barLabelsPref = "icons";
          try { localStorage.setItem("tsb_bar_labels", "icons"); } catch (e) {}
          try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
          renderSheetContent();
        });
      }

      /* Shift buttons */
      ov.querySelectorAll("[data-shift-left]").forEach(function (b) {
        b.addEventListener("click", function () {
          var idx = parseInt(b.getAttribute("data-shift-left"), 10);
          if (idx > 0) {
            var tmp = activeSlots[idx];
            activeSlots[idx] = activeSlots[idx - 1];
            activeSlots[idx - 1] = tmp;
            saveAndRefreshBar();
            renderSheetContent();
          }
        });
      });

      ov.querySelectorAll("[data-shift-right]").forEach(function (b) {
        b.addEventListener("click", function () {
          var idx = parseInt(b.getAttribute("data-shift-right"), 10);
          if (idx < activeSlots.length - 1) {
            var tmp = activeSlots[idx];
            activeSlots[idx] = activeSlots[idx + 1];
            activeSlots[idx + 1] = tmp;
            saveAndRefreshBar();
            renderSheetContent();
          }
        });
      });

      /* Swap slot with pool */
      var pendingSwapIdx = -1;
      ov.querySelectorAll("[data-swap-slot]").forEach(function (b) {
        b.addEventListener("click", function () {
          pendingSwapIdx = parseInt(b.getAttribute("data-swap-slot"), 10);
          var swapCont = ov.querySelector("#tsbSwapContainer");
          if (swapCont) swapCont.hidden = false;
        });
      });

      ov.querySelectorAll("[data-choose-tool]").forEach(function (b) {
        b.addEventListener("click", function () {
          var toolKey = b.getAttribute("data-choose-tool");
          if (pendingSwapIdx >= 0 && ITEM_DEFS[toolKey]) {
            activeSlots[pendingSwapIdx] = toolKey;
            saveAndRefreshBar();
            renderSheetContent();
          }
        });
      });

      var doneBtn = ov.querySelector("#tsbSheetDone");
      if (doneBtn) {
        doneBtn.addEventListener("click", closeBarCustomizerSheet);
      }
    }

    function saveAndRefreshBar() {
      try {
        localStorage.setItem("tsb_custom_bar", JSON.stringify(activeSlots));
      } catch (e) {}
      bar.innerHTML = buildBarHtml(activeSlots);
      setActive(currentActive());
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
    }

    function closeBarCustomizerSheet() {
      if (activeSheetOverlay) {
        try { activeSheetOverlay.remove(); } catch (e) {}
        activeSheetOverlay = null;
      }
    }

    renderSheetContent();
    document.body.appendChild(ov);
    activeSheetOverlay = ov;

    ov.addEventListener("click", function (e) {
      if (e.target === ov) closeBarCustomizerSheet();
    });
    document.addEventListener("keydown", function escSheet(e) {
      if (e.key === "Escape" && activeSheetOverlay) {
        closeBarCustomizerSheet();
        document.removeEventListener("keydown", escSheet);
      }
    });
  }

  /* ---------- Long-Press Touch & Mouse Detection ---------- */
  var longPressTimer = null;
  var suppressNextClick = false;
  var pressStartPos = { x: 0, y: 0 };

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function startLongPress(item, e) {
    cancelLongPress();
    var touch = e.touches ? e.touches[0] : e;
    pressStartPos = { x: touch.clientX, y: touch.clientY };

    longPressTimer = setTimeout(function () {
      longPressTimer = null;
      suppressNextClick = true;
      try { if (navigator.vibrate) navigator.vibrate([25, 45]); } catch (err) {}
      item.style.transform = "scale(1.12)";
      setTimeout(function () { item.style.transform = ""; }, 200);
      openBarCustomizerSheet(item.getAttribute("data-tab"));
    }, 450);
  }

  bar.addEventListener("touchstart", function (e) {
    var item = e.target && e.target.closest ? e.target.closest(".tsb-bar__item") : null;
    if (item) startLongPress(item, e);
  }, { passive: true });

  bar.addEventListener("touchmove", function (e) {
    if (!longPressTimer) return;
    var touch = e.touches ? e.touches[0] : e;
    var dx = Math.abs(touch.clientX - pressStartPos.x);
    var dy = Math.abs(touch.clientY - pressStartPos.y);
    if (dx > 10 || dy > 10) cancelLongPress();
  }, { passive: true });

  bar.addEventListener("touchend", function () { cancelLongPress(); }, { passive: true });
  bar.addEventListener("touchcancel", function () { cancelLongPress(); }, { passive: true });

  bar.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    var item = e.target && e.target.closest ? e.target.closest(".tsb-bar__item") : null;
    if (item) startLongPress(item, e);
  });

  bar.addEventListener("mousemove", function (e) {
    if (!longPressTimer) return;
    var dx = Math.abs(e.clientX - pressStartPos.x);
    var dy = Math.abs(e.clientY - pressStartPos.y);
    if (dx > 10 || dy > 10) cancelLongPress();
  });

  bar.addEventListener("mouseup", function () { cancelLongPress(); });
  bar.addEventListener("mouseleave", function () { cancelLongPress(); });

  /* Suppress navigation if long-press triggered */
  bar.addEventListener("click", function (e) {
    if (suppressNextClick) {
      e.preventDefault();
      e.stopPropagation();
      suppressNextClick = false;
      return false;
    }
  }, true);

})();
