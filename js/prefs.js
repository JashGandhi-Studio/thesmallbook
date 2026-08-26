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

  /* ---------- theme ---------- */
  const theme = {
    isDark: () => document.documentElement.classList.contains("dark"),
    toggle() {
      document.documentElement.classList.toggle("dark");
      set("tsb_theme", theme.isDark() ? "dark" : "light");
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
        const total = progress.totalRead();
        if (total >= 1) achv.award("first-lesson");
        if (total >= 10) achv.award("lessons-10");
        if (total >= 50) achv.award("lessons-50");
        if (total >= 150) achv.award("lessons-150");
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
    "sharer": { icon: "🎴", name: "Card Creator", desc: "Generated a share card" },
    "featured-author": { icon: "🏆", name: "Featured Author", desc: "Your story hit the Story of the Week slot" }
  };

  const achv = {
    list: () => get("tsb_achv", []),
    award(id) {
      if (!ACHV[id]) return;
      const l = achv.list();
      if (l.includes(id)) return;
      l.push(id);
      set("tsb_achv", l);
      achv.popup(ACHV[id]);
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
    "mohnish pabrai", "abhijit banerjee", "subroto bagchi", "shwetabh gangwar", "ronnie screwvala", "renuka gavrani"
  ];
  function isIndianBook(id) {
    try {
      const b = (window.BOOKS || []).find((x) => x.id === id);
      if (!b) return false;
      const a = String(b.author || "").toLowerCase();
      return INDIAN_AUTHORS.some((k) => a.includes(k));
    } catch (e) { return false; }
  }

  window.TSB = { get, set, theme, bookmarks, progress, plans, streak, levelFor, achv, lastRead, backup, isIndianBook };

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
    });
  }
})();
