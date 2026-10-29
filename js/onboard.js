/* ============================================================
   THESMALLBOOK: FIRST OPEN v326 (onboard.js)
   Built exactly like the redesign film: four calm screens.
     1 · Big books. Small reads.   name + the language you read in
     2 · What is on your mind?     up to three, plus read / listen
     3 · How long can you read?    a radial dial that snaps at 5,
                                   plus when in the day you read
     4 · Your shelf is ready       five real books drop onto a shelf,
                                   tap any book to swap it
   Every answer tunes the app (Today, Library, voice, language):
     tsb_reader_name · tsb_interests · tsb_ob_lead · tsb_mind
     tsb_read_minutes · tsb_read_style · tsb_read_when
     tsb_starter_shelf · tsb_lang (via TSB_LANG)
   Runs ONCE (tsb_onboarded). Signed-in readers never see it.
   520+ books, eight minutes each.
   ============================================================ */
(function () {
  "use strict";
  var mem = {};
  function get(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) {}
    return k in mem ? mem[k] : d;
  }
  function set(k, v) {
    mem[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* v331: onboarding is versioned. Everyone, new or returning, signed in or
     not, sets the app up once per big update. Returning readers first see a
     short "new update" card, then the same four screens, prefilled. */
  var OB_V = 331;
  var UPDATE = !!get("tsb_onboarded", false) && (get("tsb_onboard_v", 0) || 0) < OB_V;
  function shouldShow() {
    try { if (sessionStorage.getItem("tsb_onboarded_pending")) { set("tsb_onboarded", true); set("tsb_onboard_v", OB_V); sessionStorage.removeItem("tsb_onboarded_pending"); } } catch (e) {}
    if ((get("tsb_onboard_v", 0) || 0) >= OB_V) return false;
    /* a signed-in reader still owes the profile step first (auth.js sends them there) */
    try {
      var s = JSON.parse(localStorage.getItem("tsb_auth_session"));
      var md = s && s.user && s.user.user_metadata;
      if (s && s.user && !(md && md.username && md.birth_year && md.profile_v331)) return false;
    } catch (e) {}
    if (/404\.html|login\.html|story\.html|chat\.html|settings\.html|kids\.html/.test(location.pathname)) return false;
    if (/[?&]code=/.test(location.search)) return false;
    return true;
  }

  /* ---------- the four questions, each mapped to a real shelf ---------- */
  var MIND = [
    { t: "Focus", c: "#6F5BD9", cat: "Productivity" },
    { t: "Money", c: "#2F7D5B", cat: "Money & Finance" },
    { t: "Habits", c: "#FFC800", cat: "Self-Improvement" },
    { t: "People", c: "#FFA9CC", cat: "Psychology & People" },
    { t: "Career", c: "#1F3A5F", cat: "Business & Startups" },
    { t: "Strategy", c: "#7A1C24", cat: "Power & Strategy" },
    { t: "Ideas", c: "#FF7A59", cat: "Creativity" },
    { t: "History", c: "#A67C52", cat: "History" }
  ];
  var LANGS = [["en", "English"], ["hi", "हिन्दी"], ["mr", "मराठी"], ["gu", "ગુજરાતી"], ["bn", "বাংলা"], ["ta", "தமிழ்"]];
  var MODES = [["steady", "Read"], ["listen", "Listen"], ["both", "Both"]];
  var WHEN = [["morning", "Morning chai"], ["commute", "On the way"], ["lunch", "Lunch break"], ["night", "Before bed"]];
  var WORDS = { 5: "Five", 10: "Ten", 15: "Fifteen", 20: "Twenty", 25: "Twenty-five", 30: "Thirty" };
  var FAN = ["psychology-of-money", "atomic-habits", "deep-work"];
  var TOTAL = 4;

  var draft = get("tsb_onboard_draft", null) || {};
  if (!draft || typeof draft !== "object") draft = {};
  draft.name = draft.name || (function () { try { var n = localStorage.getItem("tsb_reader_name") || ""; n = n.replace(/^"|"$/g, ""); return n === "Guest Reader" ? "" : n; } catch (e) { return ""; } })();
  draft.lang = draft.lang || (window.TSB_LANG && TSB_LANG.get ? TSB_LANG.get() : "en");
  draft.mind = Array.isArray(draft.mind) ? draft.mind.slice(0, 3) : [];
  draft.style = draft.style || "steady";
  draft.minutes = draft.minutes || 10;
  draft.when = draft.when || "night";
  draft.picks = Array.isArray(draft.picks) ? draft.picks : [];
  if (UPDATE) {
    try {
      var pm = get("tsb_mind", null); if (Array.isArray(pm) && pm.length && !draft.mind.length) draft.mind = pm.slice(0, 3);
      draft.minutes = get("tsb_read_minutes", draft.minutes) || draft.minutes;
      draft.style = get("tsb_read_style", draft.style) || draft.style;
      draft.when = get("tsb_read_when", draft.when) || draft.when;
    } catch (e) {}
  }

  var wrap = null, step = 0, busy = false;

  /* ---------- books ---------- */
  function books() { return window.BOOKS || []; }
  function byId(id) { var a = books(); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function coverOf(b) { return b && b.cover ? b.cover : "assets/covers/" + (b ? b.id : "") + ".jpg"; }
  function mins(b) { var m = parseInt(b && b.readTime, 10); return isNaN(m) ? 10 : m; }
  function countFor(cat) { var n = 0; books().forEach(function (b) { if (b.category === cat) n++; }); return n; }
  function catsPicked() {
    var out = [];
    draft.mind.forEach(function (t) { MIND.forEach(function (m) { if (m.t === t && out.indexOf(m.cat) < 0) out.push(m.cat); }); });
    if (!out.length) out = ["Self-Improvement", "Productivity", "Money & Finance"];
    return out;
  }
  function pool(cat) {
    /* the library order is already curated; nudge books that fit the daily budget forward */
    var list = books().filter(function (b) { return b.category === cat; });
    var cap = draft.minutes + 4;
    return list.filter(function (b) { return mins(b) <= cap; }).concat(list.filter(function (b) { return mins(b) > cap; }));
  }
  /* v329: our own books (credited Unknown) are TheSmallBook Originals */
  var NORM = { "Business": "Business & Startups", "Leadership": "Business & Startups", "Finance": "Money & Finance", "Economics": "Money & Finance", "Mindset": "Self-Improvement", "Psychology": "Psychology & People" };
  function catOf(b) { return b ? (NORM[b.category] || b.category) : ""; }
  function isOrig(b) {
    if (!b) return false;
    try { if (((window.TSB_CONFIG && TSB_CONFIG.ORIGINALS) || []).indexOf(b.id) >= 0) return true; } catch (e) {}
    return /^unknown$/i.test(b.author || "");
  }
  function whyOf(b) {
    if (isOrig(b)) return { t: "Original", c: "#FFC800" };
    var c = catOf(b), hit = null;
    MIND.forEach(function (m) { if (!hit && m.cat === c) hit = m; });
    return hit ? { t: hit.t, c: hit.c } : { t: "Wildcard", c: "#857C6E" };
  }
  function origPool() {
    var cats = catsPicked(), all = books().filter(isOrig);
    return all.filter(function (b) { return cats.indexOf(catOf(b)) >= 0; }).concat(all.filter(function (b) { return cats.indexOf(catOf(b)) < 0; }));
  }
  function buildShelf() {
    var four = buildShelfReal().filter(function (id) { return !isOrig(byId(id)); }).slice(0, 4);
    var o = origPool().filter(function (b) { return four.indexOf(b.id) < 0; })[0];
    if (o) four.splice(3, 0, o.id);
    return four.slice(0, 5);
  }
  function buildShelfReal() {
    var cats = catsPicked(), pools = cats.map(pool), out = [], seen = {}, guard = 0;
    while (out.length < 6 && guard < 60) {
      var p = pools[guard % pools.length], b = null;
      while (p.length && !b) { var c = p.shift(); if (!seen[c.id]) b = c; }
      if (b) { seen[b.id] = 1; out.push(b.id); }
      guard++;
    }
    books().forEach(function (b) { if (out.length < 5 && !seen[b.id]) { seen[b.id] = 1; out.push(b.id); } });
    return out;
  }
  function swapPick(i) {
    var cur = byId(draft.picks[i]); if (!cur) return null;
    var list = isOrig(cur) ? origPool() : pool(cur.category).filter(function (b) { return !isOrig(b); }), taken = {};
    draft.picks.forEach(function (id) { taken[id] = 1; });
    var at = 0; for (var k = 0; k < list.length; k++) if (list[k].id === cur.id) at = k;
    for (var j = 1; j <= list.length; j++) { var nb = list[(at + j) % list.length]; if (!taken[nb.id]) return nb.id; }
    return null;
  }

  /* ---------- tiny icons ---------- */
  var ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var BACK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var SPARK = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>';
  var SWAP = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h13l-3-3M20 17H7l3 3"/></svg>';

  function dots(i) {
    var h = '<div class="fo-dots" aria-hidden="true">';
    for (var k = 0; k < TOTAL; k++) h += '<i class="' + (k <= i ? "on" : "") + '"></i>';
    return h + "</div>";
  }
  function top(i) {
    return '<div class="fo-top">' + (i > 0 ? '<button class="fo-back" type="button" data-back aria-label="Back">' + BACK + "</button>" : "<span></span>") + dots(i) + '<span class="fo-step">' + (i + 1) + " of " + TOTAL + "</span></div>";
  }
  function bookEl(b, w, h, cls) {
    if (!b) return "";
    return '<span class="fo-book ' + (cls || "") + '" style="width:' + w + "px;height:" + h + 'px"><img src="' + esc(coverOf(b)) + '" alt="' + esc(b.title) + '" loading="eager" decoding="async"></span>';
  }
  function niceName() { return draft.name ? esc(draft.name) : ""; }

  /* ---------- screens ---------- */
  var NEWS = [
    ['<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/>', "A new Listen room", "Real show art, and the words as they are read."],
    ['<rect x="3" y="15" width="18" height="6" rx="3"/><path d="M7 18h.01M12 18h.01M17 18h.01M12 3v8M8 7l4-4 4 4"/>', "Your own action bar", "Your buttons, set in two taps."],
    ['<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>', "Share in one tap", "WhatsApp, Instagram or a link."],
    ['<path d="M12 2l3 6.5 7 .8-5.2 4.7 1.5 6.9L12 17.5 5.7 20.9l1.5-6.9L2 9.3l7-.8z"/>', "Gold, made real", "Natural voices and every Gold tool."]
  ];
  function screen(i) {
    if (i === -1) {
      var upBooks = FAN.map(function (id, k) { return bookEl(byId(id), 92, 138, "fo-upb fo-upb" + k); }).join("");
      return '<section class="fo-s fo-s0 fo-up">' +
        '<div class="fo-up-sky" aria-hidden="true"><i></i><i></i></div>' +
        '<div class="fo-up-books" aria-hidden="true">' + upBooks + "</div>" +
        '<div class="fo-upk">NEW UPDATE</div>' +
        (draft.name ? '<p class="fo-up-hi">Welcome back, ' + niceName() + ".</p>" : "") +
        '<h1 class="fo-h1">TheSmallBook,<br><i>made new.</i></h1>' +
        '<div class="fo-news">' + NEWS.map(function (n, k) {
          return '<div class="fo-new" style="--i:' + k + '"><span class="fo-new__ic"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + n[0] + '</svg></span><span class="fo-new__t"><b>' + n[1] + "</b><span>" + n[2] + "</span></span></div>";
        }).join("") + "</div>" +
        '<p class="fo-p fo-p--safe">Your books, notes and streak are safe. Thirty seconds to set up' + (draft.name ? ", your name is already in." : ".") + '</p>' +
        '<div class="fo-foot"><button class="fo-btn" type="button" data-next>Set up again ' + ARROW + "</button></div></section>";
    }
    if (i === 0) {
      var fan = FAN.map(function (id, k) { return bookEl(byId(id), 124, 186, "fo-fan" + k); }).join("");
      return '<section class="fo-s fo-s1">' + top(0) +
        '<div class="fo-fan">' + fan + "</div>" +
        '<h1 class="fo-h1">Big books.<br><i>Small reads.</i></h1>' +
        '<p class="fo-p">520+ books, eight minutes each. In English, Hindi and more.</p>' +
        '<label class="fo-lab" for="foName">WHAT SHOULD WE CALL YOU?</label>' +
        '<input class="fo-in" id="foName" type="text" maxlength="24" autocomplete="given-name" placeholder="Your first name" value="' + esc(draft.name) + '">' +
        '<div class="fo-lab fo-lab--sm">I READ IN</div>' +
        '<div class="fo-langs" role="radiogroup" aria-label="Reading language">' + LANGS.map(function (l) {
          return '<button type="button" class="fo-pill' + (draft.lang === l[0] ? " on" : "") + '" data-lang="' + l[0] + '" role="radio" aria-checked="' + (draft.lang === l[0]) + '" translate="no">' + l[1] + "</button>";
        }).join("") + '<button type="button" class="fo-pill fo-pill--more" data-more>More</button></div>' +
        '<div class="fo-foot"><button class="fo-btn" type="button" data-next>Start reading ' + ARROW + "</button>" +
        '</div></section>';
    }
    if (i === 1) {
      return '<section class="fo-s fo-s2">' + top(1) +
        '<h2 class="fo-h2">What is on your<br>mind' + (draft.name ? ", " + niceName() : "") + "?</h2>" +
        '<p class="fo-p fo-p--q">Pick up to three.</p>' +
        '<div class="fo-chips">' + MIND.map(function (m) {
          var on = draft.mind.indexOf(m.t) >= 0;
          return '<button type="button" class="fo-chip' + (on ? " on" : "") + '" data-mind="' + m.t + '" aria-pressed="' + on + '"><span class="fo-dot" style="background:' + m.c + '"></span><span class="fo-chip__t">' + m.t + '<small>' + countFor(m.cat) + " books</small></span><span class=\"fo-ck\">" + CHECK + "</span></button>";
        }).join("") + "</div>" +
        '<div class="fo-lab fo-lab--sm">I LIKE TO</div>' +
        '<div class="fo-seg" role="radiogroup" aria-label="Read or listen">' + MODES.map(function (m) {
          return '<button type="button" class="' + (draft.style === m[0] ? "on" : "") + '" data-style="' + m[0] + '" role="radio" aria-checked="' + (draft.style === m[0]) + '">' + m[1] + "</button>";
        }).join("") + "</div>" +
        '<div class="fo-foot"><button class="fo-btn" type="button" data-next' + (draft.mind.length ? "" : " data-dim") + ">Next</button></div></section>";
    }
    if (i === 2) {
      var DS = 280, R = 112, ticks = "";
      for (var k = 0; k < 6; k++) {
        var a = (k / 6) * Math.PI * 2 - Math.PI / 2;
        ticks += '<text x="' + (DS / 2 + Math.cos(a) * 136).toFixed(1) + '" y="' + (DS / 2 + Math.sin(a) * 136 + 4).toFixed(1) + '" text-anchor="middle">' + ((k + 1) * 5) + "</text>";
      }
      var circ = 2 * Math.PI * R;
      return '<section class="fo-s fo-s3">' + top(2) +
        '<h2 class="fo-h2">How long can you<br>read a day?</h2>' +
        '<div class="fo-dial" id="foDial" role="slider" tabindex="0" aria-label="Minutes a day" aria-valuemin="5" aria-valuemax="30" aria-valuenow="' + draft.minutes + '">' +
          '<svg viewBox="0 0 ' + DS + " " + DS + '" width="' + DS + '" height="' + DS + '">' + ticks +
          '<circle cx="140" cy="140" r="' + R + '" class="fo-track"/>' +
          '<circle cx="140" cy="140" r="' + R + '" class="fo-arc" stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' + circ.toFixed(2) + '" transform="rotate(-90 140 140)"/></svg>' +
          '<span class="fo-knob"></span><span class="fo-num">' + draft.minutes + '</span><span class="fo-unit">MINUTES A DAY</span></div>' +
        '<div class="fo-year" aria-live="polite"></div>' +
        '<div class="fo-lab fo-lab--sm fo-lab--c">WHEN DO YOU READ?</div>' +
        '<div class="fo-when">' + WHEN.map(function (w) {
          return '<button type="button" class="fo-pill' + (draft.when === w[0] ? " on" : "") + '" data-when="' + w[0] + '">' + w[1] + "</button>";
        }).join("") + "</div>" +
        '<div class="fo-foot"><button class="fo-btn" type="button" data-next>Build my shelf</button></div></section>';
    }
    var lead = byId(draft.picks[0]), rest = draft.picks.slice(1).map(function (id, k) { return slotHtml(byId(id), k + 1); }).join("");
    return '<section class="fo-s fo-s4 fo-s4b">' + top(3) +
      '<h2 class="fo-h2">Your shelf is<br>ready' + (draft.name ? ", <i>" + niceName() + ".</i>" : ".") + "</h2>" +
      '<p class="fo-p fo-p--q">' + esc(summary()) + "</p>" +
      '<div class="fo-lead" data-slot="0">' + leadHtml(lead) + "</div>" +
      '<div class="fo-list"><div class="fo-listk">Then, one a day</div>' + rest + "</div>" +
      '<div class="fo-foot"><button class="fo-btn" type="button" data-next>Open my library</button></div></section>';
  }
  function authorOf(b) { return isOrig(b) ? "Written by us" : (b.author || ""); }
  function chip(b) {
    var w = whyOf(b);
    return '<span class="fo-why' + (w.t === "Original" ? " fo-why--o" : "") + '" style="--c:' + w.c + '">' + (w.t === "Original" ? SPARK.replace('width="30" height="30"', 'width="11" height="11"') : "<i></i>") + esc(w.t) + "</span>";
  }
  function leadHtml(b) {
    if (!b) return "";
    return '<button type="button" class="fo-leadbk" data-swap="0" aria-label="Swap ' + esc(b.title) + '">' + bookEl(b, 104, 156, "fo-bk3") + "</button>" +
      '<div class="fo-leadtx"><div class="fo-leadk">Start here, today</div>' +
      '<div class="fo-leadt">' + esc(b.title) + "</div>" +
      '<div class="fo-leada">' + esc(authorOf(b)) + "</div>" +
      '<div class="fo-leadm">' + chip(b) + '<span class="fo-min">' + mins(b) + " min</span></div>" +
      '<button type="button" class="fo-swap fo-swap--t" data-swap="0">' + SWAP + " Swap</button></div>";
  }
  function slotHtml(b, k) {
    if (!b) return "";
    return '<div class="fo-row' + (isOrig(b) ? " fo-row--o" : "") + '" data-slot="' + k + '" style="--i:' + k + '">' +
      bookEl(b, 40, 60, "fo-rowbk") +
      '<div class="fo-rowtx"><b>' + esc(b.title) + "</b><span>" + esc(authorOf(b)) + " · " + mins(b) + " min</span></div>" + chip(b) +
      '<button type="button" class="fo-swap" data-swap="' + k + '" aria-label="Swap ' + esc(b.title) + '">' + SWAP + "</button></div>";
  }
  function summary() {
    var t = draft.mind.map(function (x) { return x.toLowerCase(); });
    var lead = t.length ? (t.length === 1 ? t[0] : t.slice(0, -1).join(", ") + " and " + t[t.length - 1]) : "a little of everything";
    lead = lead.charAt(0).toUpperCase() + lead.slice(1);
    var when = { morning: "with your morning chai", commute: "on the way", lunch: "at lunch", night: "before bed" }[draft.when] || "";
    return lead + ". " + (WORDS[draft.minutes] || draft.minutes) + " minutes a day" + (when ? ", " + when : "") + ".";
  }

  /* ---------- dial ---------- */
  function paintDial(m, live) {
    var d = wrap && wrap.querySelector("#foDial"); if (!d) return;
    var R = 112, circ = 2 * Math.PI * R, frac = m / 30;
    d.querySelector(".fo-arc").style.strokeDashoffset = (circ * (1 - frac)).toFixed(2);
    var a = frac * Math.PI * 2 - Math.PI / 2, s = d.getBoundingClientRect().width / 280 || 1;
    var k = d.querySelector(".fo-knob");
    k.style.transform = "translate(" + ((140 + Math.cos(a) * R) * s).toFixed(1) + "px," + ((140 + Math.sin(a) * R) * s).toFixed(1) + "px)";
    var n = d.querySelector(".fo-num");
    if (n.textContent !== String(m)) { n.textContent = m; n.classList.remove("bump"); void n.offsetWidth; n.classList.add("bump"); if (live && navigator.vibrate) try { navigator.vibrate(6); } catch (e) {} }
    d.setAttribute("aria-valuenow", m);
    var y = wrap.querySelector(".fo-year");
    if (y) y.innerHTML = "That is about <b>" + Math.round(m * 365 / 80) + " books</b> a year";
  }
  function bindDial() {
    var d = wrap.querySelector("#foDial"); if (!d) return;
    var drag = false;
    function at(e) {
      var r = d.getBoundingClientRect(), x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      var ang = Math.atan2(y, x) + Math.PI / 2; if (ang < 0) ang += Math.PI * 2;
      var m = Math.round((ang / (Math.PI * 2)) * 30 / 5) * 5;
      if (m < 5) m = draft.minutes >= 20 ? 30 : 5;
      if (m !== draft.minutes) { draft.minutes = m; paintDial(m, true); }
    }
    d.addEventListener("pointerdown", function (e) { drag = true; d.classList.add("drag"); try { d.setPointerCapture(e.pointerId); } catch (x) {} at(e); });
    d.addEventListener("pointermove", function (e) { if (drag) at(e); });
    function up() { drag = false; d.classList.remove("drag"); set("tsb_onboard_draft", draft); }
    d.addEventListener("pointerup", up); d.addEventListener("pointercancel", up);
    d.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { draft.minutes = Math.min(30, draft.minutes + 5); paintDial(draft.minutes, true); e.preventDefault(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { draft.minutes = Math.max(5, draft.minutes - 5); paintDial(draft.minutes, true); e.preventDefault(); }
    });
    /* the arc sweeps in from zero, like the film */
    var from = 0, t0 = 0, to = draft.minutes;
    function sweep(ts) {
      if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / 700), e = 1 - Math.pow(1 - k, 4);
      var R = 112, circ = 2 * Math.PI * R, f = (from + (to - from) * e) / 30;
      d.querySelector(".fo-arc").style.strokeDashoffset = (circ * (1 - f)).toFixed(2);
      if (k < 1) requestAnimationFrame(sweep); else paintDial(draft.minutes);
    }
    paintDial(draft.minutes);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) requestAnimationFrame(sweep);
  }

  /* ---------- flow ---------- */
  function mount(i, dir) {
    var col = wrap.querySelector(".fo-col");
    var old = col.querySelector(".fo-s");
    var tmp = document.createElement("div");
    tmp.innerHTML = screen(i);
    var el = tmp.firstChild;
    el.classList.add(dir === "back" ? "in-back" : "in");
    if (old) { old.classList.add(dir === "back" ? "out-back" : "out"); setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 340); }
    col.appendChild(el);
    busy = true;
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove("in", "in-back"); }); });
    setTimeout(function () { busy = false; }, 360);
    if (i === 2) setTimeout(bindDial, 30);
    if (i === 0) { var n = el.querySelector("#foName"); if (n && !("ontouchstart" in window)) setTimeout(function () { try { n.focus({ preventScroll: true }); } catch (e) {} }, 420); }
    if (i === 3) el.classList.add("build");
    if (i === 0) tiltFan(el);
    wrap.scrollTop = 0;
  }
  /* v330: the three books lean toward the finger (or the phone's tilt) */
  function tiltFan(sec) {
    var fan = sec.querySelector(".fo-fan");
    if (!fan || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    var set = function (x, y) { fan.style.setProperty("--fx", (x * 14).toFixed(1) + "deg"); fan.style.setProperty("--fy", (-y * 10).toFixed(1) + "deg"); };
    sec.addEventListener("pointermove", function (e) { set(e.clientX / window.innerWidth - .5, e.clientY / window.innerHeight - .5); });
    sec.addEventListener("pointerleave", function () { set(0, 0); });
    window.addEventListener("deviceorientation", function (e) {
      if (!fan.isConnected || e.gamma == null) return;
      set(Math.max(-1, Math.min(1, e.gamma / 30)) / 2, Math.max(-1, Math.min(1, (e.beta - 45) / 30)) / 2);
    });
  }
  function go(i, dir) { step = Math.max(0, Math.min(TOTAL - 1, i)); set("tsb_onboard_draft", draft); mount(step, dir); }
  function next() {
    if (busy) return;
    if (step === -1) { step = 0; set("tsb_onboard_draft", draft); mount(0, "fwd"); return; }
    if (step === 0) {
      var n = wrap.querySelector("#foName"); draft.name = n ? n.value.trim().slice(0, 24) : "";
      if (draft.name) try { localStorage.setItem("tsb_reader_name", draft.name); } catch (e) {}
    }
    if (step === 1 && !draft.mind.length) { shake(".fo-chips"); return; }
    if (step === 2) draft.picks = buildShelf();
    if (step === 3) { finish(); return; }
    go(step + 1, "fwd");
  }
  function shake(sel) {
    var g = wrap.querySelector(sel); if (!g) return;
    g.classList.remove("fo-shake"); void g.offsetWidth; g.classList.add("fo-shake");
  }
  function save() {
    var cats = catsPicked();
    set("tsb_onboard_draft", draft);
    set("tsb_onboarded", true);
    set("tsb_onboard_v", OB_V);
    set("tsb_walk_done", window.TSB_BUILD || "331");
    set("tsb_tour_done", true);
    set("tsb_interests", cats);
    set("tsb_ob_lead", cats[0]);
    set("tsb_mind", draft.mind);
    set("tsb_read_minutes", draft.minutes);
    set("tsb_read_style", draft.style);
    set("tsb_read_when", draft.when);
    set("tsb_starter_shelf", draft.picks.length ? draft.picks : buildShelf());
    if (!get("tsb_trial_start", 0)) set("tsb_trial_start", Date.now());
    if (draft.name) try { localStorage.setItem("tsb_reader_name", draft.name); } catch (e) {}
  }
  function finish() {
    save();
    var curLang = window.TSB_LANG && TSB_LANG.get ? TSB_LANG.get() : "en";
    var btn = wrap.querySelector("[data-next]"); if (btn) btn.classList.add("press");
    wrap.classList.add("fo--leave");
    document.documentElement.classList.remove("fo-lock");
    try { window.dispatchEvent(new CustomEvent("tsb:onboarded", { detail: { picks: draft.picks, mind: draft.mind } })); } catch (e) {}
    setTimeout(function () {
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      wrap = null;
      if (draft.lang && draft.lang !== curLang && window.TSB_LANG && TSB_LANG.select) TSB_LANG.select(draft.lang);
    }, 460);
  }
  function dismiss(mark) {
    if (mark) { set("tsb_onboarded", true); set("tsb_onboard_v", OB_V); }
    if (!wrap) return;
    var w = wrap; wrap = null;
    w.classList.add("fo--leave");
    document.documentElement.classList.remove("fo-lock");
    setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 460);
  }
  function moreLangs(btn) {
    var list = (window.TSB_LANG && TSB_LANG.list) || [];
    var sel = document.createElement("select");
    sel.className = "fo-langsel"; sel.setAttribute("aria-label", "All languages");
    sel.innerHTML = list.map(function (l) { return '<option value="' + esc(l.code) + '"' + (l.code === draft.lang ? " selected" : "") + ">" + esc(l.name) + (l.special ? "" : " · " + esc(l.native)) + "</option>"; }).join("");
    btn.replaceWith(sel);
    sel.addEventListener("change", function () {
      draft.lang = sel.value;
      wrap.querySelectorAll("[data-lang]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-lang") === draft.lang); b.setAttribute("aria-checked", b.getAttribute("data-lang") === draft.lang); });
    });
    try { sel.focus(); if (sel.showPicker) sel.showPicker(); } catch (e) {}
  }
  function bind() {
    wrap.addEventListener("click", function (e) {
      var t;
      if ((t = e.target.closest("[data-next]"))) { next(); return; }
      if ((t = e.target.closest("[data-back]"))) { if (!busy && step > 0) go(step - 1, "back"); return; }
      if ((t = e.target.closest("[data-kids]"))) { e.preventDefault(); draft.name = (wrap.querySelector("#foName") || {}).value || draft.name; save(); try { localStorage.setItem("tsb_kids_mode", "1"); } catch (x) {} location.href = "kids.html"; return; }
      if ((t = e.target.closest("[data-more]"))) { moreLangs(t); return; }
      if ((t = e.target.closest("[data-lang]"))) {
        draft.lang = t.getAttribute("data-lang");
        wrap.querySelectorAll("[data-lang]").forEach(function (b) { b.classList.toggle("on", b === t); b.setAttribute("aria-checked", b === t); });
        var s = wrap.querySelector(".fo-langsel"); if (s) s.value = draft.lang;
        return;
      }
      if ((t = e.target.closest("[data-mind]"))) {
        var m = t.getAttribute("data-mind"), at = draft.mind.indexOf(m);
        if (at >= 0) draft.mind.splice(at, 1);
        else if (draft.mind.length >= 3) { t.classList.remove("fo-no"); void t.offsetWidth; t.classList.add("fo-no"); return; }
        else draft.mind.push(m);
        t.classList.toggle("on", at < 0); t.setAttribute("aria-pressed", at < 0);
        t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop");
        var nb = wrap.querySelector("[data-next]"); if (nb) { if (draft.mind.length) nb.removeAttribute("data-dim"); else nb.setAttribute("data-dim", ""); }
        set("tsb_onboard_draft", draft);
        return;
      }
      if ((t = e.target.closest("[data-style]"))) {
        draft.style = t.getAttribute("data-style");
        wrap.querySelectorAll("[data-style]").forEach(function (b) { b.classList.toggle("on", b === t); b.setAttribute("aria-checked", b === t); });
        return;
      }
      if ((t = e.target.closest("[data-when]"))) {
        draft.when = t.getAttribute("data-when");
        wrap.querySelectorAll("[data-when]").forEach(function (b) { b.classList.toggle("on", b === t); });
        return;
      }
      if ((t = e.target.closest("[data-swap]"))) {
        var i = Number(t.getAttribute("data-swap")), nid = swapPick(i);
        if (!nid) return;
        draft.picks[i] = nid;
        var b = byId(nid), slot = wrap.querySelector('[data-slot="' + i + '"]');
        if (slot && b) {
          slot.classList.remove("swapin"); slot.classList.add("swapout");
          setTimeout(function () {
            slot.innerHTML = i === 0 ? leadHtml(b) : slotHtml(b, i).replace(/^<div[^>]*>/, "").replace(/<\/div>$/, "");
            if (i > 0) slot.classList.toggle("fo-row--o", isOrig(b));
            slot.classList.remove("swapout"); void slot.offsetWidth; slot.classList.add("swapin");
          }, 170);
        }
        set("tsb_onboard_draft", draft);
      }
    });
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target && (e.target.id === "foName")) { e.preventDefault(); next(); }
    });
  }
  function build() {
    var w = document.createElement("div");
    w.className = "fo";
    w.setAttribute("role", "dialog");
    w.setAttribute("aria-modal", "true");
    w.setAttribute("aria-label", "Welcome to TheSmallBook");
    w.innerHTML = '<div class="fo-col"></div>';
    document.body.appendChild(w);
    document.documentElement.classList.add("fo-lock");
    return w;
  }
  function open(at) {
    if (wrap) return;
    wrap = build(); bind(); step = at || 0; mount(step, "fwd");
    if (step === -1) wrap.classList.add("fo--upd");
  }

  /* live re-tune from You and Settings (no reload) */
  window.TSB_ONBOARD = {
    start: function () {
      try {
        var mind = get("tsb_mind", null); if (Array.isArray(mind) && mind.length) draft.mind = mind.slice(0, 3);
        draft.minutes = get("tsb_read_minutes", draft.minutes) || 10;
        draft.style = get("tsb_read_style", draft.style) || "steady";
        draft.when = get("tsb_read_when", draft.when) || "night";
      } catch (e) {}
      open(0);
    },
    summary: summary,
    mind: MIND,
    dismiss: dismiss
  };

  function boot() {
    if (!shouldShow()) return;
    open(UPDATE ? -1 : 0);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
