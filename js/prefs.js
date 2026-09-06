/* ============================================================
   THESMALLBOOK — PREFS & GAMIFICATION ENGINE
   Theme, bookmarks, progress, streaks, achievements, levels.
   Include on every page BEFORE other scripts.
   ============================================================ */

(function () {
  /* ---------- tiny storage helpers ---------- */
  function get(key, def) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v === null || v === undefined ? def : v; }
    catch { return def; }
  }
  function set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  /* ---------- accent colour (picked in the You window) ---------- */
  try {
    var acc = JSON.parse(localStorage.getItem("tsb_accent"));
    if (acc && /^#[0-9a-f]{6}$/i.test(acc)) {
      /* accent = the action bar's selection pill ONLY — app stays classic */
      document.documentElement.style.setProperty("--tsb-bar-accent", acc);
    }
  } catch (e) {}

  /* ---------- keep the service worker honest: re-check on every load,
     so a deploy can never leave a phone on the previous version ---------- */
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update(); });
    }
  } catch (e) {}

  /* library display mode (cozy / compact / list) — pre-paint, no flash */
  try {
    var lv = JSON.parse(localStorage.getItem("tsb_lib_view"));
    if (lv === "compact") document.documentElement.classList.add("tsb-libview-compact");
    else if (lv === "list") document.documentElement.classList.add("tsb-libview-list");
  } catch (e) {}
  /* 📐 app display size: the app's OWN scale, never the phone's font size.
     default = 663px layout viewport (the locked, proper look);
     big / bigger narrow the layout viewport so everything reads larger. */
  function applyAppSize(v) {
    /* Default = the app's normal responsive size on every phone (the
       phone's own font zoom can't distort layouts — text-size-adjust
       is pinned to 100% in CSS). Big/Bigger scale the app's OWN type. */
    try {
      if (v === "big") document.documentElement.style.fontSize = "18px";
      else if (v === "bigger") document.documentElement.style.fontSize = "20px";
      else document.documentElement.style.fontSize = "";
    } catch (e) {}
  }
  var appSize = "default";
  try { appSize = JSON.parse(localStorage.getItem("tsb_appsize")) || "default"; } catch (e) {}
  applyAppSize(appSize);
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-appsize]") : null;
    if (!b) return;
    var v = b.getAttribute("data-appsize");
    try { localStorage.setItem("tsb_appsize", JSON.stringify(v)); } catch (e2) {}
    applyAppSize(v);
    document.querySelectorAll("[data-appsize]").forEach(function (x) { x.classList.toggle("on", x === b); });
  });
  document.addEventListener("DOMContentLoaded", function () {
    try {
      var cur = JSON.parse(localStorage.getItem("tsb_appsize")) || "default";
      document.querySelectorAll("[data-appsize]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-appsize") === cur); });
    } catch (e) {}
  });

  /* font style (modern / serif / clean) — pre-paint */
  try {
    var fst = JSON.parse(localStorage.getItem("tsb_fontstyle"));
    if (fst === "serif") document.documentElement.classList.add("tsb-font-serif");
    else if (fst === "clean") document.documentElement.classList.add("tsb-font-clean");
  } catch (e) {}

  /* ---------- theme ---------- */
  const theme = {
    isDark: () => document.documentElement.classList.contains("dark"),
    toggle() {
      document.documentElement.classList.toggle("dark");
      set("tsb_theme", theme.isDark() ? "dark" : "light");
      /* keep the phone status bar in sync instantly (no flash next load) */
      try {
        var m = document.querySelector('meta[name="theme-color"]');
        if (m) m.content = theme.isDark() ? "#16130e" : "#ffc800";
      } catch (e) {}
      document.querySelectorAll("[data-theme-toggle]").forEach((b) => (b.textContent = theme.isDark() ? "☀️" : "🌙"));
      if (theme.isDark()) achv.award("night-owl");
    }
  };

  /* ---------- bookmarks ---------- */
  const bookmarks = {
    list: () => get("tsb_bookmarks", []),
    has: (id) => bookmarks.list().includes(id),
    toggle(id) {
      const l = bookmarks.list();
      const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1); else l.push(id);
      set("tsb_bookmarks", l);
      if (l.length >= 1) achv.award("bookmark-1");
      if (l.length >= 5) achv.award("bookmark-5");
      if (l.length >= 10) achv.award("bookmark-10");
      return i < 0;
    }
  };

  /* ---------- reading progress ---------- */
  const progress = {
    all: () => get("tsb_progress", {}),
    forBook: (id) => (progress.all()[id] || []),
    markRead(bookId, idx) {
      const all = progress.all();
      const arr = all[bookId] || [];
      if (!arr.includes(idx)) {
        arr.push(idx);
        all[bookId] = arr;
        set("tsb_progress", all);
        // v203: live-sync to cloud so profile "X/2176 lessons" updates the moment a lesson is read
        try { if (window.TSB_COMMUNITY && TSB_COMMUNITY.signedIn && TSB_COMMUNITY.signedIn()) TSB_COMMUNITY.syncProgress(true); } catch (e) {}
        const total = progress.totalRead();
        if (total >= 1) achv.award("first-lesson");
        if (total >= 10) achv.award("lessons-10");
        if (total >= 50) achv.award("lessons-50");
        if (total >= 150) achv.award("lessons-150");
        if (total >= 25) achv.award("lessons-25");
        if (total >= 100) achv.award("lessons-100");
        if (total >= 300) achv.award("lessons-300");
      }
      return arr.length;
    },
    totalRead() {
      const all = progress.all();
      return Object.values(all).reduce((n, a) => n + a.length, 0);
    }
  };

  /* ---------- action plan checklists ---------- */
  const plans = {
    forBook: (id) => (get("tsb_plans", {})[id] || []),
    toggle(bookId, idx, planLength) {
      const all = get("tsb_plans", {});
      const arr = all[bookId] || [];
      const i = arr.indexOf(idx);
      if (i >= 0) arr.splice(i, 1); else arr.push(idx);
      all[bookId] = arr;
      set("tsb_plans", all);
      if (arr.length >= planLength) achv.award("plan-complete");
      return i < 0;
    }
  };

  /* ---------- streak ---------- */
  const streak = {
    touch() {
      const today = new Date().toISOString().slice(0, 10);
      const s = get("tsb_streak", { last: "", count: 0 });
      if (s.last === today) return s.count;
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      s.count = s.last === yesterday ? s.count + 1 : 1;
      s.last = today;
      set("tsb_streak", s);
      if (s.count >= 3) achv.award("streak-3");
      if (s.count >= 7) achv.award("streak-7");
      if (s.count >= 30) achv.award("streak-30");
      if (s.count >= 14) achv.award("streak-14");
      if (s.count >= 60) achv.award("streak-60");
      return s.count;
    },
    count: () => get("tsb_streak", { last: "", count: 0 }).count
  };

  /* ---------- levels ---------- */
  const LEVELS = [
    { at: 0, name: "Apprentice", icon: "🐣" },
    { at: 10, name: "Bookworm", icon: "🐛" },
    { at: 30, name: "Deep Reader", icon: "🤓" },
    { at: 75, name: "Scholar", icon: "🎓" },
    { at: 150, name: "Sage", icon: "🧙" },
    { at: 300, name: "Enlightened", icon: "✨" }
  ];
  function levelFor(n) {
    let cur = LEVELS[0], next = null;
    for (let i = 0; i < LEVELS.length; i++) {
      if (n >= LEVELS[i].at) cur = LEVELS[i];
      else { next = LEVELS[i]; break; }
    }
    return { ...cur, next, read: n };
  }

  /* ---------- achievements ---------- */
  const ACHV = {
    "first-open": { icon: "📖", name: "First Steps", desc: "Opened your first book" },
    "first-lesson": { icon: "🧠", name: "Lesson One", desc: "Read your first lesson" },
    "lessons-10": { icon: "⚡", name: "Getting Wiser", desc: "Read 10 lessons" },
    "lessons-50": { icon: "🔥", name: "Knowledge Machine", desc: "Read 50 lessons" },
    "lessons-150": { icon: "🚀", name: "Unstoppable", desc: "Read 150 lessons" },
    "book-complete": { icon: "🏆", name: "Finisher", desc: "Read every lesson of a book" },
    "bookmark-1": { icon: "❤️", name: "Curator", desc: "Bookmarked your first book" },
    "bookmark-5": { icon: "📚", name: "Shelf Builder", desc: "Bookmarked 5 books" },
    "streak-3": { icon: "🔥", name: "On a Roll", desc: "3-day reading streak" },
    "streak-7": { icon: "💪", name: "Habit Formed", desc: "7-day reading streak" },
    "streak-30": { icon: "👑", name: "Atomic Reader", desc: "30-day reading streak" },
    "plan-complete": { icon: "✅", name: "Action Taker", desc: "Completed a 5-step action plan" },
    "story-published": { icon: "✍️", name: "Storyteller", desc: "Published a community story" },
    "night-owl": { icon: "🌙", name: "Night Owl", desc: "Switched to dark mode" },
    "explorer": { icon: "🎲", name: "Explorer", desc: "Used the Surprise Me button" },
    "lessons-25": { icon: "🧩", name: "Puzzle Solver", desc: "Read 25 lessons" },
    "lessons-100": { icon: "💎", name: "Diamond Mind", desc: "Read 100 lessons" },
    "lessons-300": { icon: "🐉", name: "Dragon Reader", desc: "Read 300 lessons" },
    "book-complete-3": { icon: "📕", name: "Trilogy", desc: "Finished 3 books completely" },
    "book-complete-10": { icon: "🏅", name: "Shelf Master", desc: "Finished 10 books completely" },
    "bookmark-10": { icon: "🛋️", name: "Library Owner", desc: "Bookmarked 10 books" },
    "streak-14": { icon: "⏳", name: "Marathoner", desc: "14-day reading streak" },
    "streak-60": { icon: "🌋", name: "Unstoppable Force", desc: "60-day reading streak" },
    "ask-1": { icon: "🤖", name: "Curious Mind", desc: "Asked the library a question" },
    "listener": { icon: "🎧", name: "Listener", desc: "Listened to a book with audio" },
    "ghoul": { icon: "👻", name: "Grave Digger", desc: "Visited the Graveyard" },
    "scanner": { icon: "📷", name: "Cover Scanner", desc: "Scanned a book cover" },
    "polyglot": { icon: "🌏", name: "Polyglot", desc: "Read in a language other than English" },
    "sharer": { icon: "🎴", name: "Card Creator", desc: "Generated a share card" },
    "featured-author": { icon: "🏆", name: "Featured Author", desc: "Your story hit the Story of the Week slot" }
  };

  const achv = {
    list: () => get("tsb_achv", []),
    award(id, silent) {
      if (!ACHV[id]) return;
      const l = achv.list();
      if (l.includes(id)) return;
      l.push(id);
      set("tsb_achv", l);
      if (!silent) achv.popup(ACHV[id]);
    },
    popup(a) {
      const el = document.createElement("div");
      el.className = "achvpop";
      el.innerHTML = `<span class="achvpop__icon">${a.icon}</span>
        <div><div class="achvpop__title">ACHIEVEMENT UNLOCKED!</div>
        <div class="achvpop__name">${a.name}</div>
        <div class="achvpop__desc">${a.desc}</div></div>`;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add("show"));
      setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 400); }, 4200);
    },
    defs: ACHV
  };

  /* ---------- last read ---------- */
  const lastRead = {
    set: (id) => set("tsb_last", { id, ts: Date.now() }),
    get: () => get("tsb_last", null)
  };

  /* ---------- backup & restore (carry progress across devices) ---------- */
  const backup = {
    export() {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("tsb_") === 0) data[k] = localStorage.getItem(k);
      }
      const payload = { app: "thesmallbook", version: 1, saved: new Date().toISOString(), data };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "thesmallbook-backup.json";
      a.click();
      URL.revokeObjectURL(a.href);
    },
    import(file, cb) {
      const r = new FileReader();
      r.onload = () => {
        try {
          const parsed = JSON.parse(r.result);
          if (!parsed || parsed.app !== "thesmallbook" || !parsed.data) throw new Error("bad file");
          Object.entries(parsed.data).forEach(([k, v]) => {
            if (k.indexOf("tsb_") === 0) localStorage.setItem(k, v);
          });
          cb(true);
        } catch (e) { cb(false); }
      };
      r.onerror = () => cb(false);
      r.readAsText(file);
    }
  };

  /* ---------- expose ---------- */
  /* 🇮🇳 INDIAN BOOKS — filter helper (authors + known Indian-origin books) */
  const INDIAN_AUTHORS = [
    "shiv khera", "a.p.j. abdul kalam", "apj abdul kalam", "gaur gopal das",
    "sadhguru", "devdutt pattanaik", "rashmi bansal", "prakash iyer",
    "sanjeev sanyal", "gurcharan das", "saurabh mukherjea", "ashneer grover",
    "amish tripathi", "ankur warikoo", "raj shamani", "radhakrishnan pillai",
    "raguram rajan", "chetan bhagat", "navi radjou", "amartya sen",
    "r. gopalakrishnan", "nandan nilekani", "harish bhat", "subhash chandra",
    "jay shetty", "om swami", "sudha murty", "n. r. narayana murthy",
    "azim premji", "ravi subramanian", "parag anand", "kiran bedi",
    "paramahansa yogananda", "deepak chopra", "mahatma gandhi", "rujuta diwekar",
    "mohnish pabrai", "abhijit banerjee", "subroto bagchi", "shwetabh gangwar", "ronnie screwvala", "renuka gavrani",
    "sachin tendulkar", "sunil khilnani", "a.l. basham", "suketu mehta", "b.r. ambedkar", "pavan k. varma", "harsha bhogle", "yuvraj singh", "j. krishnamurti", "e. sreedharan", "sudha murty", "sanjaya baru"
  ];
  function isIndianBook(id) {
    try {
      const b = (window.BOOKS || []).find((x) => x.id === id);
      if (!b) return false;
      const a = String(b.author || "").toLowerCase();
      return INDIAN_AUTHORS.some((k) => a.includes(k));
    } catch (e) { return false; }
  }

  /* badges from other pages (scanner, language) via localStorage flags */
  try {
    if (get("tsb_flag_scanned", false)) { achv.award("scanner"); set("tsb_flag_scanned", ""); }
    if (get("tsb_flag_polyglot", false)) { achv.award("polyglot"); set("tsb_flag_polyglot", ""); }
  } catch (e) {}

  function completedCount() {
    const all = progress.all();
    const books = (window.BOOKS || []).filter((b) => all[b.id] && all[b.id].length >= b.lessons.length);
    return books.length;
  }

  window.TSB = { get, set, theme, bookmarks, progress, plans, streak, levelFor, achv, lastRead, backup, isIndianBook, completedCount };

  /* Amazon affiliate link builder — direct product page when we know the
     ASIN (converts better), search fallback for everything else. */
  window.TSB.amazonLink = function (title, author, bookId) {
    const cfg = window.TSB_CONFIG || {};
    const tag = cfg.AMAZON_TAG || "thesmallbook-21";
    const asin = bookId && cfg.AMAZON_ASINS && cfg.AMAZON_ASINS[bookId];
    if (asin) return "https://www.amazon.in/dp/" + asin + "?tag=" + tag;
    const q = encodeURIComponent(String(title) + " " + String(author || "").split("&")[0].trim() + " book");
    return "https://www.amazon.in/s?k=" + q + "&tag=" + tag;
  };

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    // bind theme toggles
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      b.textContent = theme.isDark() ? "☀️" : "🌙";
      b.addEventListener("click", theme.toggle);
    });
    // streak tick
    streak.touch();
  });

  /* ---------- ✍️ STORIES TRANSITION — every stories.html link, site-wide ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('a[href$="stories.html"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        e.preventDefault();
        let ov = document.getElementById("storyTransition");
        if (!ov) {
          ov = document.createElement("div");
          ov.id = "storyTransition";
          ov.className = "story-transition";
          ov.innerHTML =
            '<div class="story-transition__pen">✍️</div>' +
            '<div class="story-transition__line"></div>' +
            '<div class="story-transition__text">Opening the Story Shelf</div>' +
            '<div class="story-transition__sub">real readers · real turning points · your name next?</div>';
          document.body.appendChild(ov);
        }
        requestAnimationFrame(() => ov.classList.add("on"));
        setTimeout(() => { location.href = link.href; }, 950);
      });
    });
  });

  /* ---------- PWA ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
      /* a deployed update takes over → reload ONCE so signed-in readers
         never sit on a stale build (accounts live in localStorage/Supabase,
         untouched by cache purges) */
      try {
        navigator.serviceWorker.addEventListener("controllerchange", function () {
          try {
            if (sessionStorage.getItem("tsb_sw_reloaded")) return;
            sessionStorage.setItem("tsb_sw_reloaded", "1");
            location.reload();
          } catch (e2) {}
        });
        window.setTimeout(function () {
          try { sessionStorage.removeItem("tsb_sw_reloaded"); } catch (e3) {}
        }, 8000);
      } catch (e) {}
    });
  }
})();

  /* broken cover image → clean branded placeholder (never a torn-img glyph) */
  document.addEventListener("error", function (e) {
    var el = e.target;
    if (!el || el.tagName !== "IMG") return;
    if (!/aq-src__img|ob-book/.test(el.className || "")) return;
    if (el.getAttribute("data-fb")) return;
    el.setAttribute("data-fb", "1");
    el.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 93"><rect width="66" height="93" rx="7" fill="#ffc800"/><rect x="5" y="5" width="56" height="83" rx="5" fill="none" stroke="#14100a" stroke-width="3"/><text x="33" y="60" font-size="34" text-anchor="middle">\u{1F4D5}</text></svg>'
    );
  }, true);

