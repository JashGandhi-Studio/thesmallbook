/* ============================================================
   THESMALLBOOK — HOMEPAGE APP
   Grid, fuzzy search, filters, sorting, bookmarks, progress,
   continue-reading, lesson of the day, gamification, shortcuts.
   ============================================================ */

(function () {
  const grid = document.getElementById("grid");
  const searchInput = document.getElementById("searchInput");
  const filterWrap = document.getElementById("filters");
  const sortSel = document.getElementById("sortSel");
  const statBooks = document.getElementById("statBooks");
  const statLessons = document.getElementById("statLessons");
  const statCats = document.getElementById("statCats");
  const statMins = document.getElementById("statMins");

  const NEW_IDS = new Set((window.TSB_CONFIG && TSB_CONFIG.NEW_THIS_WEEK) || []);
  function isNew(id) { return NEW_IDS.has(id); }

  let activeCat = "ALL";
  let query = "";
  let sortMode = TSB.get("tsb_view", "default") === "shelves" ? "shelves" : "default";

  /* ---------- STATS ---------- */
  const totalLessons = BOOKS.reduce((n, b) => n + b.lessons.length, 0);
  const cats = [...new Set(BOOKS.map((b) => b.category))];
  const totalMins = BOOKS.reduce((n, b) => n + parseInt(b.readTime), 0);

  animateNum(statBooks, BOOKS.length);
  animateNum(statLessons, totalLessons);
  animateNum(statCats, cats.length);
  animateNum(statMins, totalMins);

  function animateNum(el, target) {
    if (!el) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 30));
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(t); }
      el.textContent = cur;
    }, 30);
  }

  /* ---------- FILTER CHIPS ---------- */
  const allChip = makeChip("ALL", true);
  filterWrap.appendChild(allChip);
  const shelfChip = makeChip("❤️ MY SHELF");
  filterWrap.appendChild(shelfChip);
  const indianChip = makeChip("🇮🇳 INDIAN");
  filterWrap.appendChild(indianChip);
  cats.forEach((c) => filterWrap.appendChild(makeChip(c)));

  function makeChip(label, active) {
    const b = document.createElement("button");
    b.className = "chip" + (active ? " active" : "");
    b.textContent = label;
    b.addEventListener("click", () => {
      activeCat = label;
      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      b.classList.add("active");
      render();
    });
    return b;
  }

  /* ---------- SORT + VIEW ---------- */
  if (sortSel) {
    sortSel.value = sortMode; // restore saved view choice
    sortSel.addEventListener("change", () => {
      sortMode = sortSel.value;
      // remember the view style (shelves vs classic) across visits
      TSB.set("tsb_view", sortMode === "shelves" ? "shelves" : "default");
      render();
    });
  }

  /* ---------- SEARCH (fuzzy) — debounced so mobile stays smooth ---------- */
  let searchTimer = null;
  searchInput.addEventListener("input", (e) => {
    const v = e.target.value.trim().toLowerCase();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { query = v; render(); }, 160);
  });

  function fuzzyMatch(text, q) {
    text = text.toLowerCase();
    if (text.includes(q)) return true;
    return q.split(/\s+/).every((word) => {
      if (text.includes(word)) return true;
      if (word.length < 4) return false;
      return text.split(/\s+/).some((t) => levenshtein(t, word) <= 1 || t.startsWith(word.slice(0, word.length - 1)));
    });
  }

  function levenshtein(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 99;
    const m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++)
      for (let j = 1; j <= a.length; j++)
        m[i][j] = b[i - 1] === a[j - 1]
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    return m[b.length][a.length];
  }

  /* ---------- RENDER ---------- */
  function render() {
    let results = BOOKS.filter((b) => {
      let inCat;
      if (activeCat === "ALL") inCat = true;
      else if (activeCat === "❤️ MY SHELF") inCat = TSB.bookmarks.has(b.id);
      else if (activeCat === "🇮🇳 INDIAN") inCat = TSB.isIndianBook(b.id);
      else inCat = b.category === activeCat;
      if (!inCat) return false;
      if (!query) return true;
      const hay = `${b.title} ${b.author} ${b.category} ${b.tagline}`;
      if (fuzzyMatch(hay, query)) { b._lessonHit = null; return true; }
      // deep search: lesson titles (fuzzy) then full lesson text (fast plain match)
      // "habit stacking" → finds the exact lesson inside Atomic Habits
      let hitIdx = b.lessons.findIndex((l) => fuzzyMatch(l.title + " " + l.chapter, query));
      if (hitIdx === -1 && query.length >= 4) {
        hitIdx = b.lessons.findIndex((l) =>
          (l.summary + " " + l.example + " " + l.action).toLowerCase().includes(query));
      }
      if (hitIdx !== -1) { b._lessonHit = hitIdx; return true; }
      b._lessonHit = null;
      return false;
    });

    results = sortBooks(results);
    grid.innerHTML = "";

    if (!results.length) {
      const msg = activeCat === "❤️ MY SHELF" && !query
        ? `<span>❤️</span>Your shelf is empty.<br>Tap the heart on any book to save it here!`
        : activeCat === "🇮🇳 INDIAN" && !query
        ? `<span>🇮🇳</span>Indian books coming soon!<br>Check back next week.`
        : `<span>📚</span>No books found.<br>Try another search — typos are OK!`;
      grid.innerHTML = `<div class="empty">${msg}</div>`;
      return;
    }

    /* 📺 SHELVES VIEW — Netflix-style rows, opt-in via the sort dropdown.
       Default stays the classic grid. Choice is remembered. */
    if (sortMode === "shelves" && activeCat === "ALL" && !query) {
      grid.classList.add("grid--shelves");
      renderShelves(results);
      bindFavs();
      return;
    }
    grid.classList.remove("grid--shelves");

    results.forEach((b, i) => {
      const read = TSB.progress.forBook(b.id).length;
      const pct = Math.round((read / b.lessons.length) * 100);
      const fav = TSB.bookmarks.has(b.id);
      const a = document.createElement("a");
      a.className = "card";
      const lessonHit = query && b._lessonHit !== null && b._lessonHit !== undefined ? b._lessonHit : null;
      a.href = `book.html?id=${b.id}` + (lessonHit !== null ? `#lesson-${lessonHit}` : "");
      a.style.animationDelay = `${Math.min(i, 10) * 50}ms`;
      a.innerHTML = `
        <div class="card__top">
          ${isNew(b.id) ? `<span class="card__new" translate="no">✦ NEW</span>` : ""}
          <span class="card__cat">${b.category}</span>
          <span class="card__time">⏱ ${b.readTime}</span>
          <img class="card__cover" src="${b.cover}" alt="${b.title} cover" loading="lazy">
          <button class="card__fav ${fav ? "on" : ""}" data-fav="${b.id}" aria-label="Bookmark">${fav ? "❤️" : "🤍"}</button>
        </div>
        ${pct > 0 ? `<div class="card__progress"><em>${pct === 100 ? "✓ DONE" : pct + "%"}</em><span style="width:${pct}%"></span></div>` : ""}
        <div class="card__body">
          <div class="card__title">${b.title}</div>
          <div class="card__author">by ${b.author} · ${b.year}</div>
          <div class="card__tag">${b.tagline}</div>
          ${lessonHit !== null ? `<div class="card__hit" translate="no">🔍 FOUND INSIDE: <strong>${b.lessons[lessonHit].title}</strong></div>` : ""}
          <div class="card__footer">
            <span class="card__lessons">${read > 0 ? read + "/" : ""}${b.lessons.length} lessons</span>
            <span class="card__go">READ IT →</span>
          </div>
        </div>`;
      grid.appendChild(a);
    });

    bindFavs();
  }

  function bindFavs() {
    grid.querySelectorAll("[data-fav]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const on = TSB.bookmarks.toggle(btn.dataset.fav);
        btn.classList.toggle("on", on);
        btn.textContent = on ? "❤️" : "🤍";
        if (activeCat === "❤️ MY SHELF") render();
      });
    });
  }

  /* ---------- 📺 SHELVES (category rows) ---------- */
  const CAT_EMOJI = {
    "Self-Improvement": "🌱", "Power & Strategy": "👑", "Money & Finance": "💰",
    "Psychology & People": "🧠", "Business & Startups": "🚀",
    "Creativity": "🎨", "Productivity": "⚡"
  };

  function cardHTML(b) {
    const read = TSB.progress.forBook(b.id).length;
    const pct = Math.round((read / b.lessons.length) * 100);
    const fav = TSB.bookmarks.has(b.id);
    return `
      <div class="card__top">
        ${isNew(b.id) ? `<span class="card__new" translate="no">✦ NEW</span>` : ""}
        <span class="card__cat">${b.category}</span>
        <span class="card__time">⏱ ${b.readTime}</span>
        <img class="card__cover" src="${b.cover}" alt="${b.title} cover" loading="lazy">
        <button class="card__fav ${fav ? "on" : ""}" data-fav="${b.id}" aria-label="Bookmark">${fav ? "❤️" : "🤍"}</button>
      </div>
      ${pct > 0 ? `<div class="card__progress"><em>${pct === 100 ? "✓ DONE" : pct + "%"}</em><span style="width:${pct}%"></span></div>` : ""}
      <div class="card__body">
        <div class="card__title">${b.title}</div>
        <div class="card__author">by ${b.author} · ${b.year}</div>
        <div class="card__tag">${b.tagline}</div>
        <div class="card__footer">
          <span class="card__lessons">${read > 0 ? read + "/" : ""}${b.lessons.length} lessons</span>
          <span class="card__go">READ IT →</span>
        </div>
      </div>`;
  }

  function makeShelfRow(label, emoji, books, catForSeeAll) {
    const row = document.createElement("section");
    row.className = "shelfrow";
    const head = document.createElement("div");
    head.className = "shelfrow__head";
    head.innerHTML = `
      <h3 class="shelfrow__title">${emoji} ${label} <span class="shelfrow__count">${books.length}</span></h3>
      <div class="shelfrow__tools">
        <button class="shelfrow__arrow" data-dir="-1" aria-label="Scroll left">←</button>
        <button class="shelfrow__arrow" data-dir="1" aria-label="Scroll right">→</button>
        ${catForSeeAll ? `<button class="shelfrow__seeall" data-seeall="${catForSeeAll}">SEE ALL →</button>` : ""}
      </div>`;
    const scroll = document.createElement("div");
    scroll.className = "shelfrow__scroll";
    books.forEach((b) => {
      const card = document.createElement("a");
      card.className = "card card--shelf";
      card.href = `book.html?id=${b.id}`;
      card.innerHTML = cardHTML(b);
      scroll.appendChild(card);
    });
    row.appendChild(head);
    row.appendChild(scroll);
    head.querySelectorAll(".shelfrow__arrow").forEach((btn) => {
      btn.addEventListener("click", () => {
        scroll.scrollBy({ left: btn.dataset.dir * (scroll.clientWidth * 0.85), behavior: "smooth" });
      });
    });
    const seeAll = head.querySelector("[data-seeall]");
    if (seeAll) seeAll.addEventListener("click", () => {
      const target = seeAll.dataset.seeall;
      document.querySelectorAll(".chip").forEach((c) => {
        c.classList.toggle("active", c.textContent === target);
      });
      activeCat = target;
      render();
      document.getElementById("library").scrollIntoView({ behavior: "smooth" });
    });
    return row;
  }

  function renderShelves(all) {
    // ❤️ Your shelf first (if any), then 🆕 new, then every category
    const favs = all.filter((b) => TSB.bookmarks.has(b.id));
    if (favs.length) grid.appendChild(makeShelfRow("My Shelf", "❤️", favs, "❤️ MY SHELF"));
    const fresh = all.filter((b) => isNew(b.id));
    if (fresh.length) grid.appendChild(makeShelfRow("New This Week", "🆕", fresh, null));
    cats.forEach((c) => {
      const books = all.filter((b) => b.category === c);
      if (books.length) grid.appendChild(makeShelfRow(c, CAT_EMOJI[c] || "📚", books, c));
    });
  }

  function sortBooks(list) {
    const l = [...list];
    switch (sortMode) {
      case "az": return l.sort((a, b) => a.title.localeCompare(b.title));
      case "shortest": return l.sort((a, b) => parseInt(a.readTime) - parseInt(b.readTime));
      case "lessons": return l.sort((a, b) => b.lessons.length - a.lessons.length);
      case "newest": return l.sort((a, b) => b.year - a.year);
      case "shelves": return l; // shelves mode renders rows; keep featured order
      case "progress": return l.sort((a, b) =>
        TSB.progress.forBook(b.id).length / b.lessons.length - TSB.progress.forBook(a.id).length / a.lessons.length);
      default:
        /* ✨ NEW books float to the front, interleaved 3 Indian : 1 international
           so the shelf feels curated, not like an all-Indian wall */
        {
          const fresh = l.filter((x) => isNew(x.id));
          const rest = l.filter((x) => !isNew(x.id));
          const ind = fresh.filter((x) => TSB.isIndianBook(x.id));
          const intl = fresh.filter((x) => !TSB.isIndianBook(x.id));
          const inter = [];
          while (ind.length || intl.length) {
            for (let k = 0; k < 3 && ind.length; k++) inter.push(ind.shift());
            if (intl.length) inter.push(intl.shift());
            else if (ind.length) inter.push(ind.shift());
          }
          return [...inter, ...rest];
        }
    }
  }

  render();

  /* ---------- RANDOM BOOK ---------- */
  const randBtn = document.getElementById("randomBtn");
  if (randBtn) {
    randBtn.addEventListener("click", () => {
      TSB.achv.award("explorer");
      const b = BOOKS[Math.floor(Math.random() * BOOKS.length)];
      location.href = `book.html?id=${b.id}`;
    });
  }

  /* ---------- CONTINUE READING ---------- */
  (function () {
    const last = TSB.lastRead.get();
    const wrap = document.getElementById("continue");
    if (!wrap || !last) return;
    const b = BOOKS.find((x) => x.id === last.id);
    if (!b) return;
    const read = TSB.progress.forBook(b.id).length;
    if (read >= b.lessons.length) return;
    wrap.innerHTML = `
      <div class="continue__box">
        <span style="font-size:1.6rem;">📖</span>
        <div>
          <div class="head">Continue Reading</div>
          <div style="font-size:.8rem; font-weight:600;">${b.title} — ${read}/${b.lessons.length} lessons done</div>
        </div>
        <a class="btn btn--yellow" href="book.html?id=${b.id}">PICK UP WHERE I LEFT OFF →</a>
      </div>`;
  })();

  /* ---------- LESSON OF THE DAY (live: real date + midnight flip) ---------- */
  (function () {
    const wrap = document.getElementById("lod");
    if (!wrap) return;
    const flat = [];
    BOOKS.forEach((b) => b.lessons.forEach((l, i) => flat.push({ b, l, i })));

    /* LOCAL day number — flips at the user's own midnight, not UTC */
    function localDayNum() {
      const n = new Date();
      return Math.floor((n.getTime() - n.getTimezoneOffset() * 60000) / 864e5);
    }
    function ordinal(d) {
      if (d >= 11 && d <= 13) return d + "th";
      return d + (["th","st","nd","rd"][d % 10] || "th");
    }
    function dateLabel() {
      const n = new Date();
      const months = ["January","February","March","April","May","June",
        "July","August","September","October","November","December"];
      const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      return { date: ordinal(n.getDate()) + " " + months[n.getMonth()], day: days[n.getDay()] };
    }
    function msToMidnight() {
      const n = new Date();
      const mid = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 2);
      return mid - n;
    }

    let shownDay = -1;
    /* 🎯 PERSONALIZED pick: prefs.goal (onboarding Q1) + prefs.time (Q4)
       Weekdays (Mon–Fri) → lessons from the user's chosen category.
       Weekends (Sat–Sun) → random discovery (keeps variety). */
    const GOAL_CAT = {
      "self": "Self-Improvement", "money": "Money & Finance",
      "business": "Business & Startups", "people": "Psychology & People",
      "creativity": "Creativity", "productivity": "Productivity",
      "power": "Power & Strategy"
    };
    function personalPick(dayNum) {
      let prefs = null;
      try { prefs = JSON.parse(localStorage.getItem("tsb_prefs")); } catch (e) {}
      const dayOfWeek = new Date().getDay(); // 0=Sun ... 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const goalCat = prefs && GOAL_CAT[prefs.goal] ? GOAL_CAT[prefs.goal] : null;
      if (goalCat && !isWeekend) {
        let pool = flat.filter((x) => x.b.category === goalCat);
        if (!pool.length) pool = flat;
        // short-time users: prefer concise lessons (summary < 600 chars)
        if (prefs.time === "5" && pool.length > 3) {
          const short = pool.filter((x) => x.l.summary && x.l.summary.length < 600);
          if (short.length >= 3) pool = short;
        }
        return { pick: pool[dayNum % pool.length], personalized: true };
      }
      return { pick: flat[dayNum % flat.length], personalized: false };
    }
    function draw() {
      const dayNum = localDayNum();
      if (dayNum === shownDay) return;
      shownDay = dayNum;
      const { pick, personalized } = personalPick(dayNum);
      const dl = dateLabel();
      const label = personalized
        ? "🎯 LESSON FOR YOU"
        : "💡 Lesson of the Day";
      const note = personalized
        ? "⏳ Picked from your shelf — new one at midnight"
        : "⏳ Today only — new lesson at midnight";
      wrap.innerHTML = `
        <div class="lod__box">
          <div class="lod__label">${label}</div>
          <div class="lod__datebadge" translate="no">
            <span class="lod__dateday">${dl.day}</span>
            <span class="lod__datenum">${dl.date}</span>
          </div>
          <img src="${pick.b.cover}" alt="${pick.b.title}">
          <div>
            <div class="lod__title">${pick.l.title}</div>
            <div class="lod__meta">${pick.b.title} · ${pick.b.author}</div>
            <div class="lod__fresh" translate="no">${note}</div>
          </div>
          <a class="btn btn--red" href="book.html?id=${pick.b.id}#lesson-${pick.i}">READ IT →</a>
        </div>`;
    }
    draw();
    /* truly live: if the tab stays open past midnight, swap the lesson */
    setTimeout(function tick() { draw(); setTimeout(tick, 60000); }, msToMidnight());
    /* also re-check when user returns to the tab */
    document.addEventListener("visibilitychange", () => { if (!document.hidden) draw(); });
  })();

  /* ---------- GAMEBAR (streak + level + achievements) ---------- */
  (function () {
    const bar = document.getElementById("gamebar");
    if (!bar) return;
    function draw() {
      const lvl = TSB.levelFor(TSB.progress.totalRead());
      const streak = TSB.streak.count();
      const achvCount = TSB.achv.list().length;
      const achvTotal = Object.keys(TSB.achv.defs).length;
      bar.innerHTML = `
        <span class="gamebar__chip">🔥 <b>${streak}</b> day streak</span>
        <span class="gamebar__chip">${lvl.icon} <b>${lvl.name}</b> · ${lvl.read} lessons</span>
        <span class="gamebar__chip" id="achvOpen">🏆 <b>${achvCount}/${achvTotal}</b> badges</span>`;
      document.getElementById("achvOpen").addEventListener("click", openAchvModal);
    }
    draw();
  })();

  function openAchvModal() {
    let modal = document.getElementById("achvModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "achvModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }
    const unlocked = TSB.achv.list();
    const lvl = TSB.levelFor(TSB.progress.totalRead());
    const nextAt = lvl.next ? lvl.next.at : lvl.at;
    const prevAt = lvl.at;
    const pct = lvl.next ? Math.min(100, Math.round(((lvl.read - prevAt) / (nextAt - prevAt)) * 100)) : 100;
    modal.innerHTML = `
      <div class="modal__box">
        <button class="modal__close">✕</button>
        <div class="modal__title">🏆 Your Trophy Room</div>
        <div class="levelbar">
          <div class="levelbar__label">
            <span>${lvl.icon} ${lvl.name}</span>
            <span>${lvl.next ? lvl.next.icon + " " + lvl.next.name + " at " + lvl.next.at : "MAX LEVEL!"}</span>
          </div>
          <div class="levelbar__track"><div class="levelbar__fill" style="width:${pct}%"></div></div>
        </div>
        <div class="achvgrid">
          ${Object.entries(TSB.achv.defs).map(([id, a]) => `
            <div class="achvcard ${unlocked.includes(id) ? "" : "locked"}">
              <div class="i">${a.icon}</div>
              <div class="n">${a.name}</div>
              <div class="d">${a.desc}</div>
            </div>`).join("")}
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:20px; border-top:2px dashed var(--ink); padding-top:16px;">
          <button class="btn btn--blue" id="backupBtn" style="font-size:.72rem;">⬇ BACKUP MY PROGRESS</button>
          <button class="btn" id="restoreBtn" style="font-size:.72rem;">⬆ RESTORE FROM FILE</button>
          <input type="file" id="restoreFile" accept="application/json" style="display:none;">
        </div>
        <p style="font-size:.7rem; font-weight:600; margin-top:8px; opacity:.7;">
          Progress is saved automatically on this device. Use Backup to move your badges, streaks & progress to another phone or computer.
        </p>
      </div>`;
    modal.classList.add("open");
    modal.querySelector(".modal__close").addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });
    modal.querySelector("#backupBtn").addEventListener("click", () => TSB.backup.export());
    const fileInput = modal.querySelector("#restoreFile");
    modal.querySelector("#restoreBtn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const f = fileInput.files[0];
      if (!f) return;
      TSB.backup.import(f, (ok) => {
        if (ok) { alert("✅ Progress restored! Reloading..."); location.reload(); }
        else alert("❌ That doesn't look like a TheSmallBook backup file.");
      });
    });
  }
  window.openAchvModal = openAchvModal;

  /* ---------- KEYBOARD SHORTCUTS ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if (e.key === "/") { e.preventDefault(); searchInput.focus(); }
    if (e.key.toLowerCase() === "r" && randBtn) randBtn.click();
    if (e.key.toLowerCase() === "d") TSB.theme.toggle();
  });

  /* ---------- SCROLL REVEAL ---------- */
  const targets = document.querySelectorAll(".how__step, .section-head, .storyform__box, .stat, .lod__box");
  targets.forEach((t) => t.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.15 });
  targets.forEach((t) => io.observe(t));
})();

/* ============================================================
   💀 GRAVEYARD TRANSITION — click the banner, descend in style
   ============================================================ */
(function () {
  const banner = document.querySelector(".gravebanner__box");
  if (!banner) return;
  banner.addEventListener("click", (e) => {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // straight nav
    e.preventDefault();
    let ov = document.getElementById("graveTransition");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "graveTransition";
      ov.className = "grave-transition";
      ov.innerHTML = '<div class="grave-transition__skull">💀</div>' +
        '<div class="grave-transition__text">Entering the Graveyard</div>' +
        '<div class="grave-transition__sub">they paid full price · your lesson is free</div>';
      document.body.appendChild(ov);
    }
    requestAnimationFrame(() => ov.classList.add("on"));
    setTimeout(() => { location.href = banner.href; }, 950);
  });
})();
