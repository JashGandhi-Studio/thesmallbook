/* ============================================================
   THESMALLBOOK, THE GRAVEYARD (graveyard2.js) · v336
   A calm, readable graveyard in the app's own language.
   - Today's grave: one tombstone, gently afloat
   - Case files + Test your idea, one tap each
   - Search, causes, sort; the list grows as you scroll
   - The case: slides up, reads like a short chapter, ends on
     the book that would have saved them
   graveyard.js stays the engine (share card, photos, wire).
   ============================================================ */
(function () {
  "use strict";
  var F = window.FAILURES || [];
  if (!F.length || document.getElementById("gy2")) return;
  var G = window.TSB_GRAVE || {};
  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e0) {}

  var CAT = {
    STARTUP: ["Startups", "#3E7CB1"], MONEY: ["Money", "#2F8F6A"], FRAUD: ["Fraud", "#B9503A"],
    EGO: ["Ego", "#7A5BC0"], BUSINESS: ["Business", "#3A5BA0"], TRUST: ["Trust", "#A87C00"],
    HISTORY: ["History", "#8B6B3E"], FAME: ["Fame", "#C46A2B"], TECH: ["Tech", "#4B6B8A"]
  };
  var ORDER = ["STARTUP", "BUSINESS", "MONEY", "FRAUD", "EGO", "HISTORY", "TRUST", "FAME", "TECH"];
  var IC = {
    back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    folder: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M8 13h8"/></svg>',
    flask: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 006 21h12a1.7 1.7 0 001.5-2.5L14 9V3"/><path d="M7 15h10"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
    book: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5"/></svg>'
  };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
  function cat(f) { return CAT[f.category] || ["Other", "#6E6658"]; }
  function usd(f) { try { return G.lossUSD ? G.lossUSD(f) : 0; } catch (e) { return 0; } }
  function fmt(n) { try { return G.fmtUSD ? G.fmtUSD(n) : ""; } catch (e) { return ""; } }
  function yr(f) { try { return G.yearNum ? G.yearNum(f) : parseInt(f.year, 10) || 0; } catch (e) { return 0; } }
  function cause(f) {
    var c = ""; try { c = G.causeOf ? G.causeOf(f) : ""; } catch (e) {}
    c = String(c).replace(/^CAUSE OF DEATH:\s*/i, "").toLowerCase();
    return c ? c.charAt(0).toUpperCase() + c.slice(1) : "";
  }
  function bookOf(id) {
    try { if (typeof BOOKS !== "undefined") for (var i = 0; i < BOOKS.length; i++) if (BOOKS[i].id === id) return BOOKS[i]; } catch (e) {}
    return null;
  }
  function stone(f, cls) {
    return '<span class="gy-stone ' + (cls || "") + '" style="--c:' + cat(f)[1] + '" aria-hidden="true"><i>' + esc(f.emoji || "") + '</i><small>' + esc(f.year) + '</small></span>';
  }

  /* the deep two-act stories load once, quietly */
  var deepWait = [];
  function deep(cb) {
    if (window.GRAVE_DEEP) { cb(window.GRAVE_DEEP); return; }
    deepWait.push(cb);
    if (deepWait.length > 1) return;
    var s = document.createElement("script");
    s.src = "js/graveyard-content.js?v=338";
    s.onload = s.onerror = function () { var w = deepWait; deepWait = []; w.forEach(function (fn) { try { fn(window.GRAVE_DEEP || {}); } catch (e) {} }); };
    document.head.appendChild(s);
  }

  /* ---------- today's grave: the same one all day, a new one tomorrow ---------- */
  var day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
  var today = F[(day * 7919) % F.length];
  var total = 0; F.forEach(function (f) { total += usd(f); });
  var causes = {}; F.forEach(function (f) { causes[f.category] = 1; });

  /* ---------- build ---------- */
  var root = document.createElement("div");
  root.id = "gy2";
  var C = window.TSB_CASEFILE || null;
  var chips = '<button type="button" class="gy-chip on" data-cat="ALL">All</button>' + ORDER.filter(function (k) { return causes[k]; }).map(function (k) {
    return '<button type="button" class="gy-chip" data-cat="' + k + '"><b style="background:' + CAT[k][1] + '"></b>' + CAT[k][0] + '</button>';
  }).join("");
  root.innerHTML =
    '<header class="gy-top"><a class="gy-ib" href="index.html" data-gy-back aria-label="Back">' + IC.back + '</a><span class="gy-top__t">Graveyard</span><span class="gy-ib gy-ib--ghost"></span></header>' +
    '<section class="gy-hero">' +
      '<p class="gy-kick">Learn from the ones who paid</p>' +
      '<h1 class="gy-h1">The graveyard</h1>' +
      '<p class="gy-sub">' + F.length + ' real falls. One lesson each.</p>' +
      '<div class="gy-stats"><span><b>' + F.length + '</b>falls</span><span><b>' + esc(fmt(total) || "$1T+") + '</b>burned</span><span><b>' + Object.keys(causes).length + '</b>causes</span></div>' +
    '</section>' +
    '<button type="button" class="gy-today" data-g="' + esc(today.id) + '" style="--c:' + cat(today)[1] + '">' +
      '<span class="gy-today__fog" aria-hidden="true"></span>' +
      '<span class="gy-today__lbl">Today&rsquo;s grave</span>' +
      '<span class="gy-today__stone" aria-hidden="true"><em>R.I.P.</em><i>' + esc(today.emoji || "") + '</i><small>' + esc(today.year) + '</small></span>' +
      '<b class="gy-today__name">' + esc(today.name) + '</b>' +
      '<span class="gy-today__ep">' + esc(today.title) + '</span>' +
      '<span class="gy-today__loss">' + esc(today.loss) + '</span>' +
      '<span class="gy-today__go">Read the case ' + IC.arrow + '</span>' +
    '</button>' +
    '<div class="gy-tools">' +
      '<a class="gy-tool" href="casefile.html"><span class="gy-tool__ic">' + IC.folder + '</span><b>Case files</b><small>' + (C ? "Case " + esc(C.no) + ": " + esc(C.title) : "Play detective") + '</small><em data-gy-count></em></a>' +
      '<button type="button" class="gy-tool" data-gy-idea><span class="gy-tool__ic">' + IC.flask + '</span><b>Test your idea</b><small>See which graves it resembles</small></button>' +
    '</div>' +
    '<div class="gy-desk" data-gy-desk></div>' +
    '<div class="gy-find">' +
      '<label class="gy-search">' + IC.search + '<input type="search" placeholder="Search ' + F.length + ' falls, names, years" aria-label="Search the graveyard" autocomplete="off" enterkeyhint="search"></label>' +
      '<div class="gy-chips" role="tablist">' + chips + '</div>' +
    '</div>' +
    '<div class="gy-bar"><span class="gy-count" aria-live="polite"></span>' +
      '<div class="gy-sort" role="group" aria-label="Sort">' +
        '<button type="button" data-sort="shuffle" class="on">' + IC.shuffle + '<span>Mixed</span></button>' +
        '<button type="button" data-sort="burned"><span>Biggest</span></button>' +
        '<button type="button" data-sort="newest"><span>Newest</span></button>' +
        '<button type="button" data-sort="oldest"><span>Oldest</span></button>' +
      '</div></div>' +
    '<div class="gy-list" role="list"></div>' +
    '<div class="gy-more" aria-hidden="true"></div>' +
    '<section class="gy-fresh" hidden></section>' +
    '<p class="gy-foot">Documented public history, summarised to learn from. They were once the smartest people in the room; that is the point.</p>';
  document.body.insertBefore(root, document.body.firstChild);
  document.documentElement.classList.add("gy2-on");

  /* back: to where you came from inside the app, else Today */
  root.querySelector("[data-gy-back]").addEventListener("click", function (e) {
    try { if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); } } catch (er) {}
  });

  /* the case file countdown (its data arrives a moment after this script) */
  function caseCard() {
    var el = root.querySelector("[data-gy-count]");
    C = window.TSB_CASEFILE || null;
    if (!C || !el || el.getAttribute("data-on")) return;
    el.setAttribute("data-on", "1");
    var sm = el.parentNode.querySelector("small"); if (sm) sm.textContent = "Case " + C.no + ": " + C.title;
    function tick() {
      var now = new Date(), next = new Date(now);
      next.setDate(now.getDate() + ((C.closeDay - now.getDay() + 7) % 7));
      next.setHours(C.closeHour, C.closeMin || 0, 0, 0);
      if (next - now < 24 * 36e5) next.setDate(next.getDate() + 7);
      var ms = next - now, d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5);
      el.textContent = "Closes in " + (d ? d + "d " : "") + h + "h";
    }
    tick(); setInterval(tick, 6e4);
  }
  caseCard();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", caseCard); else setTimeout(caseCard, 0);
  /* the founder's desk door (only ever painted for him) moves into the new page */
  (function () {
    var host = root.querySelector("[data-gy-desk]"), n = 0;
    var iv = setInterval(function () {
      var d = document.getElementById("cfDeskDoor");
      if (d && d.parentNode !== host) { host.appendChild(d); d.style.margin = "0"; clearInterval(iv); }
      if (++n > 20) clearInterval(iv);
    }, 600);
  })();
  root.querySelector("[data-gy-idea]").addEventListener("click", function () {
    if (location.hash === "#autopsy") { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
    location.hash = "autopsy";
  });

  /* ---------- the list ---------- */
  var list = root.querySelector(".gy-list"), more = root.querySelector(".gy-more"), countEl = root.querySelector(".gy-count");
  var input = root.querySelector(".gy-search input");
  var state = { cat: "ALL", q: "", sort: "shuffle" };
  var mixed = F.slice();
  for (var i = mixed.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = mixed[i]; mixed[i] = mixed[j]; mixed[j] = t; }
  var results = [], shown = 0, PAGE = 24;
  var hay = F.map(function (f) { return (f.name + " " + f.title + " " + f.year + " " + f.loss + " " + f.story + " " + f.lesson + " " + (f.bookTitle || "")).toLowerCase(); });
  var idx = {}; F.forEach(function (f, k) { idx[f.id] = k; });

  function row(f, n) {
    var m = usd(f), medal = state.sort === "burned" && n < 3 ? '<span class="gy-medal">' + (n + 1) + '</span>' : "";
    return '<button type="button" class="gy-row" role="listitem" data-g="' + esc(f.id) + '" style="--i:' + (n % PAGE) + '">' + stone(f) +
      '<span class="gy-row__t"><b>' + esc(f.name) + '</b><em>' + esc(f.title) + '</em></span>' +
      '<span class="gy-row__r">' + medal + (m ? '<span class="gy-row__loss">' + esc(fmt(m)) + '</span>' : "") + '<small>' + esc(cat(f)[0]) + '</small></span></button>';
  }
  function compute() {
    var q = state.q;
    var base = state.sort === "shuffle" ? mixed : F.slice();
    results = base.filter(function (f) {
      if (state.cat !== "ALL" && f.category !== state.cat) return false;
      return !q || hay[idx[f.id]].indexOf(q) !== -1;
    });
    if (state.sort === "burned") results.sort(function (a, b) { return usd(b) - usd(a); });
    else if (state.sort === "newest") results.sort(function (a, b) { return yr(b) - yr(a); });
    else if (state.sort === "oldest") results.sort(function (a, b) { return yr(a) - yr(b); });
  }
  function paint(animate) {
    compute(); shown = 0; list.innerHTML = "";
    countEl.textContent = results.length === F.length ? F.length + " graves" : results.length + (results.length === 1 ? " grave" : " graves");
    if (!results.length) { list.innerHTML = '<p class="gy-empty">No grave matches that. Try a name, a year or a word like &ldquo;debt&rdquo;.</p>'; return; }
    grow(animate);
  }
  function grow(animate) {
    var end = Math.min(results.length, shown + PAGE), h = "";
    for (var k = shown; k < end; k++) h += row(results[k], k);
    list.insertAdjacentHTML("beforeend", h);
    if (animate && !reduce) list.classList.add("gy-in");
    shown = end;
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { if (en[0].isIntersecting && shown < results.length) grow(false); }, { rootMargin: "600px 0px" }).observe(more);
  }
  var qT = 0;
  input.addEventListener("input", function () {
    clearTimeout(qT);
    qT = setTimeout(function () { state.q = input.value.trim().toLowerCase(); paint(false); }, 120);
  });
  root.querySelector(".gy-chips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-cat]"); if (!b) return;
    Array.prototype.forEach.call(this.children, function (c) { c.classList.toggle("on", c === b); });
    state.cat = b.getAttribute("data-cat"); paint(true);
    try { b.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" }); } catch (e2) {}
  });
  root.querySelector(".gy-sort").addEventListener("click", function (e) {
    var b = e.target.closest("[data-sort]"); if (!b) return;
    Array.prototype.forEach.call(this.children, function (c) { c.classList.toggle("on", c === b); });
    state.sort = b.getAttribute("data-sort"); paint(true);
  });
  paint(false);

  /* ---------- the case ---------- */
  var sheet = null, cur = null, lastFocus = null;
  /* ============================================================
     v341 · A GRAVE THAT READS LIKE A CASE FILE
     ------------------------------------------------------------
     Three things were missing from every autopsy: length to sit
     in, books to walk to afterwards, and neighbours in the same
     graveyard. And the "public record context" link is gone, as
     asked, because a case file should stand on its own words.
     ============================================================ */

  /* The pattern: one honest essay per category, written for this app and
     never repeated for the reader on the same day. It is what turns a page
     of facts into something worth ten minutes. */
  var PATTERN = {
    MONEY: "Money failures almost never begin with a bad number. They begin with a good story about a number: the deal that only works if everything goes right, the asset that only loses if the world does something it has never done, the lifestyle that only survives next year's bonus. The arithmetic always arrives late to the argument, and by then the story has a mortgage. Read the total aloud before you sign anything: what this costs if it goes wrong, who pays it, and whether you can still look at yourself across the table. Wealth that survives is usually boring, slightly slow, and kept in something you can explain to a friend in one sentence without needing a chart.",
    BUSINESS: "A business rarely dies of one decision. It dies of a decision that was right once. The distribution that worked in the first market gets pushed into a market it was never built for, the price that won the early customer gets held through a change in costs, the founder who was exactly right for the garage is still in the chair when the company needs a different animal. The warning signs are always the same three: numbers defended instead of examined, bad news arriving later each quarter, and a culture where the person who asks the awkward question is quietly moved aside. Companies do not usually fall from the top; they slide from a place where the honest conversation stopped.",
    STARTUP: "Every startup is an argument with reality, and reality has infinite patience. The failure is almost never the idea alone: it is the gap between what the founders believe the world does and what the world actually does, held together by runway. Runway is the only honest clock. Burn it faster than the learning and you die of arithmetic; burn it slower than the learning and you die of a market that moved. The founders who survive are not the ones with the best idea, they are the ones who find out what is true fastest and cheapest, and who are willing to be embarrassed early rather than quietly bankrupt later.",
    FRAUD: "Fraud is not born as a crime; it is born as a small, survivable lie during a bad week. A number padded, a loss deferred, a promise made in the hope that next month would cover it. Once told, the lie becomes structure: the next month needs a bigger lie to hold the first one up, and the person telling it stops being the author and becomes a caretaker of their own fiction. That is the trap worth studying, because none of these people set out to lie forever. They set out to lie once. The only reliable defence is the one none of them took: say the ugly truth while it is still small, when saying it costs nothing but pride.",
    EGO: "The failures built on ego share a single mechanism: success is read as a verdict on the person rather than on the decision. From that moment, being wrong stops being information and becomes an attack, and the advisor who delivers it gets removed rather than heard. What follows is a court with no dissenting voices, and a ruler who mistakes the silence for agreement. The tell is always the same: the person can no longer describe the last thing they got wrong. Keep exactly one person in your life who is allowed to tell you the unflattering version without consequence, and then actually make it consequence-free.",
    TRUST: "Trust is the cheapest asset to hold and the most expensive one to lose. The people in these files did not usually lose trust by being evil; they lost it by being careless with something small and then choosing silence. Silence is what turns a mistake into a betrayal. Every institution that survives a scandal survives it by telling the truth faster than the truth can be told about it. So the practical rule is unglamorous and total: be boringly accurate about what went wrong, say it while it is still a rumour, and let the trust cost land once instead of compounding.",
    FAME: "Fame removes the feedback that ordinary people get for free. A person who is told they are great by strangers stops hearing the small corrections that keep everyone else honest, and the circle around them begins to be paid in proximity, not in honesty. The money is usually the fast part and the taste is the slow part: a decade of income can be spent by an afternoon of appetite because nobody in the room has the standing to say no. If attention arrives, the work is to keep a life that does not depend on it: one friend from before, one boring habit, one number that only you watch.",
    HISTORY: "Grand failures have short origins: a promise given for the wrong reason, a system that rewarded optimism and punished warning, and someone at the top who had already decided what the ending would be. The scale changes, the mechanism does not. Empires and family businesses both fail when the cost of admitting a mistake is greater than the cost of continuing it. The lesson from history is not hindsight but inspection: find the place in your own life where the truth is expensive to say, and lower that price now, while everything is still calm.",
    TECH: "Technology failures are usually adoption failures wearing engineering clothes. The thing worked; the world did not want it in that shape, at that price, that soon. The people who build are rarely the people who must change the habit, and a habit is the real product. So the question before any build stays the same: whose afternoon does this quietly improve, and how many of those afternoons can I reach before the money runs out?"
  };
  function patternFor(f) {
    return PATTERN[f.category] || PATTERN.BUSINESS;
  }

  /* which shelf a grave points at, so the antidote is never a random book */
  var BOOK_SHELF = {
    MONEY: "Money & Finance",
    BUSINESS: "Business & Startups",
    STARTUP: "Business & Startups",
    FRAUD: "Power & Strategy",
    EGO: "Psychology & People",
    TRUST: "Psychology & People",
    FAME: "Psychology & People",
    HISTORY: "History",
    TECH: "Creativity"
  };
  function shelfBooks(f, skip, n) {
    var want = BOOK_SHELF[f.category] || "";
    var out = [], B = [];
    try { B = window.BOOKS || []; } catch (e) {}
    for (var i = 0; i < B.length && out.length < (n || 3); i++) {
      var b = B[i];
      if (!b || !b.id || b.id === skip) continue;
      var c = String(b.category || "") + " " + String(b.cat || "");
      if (want && c.toLowerCase().indexOf(want.split(" ")[0].toLowerCase()) < 0) continue;
      out.push(b);
    }
    if (!out.length) {
      for (var j = 0; j < B.length && out.length < (n || 3); j++) if (B[j] && B[j].id && B[j].id !== skip) out.push(B[j]);
    }
    return out;
  }
  function neighbourGraves(f, n) {
    var out = [];
    for (var i = 0; i < F.length && out.length < (n || 3); i++) {
      if (F[i].id === f.id) continue;
      if (F[i].category === f.category) out.push(F[i]);
    }
    for (var k = 0; k < F.length && out.length < (n || 3); k++) {
      if (F[k].id === f.id) continue;
      if (out.indexOf(F[k]) < 0) out.push(F[k]);
    }
    return out;
  }
  function relatedHTML(f) {
    var books = shelfBooks(f, f.book, 3);
    var graves = neighbourGraves(f, 3);
    var h = "";
    if (books.length) {
      h += '<section class="gyc-more"><h2>Where to read next</h2><div class="gyc-books">' +
        books.map(function (b) {
          var cover = b.cover || ("assets/covers/" + b.id + ".jpg");
          return '<a class="gyc-bk" href="book.html?id=' + esc(b.id) + '">' +
            '<img src="' + esc(cover) + '" alt="" width="72" height="108" loading="lazy">' +
            '<span><b>' + esc(b.title) + '</b><em>' + esc(b.author || "") + '</em></span>' +
          '</a>';
        }).join("") + "</div></section>";
    }
    if (graves.length) {
      h += '<section class="gyc-more"><h2>Neighbours in this graveyard</h2><div class="gyc-neigh">' +
        graves.map(function (g) {
          return '<button type="button" class="gyc-nb" data-gyc-goto="' + esc(g.id) + '">' +
            '<span class="gyc-nb__e" aria-hidden="true">' + esc(g.emoji || "\uD83D\uDC80") + '</span>' +
            '<span class="gyc-nb__t"><b>' + esc(g.name) + '</b><em>' + esc(g.title) + '</em></span>' +
            '<span class="gyc-nb__y">' + esc(g.year) + '</span>' +
          '</button>';
        }).join("") + "</div></section>";
    }
    return h;
  }

  function sec(title, body, cls) { return body ? '<section class="gyc-sec ' + (cls || "") + '"><h2>' + title + '</h2><p>' + esc(body) + '</p></section>' : ""; }
  function caseHTML(f, d) {
    var b = f.book ? bookOf(f.book) : null, c = cat(f), n = (idx[f.id] || 0) + 1, cz = cause(f);
    return '<div class="gyc-hero" style="--c:' + c[1] + '">' +
        '<span class="gyc-stone" aria-hidden="true"><em>R.I.P.</em><i>' + esc(f.emoji || "") + '</i><small>' + esc(f.year) + '</small></span>' +
        '<p class="gyc-cat"><b style="background:' + c[1] + '"></b>' + esc(c[0]) + ' &middot; case ' + n + ' of ' + F.length + '</p>' +
        '<h1 class="gyc-name">' + esc(f.name) + '</h1>' +
        '<p class="gyc-ep">' + esc(f.title) + '</p>' +
        '<div class="gyc-facts"><span><small>The cost</small><b>' + esc(f.loss) + '</b></span>' + (cz ? '<span><small>Cause</small><b>' + esc(cz) + '</b></span>' : "") + '</div>' +
      '</div>' +
      '<figure class="gyc-photo" hidden></figure>' +
      sec("The intent", f.intent || (d && d.origin) || f.story) +
      sec("How it grew", f.growth) +
      sec("The break", f.break || (d && d.fall)) +
      '<section class="gyc-sec gyc-sec--mistake"><h2>The fatal mistake</h2><p>' + esc(f.mistake) + '</p></section>' +
      (f.fallout ? sec("The fallout", f.fallout) : "") +
      sec("The pattern behind it", patternFor(f)) +
      '<section class="gyc-sec gyc-sec--lesson"><h2>The lesson</h2><p>' + esc(f.lesson) + '</p></section>' +
      (b ? '<a class="gyc-book" href="book.html?id=' + esc(b.id) + '"><img src="' + esc(b.cover) + '" alt="" width="64" height="96" loading="lazy"><span><small>The antidote</small><b>' + esc(b.title) + '</b><em>' + esc(b.author || "") + (b.readTime ? ' &middot; ' + esc(b.readTime) : "") + '</em></span><i>' + IC.book + 'Read</i></a>'
         : (f.bookTitle ? '<p class="gyc-booktxt">The antidote: ' + esc(f.bookTitle) + '</p>' : "")) +
      relatedHTML(f) +
      '<div class="gyc-acts"><button type="button" class="gyc-btn" data-gyc-share>' + IC.share + 'Share this grave</button><button type="button" class="gyc-btn gyc-btn--ink" data-gyc-next>Next grave ' + IC.arrow + '</button></div>';
  }
  function photo(f) {
    if (!G.graveWikiImages || !sheet) return;
    var fig = sheet.querySelector(".gyc-photo");
    G.graveWikiImages(f).then(function (r) {
      if (!r || !r.hero || !fig || !fig.isConnected || cur !== f) return;
      var im = new Image();
      im.onload = function () {
        if (!fig.isConnected) return;
        fig.innerHTML = ""; fig.appendChild(im);
        fig.insertAdjacentHTML("beforeend", '<figcaption>' + esc(r.title || f.name) + ' &middot; <a href="' + esc(G.wikiLink ? G.wikiLink(r.title || f.name) : "#") + '" target="_blank" rel="noopener">Wikipedia</a></figcaption>');
        fig.hidden = false;
        if (!reduce) fig.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: "ease-out" });
      };
      im.alt = ""; im.decoding = "async"; im.src = r.hero.url;
    }).catch(function () {});
  }
  function ensureSheet() {
    if (sheet) return sheet;
    sheet = document.createElement("div");
    sheet.className = "gyc";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.innerHTML = '<i class="gyc-veil" data-gyc-close></i><article class="gyc-page">' +
      '<header class="gyc-top"><button type="button" class="gy-ib" data-gyc-close aria-label="Close">' + IC.x + '</button><span class="gyc-top__t"></span><button type="button" class="gy-ib" data-gyc-share aria-label="Share">' + IC.share + '</button></header>' +
      '<div class="gyc-prog" aria-hidden="true"><i></i></div><div class="gyc-scroll"></div></article>';
    document.body.appendChild(sheet);
    var sc = sheet.querySelector(".gyc-scroll"), bar = sheet.querySelector(".gyc-prog i"), tt = sheet.querySelector(".gyc-top__t");
    sc.addEventListener("scroll", function () {
      var max = sc.scrollHeight - sc.clientHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, sc.scrollTop / max) : 0) + ")";
      tt.classList.toggle("on", sc.scrollTop > 150);
    }, { passive: true });
    sheet.addEventListener("click", function (e) {
      if (e.target.closest("[data-gyc-close]")) { close(); return; }
      if (e.target.closest("[data-gyc-share]")) { share(cur); return; }
      if (e.target.closest("[data-gyc-next]")) { next(); return; }
      var go = e.target.closest("[data-gyc-goto]");
      if (go) {
        var target = null, tid = go.getAttribute("data-gyc-goto");
        for (var gi = 0; gi < F.length; gi++) if (F[gi].id === tid) { target = F[gi]; break; }
        if (target) { fill(target); try { history.replaceState({ gy: target.id }, "", "#grave=" + encodeURIComponent(target.id)); } catch (e2) {} sc.scrollTop = 0; }
        return;
      }
      var w = e.target.closest("[data-gyc-wiki]"); if (w) record(w.getAttribute("data-gyc-wiki"));
    });
    /* pull down from the top to close */
    var y0 = null, dy = 0, page = sheet.querySelector(".gyc-page");
    page.addEventListener("touchstart", function (e) { y0 = sc.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    page.addEventListener("touchmove", function (e) {
      if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0);
      if (dy > 4) page.style.transform = "translateY(" + dy * 0.6 + "px)";
    }, { passive: true });
    page.addEventListener("touchend", function () {
      if (y0 == null) return; y0 = null;
      if (dy > 110) close(); else { page.style.transition = "transform .3s cubic-bezier(.16,1,.3,1)"; page.style.transform = ""; setTimeout(function () { page.style.transition = ""; }, 320); }
    });
    return sheet;
  }
  function fill(f) {
    cur = f;
    var sc = sheet.querySelector(".gyc-scroll");
    sheet.querySelector(".gyc-top__t").textContent = f.name;
    sc.innerHTML = caseHTML(f, window.GRAVE_DEEP ? window.GRAVE_DEEP[f.id] : null);
    sc.scrollTop = 0;
    if (!window.GRAVE_DEEP) deep(function (D) { if (cur === f && D && D[f.id]) { var top = sc.scrollTop; sc.innerHTML = caseHTML(f, D[f.id]); sc.scrollTop = top; photo(f); } });
    photo(f);
  }
  function open(f, instant, fromHistory) {
    if (!f) return;
    lastFocus = document.activeElement;
    ensureSheet(); fill(f);
    var page = sheet.querySelector(".gyc-page"), veil = sheet.querySelector(".gyc-veil");
    sheet.classList.add("on");
    document.documentElement.classList.add("gyc-lock");
    if (!instant && !reduce) {
      page.animate([{ transform: "translateY(104%)" }, { transform: "translateY(0)" }], { duration: 460, easing: "cubic-bezier(.16,1,.3,1)" });
      veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease-out" });
    }
    if (!fromHistory) { try { history.pushState({ gy: f.id }, "", "#grave=" + encodeURIComponent(f.id)); } catch (e) {} }
    try { if (window.TSB && TSB.achv) TSB.achv.award("ghoul", true); } catch (e2) {}
    /* keyboard users land on Close; touch users see no ring */
    if (lastFocus && lastFocus.matches && lastFocus.matches(":focus-visible")) setTimeout(function () { var x = sheet && sheet.querySelector(".gyc-top [data-gyc-close]"); if (x) x.focus({ preventScroll: true }); }, 60);
  }
  function hide() {
    if (!sheet || !sheet.classList.contains("on")) return;
    var page = sheet.querySelector(".gyc-page"), veil = sheet.querySelector(".gyc-veil"), s = sheet;
    function done() { s.classList.remove("on"); page.style.transform = ""; document.documentElement.classList.remove("gyc-lock"); cur = null; if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
    if (reduce) { done(); return; }
    var from = page.style.transform || "translateY(0)";
    page.animate([{ transform: from }, { transform: "translateY(104%)" }], { duration: 300, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }).onfinish = function () { done(); page.getAnimations().forEach(function (a) { a.cancel(); }); };
    veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-in", fill: "forwards" }).onfinish = function () { veil.getAnimations().forEach(function (a) { a.cancel(); }); };
  }
  function close() {
    if (/^#grave=|^#rec=/.test(location.hash) && history.state && (history.state.gy || history.state.rec)) history.back();
    else { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} hide(); }
  }
  function next() {
    if (!cur) return;
    var pool = results.length ? results : F, k = pool.indexOf(cur), n = pool[(k + 1) % pool.length];
    var sc = sheet.querySelector(".gyc-scroll");
    function swap() { fill(n); try { history.replaceState({ gy: n.id }, "", "#grave=" + encodeURIComponent(n.id)); } catch (e) {} }
    if (reduce) { swap(); return; }
    sc.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-24px)" }], { duration: 160, easing: "ease-in", fill: "forwards" }).onfinish = function () {
      swap();
      sc.getAnimations().forEach(function (a) { a.cancel(); });
      sc.animate([{ opacity: 0, transform: "translateX(24px)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: "cubic-bezier(.16,1,.3,1)" });
    };
  }
  function share(f) {
    if (!f || !G.renderGraveCard) return;
    try { if (G.toast) G.toast("Making your grave card..."); } catch (e) {}
    Promise.resolve(G.renderGraveCard(f)).then(function (cv) {
      return G.shareGraveCanvas(cv, "graveyard-" + f.id + ".png", f.name + ": " + f.loss + ". The lesson, in 2 minutes, on TheSmallBook.");
    }).catch(function (err) {
      /* v346: never fail silently - a dead button is worse than an honest line */
      try { if (G.toast) G.toast("❌ Could not make the card. Try again."); } catch (e) {}
      try { console.warn("[grave card]", err); } catch (e) {}
    });
  }
  /* a fresh grave's public record, read in the same sheet */
  function record(title) {
    if (!G.wikiExtract) return;
    ensureSheet();
    cur = null;
    var sc = sheet.querySelector(".gyc-scroll");
    sheet.querySelector(".gyc-top__t").textContent = title;
    sc.innerHTML = '<div class="gyc-hero gyc-hero--rec"><p class="gyc-cat">Fresh grave &middot; the public record</p><h1 class="gyc-name">' + esc(title) + '</h1></div><div class="gyc-loading"><i></i><i></i><i></i></div>';
    if (!sheet.classList.contains("on")) {
      sheet.classList.add("on"); document.documentElement.classList.add("gyc-lock");
      if (!reduce) sheet.querySelector(".gyc-page").animate([{ transform: "translateY(104%)" }, { transform: "translateY(0)" }], { duration: 460, easing: "cubic-bezier(.16,1,.3,1)" });
      try { history.pushState({ rec: 1 }, "", "#rec"); } catch (e) {}
    }
    G.wikiExtract(title).then(function (r) {
      var paras = r && r.text ? r.text.split(/\n+/).filter(function (p) { return p.length > 60; }).slice(0, 8) : [];
      sc.querySelector(".gyc-loading") && sc.querySelector(".gyc-loading").remove();
      sc.insertAdjacentHTML("beforeend", paras.length
        ? paras.map(function (p) { return '<p class="gyc-recp">' + esc(p) + '</p>'; }).join("") + '<p class="gyc-booktxt"><a href="' + esc(G.wikiLink(title)) + '" target="_blank" rel="noopener">Read the full record on Wikipedia</a></p>'
        : '<p class="gyc-recp">The record could not be reached right now. Try again in a moment.</p>');
    });
  }

  root.addEventListener("click", function (e) {
    var g = e.target.closest("[data-g]"); if (!g) return;
    var f = F[idx[g.getAttribute("data-g")]]; if (f) open(f);
  });
  root.addEventListener("click", function (e) { var w = e.target.closest("[data-gyc-wiki]"); if (w) record(w.getAttribute("data-gyc-wiki")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet && sheet.classList.contains("on")) close(); });
  window.addEventListener("popstate", function (e) {
    var m = /^#grave=(.+)$/.exec(location.hash);
    if (m) { var f = F[idx[decodeURIComponent(m[1])]]; if (f) { if (sheet && sheet.classList.contains("on")) fill(f); else open(f, false, true); return; } }
    hide();
  });

  /* deep links: #grave=<id> or ?id=<id> open straight onto the case, no list first */
  (function () {
    var id = "";
    var m = /^#grave=(.+)$/.exec(location.hash); if (m) id = decodeURIComponent(m[1]);
    if (!id) { try { id = new URLSearchParams(location.search).get("id") || ""; } catch (e) {} }
    var f = id ? F[idx[id]] : null;
    if (!f) return;
    /* the list sits underneath, so closing the case lands somewhere useful */
    try { history.replaceState(null, "", location.pathname); history.pushState({ gy: f.id }, "", "#grave=" + encodeURIComponent(f.id)); } catch (e) {}
    open(f, true, true);
  })();

  /* ---------- fresh graves, from the public record (quietly, after load) ---------- */
  function fresh(force) {
    var box = root.querySelector(".gy-fresh");
    if (!G.buildWireData || !G.wikiExtract) return;
    G.buildWireData(force).then(function (w) {
      var names = (w && w.graves || []).slice(0, 6);
      return Promise.all(names.map(function (n) {
        return G.wikiExtract(n).then(function (r) { return r && r.text ? { t: r.title || n, s: G.firstSentences(r.text, 2) } : null; }).catch(function () { return null; });
      })).then(function (rows) {
        rows = rows.filter(function (r) { return r && r.s; });
        var st = (w && w.stories || []).slice(0, 4);
        if (!rows.length && !st.length) return;
        box.innerHTML = '<div class="gy-fresh__h"><h2>Fresh graves</h2><span>From this year&rsquo;s public records</span></div>' +
          (rows.length ? '<div class="gy-fresh__row">' + rows.map(function (r) {
            return '<button type="button" class="gy-fcard" data-gyc-wiki="' + esc(r.t) + '"><small>' + new Date().getFullYear() + '</small><b>' + esc(r.t) + '</b><span>' + esc(r.s) + '</span></button>';
          }).join("") + '</div>' : "") +
          (st.length ? '<div class="gy-reports"><h3>Founders&rsquo; post-mortems</h3>' + st.map(function (s) {
            var dom = ""; try { dom = new URL(s.url).hostname.replace(/^www\./, ""); } catch (e) {}
            return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener"><b>' + esc(s.title) + '</b><small>' + esc(dom) + '</small></a>';
          }).join("") + '</div>' : "");
        box.hidden = false;
      });
    }).catch(function () {});
  }
  function later(fn, ms) { window.addEventListener("load", function () { setTimeout(function () { (window.requestIdleCallback || setTimeout)(fn); }, ms); }); }
  later(function () { fresh(false); }, 1800);
  later(function () { deep(function () {}); }, 3000);

  window.TSB_GY2 = { open: function (id) { open(F[idx[id]]); }, close: close };
})();
