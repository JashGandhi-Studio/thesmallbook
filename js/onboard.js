/* ============================================================
   THESMALLBOOK — 🎯 FIRST-VISIT ONBOARDING v3 (onboard.js)
   Seven genuinely personalising steps — no repeated questions:
     1 · Welcome            2 · Why you read      3 · Your shelves
     4 · Daily budget       5 · Reading style     6 · Language
     7 · Theme + finish
   The answers ACTUALLY tune the app:
     • primary shelf  → library opens pre-filtered to it (app.js)
     • reading style  → deep readers start fully expanded (book.js)
     • language/theme → applied site-wide on finish
     • budget/interests → saved to the profile (Supabase-ready)
   Full-width row choices (never overlap), slide/fade transitions,
   progress segments, back nav, shake when a required pick is missed.
   Runs ONCE (localStorage tsb_onboarded). Skips returning users.
   ============================================================ */
(function () {
  /* storage that never dies: localStorage → sessionStorage → in-memory. */
  var memStore = {};
  function get(key, def) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return v === null || v === undefined ? def : v;
    } catch (e) {}
    try {
      var v2 = JSON.parse(sessionStorage.getItem(key));
      return v2 === null || v2 === undefined ? def : v2;
    } catch (e2) {}
    return key in memStore ? memStore[key] : def;
  }
  function set(key, val) {
    memStore[key] = val;
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e2) {}
  }

  function shouldShow() {
    try { if (sessionStorage.getItem("tsb_onboarded_pending")) { set("tsb_onboarded", true); sessionStorage.removeItem("tsb_onboarded_pending"); } } catch (e) {}
    if (get("tsb_onboarded", false)) return false;
    try { if (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) return false; } catch (e) {}
    /* sync session check — logged-in readers NEVER see onboarding,
       even if auth.js hasn't finished booting yet (no race) */
    try {
      var s = JSON.parse(localStorage.getItem("tsb_auth_session"));
      if (s && (s.user || s.access_token)) return false;
    } catch (e) {}
    if (/404\.html|login\.html|story\.html|chat\.html|settings\.html/.test(location.pathname)) return false;
    if (/[?&]code=/.test(location.search)) return false;
    return true;
  }

  /* ---------- real personalisation dimensions (v4: unique & fun) ---------- */
  /* each "mess" maps straight onto a real library shelf */
  var WHYS = [
    { id: "Productivity", ic: "🧠", t: "Close my 47 open brain tabs", s: "Focus, deep work, zero chaos" },
    { id: "Money & Finance", ic: "💸", t: "Make money make sense", s: "Earn it · keep it · grow it" },
    { id: "Business & Startups", ic: "🏢", t: "Build something of my own", s: "Founder brain, minus the burnout" },
    { id: "Psychology & People", ic: "🎭", t: "Read people like books", s: "Why everyone does that thing" },
    { id: "Power & Strategy", ic: "♟️", t: "Win quietly", s: "Chess moves for real life" },
    { id: "Creativity", ic: "🎨", t: "Make stuff people stare at", s: "Ideas that actually slap" },
    { id: "Self-Improvement", ic: "🌱", t: "Fix my habits (and my sleep)", s: "Become v2.0 of me" },
    { id: "History", ic: "🏛️", t: "Steal plays from dead empires", s: "Old games, new wins" }
  ];
  var SHELF_META = {
    "Self-Improvement": ["🌱", "habits, sleep, becoming v2.0"],
    "Business & Startups": ["🏢", "founder brain, real stories"],
    "Psychology & People": ["🎭", "why people do that"],
    "Power & Strategy": ["♟️", "chess, not checkers"],
    "Money & Finance": ["💸", "make it · keep it · grow it"],
    "Productivity": ["🧠", "deep work, calm schedule"],
    "Creativity": ["🎨", "ideas that slap"],
    "History": ["🏛️", "old plays, new games"],
    "Biography": ["👤", "lives worth borrowing"]
  };
  var STYLES = [
    { id: "skim", ic: "⚡", t: "Just the tactics, coach", s: "Key lessons — in and out" },
    { id: "steady", ic: "🍿", t: "Story me through it", s: "Case studies & real examples" },
    { id: "deep", ic: "💀", t: "Autopsies & deep dives", s: "Everything open, graves included" },
    { id: "listen", ic: "🎧", t: "Read it to me", s: "Audio lessons while I move" }
  ];
  var MINUTES = [5, 10, 20, 30];
  var MIN_LABEL = { 5: "🐟 5′", 10: "☕ 10′", 20: "📖 20′", 30: "🐋 30′" };
  var MIN_SUB = { 5: "reel brain", 10: "one chai", 20: "proper sit-down", 30: "deep sea" };

  /* top shelves straight from the real library */
  function shelves() {
    var out = [];
    try {
      var counts = {};
      (window.BOOKS || []).forEach(function (b) { counts[b.category] = (counts[b.category] || 0) + 1; });
      out = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 8);
    } catch (e) {}
    if (!out.length) out = ["Self-Improvement", "Money & Finance", "Business & Startups", "Psychology & People", "Creativity", "Productivity", "Power & Strategy", "Biography"];
    return out;
  }

  var draft = get("tsb_onboard_draft", null) || { why: null, shelves: [], minutes: 10, style: null, lang: null, theme: null };
  var step = 0;
  var TOTAL = 8;

  /* ---------- the payoff: a starter shelf built from the answers ---------- */
  function starterShelf() {
    var pick = [], seen = {}, order = [];
    if (draft.why) order.push(draft.why);
    (draft.shelves || []).forEach(function (c) { if (order.indexOf(c) < 0) order.push(c); });
    if (!order.length) order = shelves().slice(0, 3);
    function readMin(b) { var m = parseInt(b.readTime, 10); return isNaN(m) ? 15 : m; }
    var budget = draft.minutes || 10;
    var pools = {};
    (window.BOOKS || []).forEach(function (b) { (pools[b.category] = pools[b.category] || []).push(b); });
    Object.keys(pools).forEach(function (k) {
      pools[k].sort(function (a, b) {
        if (draft.style === "deep") { var d = (b.graveLink ? 1 : 0) - (a.graveLink ? 1 : 0); if (d) return d; }
        if (budget <= 10) return readMin(a) - readMin(b);
        return 0; /* stable — library order otherwise */
      });
    });
    var idx = {};
    var added = true;
    while (pick.length < 6 && added) {
      added = false;
      for (var i = 0; i < order.length && pick.length < 6; i++) {
        var c = order[i], pool = pools[c] || [];
        idx[c] = idx[c] || 0;
        while (idx[c] < pool.length) {
          var b = pool[idx[c]++];
          if (!seen[b.id]) { seen[b.id] = 1; pick.push(b); added = true; break; }
        }
      }
    }
    (window.BOOKS || []).forEach(function (b) { if (pick.length < 6 && !seen[b.id]) { seen[b.id] = 1; pick.push(b); } });
    return pick.slice(0, 6);
  }

  function langList() {
    var base = [{ code: "en", name: "English", flag: "📕" }];
    try { if (window.TSB_LANG && TSB_LANG.list) return base.concat(TSB_LANG.list); } catch (e) {}
    return base;
  }

  function rows(list, attr, picked, withSub) {
    return list.map(function (o) {
      var on = Array.isArray(picked) ? picked.indexOf(o.id) >= 0 : picked === o.id;
      return '<button class="ob-row' + (on ? " on" : "") + '" data-' + attr + '="' + o.id + '">' +
        '<span class="ic">' + o.ic + "</span><span>" + o.t +
        (withSub ? "<small>" + o.s + "</small>" : "") +
        '</span><span class="tick">✓</span></button>';
    }).join("");
  }

  /* ---------- step templates ---------- */
  function stepHtml(i) {
    switch (i) {
      case 0:
        return '<div class="ob-step__center">' +
          '<div class="ob-logo">📕</div>' +
          '<h2>The<span>Small</span>Book</h2>' +
          '<p class="ob-tag">big books · small reads</p>' +
          '<p class="ob-sub">350+ books, distilled into lessons you can use today. A few quick questions — and your starter shelf appears.</p>' +
          '<button class="ob-cta" data-next>Let’s tune it for me →</button>' +
          "</div>";
      case 1:
        return "<h2>What mess are we fixing?</h2>" +
          '<p class="ob-sub">Your main battle — the library will lead with it.</p>' +
          '<div class="ob-rows">' + rows(WHYS, "why", draft.why, true) + "</div>" +
          '<div class="ob-btns"><button class="ob-cta" data-next data-need="why">Continue →</button></div>';
      case 2:
        return "<h2>Pick your shelves</h2>" +
          '<p class="ob-sub">Tap everything you’d browse at 2am.</p>' +
          '<div class="ob-rows">' + shelves().map(function (c) {
            var on = draft.shelves.indexOf(c) >= 0;
            var m = SHELF_META[c] || ["📚", ""];
            return '<button class="ob-row' + (on ? " on" : "") + '" data-shelf="' + c.replace(/"/g, "&quot;") + '"><span class="ic">' + m[0] + "</span><span>" + c +
              (m[1] ? "<small>" + m[1] + "</small>" : "") + '<span class="tick">✓</span></button>';
          }).join("") + "</div>" +
          '<div class="ob-btns"><button class="ob-cta" data-next data-need="shelves">Continue →</button></div>';
      case 3:
        return "<h2>Real talk — your attention span today?</h2>" +
          '<p class="ob-sub">We’ll respect it. No 40-minute walls, no guilt.</p>' +
          '<div class="ob-seg">' + MINUTES.map(function (m) {
            return '<button class="' + (draft.minutes === m ? "on" : "") + '" data-min="' + m + '">' + (MIN_LABEL[m] || m + "′") + "</button>";
          }).join("") + "</div>" +
          '<p class="ob-sub ob-sub--mt">“' + (MIN_SUB[draft.minutes] || "one chai") + '” it is — one lesson fits exactly that.</p>' +
          '<div class="ob-btns"><button class="ob-cta" data-next>Continue →</button></div>';
      case 4:
        return "<h2>How should lessons taste?</h2>" +
          '<p class="ob-sub">Every book in the app obeys this.</p>' +
          '<div class="ob-rows">' + rows(STYLES, "style", draft.style, true) + "</div>" +
          '<div class="ob-btns"><button class="ob-cta" data-next data-need="style">Continue →</button></div>';
      case 5:
        return "<h2>Read in which language?</h2>" +
          '<p class="ob-sub">Summaries, chat and audio all switch.</p>' +
          '<div class="ob-langs">' + langList().map(function (l) {
            var cur = draft.lang || ((window.TSB_LANG && TSB_LANG.get) ? TSB_LANG.get() : "en");
            return '<button class="ob-lang' + (l.code === cur ? " on" : "") + '" data-lang="' + l.code + '"><span>' + l.flag + "</span>" + l.name + "</button>";
          }).join("") + "</div>" +
          '<div class="ob-btns"><button class="ob-cta" data-next>Continue →</button></div>';
      case 6:
        return "<h2>Light or dark?</h2>" +
          '<p class="ob-sub">Flip it any time in Settings.</p>' +
          '<div class="ob-rows">' +
            '<button class="ob-row' + (draft.theme === "light" ? " on" : "") + '" data-theme-pick="light"><span class="ic">☀️</span><span>Light<small>Paper & ink</small></span><span class="tick">✓</span></button>' +
            '<button class="ob-row' + (draft.theme === "dark" ? " on" : "") + '" data-theme-pick="dark"><span class="ic">🌙</span><span>Dark<small>Low-light reading</small></span><span class="tick">✓</span></button>' +
          "</div>" +
          '<div class="ob-btns"><button class="ob-cta" data-next>See my shelf →</button></div>';
      case 7:
        return "<h2>Your starter shelf 🎁</h2>" +
          '<p class="ob-sub">Hand-picked from your answers. Tap any cover — page one opens instantly.</p>' +
          '<div class="ob-shelf">' + starterShelf().map(function (b, i) {
            return '<button class="ob-book" data-book="' + b.id + '"><span class="ob-book__n">' + (i + 1) + "</span>" +
              '<img src="assets/covers/' + encodeURIComponent(b.id) + '.jpg" alt="" loading="lazy">' +
              '<span class="ob-book__t">' + b.title + "</span></button>";
          }).join("") + "</div>" +
          '<p class="ob-shelfnote">This shelf also waits for you on Home.</p>' +
          '<div class="ob-btns"><button class="ob-cta" data-finish>Save & explore home →</button></div>';
    }
    return "";
  }

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "obwrap";
    wrap.innerHTML =
      '<div class="ob" role="dialog" aria-modal="true" aria-label="Welcome to TheSmallBook">' +
        '<div class="ob__prog">' + Array.apply(null, Array(TOTAL)).map(function (_, i) { return '<i data-seg="' + i + '"></i>'; }).join("") + "</div>" +
        '<button class="ob__back" data-back aria-label="Back">←</button>' +
        '<button class="ob__x" data-skip aria-label="Skip personalisation">✕</button>' +
        '<div class="ob__body"></div>' +
      "</div>";
    document.body.appendChild(wrap);
    document.documentElement.classList.add("ob-lock");
    return wrap;
  }

  var wrap = null;
  var body = null;
  var busy = false;

  function paintProg() {
    wrap.querySelectorAll("[data-seg]").forEach(function (s, i) {
      s.classList.toggle("on", i <= step);
    });
    wrap.querySelector(".ob__back").style.visibility = step === 0 ? "hidden" : "visible";
  }

  function show(i, dir) {
    var old = body.querySelector(".ob-step");
    function mount() {
      var el = document.createElement("div");
      el.className = "ob-step ob-step--enter" + (dir === "back" ? " ob-step--enterback" : "");
      el.innerHTML = stepHtml(i);
      body.appendChild(el);
      body.scrollTop = 0;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { el.classList.remove("ob-step--enter", "ob-step--enterback"); });
      });
      busy = false;
    }
    if (old) {
      busy = true;
      old.classList.add(dir === "back" ? "ob-step--outback" : "ob-step--out");
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); mount(); }, 200);
    } else mount();
    paintProg();
  }

  function goNext() { if (!busy) { step = Math.min(TOTAL - 1, step + 1); show(step, "fwd"); } }
  function goBack() { if (!busy && step > 0) { step -= 1; show(step, "back"); } }

  /* close for good — never trap the reader */
  function dismiss(mark) {
    if (mark) set("tsb_onboarded", true);
    if (!wrap) return;
    var w = wrap;
    wrap = null;
    w.classList.add("obwrap--off");
    document.documentElement.classList.remove("ob-lock");
    setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 420);
  }

  function shakeNeed(sel) {
    var g = body.querySelector(sel);
    if (!g) return;
    g.classList.add("ob-shake");
    setTimeout(function () { g.classList.remove("ob-shake"); }, 420);
  }

  function saveProfile() {
    var order = [];
    if (draft.why) order.push(draft.why);
    (draft.shelves || []).forEach(function (c) { if (order.indexOf(c) < 0) order.push(c); });
    set("tsb_onboard_draft", draft);
    set("tsb_onboarded", true);
    set("tsb_interests", order.length ? order : draft.shelves);
    set("tsb_read_minutes", draft.minutes);
    set("tsb_read_style", draft.style || "steady");
    var lead = draft.why || draft.shelves[0];
    if (lead) set("tsb_ob_lead", lead);
    try { set("tsb_starter_shelf", starterShelf().map(function (b) { return b.id; })); } catch (e) {}
  }

  function finish() {
    saveProfile();
    try {
      if (draft.lang && window.TSB_LANG && TSB_LANG.select) TSB_LANG.select(draft.lang);
      var isDark = document.documentElement.classList.contains("dark");
      if (draft.theme && ((draft.theme === "dark") !== isDark) && window.TSB && TSB.theme) TSB.theme.toggle();
    } catch (e) {}
    var lead = draft.shelves[0] || "";
    var styleName = (STYLES.filter(function (s) { return s.id === draft.style; })[0] || {}).t || "Steady reader";
    body.innerHTML = '<div class="ob-step ob-step--done"><div class="ob-logo">🎉</div><h2>Your library is tuned</h2>' +
      '<p class="ob-sub">' + (lead ? "📚 Leading with " + lead + "<br>" : "") +
      "⏱ " + draft.minutes + " min a day · " + styleName + "<br>" +
      "🌐 " + (draft.lang && draft.lang !== "en" ? draft.lang.toUpperCase() : "EN") + " · " +
      (draft.theme === "dark" ? "🌙 dark" : "☀️ light") + "</p>" +
      '<p class="ob-sub">Change any of it later in Settings.</p></div>';
    setTimeout(function () {
      wrap.classList.add("obwrap--off");
      document.documentElement.classList.remove("ob-lock");
      setTimeout(function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        /* apply the tuned shelf live — tap the matching filter chip */
        try {
          var leadNow = JSON.parse(localStorage.getItem("tsb_ob_lead") || "null");
          if (leadNow) {
            var chip = null;
            document.querySelectorAll(".chip").forEach(function (c) { if (c.textContent === leadNow) chip = c; });
            if (chip) chip.click();
          }
        } catch (e) {}
      }, 420);
    }, 1400);
  }

  function bind() {
    wrap.addEventListener("click", function (e) {
      var t;
      if ((t = e.target.closest("[data-next]"))) {
        var need = t.getAttribute("data-need");
        if (need === "why" && !draft.why) return shakeNeed(".ob-rows");
        if (need === "style" && !draft.style) return shakeNeed(".ob-rows");
        if (need === "shelves" && !draft.shelves.length) return shakeNeed(".ob-rows");
        set("tsb_onboard_draft", draft);
        goNext();
        return;
      }
      if (e.target.closest("[data-finish]")) { finish(); return; }
      if ((t = e.target.closest("[data-book]"))) {
        /* tap a cover on the starter shelf → save profile, open page one */
        saveProfile();
        dismiss(true);
        location.href = "book.html?id=" + encodeURIComponent(t.getAttribute("data-book"));
        return;
      }
      if (e.target.closest("[data-skip]")) { dismiss(true); return; }
      if (e.target.closest("[data-back]")) { goBack(); return; }
      if ((t = e.target.closest("[data-why]"))) {
        draft.why = t.getAttribute("data-why");
        body.querySelectorAll("[data-why]").forEach(function (b) { b.classList.toggle("on", b === t); });
        return;
      }
      if ((t = e.target.closest("[data-shelf]"))) {
        var c = t.getAttribute("data-shelf");
        var ix = draft.shelves.indexOf(c);
        if (ix >= 0) draft.shelves.splice(ix, 1); else draft.shelves.push(c);
        t.classList.toggle("on", ix < 0);
        return;
      }
      if ((t = e.target.closest("[data-min]"))) {
        draft.minutes = Number(t.getAttribute("data-min"));
        body.querySelectorAll("[data-min]").forEach(function (b) { b.classList.toggle("on", b === t); });
        return;
      }
      if ((t = e.target.closest("[data-style]"))) {
        draft.style = t.getAttribute("data-style");
        body.querySelectorAll("[data-style]").forEach(function (b) { b.classList.toggle("on", b === t); });
        return;
      }
      if ((t = e.target.closest("[data-lang]"))) {
        draft.lang = t.getAttribute("data-lang");
        body.querySelectorAll("[data-lang]").forEach(function (b) { b.classList.toggle("on", b === t); });
        return;
      }
      if ((t = e.target.closest("[data-theme-pick]"))) {
        draft.theme = t.getAttribute("data-theme-pick");
        body.querySelectorAll("[data-theme-pick]").forEach(function (b) { b.classList.toggle("on", b === t); });
        return;
      }
    });
  }

  /* 🎯 live re-tune from Settings / You window (no reload) */
  window.TSB_ONBOARD = {
    start: function () {
      if (wrap) return;
      try {
        var ints = JSON.parse(localStorage.getItem("tsb_interests")) || [];
        if (ints.length && !draft.shelves.length) { draft.shelves = ints.slice(); draft.why = draft.why || ints[0]; }
        var lead = JSON.parse(localStorage.getItem("tsb_ob_lead"));
        if (lead) draft.why = lead;
        var mm = JSON.parse(localStorage.getItem("tsb_read_minutes")); if (mm) draft.minutes = mm;
        var st = JSON.parse(localStorage.getItem("tsb_read_style")); if (st) draft.style = st;
      } catch (e) {}
      step = 0;
      wrap = build();
      body = wrap.querySelector(".ob__body");
      bind();
      show(0, "fwd");
    }
  };

  function boot() {
    if (!shouldShow()) return;
    wrap = build();
    body = wrap.querySelector(".ob__body");
    bind();
    show(0, "fwd");
    /* if a login completes while this is open, bow out gracefully */
    window.addEventListener("tsb:auth", function () {
      try { if (window.TSB_AUTH && TSB_AUTH.user && TSB_AUTH.user()) dismiss(true); } catch (e) {}
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
