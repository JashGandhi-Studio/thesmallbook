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
    wireHomeScroll(nav);

    var youTab = nav.querySelector('[data-tab="you"]');
    if (youTab) {
      youTab.addEventListener("click", function (ev) {
        /* profile.html is the full page; everywhere else You slides up */
        if (/profile\.html/.test(location.pathname)) return;
        ev.preventDefault();
        openYou();
      });
    }
    /* auth resolves after the bar paints — refresh the You tab then */
    window.addEventListener("tsb:auth", function () { paintYou(nav); });
    window.addEventListener("tsb:profile", function () { paintYou(nav); });
  }

  /* ---------- Home/Read scroll within the homepage ----------
     On index.html both tabs point at the same document, so a normal
     navigation would reload the page and lose your place. Scroll instead:
     Home => very top, Read => the shelf. */
  function wireHomeScroll(nav) {
    var p = location.pathname;
    var onHome = /(^|\/)$/.test(p) || /(^|\/)index\.html$/.test(p);
    if (!onHome) return;

    nav.querySelectorAll("[data-tab]").forEach(function (a) {
      var id = a.getAttribute("data-tab");
      if (id !== "home" && id !== "read") return;

      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        var lib = document.getElementById("library");
        if (id === "read" && lib) lib.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.scrollTo({ top: 0, behavior: "smooth" });

        nav.querySelectorAll("[data-tab]").forEach(function (b) {
          b.classList.toggle("is-active", b === a);
          if (b === a) b.setAttribute("aria-current", "page");
          else b.removeAttribute("aria-current");
        });
      });
    });
  }

  /* ---------- You opens as a bottom sheet, not a page ----------
     The reader stays where they are; the panel slides up over it. Signed
     out it shows the sign-in pitch; signed in it shows name + shortcuts. */
  function youHtml() {
    var p = null;
    try { p = window.TSB_PROFILE && window.TSB_PROFILE.get(); } catch (e) {}

    if (!signedIn() || !p) {
      return '<div class="yo-gate">' +
        '<div class="yo-gate__mark">\uD83D\uDC4B</div>' +
        "<h3>Your shelf, everywhere</h3>" +
        "<p>Sign in to keep what you read \u2014 and to start posting.</p>" +
        '<ul class="yo-perks">' +
          "<li><span>\uD83D\uDCDA</span><div>Progress and shelf on every device</div></li>" +
          "<li><span>\uD83D\uDD25</span><div>Streaks and badges that actually save</div></li>" +
          "<li><span>\u270D\uFE0F</span><div>Post under your own name</div></li>" +
        "</ul>" +
        '<button class="yo-cta" id="yoSignIn">Continue with Google</button>' +
        '<p class="yo-fine">Free forever. No card.</p>' +
      "</div>";
    }

    var name = p.display_name || p.username || "Reader";
    var handle = p.username ? "@" + p.username : "";
    var ava = p.avatar_url
      ? '<img src="' + p.avatar_url + '" alt="" width="56" height="56">'
      : '<span class="yo-ava__ini">' +
        (window.TSB_PROFILE.initials ? window.TSB_PROFILE.initials(p) : "R") + "</span>";

    return '<div class="yo-id">' +
        '<div class="yo-ava">' + ava + "</div>" +
        '<div class="yo-id__txt"><strong>' + name + "</strong>" +
          (handle ? "<span>" + handle + "</span>" : "") + "</div>" +
      "</div>" +
      '<div class="yo-stats">' +
        '<div><b>' + (p.posts || 0) + "</b><span>Posts</span></div>" +
        '<div><b>' + (p.followers || 0) + "</b><span>Followers</span></div>" +
        '<div><b>' + (p.following || 0) + "</b><span>Following</span></div>" +
      "</div>" +
      '<nav class="yo-rows">' +
        '<a class="yo-row" href="' + BASE + 'profile.html"><span>\uD83D\uDC64</span>Full profile</a>' +
        '<a class="yo-row" href="' + BASE + 'index.html#library"><span>\uD83D\uDCDA</span>My shelf</a>' +
        '<a class="yo-row" href="' + BASE + 'stories.html"><span>\u270D\uFE0F</span>My posts</a>' +
        '<a class="yo-row" href="' + BASE + 'settings.html"><span>\u2699\uFE0F</span>Settings</a>' +
      "</nav>";
  }

  function openYou() {
    if (!window.TSB_SHEET) { location.href = BASE + "profile.html"; return; }
    window.TSB_SHEET.open({
      title: "You",
      html: youHtml(),
      onMount: function (body) {
        var btn = body.querySelector("#yoSignIn");
        if (btn) btn.addEventListener("click", function () {
          location.href = BASE + "signin.html?next=index.html";
        });
      }
    });
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
