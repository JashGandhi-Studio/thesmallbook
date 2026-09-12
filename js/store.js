/* ============================================================
   THESMALLBOOK — 🛍️ TSB STORE (store.js) · v225
   The reader deals store. Access unlocks three ways:
     1. 💛 TSB Gold            (paid plan)
     2. ✍️ 3 published stories  (the Insider path — grows community)
     3. 👑 Founder             (FOUNDER_EMAILS below, or the
        official ✔ account id in js/community.js OFFICIAL_ID)
   Offers come from js/store-data.js — curated official brand
   programs with real, locally-shipped logos (assets/logos/).
   Paying links can be affiliate-tagged via js/affiliate.js
   (window.TSB_AFFILIATE) — see docs/STORE-OPS.md § affiliate.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_STORE) return;

  /* 👑 FOUNDER: your Gmail — you get the whole store free on login. */
  var FOUNDER_EMAILS = ["acimotreyothy@gmail.com"];
  var INSIDER_POSTS = 3;   /* stories a writer must publish to unlock free */
  var FREE_TEASERS = 3;    /* offers everyone can open without unlocking */
  var LOGO_DIR = "assets/logos/";

  var C = window.TSB_COMMUNITY;
  var DATA = window.TSB_STORE_DATA || { offers: [] };
  var CATS = [
    { id: "all", label: "✦ All" },
    { id: "books", label: "📚 Books" },
    { id: "fun", label: "🎧 Music & video" },
    { id: "learning", label: "🧠 Learning" },
    { id: "food", label: "🍜 Food" },
    { id: "shopping", label: "🛒 Shopping" },
    { id: "travel", label: "🎟️ Going out" }
  ];
  var TAG_CLASS = { "FREE TRIAL": "trial", "TRIAL": "trial", "STUDENT": "student", "NEW USER": "new", "FREE": "free", "BUNDLED": "trial", "DEALS HUB": "free", "CASHBACK HUB": "free" };

  var cat = "all", accessCache = null, closing = null;

  /* ---------- utils ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>\"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "st-toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2400);
  }
  function haptic() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }
  function initials(b) { return (b || "?").replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase() || "?"; }
  function logoHTML(o, cls) {
    /* real brand mark; if the file ever 404s we fall back to a monogram tile */
    return '<div class="st-logo ' + (cls || "") + '" style="background:' + esc(o.bg || "#fff") + '">' +
      '<img src="' + LOGO_DIR + esc(o.logo) + '" alt="' + esc(o.brand) + ' logo" loading="lazy" decoding="async" ' +
      'onerror="this.outerHTML=\'<span class=&quot;st-logo__mono&quot;>' + esc(initials(o.brand)) + '</span>\'">' +
      "</div>";
  }
  function tagClass(tag) { return TAG_CLASS[tag] ? " st-card__tag--" + TAG_CLASS[tag] : ""; }
  function byId(id) { return DATA.offers.filter(function (x) { return x.id === id; })[0]; }
  function isOpen(o, a) {
    if (a.ok) return true;
    var idx = DATA.offers.indexOf(o);
    return idx > -1 && idx < FREE_TEASERS;
  }
  /* affiliate link resolver — window.TSB_AFFILIATE maps offer id → your tracked url (EarnKaro/Cuelinks/Amazon).
     If empty, we fall back to the clean official url. See docs/STORE-OPS.md. */
  function finalUrl(o) {
    try {
      var m = window.TSB_AFFILIATE || {};
      if (m[o.id]) return m[o.id];
      if (m[o.brand]) return m[o.brand];
    } catch (e) {}
    return o.url;
  }
  function isAffiliate(o) {
    try {
      var m = window.TSB_AFFILIATE || {};
      return !!(m[o.id] || m[o.brand]);
    } catch (e) { return false; }
  }

  /* ---------- access ---------- */
  async function access(force) {
    if (accessCache && !force) return accessCache;
    var a = { ok: false, via: null, posts: 0, signed: false };
    try {
      if (C && C.signedIn()) {
        a.signed = true;
        var me = C.me() || {};
        var email = (me.email || "").toLowerCase();
        if (FOUNDER_EMAILS.indexOf(email) >= 0 || (C.isOfficial && C.isOfficial(me.id))) {
          a.ok = true; a.via = "founder";
        }
        if (!a.ok) {
          var rows = [];
          try { rows = await C.listPosts({ author: me.id }); } catch (e) {}
          a.posts = (rows || []).length;
          if (a.posts >= INSIDER_POSTS) { a.ok = true; a.via = "insider"; }
        }
      }
      if (!a.ok && window.TSB_GOLD && TSB_GOLD.isGold()) { a.ok = true; a.via = "gold"; }
    } catch (e) {}
    accessCache = a;
    return a;
  }

  /* ---------- hero stats + ticker ---------- */
  function renderHeroBits() {
    var stats = $("stStats");
    if (stats) {
      var trials = DATA.offers.filter(function (o) { return /TRIAL/.test(o.tag); }).length;
      var student = DATA.offers.filter(function (o) { return o.tag === "STUDENT"; }).length;
      stats.innerHTML =
        '<span class="st-stat"><b>' + DATA.offers.length + "</b> LIVE OFFERS</span>" +
        '<span class="st-stat"><b>' + trials + "</b> FREE TRIALS</span>" +
        '<span class="st-stat"><b>' + student + "</b> STUDENT PLANS</span>" +
        '<span class="st-stat">' + esc(DATA.verified).toUpperCase() + "</span>";
    }
    var tk = $("stTicker");
    if (tk) {
      var seen = {}, items = [];
      DATA.offers.forEach(function (o) {
        if (seen[o.logo]) return; seen[o.logo] = 1;
        items.push('<span class="st-ticker__item"><img src="' + LOGO_DIR + esc(o.logo) + '" alt="" style="background:' + esc(o.bg || "#fff") + '">' + esc(o.brand) + "</span>");
      });
      tk.innerHTML = '<div class="st-ticker__track">' + items.join("") + items.join("") + "</div>";
    }
  }

  /* ---------- editor's picks rail ---------- */
  function renderPicks(a) {
    var rail = $("stPicks");
    if (!rail) return;
    var picks = DATA.offers.filter(function (o) { return o.top; });
    if (!picks.length) { rail.parentNode && (rail.parentNode.hidden = true); return; }
    rail.innerHTML = picks.map(function (o, i) {
      var open = isOpen(o, a);
      return '<div class="st-pick' + (open ? "" : " st-card--lock") + '" data-id="' + esc(o.id) + '" style="--i:' + i + ";--c:" + esc(o.bg && o.bg !== "#ffffff" ? o.bg : "#ffc800") + '">' +
        '<div class="st-pick__glow"></div>' +
        '<div class="st-pick__row">' + logoHTML(o) + "<div><span class=\"st-pick__brand\">" + esc(o.brand) + '</span><span class="st-pick__worth">' + esc(o.worth || "") + "</span></div></div>" +
        '<span class="st-pick__val">' + esc(o.value) + "</span>" +
        '<b class="st-pick__t st-card__t">' + esc(o.title) + "</b>" +
        '<span class="st-pick__cta">' + (open ? "REVEAL OFFER →" : "🔒 UNLOCK TO REVEAL") + "</span>" +
        "</div>";
    }).join("");
  }

  /* ---------- grid ---------- */
  function cardHTML(o, open, i) {
    return '<div class="st-card' + (open ? "" : " st-card--lock") + '" data-id="' + esc(o.id) + '" style="--i:' + i + '" role="button" tabindex="0" aria-label="' + esc(o.brand + ": " + o.value) + '">' +
      '<div class="st-card__top">' + logoHTML(o) + '<span class="st-card__tag' + tagClass(o.tag) + '">' + esc(o.tag) + "</span></div>" +
      '<span class="st-card__brand">' + esc(o.brand) + "</span>" +
      '<span class="st-card__val">' + esc(o.value) + "</span>" +
      '<b class="st-card__t">' + esc(o.title) + "</b>" +
      '<div class="st-card__foot"><span class="st-card__worth">' + esc(o.worth || o.verified || DATA.verified) + '</span><span class="st-card__go">→</span></div>' +
      "</div>";
  }

  function renderGrid(a) {
    var grid = $("stGrid");
    var list = DATA.offers.filter(function (o) { return cat === "all" || o.cat === cat; });
    if (!list.length) { grid.innerHTML = '<div class="st-empty">Nothing on this shelf yet — new drops land monthly.</div>'; return; }
    grid.innerHTML = list.map(function (o, i) { return cardHTML(o, isOpen(o, a), i); }).join("");
  }

  function renderCats() {
    var cats = $("stCats");
    cats.innerHTML = CATS.map(function (c) {
      var n = c.id === "all" ? DATA.offers.length : DATA.offers.filter(function (o) { return o.cat === c.id; }).length;
      return '<button class="st-cat' + (c.id === cat ? " on" : "") + '" data-cat="' + c.id + '" type="button">' + c.label + "<small>" + n + "</small></button>";
    }).join("");
  }

  function renderUnlock(a) {
    var box = $("stUnlock");
    if (a.ok) { box.hidden = true; return; }
    box.hidden = false;
    var left = Math.max(0, INSIDER_POSTS - a.posts);
    var pct = Math.min(100, Math.round((a.posts / INSIDER_POSTS) * 100));
    $("stProg").innerHTML =
      (a.signed
        ? "✍️ You’ve published " + a.posts + " of " + INSIDER_POSTS + " stories — " + (left ? left + " to go." : "unlocked!")
        : "Sign in first, then publish " + INSIDER_POSTS + " stories to unlock free.") +
      '<span class="st-prog__bar"><i id="stProgBar"></i></span>';
    setTimeout(function () { var b = $("stProgBar"); if (b) b.style.width = pct + "%"; }, 60);
  }

  /* ---------- reveal sheet ---------- */
  function openOffer(o) {
    closeOffer(true);
    var ov = document.createElement("div");
    ov.className = "st-ovl"; ov.id = "stOvl";
    var href = finalUrl(o);
    var aff = isAffiliate(o);
    ov.innerHTML =
      '<div class="st-modal" role="dialog" aria-modal="true" aria-label="' + esc(o.brand + " offer") + '">' +
        '<div class="st-modal__grab"></div>' +
        '<div class="st-modal__head">' + logoHTML(o) +
          "<div><b>" + esc(o.brand) + '</b><small><i></i>OFFICIAL · ' + esc(o.verified || DATA.verified).toUpperCase() + "</small></div>" +
          '<button class="st-modal__x" id="stX" type="button" aria-label="Close">✕</button>' +
        "</div>" +
        '<div class="st-modal__body">' +
          '<span class="st-val">' + esc(o.value) + "</span>" +
          '<h2 class="st-title">' + esc(o.title) + "</h2>" +
          '<p class="st-desc">' + esc(o.desc) + "</p>" +
          (o.worth ? '<div class="st-worth">💸 ' + esc(o.worth) + "<span>" + esc(o.tag) + "</span></div>" : "") +
          (o.code
            ? '<div class="st-codebox"><code>' + esc(o.code) + '</code><button id="stCopy" type="button">COPY</button></div>'
            : '<div class="st-nocode"><em>NO CODE NEEDED</em>Applied automatically on the ' + esc(o.brand) + " page — just follow the steps.</div>") +
          '<div class="st-lbl">HOW TO CLAIM</div>' +
          '<ol class="st-steps">' + o.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
          '<details class="st-tnc-wrap"><summary>TERMS &amp; CONDITIONS</summary>' +
            '<ul class="st-tnc">' + o.tnc.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" +
          "</details>" +
          '<p class="st-disc">This is an official program run by ' + esc(o.brand) + ". TheSmallBook is not affiliated with or endorsed by " + esc(o.brand) + "; brand names and logos belong to their owners. Eligibility (new user, student, city, account) is decided by the partner at checkout. " + esc(DATA.verified) + " — always confirm the offer in the partner app before paying anything.</p>" +
          (aff ? '<p class="st-disc" style="margin-top:8px;opacity:.75">🔗 Affiliate link — if you buy through this, we may earn a small commission at no extra cost to you. Keeps the library running 💛</p>' : "") +
        "</div>" +
        '<div class="st-modal__foot">' +
          '<a class="st-cta" href="' + esc(href) + '" target="_blank" rel="noopener nofollow"><img src="' + LOGO_DIR + esc(o.logo) + '" alt="">OPEN ' + esc(o.brand.toUpperCase()) + " →</a>" +
          '<a class="st-dead" href="https://wa.me/919702510680?text=' + encodeURIComponent("Hi! The store offer “" + o.title + "” seems dead — please refresh it.") + '" target="_blank" rel="noopener">Offer not working? Report it — we refresh monthly</a>' +
        "</div>" +
      "</div>";
    mountSheet(ov);
    if (o.code) $("stCopy").addEventListener("click", function () { copyText(o.code); });
    haptic();
  }

  function openNudge(o, a) {
    closeOffer(true);
    var left = Math.max(0, INSIDER_POSTS - (a ? a.posts : 0));
    var ov = document.createElement("div");
    ov.className = "st-ovl"; ov.id = "stOvl";
    ov.innerHTML =
      '<div class="st-modal" role="dialog" aria-modal="true">' +
        '<div class="st-modal__grab"></div>' +
        '<div class="st-nudge">' + logoHTML(o) +
          "<h2>" + esc(o.brand) + " is behind the shelf</h2>" +
          "<p>" + esc(o.value) + " — unlock the full store two ways: go Gold, or publish " + (a && a.signed ? left + " more " + (left === 1 ? "story" : "stories") : INSIDER_POSTS + " stories") + " and it’s free forever.</p>" +
          '<div class="st-nudge__btns"><a href="gold.html">💛 GET GOLD</a><a href="write.html">✍️ WRITE A STORY</a></div>' +
          '<button class="st-dead" id="stX" type="button" style="background:none;border:0;cursor:pointer;width:100%;margin-top:14px">Not now</button>' +
        "</div>" +
      "</div>";
    mountSheet(ov);
  }

  function mountSheet(ov) {
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
    ov.addEventListener("click", function (e) { if (e.target === ov) closeOffer(); });
    $("stX").addEventListener("click", function () { closeOffer(); });
    /* swipe-down to dismiss */
    var sy = 0, m = ov.querySelector(".st-modal");
    m.addEventListener("touchstart", function (e) { sy = e.touches[0].clientY; }, { passive: true });
    m.addEventListener("touchend", function (e) {
      var dy = e.changedTouches[0].clientY - sy;
      var body = m.querySelector(".st-modal__body");
      if (dy > 90 && (!body || body.scrollTop <= 0)) closeOffer();
    }, { passive: true });
  }

  function closeOffer(instant) {
    var ov = $("stOvl");
    if (!ov) return;
    document.body.style.overflow = "";
    if (instant || closing === ov) { ov.remove(); closing = null; return; }
    closing = ov;
    ov.classList.add("is-closing");
    setTimeout(function () { if (ov.parentNode) ov.remove(); if (closing === ov) closing = null; }, 200);
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeOffer(); });

  function copyText(t) {
    var done = function () { toast("📋 Code copied — paste it at checkout"); haptic(); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done).catch(done); return; }
    } catch (e) {}
    try {
      var ta = document.createElement("textarea");
      ta.value = t; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove(); done();
    } catch (e) { toast("Copy failed — long-press the code instead"); }
  }

  /* ---------- page ---------- */
  function onTap(e) {
    var card = e.target.closest("[data-id]");
    if (!card) return;
    var o = byId(card.getAttribute("data-id"));
    if (!o) return;
    if (card.classList.contains("st-card--lock")) { openNudge(o, accessCache); return; }
    openOffer(o);
  }

  async function init() {
    renderHeroBits();
    renderCats();
    var a = await access();

    if (a.via === "founder") {
      var rib = document.createElement("div");
      rib.className = "st-founder";
      rib.textContent = "👑 FOUNDER MODE — everything unlocked, forever free. Thank you for building this.";
      $("stHero").after(rib);
    }

    var cats = $("stCats");
    cats.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]");
      if (!b) return;
      cat = b.getAttribute("data-cat");
      cats.querySelectorAll(".st-cat").forEach(function (x) { x.classList.toggle("on", x === b); });
      renderGrid(accessCache);
      haptic();
      var g = $("stGrid"), top = g.getBoundingClientRect().top + window.pageYOffset - 120;
      if (window.pageYOffset > top) window.scrollTo({ top: top, behavior: "smooth" });
    });

    $("stGrid").addEventListener("click", onTap);
    $("stGrid").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap(e); } });
    var picks = $("stPicks"); if (picks) picks.addEventListener("click", onTap);

    $("stGoldBtn").addEventListener("click", function () { location.href = "gold.html"; });
    $("stWriteBtn").addEventListener("click", function () { location.href = "write.html"; });

    renderUnlock(a);
    renderPicks(a);
    renderGrid(a);

    /* deep link: store.html#offer=kindle-unlimited */
    var m = (location.hash || "").match(/offer=([a-z0-9-]+)/i);
    if (m) { var o = byId(m[1]); if (o && isOpen(o, a)) setTimeout(function () { openOffer(o); }, 350); }
  }

  window.TSB_STORE = { access: access, INSIDER_POSTS: INSIDER_POSTS, FREE_TEASERS: FREE_TEASERS, FOUNDER_EMAILS: FOUNDER_EMAILS, init: init, open: function (id) { var o = byId(id); if (o) openOffer(o); } };
})();
