/* ============================================================
   THESMALLBOOK — 🎯 ONBOARDING v2 (onboard2.js)
   7 steps, ~45 seconds, and EVERY answer changes the app.

   Stored in tsb_prefs_v2 and consumed by:
     - the feed (topic weighting + tone)
     - Lesson of the Day (length + depth)
     - theme (night readers default to dark)
     - language (whole app)
     - the reveal: a real scoring pass over all 350 books

   Replaces js/onboard.js. Skippable at every step — skipping
   just uses sane defaults, never a wall.
   ============================================================ */
(function () {
  "use strict";
  if (window.TSB_ONBOARD2) return;

  var KEY   = "tsb_prefs_v2";
  var DONE  = "tsb_onboarded_v2";
  var LEGACY = "tsb_onboarded";

  /* storage that survives private mode / sandboxed previews */
  var mem = {};
  function get(k, d) {
    try { var v = JSON.parse(localStorage.getItem(k)); if (v != null) return v; } catch (e) {}
    try { var v2 = JSON.parse(sessionStorage.getItem(k)); if (v2 != null) return v2; } catch (e) {}
    return k in mem ? mem[k] : d;
  }
  function set(k, v) {
    mem[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ---------- when to run ---------- */
  function shouldShow() {
    if (get(DONE, false)) return false;
    if (get(LEGACY, false)) { set(DONE, true); return false; }   /* v1 users are not re-asked */
    try { if (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) return false; } catch (e) {}
    if (/404\.html|login\.html|signin\.html|story\.html|scan\.html/.test(location.pathname)) return false;
    if (/[?&]code=/.test(location.search)) return false;
    var ua = navigator.userAgent || "";
    if (/bot|crawl|spider|slurp|lighthouse|headlesschrome/i.test(ua)) return false;
    return true;
  }

  /* ============================================================
     THE QUESTIONS
     ============================================================ */
  var MOODS = [
    { id: "stuck",    emoji: "\uD83E\uDDF1", label: "Stuck",     sub: "Something isn't moving" },
    { id: "curious",  emoji: "\uD83D\uDD0D", label: "Curious",   sub: "Just here to learn" },
    { id: "building", emoji: "\uD83D\uDE80", label: "Building",  sub: "Working on something" },
    { id: "healing",  emoji: "\uD83E\uDEB7", label: "Healing",   sub: "Going through it" },
    { id: "winning",  emoji: "\uD83C\uDFC6", label: "Winning",   sub: "Want the edge" }
  ];

  var TOPICS = [
    { id: "money",        emoji: "\uD83D\uDCB0", label: "Money",        cats: ["Money & Finance"] },
    { id: "habits",       emoji: "\u26A1",       label: "Habits",       cats: ["Self-Improvement", "Productivity"] },
    { id: "business",     emoji: "\uD83D\uDCBC", label: "Business",     cats: ["Business & Startups"] },
    { id: "mind",         emoji: "\uD83E\uDDE0", label: "Mindset",      cats: ["Psychology & People", "Self-Improvement"] },
    { id: "people",       emoji: "\u2764\uFE0F", label: "People",       cats: ["Psychology & People"] },
    { id: "focus",        emoji: "\uD83C\uDFAF", label: "Focus",        cats: ["Productivity"] },
    { id: "power",        emoji: "\uD83C\uDFDB\uFE0F", label: "Power",  cats: ["Power & Strategy"] },
    { id: "creativity",   emoji: "\uD83C\uDFA8", label: "Creativity",   cats: ["Creativity"] },
    { id: "health",       emoji: "\uD83D\uDCAA", label: "Health",       cats: ["Health", "Self-Improvement"] },
    { id: "leadership",   emoji: "\uD83E\uDD85", label: "Leadership",   cats: ["Business & Startups", "Power & Strategy"] },
    { id: "philosophy",   emoji: "\uD83E\uDD14", label: "Philosophy",   cats: ["Philosophy", "Psychology & People"] },
    { id: "failure",      emoji: "\uD83D\uDC80", label: "Failure",      cats: ["Business & Startups"], graves: true }
  ];

  var TIMES = [
    { id: "3",  emoji: "\u26A1",       label: "3 minutes",  sub: "Give me one lesson" },
    { id: "10", emoji: "\u2615",       label: "10 minutes", sub: "A proper sit-down" },
    { id: "25", emoji: "\uD83D\uDCDA", label: "25+ minutes", sub: "I want depth" }
  ];

  var WHENS = [
    { id: "morning", emoji: "\uD83C\uDF05", label: "Morning",  sub: "Before the day starts" },
    { id: "commute", emoji: "\uD83D\uDE87", label: "Commute",  sub: "On the move" },
    { id: "lunch",   emoji: "\uD83C\uDF71", label: "Midday",   sub: "A break in the middle" },
    { id: "night",   emoji: "\uD83C\uDF19", label: "Night",    sub: "Winding down" }
  ];

  var QUOTES = [
    { id: "tactical",
      text: "You do not rise to the level of your goals. You fall to the level of your systems.",
      who: "Atomic Habits" },
    { id: "philosophical",
      text: "He who has a why to live can bear almost any how.",
      who: "Man's Search for Meaning" },
    { id: "strategic",
      text: "Never outshine the master. Always make those above you feel comfortably superior.",
      who: "The 48 Laws of Power" }
  ];

  var DEPTHS = {
    tactical:      { label: "practical and step-by-step", cats: ["Productivity", "Self-Improvement", "Business & Startups"] },
    philosophical: { label: "deep and reflective",        cats: ["Philosophy", "Psychology & People"] },
    strategic:     { label: "sharp and strategic",        cats: ["Power & Strategy", "Business & Startups"] }
  };

  /* ============================================================
     RECOMMENDER — a real scoring pass, not a hardcoded list
     ============================================================ */
  function recommend(a) {
    var books = window.BOOKS || [];
    if (!books.length) return [];

    var wantCats = {};
    (a.topics || []).forEach(function (tid) {
      var t = TOPICS.filter(function (x) { return x.id === tid; })[0];
      if (t) t.cats.forEach(function (c) { wantCats[c] = (wantCats[c] || 0) + 3; });
    });
    var depth = DEPTHS[a.depth];
    if (depth) depth.cats.forEach(function (c) { wantCats[c] = (wantCats[c] || 0) + 2; });

    var maxLessons = a.time === "3" ? 8 : (a.time === "10" ? 14 : 99);

    var scored = books.map(function (b) {
      var score = 0;
      var reasons = [];

      if (wantCats[b.category]) {
        score += wantCats[b.category];
        var t = (a.topics || []).filter(function (tid) {
          var x = TOPICS.filter(function (y) { return y.id === tid; })[0];
          return x && x.cats.indexOf(b.category) !== -1;
        })[0];
        var tl = TOPICS.filter(function (x) { return x.id === t; })[0];
        if (tl) reasons.push("you picked " + tl.label.toLowerCase());
      }

      var n = (b.lessons || []).length;
      if (n <= maxLessons) { score += 2; }
      else { score -= 1; }
      if (a.time === "3" && n <= 8) reasons.push("short enough for 3 minutes");
      if (a.time === "25" && n >= 12) reasons.push("has the depth you asked for");

      if (a.mood === "stuck" && /Self-Improvement|Psychology/.test(b.category)) {
        score += 2; reasons.push("for when you're stuck");
      }
      if (a.mood === "building" && /Business|Creativity/.test(b.category)) {
        score += 2; reasons.push("you're building something");
      }
      if (a.mood === "healing" && /Psychology|Philosophy|Health/.test(b.category)) {
        score += 2; reasons.push("gentle, for right now");
      }
      if (a.mood === "winning" && /Power|Business|Productivity/.test(b.category)) {
        score += 2; reasons.push("for the edge you want");
      }
      if (a.mood === "curious" && /Philosophy|Science|History/.test(b.category)) {
        score += 2; reasons.push("worth being curious about");
      }

      score += Math.random() * 0.6;   /* gentle tie-break, keeps it fresh */

      return { b: b, score: score, reason: reasons[0] || "a strong place to start" };
    });

    scored.sort(function (x, y) { return y.score - x.score; });
    return scored.slice(0, 6);
  }

  /* ============================================================
     UI
     ============================================================ */
  var answers = { mood: "", topics: [], time: "10", when: "morning", depth: "", lang: "en" };
  var step = 0;
  var STEPS = 7;
  var rootEl = null;

  function css() {
    if (document.getElementById("ob2css")) return;
    var st = document.createElement("style");
    st.id = "ob2css";
    st.textContent = [
      ".ob2{position:fixed;inset:0;z-index:100000;display:flex;align-items:flex-end;justify-content:center;",
      "background:rgba(8,8,10,.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:ob2f .25s ease}",
      "@keyframes ob2f{from{opacity:0}to{opacity:1}}",
      ".ob2__box{display:flex;flex-direction:column;width:min(100%,520px);height:min(92dvh,780px);",
      "background:var(--surface-1);border-radius:26px 26px 0 0;overflow:hidden;animation:ob2u .38s cubic-bezier(.16,1,.3,1)}",
      "@media(min-width:560px){.ob2{align-items:center}.ob2__box{border-radius:26px;height:min(88dvh,760px)}}",
      "@keyframes ob2u{from{transform:translateY(100%)}to{transform:translateY(0)}}",
      ".ob2__top{flex:0 0 auto;padding:18px 20px 12px}",
      ".ob2__bar{display:flex;gap:5px;margin-bottom:14px}",
      ".ob2__bar i{flex:1;height:4px;border-radius:9px;background:var(--surface-inset);transition:background .3s ease}",
      ".ob2__bar i.on{background:var(--tsb-coral)}",
      ".ob2__nav{display:flex;align-items:center;justify-content:space-between;gap:10px}",
      ".ob2__back,.ob2__skip{background:none;border:0;color:var(--text-3);font-family:var(--font-body);",
      "font-size:.82rem;font-weight:600;cursor:pointer;padding:6px 4px;min-height:32px}",
      ".ob2__back:disabled{opacity:0;pointer-events:none}",
      ".ob2__body{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 20px 20px}",
      ".ob2__h{font-family:var(--font-head);font-size:clamp(1.35rem,1.1rem+1.4vw,1.75rem);line-height:1.15;",
      "text-transform:uppercase;letter-spacing:.4px;color:var(--text-1);margin-bottom:8px}",
      ".ob2__p{font-size:.88rem;color:var(--text-2);margin-bottom:20px;line-height:1.45}",
      ".ob2__opts{display:flex;flex-direction:column;gap:9px}",
      ".ob2__opt{display:flex;align-items:center;gap:13px;width:100%;min-height:60px;padding:12px 15px;",
      "background:var(--surface-2);border:2px solid transparent;border-radius:16px;color:var(--text-1);",
      "font-family:var(--font-body);font-size:.94rem;font-weight:600;text-align:left;cursor:pointer;",
      "transition:border-color .18s ease,transform .18s cubic-bezier(.34,1.56,.64,1),background .18s ease}",
      ".ob2__opt:active{transform:scale(.98)}",
      ".ob2__opt.on{border-color:var(--tsb-coral);background:color-mix(in srgb,var(--tsb-coral) 12%,var(--surface-2))}",
      ".ob2__opt span.e{flex:0 0 auto;font-size:24px;line-height:1}",
      ".ob2__opt div{flex:1 1 auto;min-width:0}",
      ".ob2__opt small{display:block;font-size:.74rem;font-weight:500;color:var(--text-3);margin-top:1px}",
      ".ob2__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(102px,1fr));gap:9px}",
      ".ob2__tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;",
      "min-height:88px;padding:12px 6px;background:var(--surface-2);border:2px solid transparent;border-radius:16px;",
      "color:var(--text-1);font-family:var(--font-body);font-size:.8rem;font-weight:700;cursor:pointer;",
      "transition:border-color .18s ease,transform .18s cubic-bezier(.34,1.56,.64,1),background .18s ease}",
      ".ob2__tile:active{transform:scale(.96)}",
      ".ob2__tile.on{border-color:var(--tsb-coral);background:color-mix(in srgb,var(--tsb-coral) 14%,var(--surface-2))}",
      ".ob2__tile b{font-size:25px;line-height:1;font-weight:400}",
      ".ob2__quote{width:100%;padding:18px 16px;background:var(--surface-2);border:2px solid transparent;",
      "border-radius:18px;text-align:left;cursor:pointer;font-family:var(--font-body);color:var(--text-1);",
      "transition:border-color .18s ease,transform .18s cubic-bezier(.34,1.56,.64,1)}",
      ".ob2__quote:active{transform:scale(.98)}",
      ".ob2__quote.on{border-color:var(--tsb-coral)}",
      ".ob2__quote q{display:block;font-size:1rem;line-height:1.45;font-style:italic;margin-bottom:8px}",
      ".ob2__quote cite{font-size:.74rem;font-weight:700;color:var(--text-3);font-style:normal;letter-spacing:.4px;text-transform:uppercase}",
      ".ob2__foot{flex:0 0 auto;padding:12px 20px calc(env(safe-area-inset-bottom,0px) + 16px);",
      "background:var(--surface-1);border-top:1px solid var(--line-soft)}",
      ".ob2__cta{display:flex;align-items:center;justify-content:center;width:100%;min-height:52px;",
      "background:var(--tsb-coral);color:#fff;border:0;border-radius:16px;font-family:var(--font-body);",
      "font-size:1rem;font-weight:700;cursor:pointer;box-shadow:0 5px 16px rgba(255,90,71,.34);",
      "transition:transform .18s cubic-bezier(.34,1.56,.64,1),opacity .18s ease}",
      ".ob2__cta:active{transform:scale(.98)}",
      ".ob2__cta:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}",
      ".ob2__load{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:18px;text-align:center}",
      ".ob2__spin{width:44px;height:44px;border:3px solid var(--surface-inset);border-top-color:var(--tsb-coral);",
      "border-radius:50%;animation:ob2s .8s linear infinite}",
      "@keyframes ob2s{to{transform:rotate(360deg)}}",
      ".ob2__loadtxt{font-size:.9rem;color:var(--text-2);min-height:22px}",
      ".ob2__recs{display:flex;flex-direction:column;gap:9px}",
      ".ob2__rec{display:flex;align-items:center;gap:12px;padding:10px;background:var(--surface-2);",
      "border-radius:15px;text-decoration:none;color:var(--text-1)}",
      ".ob2__rec img{flex:0 0 auto;width:44px;height:64px;object-fit:cover;border-radius:8px;background:var(--surface-inset)}",
      ".ob2__rec div{flex:1 1 auto;min-width:0}",
      ".ob2__rec b{display:block;font-size:.9rem;line-height:1.25;margin-bottom:2px}",
      ".ob2__rec small{display:block;font-size:.74rem;color:var(--text-3);line-height:1.35}",
      ".ob2__why{color:var(--tsb-coral);font-weight:700}",
      ".ob2__body{transition:opacity .13s ease,transform .13s cubic-bezier(.16,1,.3,1);will-change:opacity,transform}",
      ".ob2__body.is-exit{opacity:0;transform:translateY(-6px)}",
      ".ob2__body.is-enter{opacity:0;transform:translateY(8px)}",
      "@media(prefers-reduced-motion:reduce){.ob2,.ob2__box{animation:none}.ob2__spin{animation-duration:2s}",
      ".ob2__body,.ob2__body.is-exit,.ob2__body.is-enter{transition:none;opacity:1;transform:none}}"
    ].join("");
    document.head.appendChild(st);
  }

  function progress() {
    var out = "";
    for (var i = 0; i < STEPS; i++) out += '<i class="' + (i <= step ? "on" : "") + '"></i>';
    return out;
  }

  function shell(bodyHtml, ctaLabel, ctaEnabled, showFoot) {
    return '<div class="ob2__box" role="dialog" aria-modal="true" aria-label="Personalise TheSmallBook">' +
      '<div class="ob2__top">' +
        '<div class="ob2__bar">' + progress() + "</div>" +
        '<div class="ob2__nav">' +
          '<button class="ob2__back" id="ob2Back"' + (step === 0 ? " disabled" : "") + '>\u2190 Back</button>' +
          '<button class="ob2__skip" id="ob2Skip">Skip</button>' +
        "</div>" +
      "</div>" +
      '<div class="ob2__body" id="ob2Body">' + bodyHtml + "</div>" +
      (showFoot === false ? "" :
        '<div class="ob2__foot"><button class="ob2__cta" id="ob2Next"' +
        (ctaEnabled ? "" : " disabled") + ">" + esc(ctaLabel || "Continue") + "</button></div>") +
    "</div>";
  }

  function optList(items, selected, multi) {
    return '<div class="ob2__opts">' + items.map(function (o) {
      var on = multi ? selected.indexOf(o.id) !== -1 : selected === o.id;
      return '<button class="ob2__opt' + (on ? " on" : "") + '" data-id="' + esc(o.id) + '">' +
        '<span class="e">' + o.emoji + "</span>" +
        "<div>" + esc(o.label) + (o.sub ? "<small>" + esc(o.sub) + "</small>" : "") + "</div>" +
      "</button>";
    }).join("") + "</div>";
  }

  var pendingSwap = null;
  var REDUCED = false;
  try {
    REDUCED = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  function render() {
    css();
    if (!rootEl) {
      rootEl = document.createElement("div");
      rootEl.className = "ob2";
      document.body.appendChild(rootEl);
    }

    var body = "", cta = "Continue", ok = false, foot = true;

    if (step === 0) {
      body = '<h1 class="ob2__h">What brought you here?</h1>' +
        '<p class="ob2__p">One tap. It changes what we put in front of you.</p>' +
        optList(MOODS, answers.mood);
      ok = !!answers.mood;

    } else if (step === 1) {
      body = '<h1 class="ob2__h">Pick what you care about</h1>' +
        '<p class="ob2__p">Choose at least 3. We\u2019ll weight your whole feed around these.</p>' +
        '<div class="ob2__grid">' + TOPICS.map(function (t) {
          var on = answers.topics.indexOf(t.id) !== -1;
          return '<button class="ob2__tile' + (on ? " on" : "") + '" data-id="' + t.id + '">' +
            "<b>" + t.emoji + "</b>" + esc(t.label) + "</button>";
        }).join("") + "</div>";
      ok = answers.topics.length >= 3;
      cta = answers.topics.length >= 3 ? "Continue" :
            "Pick " + (3 - answers.topics.length) + " more";

    } else if (step === 2) {
      body = '<h1 class="ob2__h">How much time do you actually have?</h1>' +
        '<p class="ob2__p">Be honest \u2014 this sets your default lesson length.</p>' +
        optList(TIMES, answers.time);
      ok = !!answers.time;

    } else if (step === 3) {
      body = '<h1 class="ob2__h">When do you read?</h1>' +
        '<p class="ob2__p">Night readers get a dark theme automatically.</p>' +
        optList(WHENS, answers.when);
      ok = !!answers.when;

    } else if (step === 4) {
      body = '<h1 class="ob2__h">Which one hits hardest?</h1>' +
        '<p class="ob2__p">This tells us how deep you like it.</p>' +
        '<div class="ob2__opts">' + QUOTES.map(function (q) {
          return '<button class="ob2__quote' + (answers.depth === q.id ? " on" : "") + '" data-id="' + q.id + '">' +
            "<q>" + esc(q.text) + "</q><cite>" + esc(q.who) + "</cite></button>";
        }).join("") + "</div>";
      ok = !!answers.depth;

    } else if (step === 5) {
      var LS = [];
      try { LS = (window.TSB_LANG && window.TSB_LANG.LANGS) || []; } catch (e) {}
      if (!LS.length) LS = [{ code: "en", name: "English", native: "English", flag: "\uD83C\uDDEC\uD83C\uDDE7" }];
      var top = LS.slice(0, 8);
      body = '<h1 class="ob2__h">Read in your language</h1>' +
        '<p class="ob2__p">All 350 books, including Hinglish and Gujlish. Change it anytime in Settings.</p>' +
        '<div class="ob2__opts">' + top.map(function (l) {
          return '<button class="ob2__opt' + (answers.lang === l.code ? " on" : "") + '" data-id="' + esc(l.code) + '">' +
            '<span class="e">' + esc(l.flag || "\uD83C\uDF10") + "</span>" +
            "<div>" + esc(l.name) +
            (l.native && l.native !== l.name ? "<small>" + esc(l.native) + "</small>" : "") +
            "</div></button>";
        }).join("") + "</div>";
      ok = true;
      cta = "Build my shelf";

    } else if (step === 6) {
      foot = false;
      body = '<div class="ob2__load"><div class="ob2__spin"></div>' +
        '<div class="ob2__loadtxt" id="ob2Load">Reading your answers\u2026</div></div>';
    }

    /* Cross-fade the step instead of swapping innerHTML outright, which
       pops. Fade the outgoing body, swap, then fade in on the next frame —
       opacity+transform only, so it never leaves the compositor. */
    var prev = document.getElementById("ob2Body");
    var swap = function () {
      rootEl.innerHTML = shell(body, cta, ok, foot);
      wire();
      if (step === 6) crunch();

      var next = document.getElementById("ob2Body");
      if (next && !REDUCED) {
        next.classList.add("is-enter");
        var cleared = false;
        var clear = function () {
          if (cleared) return;
          cleared = true;
          next.classList.remove("is-enter");
        };
        requestAnimationFrame(function () { requestAnimationFrame(clear); });
        /* rAF is throttled to zero in background tabs and never fires in
           some headless engines, which would leave the step invisible.
           A timer guarantees the step always becomes visible. */
        setTimeout(clear, 80);
      }
    };

    /* A step can be re-rendered while the previous fade is still pending
       (fast taps, auto-advance, back). Cancel the in-flight swap so we never
       stack two transitions and strand a body in its faded-out state. */
    if (pendingSwap) {
      clearTimeout(pendingSwap);
      pendingSwap = null;
      /* the cancelled transition left the current body faded out - clear it,
         otherwise this step renders invisible and the flow looks frozen */
      if (prev) prev.classList.remove("is-exit");
    }

    if (prev && !REDUCED) {
      prev.classList.add("is-exit");
      pendingSwap = setTimeout(function () { pendingSwap = null; swap(); }, 120);
    } else {
      swap();
    }
  }

  function wire() {
    var body = document.getElementById("ob2Body");
    var back = document.getElementById("ob2Back");
    var skip = document.getElementById("ob2Skip");
    var next = document.getElementById("ob2Next");

    if (back) back.addEventListener("click", function () { if (step > 0) { step--; render(); } });
    if (skip) skip.addEventListener("click", finishSkipped);
    if (next) next.addEventListener("click", function () { step++; render(); });

    if (!body) return;
    body.addEventListener("click", function (e) {
      var el = e.target.closest("[data-id]");
      if (!el) return;
      var id = el.getAttribute("data-id");

      if (step === 0) { answers.mood = id; render(); }
      else if (step === 1) {
        var i = answers.topics.indexOf(id);
        if (i === -1) answers.topics.push(id); else answers.topics.splice(i, 1);
        render();
      }
      else if (step === 2) { answers.time = id; render(); }
      else if (step === 3) { answers.when = id; render(); }
      else if (step === 4) { answers.depth = id; render(); }
      else if (step === 5) { answers.lang = id; render(); }
    });
  }

  /* ---------- the reveal ---------- */
  function crunch() {
    var txt = document.getElementById("ob2Load");
    var lines = [
      "Reading your answers\u2026",
      "Scoring 350 books\u2026",
      "Matching " + (answers.topics.length) + " topics\u2026",
      "Building your shelf\u2026"
    ];
    var i = 0;
    var iv = setInterval(function () {
      i++;
      if (txt && lines[i]) txt.textContent = lines[i];
    }, 620);

    setTimeout(function () {
      clearInterval(iv);
      commit();
      showResults();
    }, 2500);
  }

  function showResults() {
    var recs = recommend(answers);
    var mood = MOODS.filter(function (m) { return m.id === answers.mood; })[0];
    var depth = DEPTHS[answers.depth];

    var intro = "Because you\u2019re " +
      (mood ? mood.label.toLowerCase() : "here") +
      (depth ? ", and you like it " + depth.label : "") + ".";

    var body = '<h1 class="ob2__h">Your shelf is ready</h1>' +
      '<p class="ob2__p">' + esc(intro) + "</p>" +
      '<div class="ob2__recs">' + recs.map(function (r) {
        return '<a class="ob2__rec" href="book.html?id=' + esc(r.b.id) + '">' +
          '<img src="' + esc(r.b.cover || "") + '" alt="" loading="lazy" width="44" height="64">' +
          "<div><b>" + esc(r.b.title) + "</b>" +
          '<small><span class="ob2__why">Why:</span> ' + esc(r.reason) + "</small></div></a>";
      }).join("") + "</div>";

    rootEl.innerHTML = shell(body, "Start reading", true, true);
    var next = document.getElementById("ob2Next");
    var back = document.getElementById("ob2Back");
    var skip = document.getElementById("ob2Skip");
    if (back) back.disabled = true;
    if (skip) skip.textContent = "Close";
    if (next) next.addEventListener("click", close);
    if (skip) skip.addEventListener("click", close);
  }

  /* ---------- persist + apply ---------- */
  function commit() {
    var prefs = {
      mood: answers.mood,
      topics: answers.topics.slice(),
      time: answers.time,
      when: answers.when,
      depth: answers.depth,
      lang: answers.lang,
      at: Date.now(),
      v: 2
    };
    set(KEY, prefs);
    set(DONE, true);
    set(LEGACY, true);   /* stop the old onboarding from ever firing */

    /* night readers get dark automatically */
    try {
      if (answers.when === "night" && window.TSB_THEME && window.TSB_THEME.get() === "light") {
        window.TSB_THEME.set("dark");
      }
    } catch (e) {}

    /* language */
    try {
      if (answers.lang && answers.lang !== "en") {
        set("tsb_lang", answers.lang);
        if (window.TSB_LANG && window.TSB_LANG.select) window.TSB_LANG.select(answers.lang);
      }
    } catch (e) {}

    /* bridge to the v1 pref keys the existing app already reads */
    try {
      var goalMap = { money: "money", business: "business", habits: "self", mind: "people",
                      people: "people", focus: "productivity", power: "power",
                      creativity: "creativity", failure: "business" };
      var first = answers.topics[0];
      if (first && goalMap[first]) set("tsb_goal", goalMap[first]);
      set("tsb_time", answers.time);
    } catch (e) {}

    try { window.dispatchEvent(new CustomEvent("tsb:onboarded", { detail: prefs })); } catch (e) {}
  }

  function finishSkipped() {
    set(DONE, true);
    set(LEGACY, true);
    close();
  }

  function close() {
    if (rootEl && rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
    rootEl = null;
    document.documentElement.style.overflow = "";
  }

  function start() {
    if (!shouldShow()) return;
    step = 0;
    render();
  }

  window.TSB_ONBOARD2 = {
    start: start,
    force: function () { set(DONE, false); set(LEGACY, false); step = 0; render(); },
    prefs: function () { return get(KEY, null); },
    recommend: recommend,
    _answers: answers
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(start, 900); });
  } else { setTimeout(start, 900); }
})();
