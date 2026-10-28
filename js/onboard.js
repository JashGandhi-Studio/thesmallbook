/* ============================================================
   THESMALLBOOK: 🎯 FIRST-VISIT ONBOARDING v3 (onboard.js)
   Six quick steps + a picker: one less page, sharper questions:
     1 · Welcome            2 · Why you read      3 · Your shelves
     4 · Daily budget       5 · Reading style     6 · Language & look
     7 · Pick your starter shelf (tap covers on/off)
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
    /* sync session check: logged-in readers NEVER see onboarding,
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
    { id: "Productivity", ic: '<svg class="ob-ic-svg ob-ic-svg--brain" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/></svg>', t: "Close my 47 open brain tabs", s: "Focus, deep work, zero chaos" },
    { id: "Money & Finance", ic: '<svg class="ob-ic-svg ob-ic-svg--money" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>', t: "Make money make sense", s: "Earn it · keep it · grow it" },
    { id: "Business & Startups", ic: '<svg class="ob-ic-svg ob-ic-svg--biz" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/></svg>', t: "Build something of my own", s: "Founder brain, minus the burnout" },
    { id: "Psychology & People", ic: '<svg class="ob-ic-svg ob-ic-svg--psych" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>', t: "Read people like books", s: "Why everyone does that thing" },
    { id: "Power & Strategy", ic: '<svg class="ob-ic-svg ob-ic-svg--power" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21h14M7 21v-4l2-2v-3a3 3 0 0 1 6 0v3l2 2v4M9 5l3-3 3 3-1.5 4h-3L9 5z"/></svg>', t: "Win quietly", s: "Chess moves for real life" },
    { id: "Creativity", ic: '<svg class="ob-ic-svg ob-ic-svg--art" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/></svg>', t: "Make stuff people stare at", s: "Ideas that actually slap" },
    { id: "Self-Improvement", ic: '<svg class="ob-ic-svg ob-ic-svg--growth" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-9M12 13a5 5 0 0 1 5-5h2a7 7 0 0 1-7 7M12 13a5 5 0 0 0-5-5H5a7 7 0 0 0 7 7"/></svg>', t: "Fix my habits (and my sleep)", s: "Become v2.0 of me" },
    { id: "History", ic: '<svg class="ob-ic-svg ob-ic-svg--hist" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M4 18h16M4 10h16M12 3L2 8h20L12 3zM6 10v8M10 10v8M14 10v8M18 10v8"/></svg>', t: "Steal plays from dead empires", s: "Old games, new wins" }
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
  /* v292: the fixes list, pick what you want fixed, the shelf builds itself */
  var FIXES = [
    { cat: "Money & Finance",      ic: '<svg class="ob-ic-svg ob-ic-svg--money" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>', t: "Get good with money",     s: "budgets · investing · zero scams" },
    { cat: "Business & Startups",  ic: '<svg class="ob-ic-svg ob-ic-svg--biz" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/></svg>', t: "Build the side hustle",   s: "real founder plays, minus jargon" },
    { cat: "Psychology & People",  ic: '<svg class="ob-ic-svg ob-ic-svg--psych" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>', t: "Understand humans",       s: "negotiate · persuade · read rooms" },
    { cat: "Power & Strategy",     ic: '<svg class="ob-ic-svg ob-ic-svg--power" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21h14M7 21v-4l2-2v-3a3 3 0 0 1 6 0v3l2 2v4M9 5l3-3 3 3-1.5 4h-3L9 5z"/></svg>', t: "Get strategic",           s: "see three moves ahead" },
    { cat: "Productivity",         ic: '<svg class="ob-ic-svg ob-ic-svg--brain" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/></svg>', t: "Get my focus back",       s: "deep work on a calm schedule" },
    { cat: "Self-Improvement",     ic: '<svg class="ob-ic-svg ob-ic-svg--growth" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-9M12 13a5 5 0 0 1 5-5h2a7 7 0 0 1-7 7M12 13a5 5 0 0 0-5-5H5a7 7 0 0 0 7 7"/></svg>', t: "Upgrade the basics",      s: "habits · sleep · discipline" },
    { cat: "Creativity",           ic: '<svg class="ob-ic-svg ob-ic-svg--art" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/></svg>', t: "Make better things",      s: "ideas with a kick" },
    { cat: "History",              ic: '<svg class="ob-ic-svg ob-ic-svg--hist" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M4 18h16M4 10h16M12 3L2 8h20L12 3zM6 10v8M10 10v8M14 10v8M18 10v8"/></svg>', t: "Learn from the falls",    s: "empires · crashes · comebacks" },
    { cat: "Leadership",           ic: '<svg class="ob-ic-svg ob-ic-svg--lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h7l-5.5 4.5 2 7-6.5-4.5-6.5 4.5 2-7L3 9h7z"/></svg>', t: "Run the room",            s: "lead teams without breaking them" },
    { cat: "__surprise__",         ic: '<svg class="ob-ic-svg ob-ic-svg--surp" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>', t: "Surprise me",             s: "a bit of everything, hand-picked" }
  ];
  var STYLES = [
    { id: "skim", ic: '<svg class="ob-ic-svg ob-ic-svg--bolt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', t: "Just the tactics, coach", s: "Key lessons, in and out" },
    { id: "steady", ic: '<svg class="ob-ic-svg ob-ic-svg--story" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>', t: "Story me through it", s: "Case studies & real examples" },
    { id: "deep", ic: '<svg class="ob-ic-svg ob-ic-svg--deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>', t: "Autopsies & deep dives", s: "Everything open, graves included" },
    { id: "listen", ic: '<svg class="ob-ic-svg ob-ic-svg--listen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>', t: "Read it to me", s: "Audio lessons while I move" }
  ];
  var MINUTES = [5, 10, 20, 30];
  var MIN_LABEL = {
    5: '<svg class="ob-min-svg ob-min-svg--5" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12c4-6 12-4 15 0-3 4-11 6-15 0z"/><path d="M6 12L2 9v6l4-3z"/><circle cx="17" cy="11" r="1" fill="currentColor"/></svg> 5′',
    10: '<svg class="ob-min-svg ob-min-svg--10" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg> 10′',
    20: '<svg class="ob-min-svg ob-min-svg--20" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> 20′',
    30: '<svg class="ob-min-svg ob-min-svg--30" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 13c1.5-4 6-7 12-7 4 0 7 2 8 5-1 3-4 6-9 6-3 0-5.5-.8-7.5-2L2 16v-3z"/><path d="M10 6V2"/><circle cx="18" cy="11" r="1" fill="currentColor"/></svg> 30′'
  };
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
  var TOTAL = 7;

  /* ---------- the payoff: a starter shelf built from the answers ---------- */
  function starterShelf(maxPicks) {
    var pick = [], seen = {}, order = [];
    if (draft.why) order.push(draft.why);
    (draft.shelves || []).forEach(function (c) { if (order.indexOf(c) < 0) order.push(c); });
    if (!order.length) order = shelves().slice(0, 3);
    function readMin(b) { var m = parseInt(b.readTime, 10); return isNaN(m) ? 15 : m; }
    var budget = draft.minutes || 10;
    var seedStr = (draft.why || "") + (draft.shelves || []).join("") + (draft.minutes || "") + (draft.style || "");
    function seedRank(str) {
      var h = 0;
      for (var s = 0; s < str.length; s++) h = ((h << 5) - h + str.charCodeAt(s)) | 0;
      return Math.abs(h);
    }
    var userSeed = seedRank(seedStr);

    var pools = {};
    (window.BOOKS || []).forEach(function (b) { (pools[b.category] = pools[b.category] || []).push(b); });
    Object.keys(pools).forEach(function (k) {
      pools[k].sort(function (a, b) {
        if (draft.style === "deep") { var d = (b.graveLink ? 1 : 0) - (a.graveLink ? 1 : 0); if (d) return d; }
        // Diverse preference scoring rather than static minimum-length forcing
        var scoreA = 0, scoreB = 0;
        var rA = readMin(a), rB = readMin(b);
        if (budget <= 10) {
          if (rA <= 10) scoreA += 2;
          if (rB <= 10) scoreB += 2;
        } else {
          if (rA >= 10) scoreA += 2;
          if (rB >= 10) scoreB += 2;
        }
        if (draft.style === "skim" && (a.lessons || []).length <= 7) scoreA += 1;
        if (draft.style === "skim" && (b.lessons || []).length <= 7) scoreB += 1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        // User-specific deterministic permutation so different selections yield diverse shelves
        var hA = (seedRank(a.id) ^ userSeed) % 97;
        var hB = (seedRank(b.id) ^ userSeed) % 97;
        return hA - hB;
      });
    });
    var idx = {};
    var added = true;
    var want = maxPicks || 6;
    while (pick.length < want && added) {
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
    (window.BOOKS || []).forEach(function (b) { if (pick.length < want && !seen[b.id]) { seen[b.id] = 1; pick.push(b); } });
    pick = pick.slice(0, want);
    /* v292: 1 or 2 picked for the reader first, then the fresh books, then the rest of the matches */
    var head = pick.slice(0, Math.min(2, pick.length));
    var rest = pick.slice(2);
    var inPool = {};
    head.concat(rest).forEach(function (b) { inPool[b.id] = 1; });
    var news = [];
    var ntwList = (window.TSB_CONFIG && TSB_CONFIG.NEW_THIS_WEEK) || [];
    // Personalize NEW books: prioritize new additions matching user selected categories first
    ntwList.forEach(function (id) {
      if (news.length >= 6) return;
      if (inPool[id]) return;
      for (var k = 0; k < (window.BOOKS || []).length; k++) {
        var bCand = BOOKS[k];
        if (bCand.id === id && order.indexOf(bCand.category) >= 0) {
          inPool[id] = 1; news.push(bCand); break;
        }
      }
    });
    // Top up to 6 fresh books from NEW_THIS_WEEK
    ntwList.forEach(function (id) {
      if (news.length >= 6) return;
      if (inPool[id]) return;
      for (var k2 = 0; k2 < (window.BOOKS || []).length; k2++) {
        if (BOOKS[k2].id === id) { inPool[id] = 1; news.push(BOOKS[k2]); break; }
      }
    });
    return head.concat(news, rest).slice(0, want);
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
  /* ---------- starter-shelf picker (v221) ---------- */
  var recPoolCache = null;
  function recPool() {
    if (!recPoolCache) recPoolCache = starterShelf(12);
    return recPoolCache;
  }
  function newCount() {
    try { return ((window.TSB_CONFIG && TSB_CONFIG.NEW_THIS_WEEK) || []).length; } catch (e) { return 0; }
  }
  function newIds() {
    var out = {};
    try { ((window.TSB_CONFIG && TSB_CONFIG.NEW_THIS_WEEK) || []).forEach(function (id) { out[id] = 1; }); } catch (e) {}
    return out;
  }
  function ensurePicks() {
    recPoolCache = null;
    var pool = recPool();
    if (!draft.picks || !draft.picks.length) {
      draft.picks = [];
      pool.slice(0, 6).forEach(function (b) { draft.picks.push(b.id); });
    }
    var valid = {};
    (window.BOOKS || []).forEach(function (b) { valid[b.id] = 1; });
    draft.picks = draft.picks.filter(function (id) { return valid[id]; });
  }
  function paintPicks() {
    var c = body && body.querySelector("#obPickCtr");
    if (c) c.textContent = "✓ " + (draft.picks || []).length + " on your shelf · tap covers to add or remove";
    if (!body) return;
    body.querySelectorAll("[data-pick]").forEach(function (b) {
      b.classList.toggle("is-off", (draft.picks || []).indexOf(b.dataset.pick) < 0);
    });
  }

  function stepHtml(i) {
    switch (i) {
      case 0:
        var savedName = "";
        try { savedName = localStorage.getItem("tsb_reader_name") || ""; } catch (e) {}
        return '<div class="ob-step__center ob-hero">' +
          '<span class="ob-hero__deco ob-hero__deco--sq" aria-hidden="true"></span>' +
          '<span class="ob-hero__deco ob-hero__deco--circ" aria-hidden="true"></span>' +
          '<span class="ob-hero__deco ob-hero__deco--ring" aria-hidden="true"></span>' +
          '<div class="ob-logo">📕</div>' +
          '<span class="ob-eyebrow">WELCOME TO</span>' +
          '<h2 class="ob-hero__t">The<span>Small</span>Book</h2>' +
          '<p class="ob-tag">READ 1 BOOK IN 8 MINUTES. BECOME 1% BETTER EVERY DAY.</p>' +
          '<p class="ob-sub">500+ books (520 curated editions), distilled into punchy masterclass frameworks you can apply today. Six quick questions tailor the entire library to your exact ambition.</p>' +
          '<div class="ob-guest-box" style="margin:16px auto 14px;max-width:320px;text-align:left;">' +
            '<label for="obReaderName" style="display:block;font:800 11px var(--font-head);letter-spacing:1px;text-transform:uppercase;color:var(--ink);margin-bottom:6px;">Your Name (Guest / Sign In)</label>' +
            '<div style="display:flex;gap:8px;">' +
              '<input id="obReaderName" type="text" maxlength="24" placeholder="Enter guest name (e.g. Alex)" value="' + (savedName ? savedName.replace(/"/g, "&quot;") : "") + '" style="flex:1;border:2.5px solid var(--ink);border-radius:12px;padding:11px 14px;font:700 13px var(--font-body);background:var(--paper);color:var(--ink);box-shadow:3px 3px 0 var(--ink);outline:none;">' +
            '</div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:7px;font:600 11px var(--font-body);color:var(--muted);">' +
              '<span>Reads instantly as Guest</span>' +
              '<a href="login.html?next=index.html" style="color:var(--ink);font-weight:800;text-decoration:underline;">Or sign in →</a>' +
            '</div>' +
          '</div>' +
          '<div class="ob-btns ob-btns--col">' +
            '<button class="ob-cta" data-next>🚀 GET STARTED →</button>' +
          '</div>' +
          '<p class="ob-fine">Takes 60 seconds · instant starter shelf · unlimited reading free</p>' +
          '</div>';
      case 1:
        return "<h2>What is your primary reading focus?</h2>" +
          '<p class="ob-sub">Your main ambition. The library will lead with it.</p>' +
          '<div class="ob-rows">' + rows(WHYS, "why", draft.why, true) + "</div>" +
          '<div class="ob-btns"><button class="ob-cta" data-next data-need="why">Continue →</button></div>';
      case 2:
        return "<h2>And what else are we fixing?</h2>" +
          '<p class="ob-sub">Pick your fixes and the shelf builds itself around them. Fine-tune the genres later.</p>' +
          '<div class="ob-rows">' + FIXES.map(function (f) {
            var on = f.cat === "__surprise__" ? draft.shelves.length >= 8 : draft.shelves.indexOf(f.cat) >= 0;
            return '<button class="ob-row' + (on ? " on" : "") + '" data-shelf="' + f.cat.replace(/"/g, "&quot;") + '"><span class="ic">' + f.ic +
              "</span><span>" + f.t + "<small>" + f.s + '</small></span><span class="tick">✓</span></button>';
          }).join("") + "</div>" +
          '<div class="ob-btns"><button class="ob-cta" data-next data-need="shelves">Continue →</button></div>';
      case 3:
        return "<h2>Real talk: your attention span today?</h2>" +
          '<p class="ob-sub">We’ll respect it. No 40-minute walls, no guilt.</p>' +
          '<div class="ob-seg">' + MINUTES.map(function (m) {
            return '<button class="' + (draft.minutes === m ? "on" : "") + '" data-min="' + m + '">' + (MIN_LABEL[m] || m + "′") + "</button>";
          }).join("") + "</div>" +
          '<p class="ob-sub ob-sub--mt">“' + (MIN_SUB[draft.minutes] || "one chai") + '” it is: one lesson fits exactly that.</p>' +
          '<div class="ob-btns"><button class="ob-cta" data-next>Continue →</button></div>';
      case 4:
        return "<h2>How should lessons taste?</h2>" +
          '<p class="ob-sub">Every book in the app obeys this.</p>' +
          '<div class="ob-rows">' + rows(STYLES, "style", draft.style, true) + "</div>" +
          '<div class="ob-btns"><button class="ob-cta" data-next data-need="style">Continue →</button></div>';
      case 5:
        return "<h2>Language & look</h2>" +
          '<p class="ob-sub">Reading language: summaries, chat and audio switch instantly.</p>' +
          '<div class="ob-langs">' + langList().map(function (l) {
            var cur = draft.lang || ((window.TSB_LANG && TSB_LANG.get) ? TSB_LANG.get() : "en");
            return '<button class="ob-lang' + (l.code === cur ? " on" : "") + '" data-lang="' + l.code + '"><span>' + l.flag + "</span>" + l.name + "</button>";
          }).join("") + "</div>" +
          '<p class="ob-sub ob-sub--mt" style="margin-top:14px;">And your vibe, flip any time in Settings:</p>' +
          '<div class="ob-rows">' +
            '<button class="ob-row' + (draft.theme === "light" ? " on" : "") + '" data-theme-pick="light"><span class="ic">☀️</span><span>Light<small>Paper & ink</small></span><span class="tick">✓</span></button>' +
            '<button class="ob-row' + (draft.theme === "dark" ? " on" : "") + '" data-theme-pick="dark"><span class="ic">🌙</span><span>Dark<small>Low-light reading</small></span><span class="tick">✓</span></button>' +
          "</div>" +
          '<div class="ob-btns"><button class="ob-cta" data-next>Pick my books →</button></div>';
      case 6:
        recPoolCache = null;
        ensurePicks(body);
        return "<h2>Pick your starter shelf 🎁</h2>" +
          '<p class="ob-sub">Handpicked from your answers, then ' + newCount() + ' fresh books (look for NEW), tap a cover to keep it or drop it. These lead your Home.</p>' +
          '<p class="ob-pickctr" id="obPickCtr">✓ ' + (draft.picks || []).length + " on your shelf · tap covers to add or remove</p>" +
          '<div class="ob-shelf">' + recPool().map(function (b, i) {
            var on = (draft.picks || []).indexOf(b.id) >= 0;
            var isNew = newIds()[b.id];
            return '<button class="ob-book' + (on ? "" : " is-off") + '" data-pick="' + b.id + '">' +
              '<span class="ob-book__n">' + (i + 1) + "</span>" +
              (isNew ? '<span class="ob-book__new">NEW</span>' : "") +
              '<span class="ob-book__pick">✓</span>' +
              '<img src="assets/covers/' + encodeURIComponent(b.id) + '.jpg" alt="" loading="lazy">' +
              '<span class="ob-book__t">' + b.title + "</span></button>";
          }).join("") + "</div>" +
          '<p class="ob-shelfnote">They wait for you on Home, tap any time to start reading.</p>' +
          '<div class="ob-btns"><button class="ob-cta" data-finish>Save & explore home →</button></div>';

    }
    return "";
  }

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "obwrap";
    wrap.innerHTML =
      '<div class="ob ob--page" role="dialog" aria-modal="true" aria-label="Welcome to TheSmallBook">' +
        '<span class="ob__bg ob__bg--sq" aria-hidden="true"></span>' +
        '<span class="ob__bg ob__bg--circ" aria-hidden="true"></span>' +
        '<header class="ob__bar">' +
          '<button class="ob__back" data-back aria-label="Back">←</button>' +
          '<div class="ob__prog">' + Array.apply(null, Array(TOTAL)).map(function (_, i) { return '<i data-seg="' + i + '"><b>' + (i + 1) + "</b></i>"; }).join("") + "</div>" +
        "</header>" +
        '<span class="ob__count" id="obCount"></span>' +
        '<div class="ob__body"></div>' +
      "</div>";
    document.body.appendChild(wrap);
    document.documentElement.classList.add("ob-lock");
    return wrap;
  }

  var wrap = null;
  var body = null;
  var busy = false;

  var STEP_NAMES = ["Welcome", "Your battle", "Your fixes", "Daily time", "Taste", "Look", "Your books"];
  function paintProg() {
    wrap.querySelectorAll("[data-seg]").forEach(function (s, i) {
      s.classList.toggle("on", i <= step);
      s.classList.toggle("now", i === step);
    });
    wrap.querySelector(".ob__back").style.visibility = step === 0 ? "hidden" : "visible";
    var c = wrap.querySelector(".ob__count");
    if (c) c.textContent = step === 0 ? "THE TUNE-UP" : "STEP " + step + " / " + (TOTAL - 1) + " · " + (STEP_NAMES[step] || "").toUpperCase();
    wrap.classList.toggle("obwrap--welcome", step === 0);
  }

  function show(i, dir) {
    var old = body.querySelector(".ob-step");
    function mount() {
      var el = document.createElement("div");
      el.className = "ob-step ob-step--enter" + (dir === "back" ? " ob-step--enterback" : "");
      var nn = (i + 1 < 10 ? "0" : "") + (i + 1);
      var chrome = i === 0
        ? '<div class="ob-chrome"><span class="ob-chrome__l">THE TUNE-UP · A WORD BEFORE WE BEGIN</span></div>'
        : '<div class="ob-chrome"><b class="ob-chrome__n">' + nn + '</b><span class="ob-chrome__l">CHAPTER ' + nn + ' · ' + (STEP_NAMES[i] || "").toUpperCase() + "</span></div>";
      el.innerHTML = chrome + stepHtml(i);
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

  /* close for good, never trap the reader */
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
    /* never auto-play walkthrough after onboarding; available on-demand via ? or settings */
    set("tsb_walk_done", window.TSB_BUILD || "323");
    set("tsb_tour_done", true);
    set("tsb_interests", order.length ? order : draft.shelves);
    set("tsb_read_minutes", draft.minutes);
    set("tsb_read_style", draft.style || "steady");
    var lead = draft.why || draft.shelves[0];
    if (lead) set("tsb_ob_lead", lead);
    try { set("tsb_starter_shelf", (draft.picks && draft.picks.length ? draft.picks : starterShelf().map(function (b) { return b.id; }))); } catch (e) {}
  }

  function showFirstReadModal() {
    var picks = (draft.picks && draft.picks.length) ? draft.picks : [];
    var all = window.BOOKS || [];
    var recBooks = [];

    // Select personal picks and tailored recommendations (at least 6 books for swipeable selection)
    for (var i = 0; i < picks.length; i++) {
      for (var j = 0; j < all.length; j++) {
        if (all[j].id === picks[i] && recBooks.indexOf(all[j]) < 0) {
          recBooks.push(all[j]);
          break;
        }
      }
      if (recBooks.length >= 8) break;
    }

    // Top up from user selected shelves
    var userShelves = (draft.shelves || []).concat(draft.why ? [draft.why] : []);
    if (recBooks.length < 6 && userShelves.length) {
      for (var sIdx = 0; sIdx < userShelves.length; sIdx++) {
        var sName = userShelves[sIdx];
        var shelfMatches = all.filter(function (b) {
          return b.category === sName || (b.tags && b.tags.indexOf(sName) >= 0);
        });
        for (var mIdx = 0; mIdx < shelfMatches.length; mIdx++) {
          if (recBooks.indexOf(shelfMatches[mIdx]) < 0) {
            recBooks.push(shelfMatches[mIdx]);
          }
          if (recBooks.length >= 6) break;
        }
        if (recBooks.length >= 6) break;
      }
    }

    // Top up from starterShelf
    if (recBooks.length < 6) {
      var pool = starterShelf(8);
      for (var k = 0; k < pool.length; k++) {
        if (recBooks.indexOf(pool[k]) < 0) recBooks.push(pool[k]);
        if (recBooks.length >= 6) break;
      }
    }

    // Fallback if still under 6
    if (recBooks.length < 6) {
      for (var a = 0; a < all.length; a++) {
        if (recBooks.indexOf(all[a]) < 0) recBooks.push(all[a]);
        if (recBooks.length >= 6) break;
      }
    }
    if (!recBooks.length) return;

    var readerName = "";
    try { readerName = localStorage.getItem("tsb_reader_name") || ""; } catch (e) {}
    if (!readerName || readerName === "Guest Reader") readerName = "";

    var modal = document.createElement("div");
    modal.className = "firstread-wrap";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Welcome to TheSmallBook");

    var railHtml = recBooks.map(function (b) {
      var time = b.readTime || "8 min";
      return '<a href="book.html?id=' + encodeURIComponent(b.id) + '" class="firstread-item">' +
        '<div class="firstread-cover">' +
          '<img src="assets/covers/' + encodeURIComponent(b.id) + '.jpg" alt="' + b.title.replace(/"/g, "&quot;") + '" loading="lazy">' +
        '</div>' +
        '<h3 class="firstread-booktitle">' + b.title + '</h3>' +
        '<span class="firstread-author">' + b.author + '</span>' +
        '<span class="firstread-time">⏱ ' + time + '</span>' +
        '<span class="firstread-readbtn">Read →</span>' +
      '</a>';
    }).join("");

    var welcomeHeading = "WELCOME TO THESMALLBOOK" + (readerName ? ", " + readerName.toUpperCase() : "");

    modal.innerHTML =
      '<div class="firstread-card">' +
        '<button class="firstread-close" aria-label="Close" id="frClose">✕</button>' +
        '<div class="firstread-header">' +
          '<h2 class="firstread-title">' + welcomeHeading + '</h2>' +
          '<p class="firstread-sub">Here are your personal book recommendations</p>' +
          '<div class="firstread-swipe-hint">↔ SWIPE TO EXPLORE ' + recBooks.length + ' RECOMMENDATIONS</div>' +
        '</div>' +
        '<div class="firstread-rail">' + railHtml + '</div>' +
        '<button type="button" class="firstread-btn" id="frHomeBtn">EXPLORE ALL BOOKS →</button>' +
      '</div>';

    document.body.appendChild(modal);

    function dismissModal() {
      modal.style.opacity = "0";
      modal.style.transition = "opacity .22s cubic-bezier(0.16, 1, 0.3, 1)";
      setTimeout(function () {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      }, 220);
    }

    var closeBtn = modal.querySelector("#frClose");
    if (closeBtn) closeBtn.addEventListener("click", dismissModal);
    var homeBtn = modal.querySelector("#frHomeBtn");
    if (homeBtn) homeBtn.addEventListener("click", dismissModal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) dismissModal();
    });
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
    try { set("tsb_trial_start", Date.now()); } catch (e) {}
    body.innerHTML = '<div class="ob-step ob-step--done"><div class="ob-logo">🎉</div><h2>Okay, you\u2019re in</h2>' +
      '<p class="ob-sub">' + (lead ? "📚 Leading with " + lead + "<br>" : "") +
      "⏱ " + draft.minutes + " min a day · " + styleName + "<br>" +
      "🌐 " + (draft.lang && draft.lang !== "en" ? draft.lang.toUpperCase() : "EN") + " · " +
      (draft.theme === "dark" ? "🌙 dark" : "☀️ light") + "</p>" +
      '<p class="ob-sub">Your shelf is ready, and you have a <b>15-minute free taster</b> on the house. Sign in any time to keep it forever.</p></div>';
    setTimeout(function () {
      wrap.classList.add("obwrap--off");
      document.documentElement.classList.remove("ob-lock");
      setTimeout(function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        showFirstReadModal();
        /* apply the tuned shelf live, tap the matching filter chip */
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
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target && e.target.id === "obReaderName") {
        e.preventDefault();
        var nextBtn = wrap.querySelector("[data-next]");
        if (nextBtn) nextBtn.click();
      }
    });

    wrap.addEventListener("click", function (e) {
      var t;
      if ((t = e.target.closest("[data-next]"))) {
        if (step === 0) {
          var nameInput = body.querySelector("#obReaderName");
          var rawName = nameInput ? (nameInput.value || "").trim() : "";
          if (!rawName) rawName = "Guest Reader";
          try {
            localStorage.setItem("tsb_reader_name", rawName);
            localStorage.setItem("tsb_guest_user", rawName === "Guest Reader" ? "true" : "false");
          } catch (e) {}
        }
        var need = t.getAttribute("data-need");
        if (need === "why" && !draft.why) return shakeNeed(".ob-rows");
        if (need === "style" && !draft.style) return shakeNeed(".ob-rows");
        if (need === "shelves" && !draft.shelves.length) return shakeNeed(".ob-rows");
        set("tsb_onboard_draft", draft);
        goNext();
        return;
      }
      if (e.target.closest("[data-finish]")) { finish(); return; }
      if ((t = e.target.closest("[data-pick]"))) {
        /* tap a cover → keep it on the starter shelf or drop it */
        ensurePicks();
        var id = t.getAttribute("data-pick");
        var at = draft.picks.indexOf(id);
        if (at >= 0) draft.picks.splice(at, 1); else draft.picks.push(id);
        set("tsb_onboard_draft", draft);
        paintPicks();
        return;
      }
      if (e.target.closest("[data-back]")) { goBack(); return; }
      if ((t = e.target.closest("[data-why]"))) {
        recPoolCache = null;
        draft.why = t.getAttribute("data-why");
        body.querySelectorAll("[data-why]").forEach(function (b) { b.classList.toggle("on", b === t); });
        set("tsb_onboard_draft", draft);
        setTimeout(function () { if (step === 1 && !busy) goNext(); }, 200);
        return;
      }
      if ((t = e.target.closest("[data-shelf]"))) { recPoolCache = null;
        var c = t.getAttribute("data-shelf");
        if (c === "__surprise__") {
          if (draft.shelves.length >= 8) { draft.shelves = []; }
          else { draft.shelves = shelves().slice(0, 8); }
          body.querySelectorAll("[data-shelf]").forEach(function (b) {
            var v = b.getAttribute("data-shelf");
            b.classList.toggle("on", v === "__surprise__" ? draft.shelves.length >= 8 : draft.shelves.indexOf(v) >= 0);
          });
        } else {
          var ix = draft.shelves.indexOf(c);
          if (ix >= 0) draft.shelves.splice(ix, 1); else draft.shelves.push(c);
          t.classList.toggle("on", ix < 0);
          var sur = body.querySelector('[data-shelf="__surprise__"]');
          if (sur) sur.classList.toggle("on", draft.shelves.length >= 8);
        }
        return;
      }
      if ((t = e.target.closest("[data-min]"))) {
        draft.minutes = Number(t.getAttribute("data-min"));
        body.querySelectorAll("[data-min]").forEach(function (b) { b.classList.toggle("on", b === t); });
        set("tsb_onboard_draft", draft);
        setTimeout(function () { if (step === 3 && !busy) goNext(); }, 200);
        return;
      }
      if ((t = e.target.closest("[data-style]"))) {
        draft.style = t.getAttribute("data-style");
        body.querySelectorAll("[data-style]").forEach(function (b) { b.classList.toggle("on", b === t); });
        set("tsb_onboard_draft", draft);
        setTimeout(function () { if (step === 4 && !busy) goNext(); }, 200);
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
