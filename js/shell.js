/* ============================================================
   THESMALLBOOK — 📱 APP SHELL (shell.js)
   Injects the bottom action bar on every app page.

   - 5 slots: Home · Read · Add (FAB) · Chat · You
   - Active tab derived from the current URL
   - Hides on scroll-down, returns on scroll-up
   - Safe-area aware, 44px+ tap targets, full a11y
   - NEVER renders for crawlers, or on SEO pages (books/*.html,
     graveyard/*.html) unless the visitor is signed in — Phase 1
     must not touch what Google indexes.

   Load AFTER config.js/auth.js, with `defer`.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- don't ever gate or decorate crawlers ---------- */
  var UA = navigator.userAgent || "";
  var IS_BOT = /bot|crawl|spider|slurp|bingpreview|duckduckbot|baiduspider|yandex|facebookexternalhit|embedly|quora link preview|lighthouse|headlesschrome/i.test(UA);
  if (IS_BOT) return;

  var path = location.pathname;
  var file = (path.split("/").pop() || "index.html").toLowerCase();
  var isSEOPage = /\/books\/|\/graveyard\//.test(path);
  var isStandalone = /login\.html|404\.html/.test(file);
  if (isStandalone) return;

  function signedIn() {
    try { return !!(window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()); }
    catch (e) { return false; }
  }
  /* SEO article pages stay exactly as Google sees them for anonymous
     visitors; signed-in readers get the app chrome. */
  if (isSEOPage && !signedIn()) return;

  /* ---------- root-relative href helper (works one level deep) ---------- */
  var depth = (path.replace(/\/[^\/]*$/, "/").match(/\//g) || []).length - 1;
  var BASE = depth > 0 ? new Array(depth + 1).join("../") : "";

  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    read: '<path d="M12 6.5C10.5 5 8 4.2 4 4.2V19c4 0 6.5.8 8 2.3 1.5-1.5 4-2.3 8-2.3V4.2c-4 0-6.5.8-8 2.3Z"/><path d="M12 6.5v14.8"/>',
    add:  '<path d="M12 5v14"/><path d="M5 12h14"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z"/>',
    you:  '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>'
  };

  var TABS = [
    { id: "home", label: "Home",  icon: "home", href: BASE + "index.html",
      match: /^$|index\.html|home\.html/ },
    { id: "read", label: "Read",  icon: "read", href: BASE + "index.html#library",
      match: /book\.html|library|graveyard/ },
    { id: "add",  label: "Add",   icon: "add",  href: BASE + "stories.html",
      match: /stories\.html|story\.html|add\.html/, fab: true },
    { id: "chat", label: "Chat",  icon: "chat", href: BASE + "chat.html",
      match: /chat\.html|ask/ },
    { id: "you",  label: "You",   icon: "you",  href: BASE + "profile.html",
      match: /profile\.html|settings\.html/ }
  ];

  function svg(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }

  function activeId() {
    var hash = (location.hash || "").toLowerCase();
    for (var i = 0; i < TABS.length; i++) {
      var t = TABS[i];
      if (t.id !== "home" && (t.match.test(file) || t.match.test(hash))) return t.id;
    }
    return "home";
  }

  function build() {
    if (document.querySelector(".tsb-bar")) return;

    var current = activeId();
    var nav = document.createElement("nav");
    nav.className = "tsb-bar";
    nav.setAttribute("role", "navigation");
    nav.setAttribute("aria-label", "Primary");

    var html = "";
    TABS.forEach(function (t) {
      var isActive = t.id === current;
      if (t.fab) {
        html +=
          '<a class="tsb-bar__item tsb-bar__item--fab" href="' + t.href + '" ' +
          'data-tab="' + t.id + '" aria-label="' + t.label + '">' +
          '<span class="tsb-bar__fab">' + svg(ICONS[t.icon]) + '</span>' +
          '</a>';
      } else {
        html +=
          '<a class="tsb-bar__item' + (isActive ? " is-active" : "") + '" ' +
          'href="' + t.href + '" data-tab="' + t.id + '"' +
          (isActive ? ' aria-current="page"' : "") + '>' +
          '<span class="tsb-bar__icon">' + svg(ICONS[t.icon]) + '</span>' +
          '<span class="tsb-bar__label">' + t.label + '</span>' +
          '</a>';
      }
    });

    nav.innerHTML = html;
    document.body.appendChild(nav);
    document.body.classList.add("tsb-has-bar");

    paintYou(nav);
    hideOnScroll(nav);
    /* auth resolves after the bar paints — refresh the You tab then */
    window.addEventListener("tsb:auth", function () { paintYou(nav); });
    window.addEventListener("tsb:profile", function () { paintYou(nav); });
  }

  /* ---------- You tab reflects the signed-in user ---------- */
  function paintYou(nav) {
    var slot = nav.querySelector('[data-tab="you"] .tsb-bar__icon');
    if (!slot) return;
    if (!signedIn()) { slot.innerHTML = svg(ICONS.you); return; }

    var p = null;
    try { p = window.TSB_PROFILE && window.TSB_PROFILE.get(); } catch (e) {}
    if (p && p.avatar_url) {
      slot.innerHTML = '<img class="tsb-bar__ava" src="' + p.avatar_url +
        '" alt="" width="22" height="22" loading="lazy">';
    } else if (p) {
      var ini = "R";
      try { ini = window.TSB_PROFILE.initials(p); } catch (e) {}
      slot.innerHTML = '<span class="tsb-bar__ava tsb-bar__ava--ini">' + ini + "</span>";
    } else {
      slot.innerHTML = svg(ICONS.you);
    }
  }

  /* ---------- hide on scroll-down, show on scroll-up ---------- */
  function hideOnScroll(nav) {
    var last = window.pageYOffset;
    var ticking = false;
    var THRESHOLD = 8;

    function update() {
      var y = window.pageYOffset;
      var delta = y - last;
      if (Math.abs(delta) > THRESHOLD) {
        /* never hide at the very top or inside the bounce zone */
        if (delta > 0 && y > 120) nav.classList.add("is-hidden");
        else nav.classList.remove("is-hidden");
        last = y;
      }
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  }

  /* keep the active tab correct on hash navigation */
  window.addEventListener("hashchange", function () {
    var nav = document.querySelector(".tsb-bar");
    if (!nav) return;
    var current = activeId();
    nav.querySelectorAll(".tsb-bar__item").forEach(function (el) {
      var on = el.getAttribute("data-tab") === current && !el.classList.contains("tsb-bar__item--fab");
      el.classList.toggle("is-active", on);
      if (on) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }

  window.TSB_SHELL = { rebuild: build };
})();
