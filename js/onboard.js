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
   books, eight minutes each.
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

  /* v341: setting up is a once-in-a-lifetime moment, not a per-update chore.
     A reader who has already told us their name, language, shelf and reading
     rhythm goes straight into the app on every future open and every future
     update. A new version may show a quiet "what is new" card, and that card
     never leads back into the four screens. */
  var OB_V = 389;
  function alreadySetUp() {
    try { if (get("tsb_onboarded", false)) return true; } catch (e) {}
    try {
      /* anyone who finished even a partial setup keeps it */
      if (get("tsb_starter_shelf", null) || get("tsb_read_minutes", null) || get("tsb_mind", null)) return true;
    } catch (e) {}
    return false;
  }
  var UPDATE = alreadySetUp() && (get("tsb_onboard_v", 0) || 0) < OB_V;
  /* the Open Leaf mark, inline so it is there before any image loads */
  var MARK = '<svg class="tsb-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path class="tsb-mark__a" d="M32 18c-6-5-13-6-20-6v34c7 0 14 1 20 6V18z"/><path class="tsb-mark__b" d="M32 18c6-5 13-6 20-6v34c-7 0-14 1-20 6V18z"/><path class="tsb-mark__sp" d="M32 18v34"/></svg>';
  function shouldShow() {
    try { if (sessionStorage.getItem("tsb_onboarded_pending")) { set("tsb_onboarded", true); set("tsb_onboard_v", OB_V); sessionStorage.removeItem("tsb_onboarded_pending"); } } catch (e) {}
    if ((get("tsb_onboard_v", 0) || 0) >= OB_V) return false;
    if (/404\.html|login\.html|story\.html|chat\.html|settings\.html|kids\.html/.test(location.pathname)) return false;
    if (/[?&]code=/.test(location.search)) return false;
    /* v347: a reader who has already set up is never sent back through the
       four questions. They get one card: what changed in this build. It is
       shown once, then remembered. */
    if (UPDATE) return true;
    /* an existing setup is never overwritten by a new build */
    if (alreadySetUp()) { set("tsb_onboarded", true); set("tsb_onboard_v", OB_V); return false; }
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
  /* v350: the welcome card gets a full shelf, not three books on a wide empty
     ground - five covers, overlapping, the middle one standing up */
  var UPBOOKS = ["psychology-of-money", "rich-dad-poor-dad", "atomic-habits", "deep-work", "48-laws-of-power"]
    .filter(function (id) { return !!byId(id); });
  var TOTAL = 5;   /* v349: the last new step explains what learns from you */
  /* v348: the first slide is always the news: what this build changed, in
     plain words. A brand new reader sees it once before the four questions,
     a reader who already set up sees only this card, once, and the app
     remembers. Nobody is ever walked through setup twice. */
  var hasNews = false;
  function total() { return updating ? 1 : (hasNews ? TOTAL + 1 : TOTAL); }

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

  var wrap = null, step = 0, busy = false, updating = false;

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
    var off = hasNews ? 1 : 0;
    var n = updating ? 2 : total();
    if (updating) i = Math.max(0, i - 1);
    else i = i + off;
    var h = '<div class="fo-dots" aria-hidden="true">';
    for (var k = 0; k < n; k++) h += '<i class="' + (k <= i ? "on" : "") + '"></i>';
    return h + "</div>";
  }
  function top(i) {
    var off = hasNews ? 1 : 0;
    var n = updating ? 1 : total();
    if (updating) i = 0;                 /* v349: a returning reader has one card, not a flow */
    else i = i + off;
    return '<div class="fo-top">' + (i > 0 ? '<button class="fo-back" type="button" data-back aria-label="Back">' + BACK + "</button>" : "<span></span>") + dots(i) + '<span class="fo-step">' + (i + 1) + " of " + n + "</span></div>";
  }
  function fanDims() {
    var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight || 800;
    if (h <= 470) return { w: 78, h: 117, cls: " fo-s1--xs" };
    if (h <= 620) return { w: 84, h: 126, cls: " fo-s1--sm fo-s1--dense" };
    if (h <= 800) return { w: 96, h: 144, cls: " fo-s1--sm" };
    return { w: 124, h: 186, cls: "" };
  }
  function bookEl(b, w, h, cls) {
    if (!b) return "";
    return '<span class="fo-book ' + (cls || "") + '" style="width:' + w + "px;height:" + h + 'px"><img src="' + esc(coverOf(b)) + '" alt="' + esc(b.title) + '" loading="eager" decoding="async"></span>';
  }
  function niceName() { return draft.name ? esc(draft.name) : ""; }
  /* v347: the space under the choices used to be empty. It now shows the
     first books this reader is about to own, and it answers every tap. */
  function miniHtml() {
    var picks = [];
    catsPicked().forEach(function (cat) {
      pool(cat).forEach(function (b) { if (picks.length < 3 && picks.indexOf(b) < 0) picks.push(b); });
    });
    if (!picks.length) {
      return '<div class="fo-mini__hint">Your shelf starts here. Pick one and it fills.</div>';
    }
    var names = draft.mind.slice(0, 3).join(", ");
    return '<div class="fo-mini__row">' + picks.map(function (b, k) {
      return bookEl(b, 48, 72, "fo-mini__b fo-mini__b" + k);
    }).join("") + "</div>" +
    '<div class="fo-mini__tx"><b>Your shelf starts here</b><span>' + esc(names || "Picked for you") + '</span></div>';
  }

  /* ---------- screens ---------- */
  var NEWS = [
    ['<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="17" y="12" width="4" height="9" rx="1"/>',
      "Listen is a room now", "Audiobooks, shows and podcasts in one place."],
    ['<path d="M12 3v18"/><path d="M5 8h14"/><path d="M5 16h14"/>',
      "It builds around you", "Your feed learns from every chapter you play."],
  ];
  function upLine() {
    var mind = [];
    try { var m = get("tsb_mind", null); if (Array.isArray(m)) mind = m; } catch (e) {}
    if (!mind.length) mind = draft.mind || [];
    var where = mind.length ? mind.slice(0, 2).join(" and ").toLowerCase() : "";
    return (where ? where.charAt(0).toUpperCase() + where.slice(1) + (mind.length > 1 ? " still lead" : " still leads") + " your shelf. " : "") +
      "Your notes and streak are safe, and nothing needs setting up again.";
  }
  function screen(i) {
    try { document.body.classList.toggle("fo-updating", !!updating); } catch (e) {}
    if (i === -1) {
      var upIds = UPBOOKS.slice(0, 5);
      while (upIds.length < 5) { var extra = FAN[upIds.length % FAN.length]; if (upIds.indexOf(extra) < 0) upIds.push(extra); else break; }
      var upBooks = upIds.map(function (id, k) { return bookEl(byId(id), 92, 138, "fo-upb fo-upb" + k); }).join("");
      return '<section class="fo-s fo-s0 fo-up fo-wlc">' +
        '<div class="lw__stage" aria-hidden="true">' +
          '<div class="lw__pips"><i></i><i></i><i></i></div>' +
          '<div class="lw__pip">' + (window.TSB_PIP ? TSB_PIP("pip--lg") : "") + "</div>" +
        "</div>" +
        '<div class="fo-upk">' + (updating ? "WHAT IS NEW IN " + esc(String(OB_V)) : "WELCOME TO THESMALLBOOK") + '</div>' +
        (total() > 1 ? '<div class="fo-upstep">1 of ' + total() + "</div>" : "") +
        (draft.name ? '<p class="fo-up-hi">Welcome back, ' + niceName() + ".</p>" : "") +
        '<h1 class="fo-h1">' + (updating ? "TheSmallBook,<br><i>made new.</i>" : "A small read.<br><i>A different year.</i>") + '</h1>' +
        '<div class="fo-news">' + NEWS.map(function (n, k) {
          return '<div class="fo-new" style="--i:' + k + '"><span class="fo-new__ic"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + n[0] + '</svg></span><span class="fo-new__t"><b>' + n[1] + "</b><span>" + n[2] + "</span></span></div>";
        }).join("") + "</div>" +
        '<p class="fo-p fo-p--safe">' + (updating ? upLine() : "The biggest ideas, in the smallest time you actually have.") + '</p>' +
        '<div class="fo-foot"><button class="fo-btn" type="button" data-next>' +
          (updating ? "Continue " + ARROW : "Let’s begin " + ARROW) + "</button>" +
        (updating ? '<button class="fo-tiny" type="button" data-restart>Set up again</button>' : "") +
        "</div></section>";
    }
    if (i === 0) {
      /* v345: the fan is built to the height of the phone it lands on, so a
         640px screen gets a 144px book and never has to scroll a welcome */
      var fd = fanDims();
      var fan = FAN.map(function (id, k) { return bookEl(byId(id), fd.w, fd.h, "fo-fan" + k); }).join("");
      return '<section class="fo-s fo-s1' + fd.cls + '">' + top(0) +
        '<div class="fo-fan fo-fan--pip"><span class="fo-fan__pip">' + (window.TSB_PIP ? TSB_PIP("pip--sm") : "") + "</span>" + fan + "</div>" +
        '<h1 class="fo-h1">Big books.<br><i>Small reads.</i></h1>' +
        '<p class="fo-p">The best books, told small. In English, Hindi and more.</p>' +
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
        '<div class="fo-foot"><button class="fo-btn" type="button" data-next' + (draft.mind.length ? "" : " data-dim") + ">Next</button>" +
          '<p class="fo-footnote">' + (draft.mind.length
            ? "Your shelf is built on the next step, not guessed at here."
            : "Pick at least one to go on.") + "</p></div></section>";
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
    if (i === 3) {
      /* v349 · the one screen that explains the machine, in plain words.
         Not branded, not hidden: the reader is told what is noticed and what
         is never done with it, before they answer anything else. */
      var KN = [
        ['<path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 12h8M8 16h5"/>',
         "Every chapter, every skip", "What you finish, what you abandon, what you save."],
        ['<path d="M4 5h16v11H8l-4 4z"/>', "What you write and send",
         "Notes, highlights and messages colour what comes back to you."],
        ['<path d="M12 3l7 4v6c0 4-3 6.6-7 8-4-1.4-7-4-7-8V7z"/><path d="M9 12l2 2 4-4"/>',
         "It never leaves your account", "Not sold, not shared, no advertising, ever."]
      ];
      return '<section class="fo-s fo-s5">' + top(3) +
        '<div class="fo-os" aria-hidden="true">' + MARK + '</div>' +
        '<h2 class="fo-h2">It starts<br><i>noticing.</i></h2>' +
        '<p class="fo-p fo-p--q">Nothing here is a form you have to keep filling in. The library reads how you actually use it, and quietly puts the right thing in front of you.</p>' +
        '<div class="fo-know">' + KN.map(function (k, n) {
          return '<div class="fo-know__r" style="--i:' + n + '"><span class="fo-know__ic"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + k[0] + '</svg></span><span class="fo-know__t"><b>' + k[1] + '</b><span>' + k[2] + '</span></span></div>';
        }).join("") + '</div>' +
        '<div class="fo-foot"><button class="fo-btn" type="button" data-next>Build my shelf ' + ARROW + '</button></div></section>';
    }
    var lead = byId(draft.picks[0]), rest = draft.picks.slice(1).map(function (id, k) { return slotHtml(byId(id), k + 1); }).join("");
    return '<section class="fo-s fo-s4 fo-s4b">' + top(4) +
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
  function goNews(dir) { step = -1; mount(-1, dir || "fwd"); }
  function next() {
    if (busy) return;
    if (step === -1) {
      set("tsb_onboard_draft", draft);
      /* v349: a reader who already set up gets the banner and nothing else.
         Setup is never repeated behind their back; the Settings page and the
         "Set up again" link are where they go if they want it. */
      if (updating) { save(); finish(); return; }
      step = 0; mount(step, "fwd"); return;
    }
    if (step === 0) {
      var n = wrap.querySelector("#foName"); draft.name = n ? n.value.trim().slice(0, 24) : "";
      if (draft.name) try { localStorage.setItem("tsb_reader_name", draft.name); } catch (e) {}
    }
    if (step === 1 && !draft.mind.length) { shake(".fo-chips"); return; }
    if (step === 2) draft.picks = buildShelf();
    if (step === 4) { finish(); return; }
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
    try { if (window.TSB_AUTH && TSB_AUTH.queueStateSync) TSB_AUTH.queueStateSync(); } catch (e) {}
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
      if ((t = e.target.closest("[data-restart]"))) { updating = false; wrap.classList.remove("fo--upd"); go(0, "fwd"); return; }
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
        var mi = wrap.querySelector("#foMini"); if (mi) { mi.classList.remove("fo-mini--in"); mi.innerHTML = miniHtml(); void mi.offsetWidth; mi.classList.add("fo-mini--in"); }
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
    updating = UPDATE;
    hasNews = updating || at === -1 || !alreadySetUp();
    wrap = build(); bind(); step = at || 0; mount(step, "fwd");
    if (updating) wrap.classList.add("fo--upd");
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
    /* every first open begins with the news card, then the four questions */
    open(-1);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
