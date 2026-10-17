/* ============================================================
   THESMALLBOOK, HOMEPAGE APP
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
    /* the real numbers ship in the HTML now, so count up only from what a
       slow phone actually sees: most days this settles instantly */
    let cur = Math.min(parseInt(el.textContent, 10) || 0, target);
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

  /* 🎯 onboarding personalisation, lead with the reader's primary shelf
     (once per session, until they touch a filter chip themselves) */
  try {
    const lead = JSON.parse(localStorage.getItem("tsb_ob_lead") || "null");
    if (lead && !sessionStorage.getItem("tsb_filter_touched") && cats.includes(lead)) {
      activeCat = lead;
      document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.textContent === lead));
    }
  } catch (e) {}

  function makeChip(label, active) {
    const b = document.createElement("button");
    b.className = "chip" + (active ? " active" : "");
    b.textContent = label;
    b.addEventListener("click", () => {
      activeCat = label;
      try { sessionStorage.setItem("tsb_filter_touched", "1"); } catch (e) {}
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

  /* ---------- SEARCH (fuzzy), debounced so mobile stays smooth ---------- */
  let searchTimer = null;
  /* FIND IT / Enter → smooth glide to the shelf where the filtered results live */
  function smoothScrollToShelf() {
    try {
      const target = document.getElementById("library") || grid;
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {}
  }

  /* ---------- ⚡ INSTANT LIVE TITLE SEARCH (FAST SEPARATED TITLES) ---------- */
  const searchLiveOut = document.getElementById("searchLiveResults");

  function escHTML(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderLiveTitleSearch(val) {
    if (!searchLiveOut) return;
    const v = String(val || "").trim().toLowerCase();
    if (!v) {
      searchLiveOut.style.display = "none";
      searchLiveOut.innerHTML = "";
      return;
    }

    const words = v.split(/\s+/).filter(Boolean);
    const hits = BOOKS.filter((b) => {
      const titleLower = (b.title || "").toLowerCase();
      const authorLower = (b.author || "").toLowerCase();
      const catLower = (b.category || "").toLowerCase();
      return words.every((w) => titleLower.includes(w) || authorLower.includes(w) || catLower.includes(w));
    });

    if (!hits.length) {
      searchLiveOut.style.display = "block";
      searchLiveOut.innerHTML = `<div style="padding:10px 12px;font:700 13px 'Space Grotesk',sans-serif;color:var(--muted,#777);text-align:center;">No matching titles found for “${escHTML(v)}”. Press Enter to search inside all lessons.</div>`;
      return;
    }

    searchLiveOut.style.display = "flex";
    const topHits = hits.slice(0, 6);
    let html = `<div class="search-live-header"><span>MATCHING BOOK TITLES (${hits.length})</span><small>FAST PREVIEW</small></div>`;
    topHits.forEach((b) => {
      html += `
        <a class="search-hit-item" href="book.html?id=${encodeURIComponent(b.id)}">
          <img class="search-hit-cover" src="${escHTML(b.cover)}" alt="" loading="lazy" onerror="this.style.display='none'">
          <div class="search-hit-info">
            <div class="search-hit-title">${escHTML(b.title)}</div>
            <div class="search-hit-meta">${escHTML(b.author)} · ${escHTML(b.category)} · ${b.lessons.length} lessons</div>
          </div>
          <span class="search-hit-badge">READ →</span>
        </a>`;
    });

    if (hits.length > 6) {
      html += `
        <div class="search-live-footer">
          <button type="button" id="searchLiveMoreBtn">↓ SEE ALL ${hits.length} BOOKS ON THE SHELF</button>
        </div>`;
    }

    searchLiveOut.innerHTML = html;
    const moreBtn = document.getElementById("searchLiveMoreBtn");
    if (moreBtn) {
      moreBtn.addEventListener("click", () => {
        searchLiveOut.style.display = "none";
        smoothScrollToShelf();
      });
    }
  }

  document.addEventListener("click", (e) => {
    if (!searchLiveOut || searchLiveOut.style.display === "none") return;
    if (!e.target.closest("#searchWrap")) {
      searchLiveOut.style.display = "none";
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchLiveOut) {
      searchLiveOut.style.display = "none";
    }
  });

  searchInput.addEventListener("input", (e) => {
    const v = e.target.value.trim().toLowerCase();
    renderLiveTitleSearch(v);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      query = v;
      render();
    }, 160);
  });

  /* FIND IT button + Enter key → glide down to the filtered shelf */
  const searchGo = document.getElementById("searchGo");
  if (searchGo) searchGo.addEventListener("click", smoothScrollToShelf);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); smoothScrollToShelf(); }
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

    /* Smart category fallback: if searching inside a category returns 0 hits,
       automatically switch category to ALL to show matching books seamlessly */
    if (results.length === 0 && query && activeCat !== "ALL") {
      const allResults = BOOKS.filter((b) => {
        const hay = `${b.title} ${b.author} ${b.category} ${b.tagline}`;
        if (fuzzyMatch(hay, query)) { b._lessonHit = null; return true; }
        let hitIdx = b.lessons.findIndex((l) => fuzzyMatch(l.title + " " + l.chapter, query));
        if (hitIdx === -1 && query.length >= 4) {
          hitIdx = b.lessons.findIndex((l) =>
            (l.summary + " " + l.example + " " + l.action).toLowerCase().includes(query));
        }
        if (hitIdx !== -1) { b._lessonHit = hitIdx; return true; }
        b._lessonHit = null;
        return false;
      });

      if (allResults.length > 0) {
        activeCat = "ALL";
        document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.textContent === "ALL"));
        results = allResults;
      }
    }

    results = sortBooks(results);
    grid.innerHTML = "";

    if (!results.length) {
      const msg = activeCat === "❤️ MY SHELF" && !query
        ? `<span>❤️</span>Your shelf is empty.<br>Tap the heart on any book to save it here!`
        : activeCat === "🇮🇳 INDIAN" && !query
        ? `<span>🇮🇳</span>Indian books coming soon!<br>Check back next week.`
        : `<span>📚</span>No books found.<br>Try another search, typos are OK!`;
      grid.innerHTML = `<div class="empty">${msg}</div>`;
      return;
    }

    /* 📺 SHELVES VIEW, Netflix-style rows, opt-in via the sort dropdown.
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
    /* 🎁 starter shelf picked during onboarding, leads Home */
    let starter = [];
    try { starter = JSON.parse(localStorage.getItem("tsb_starter_shelf")) || []; } catch (e) {}
    if (starter.length) {
      const sb = starter.map((id) => all.find((b) => b.id === id)).filter(Boolean);
      if (sb.length) grid.appendChild(makeShelfRow("Your Starter Shelf", "🎁", sb, null));
    }
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
        /* ✨ v221 recommendation ranking:
           1) your preferences (onboarding "why" + shelves + what you read) LEAD the library,
              matched case-insensitively, fixes the 'Productivity' vs 'productivity' misalignment
           2) inside each group the BEST books come first (deepest: most lessons + autopsies)
           3) new books still float
           4) the WHOLE result is interleaved 3 Indian : 1 international, so your shelf is
              never an all-international wall and never an all-Indian wall */
        {
          let prefs = [];
          try { prefs = JSON.parse(localStorage.getItem("tsb_interests")) || []; } catch (e) {}
          prefs = prefs.map((x) => String(x).toLowerCase()).filter(Boolean);
          const score = (b) => (b.graveLink ? 3 : 0) + (b.lessons ? b.lessons.length : 0) * 2 - (parseInt(b.readTime) || 15) / 20;
          const prefBlock = [], restBlock = [];
          l.forEach((b) => { (prefs.indexOf(String(b.category || "").toLowerCase()) >= 0 ? prefBlock : restBlock).push(b); });
          const q = (arr) => [...arr].sort((a, b) => score(b) - score(a));
          const mix3to1 = (arr) => {
            const ind = arr.filter((x) => TSB.isIndianBook(x.id));
            const intl = arr.filter((x) => !TSB.isIndianBook(x.id));
            const out = [];
            while (ind.length || intl.length) {
              for (let k = 0; k < 3 && ind.length; k++) out.push(ind.shift());
              if (intl.length) out.push(intl.shift());
              else if (ind.length) out.push(ind.shift());
            }
            return out;
          };
          const prefQ = q(prefBlock), restQ = q(restBlock);
          const ordered = mix3to1([
            ...prefQ.filter((x) => isNew(x.id)),
            ...restQ.filter((x) => isNew(x.id)),
            ...prefQ.filter((x) => !isNew(x.id)),
            ...restQ.filter((x) => !isNew(x.id))
          ]);
          /* 🎁 starter shelf picks lead the library in every view */
          let starterIds = [];
          try { starterIds = JSON.parse(localStorage.getItem("tsb_starter_shelf")) || []; } catch (e) {}
          if (starterIds.length) {
            const st = new Set(starterIds);
            const sb = ordered.filter((x) => st.has(x.id));
            const tail = ordered.filter((x) => !st.has(x.id));
            if (sb.length) return sb.concat(tail);
          }
          return ordered;
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
          <div style="font-size:.8rem; font-weight:600;">${b.title}, ${read}/${b.lessons.length} lessons done</div>
        </div>
        <a class="btn btn--yellow" href="book.html?id=${b.id}">PICK UP WHERE I LEFT OFF →</a>
      </div>`;
  })();

  /* ---------- 🔥 DAILY 60-SECOND SPARK & FLAME STREAK RETENTION ENGINE ---------- */
  const SPARKS = [
    {
      bookId: "atomic-habits",
      title: "The 2-Minute Rule",
      quote: "When you start a new habit, it should take less than two minutes to do.",
      takeaway: "Standardize before you optimize. A habit must be established before it can be improved.",
      book: "Atomic Habits",
      author: "James Clear"
    },
    {
      bookId: "psychology-of-money",
      title: "Freedom Over Luxury",
      quote: "The ability to do what you want, when you want, with who you want, for as long as you want, is the highest dividend money pays.",
      takeaway: "True wealth is not the cars you buy, but the options, independence, and calm you preserve.",
      book: "The Psychology of Money",
      author: "Morgan Housel"
    },
    {
      bookId: "deep-work",
      title: "The Law of High-Productivity",
      quote: "High-Quality Work Produced = (Time Spent) x (Intensity of Focus).",
      takeaway: "Cut shallow distractions and batch your hardest cognitive output into unbroken blocks.",
      book: "Deep Work",
      author: "Cal Newport"
    },
    {
      bookId: "essentialism",
      title: "The Power of Less But Better",
      quote: "If you don't prioritize your life, someone else will.",
      takeaway: "Ruthlessly eliminate trivial tasks so you can channel full energy into what truly matters.",
      book: "Essentialism",
      author: "Greg McKeown"
    },
    {
      bookId: "show-your-work",
      title: "Document, Don't Create",
      quote: "Share what you love, and the people who love the same things will find you.",
      takeaway: "You don't need to be an expert to post. Share the process, the daily notebook, the lessons learned.",
      book: "Show Your Work!",
      author: "Austin Kleon"
    },
    {
      bookId: "almanack-naval-ravikant",
      title: "Specific Knowledge & Leverage",
      quote: "Specific knowledge is found by pursuing your genuine curiosity and passion rather than whatever is hot right now.",
      takeaway: "Learn to build or learn to sell. If you can do both, you will be unstoppable.",
      book: "The Almanack of Naval Ravikant",
      author: "Eric Jorgenson"
    },
    {
      bookId: "cant-hurt-me",
      title: "The 40% Rule",
      quote: "When your mind is telling you that you are done, you're really only 40 percent done.",
      takeaway: "Our brains are built to protect comfort. Push past the initial fatigue barrier to grow.",
      book: "Can't Hurt Me",
      author: "David Goggins"
    }
  ];

  function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function getTodaySpark() {
    const today = getTodayKey();
    let num = 0;
    for (let i = 0; i < today.length; i++) num = (num * 31 + today.charCodeAt(i)) % SPARKS.length;
    return SPARKS[num];
  }

  function isSparkDone() {
    return localStorage.getItem("tsb_spark_done_" + getTodayKey()) === "1";
  }

  function markSparkDone() {
    localStorage.setItem("tsb_spark_done_" + getTodayKey(), "1");
    TSB.streak.touch();
    try {
      if (TSB.sound && TSB.sound.play) TSB.sound.play("ding");
    } catch (e) {}
    if (window.confetti) {
      try { window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } }); } catch (eC) {}
    }
  }

  function openStreakSheet() {
    let sheetOvl = document.getElementById("streakSheetOvl");
    if (!sheetOvl) {
      sheetOvl = document.createElement("div");
      sheetOvl.id = "streakSheetOvl";
      sheetOvl.className = "tsb-streak-sheet-ovl";
      document.body.appendChild(sheetOvl);
    }
    const streak = TSB.streak.count();
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
    const sparkDone = isSparkDone();

    let ringsHtml = "";
    for (let d = 0; d < 7; d++) {
      const isPast = d < dayOfWeek;
      const isToday = d === dayOfWeek;
      const done = (isToday && sparkDone) || (isPast && d >= Math.max(0, dayOfWeek - streak));
      ringsHtml += `
        <div class="tsb-ring ${isToday ? 'today' : ''} ${done ? 'completed' : ''}">
          <div class="tsb-ring__circle">${done ? '🔥' : (isToday ? '⚡' : '○')}</div>
          <span class="tsb-ring__day">${dayNames[d]}</span>
        </div>`;
    }

    sheetOvl.innerHTML = `
      <div class="tsb-streak-sheet" role="dialog" aria-modal="true" aria-label="Your reading streak">
        <div class="tsb-streak-sheet__grip"></div>
        <div class="tsb-streak-sheet__flame-big">🔥</div>
        <h3 class="tsb-streak-sheet__title">${streak} DAY STREAK</h3>
        <p class="tsb-streak-sheet__sub">Keep the flame alive. Read for 60 seconds every day.</p>

        <div class="tsb-streak-sheet__rings">
          ${ringsHtml}
        </div>

        <div style="background:var(--bg,#f6f1e8);border:2px solid var(--ink,#111);border-radius:14px;padding:14px;margin-bottom:18px;">
          <b style="display:block;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px;color:var(--ink,#111);">🛡️ HABIT SHIELD ACTIVE</b>
          <span style="font-size:12px;color:var(--sub,#666);line-height:1.4;display:block;">
            Never miss twice. Even when life gets busy, complete your 60-second daily spark to protect your streak.
          </span>
        </div>

        <button type="button" id="streakShareBtn" style="width:100%;background:var(--yellow,#ffc800);border:2.5px solid var(--ink,#111);border-radius:14px;padding:12px;font:800 13px var(--font-head);cursor:pointer;box-shadow:3px 3px 0 var(--ink,#111);margin-bottom:8px;">
          SHARE MY STREAK 📤
        </button>
        <button type="button" id="streakCloseBtn" style="width:100%;background:transparent;border:none;font:700 12px var(--font-head);color:var(--sub,#666);cursor:pointer;padding:8px;">
          CLOSE
        </button>
      </div>`;

    sheetOvl.style.display = "flex";
    sheetOvl.addEventListener("click", (e) => {
      if (e.target === sheetOvl || e.target.id === "streakCloseBtn") {
        sheetOvl.style.display = "none";
      }
    });

    const shareBtn = document.getElementById("streakShareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        const text = `🔥 I am on a ${streak}-day reading streak on TheSmallBook! 60 seconds of actionable book wisdom daily: https://thesmallbook.in`;
        if (navigator.share) {
          navigator.share({ title: "My TheSmallBook Streak", text: text }).catch(() => {});
        } else {
          navigator.clipboard.writeText(text);
          shareBtn.textContent = "COPIED TO CLIPBOARD! ✨";
          setTimeout(() => { shareBtn.textContent = "SHARE MY STREAK 📤"; }, 2000);
        }
      });
    }
  }

  /* ---------- LESSON OF THE DAY + 60s SPARK (COMBINED & ULTRA-COMPACT) ---------- */
  (function () {
    const wrap = document.getElementById("lod");
    if (!wrap) return;
    const flat = [];
    BOOKS.forEach((b) => b.lessons.forEach((l, i) => flat.push({ b, l, i })));

    /* LOCAL day number, flips at the user's own midnight, not UTC */
    function localDayNum() {
      const n = new Date();
      return Math.floor((n.getTime() - n.getTimezoneOffset() * 60000) / 864e5);
    }
    function ordinal(d) {
      if (d >= 11 && d <= 13) return d + "th";
      return d + (["th","st","nd","rd"][d % 10] || "th");
    }
    function msToMidnight() {
      const n = new Date();
      const mid = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 2);
      return mid - n;
    }

    let shownDay = -1;
    const GOAL_CAT = {
      "self": "Self-Improvement", "money": "Money & Finance",
      "business": "Business & Startups", "people": "Psychology & People",
      "creativity": "Creativity", "productivity": "Productivity",
      "power": "Power & Strategy"
    };
    function personalPick(dayNum) {
      let prefs = null;
      try { prefs = JSON.parse(localStorage.getItem("tsb_prefs")); } catch (e) {}
      const dayOfWeek = new Date().getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const goalCat = prefs && GOAL_CAT[prefs.goal] ? GOAL_CAT[prefs.goal] : null;
      if (goalCat && !isWeekend) {
        let pool = flat.filter((x) => x.b.category === goalCat);
        if (!pool.length) pool = flat;
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
      const spark = getTodaySpark();
      const streak = TSB.streak.count();
      const done = isSparkDone();

      const targetBook = (spark && spark.bookId) ? (BOOKS.find((b) => b.id === spark.bookId) || pick.b) : pick.b;
      const bookTitle = spark.book || targetBook.title;
      const bookAuthor = spark.author || targetBook.author;
      const bookId = (spark && spark.bookId) ? spark.bookId : targetBook.id;
      const quoteText = spark.quote || (pick.l.summary ? pick.l.summary.slice(0, 120) + "…" : pick.l.title);
      const takeawayText = spark.takeaway || (pick.l.action || "");

      wrap.innerHTML = `
        <div class="lod__box">
          <button type="button" class="lod__streak" id="lodStreakBtn" title="View streak flame and weekly rings">
            🔥 <span>${streak}d</span>
          </button>
          <img class="lod__thumb" src="${escHTML(targetBook.cover)}" alt="" loading="lazy">
          <div class="lod__content">
            <div class="lod__headrow">
              <span class="lod__badge">⚡ 60s SPARK</span>
              <span class="lod__sep">·</span>
              <span class="lod__book">${escHTML(bookTitle)}</span>
              <span class="lod__author">by ${escHTML(bookAuthor)}</span>
            </div>
            <div class="lod__quote">“${escHTML(quoteText)}”</div>
            ${takeawayText ? `<div class="lod__takeaway">${escHTML(takeawayText)}</div>` : ''}
          </div>
          <a class="lod__btn ${done ? 'done' : ''}" id="lodSparkBtn" href="book.html?id=${encodeURIComponent(bookId)}#lesson-1">
            ${done ? '✓ IGNITED 🔥' : 'READ 60s →'}
          </a>
        </div>`;

      const strBtn = document.getElementById("lodStreakBtn");
      if (strBtn) strBtn.addEventListener("click", openStreakSheet);

      const actBtn = document.getElementById("lodSparkBtn");
      if (actBtn && !done) {
        actBtn.addEventListener("click", () => {
          markSparkDone();
        });
      }
    }
    draw();
    setTimeout(function tick() { draw(); setTimeout(tick, 60000); }, msToMidnight());
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
        <span class="gamebar__chip" id="streakOpen" style="cursor:pointer;" title="View streak flame and weekly rings">🔥 <b>${streak}</b> day streak</span>
        <span class="gamebar__chip">${lvl.icon} <b>${lvl.name}</b> · ${lvl.read} lessons</span>
        <span class="gamebar__chip" id="achvOpen">🏆 <b>${achvCount}/${achvTotal}</b> badges</span>`;
      const strEl = document.getElementById("streakOpen");
      if (strEl) strEl.addEventListener("click", openStreakSheet);
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
   💀 GRAVEYARD TRANSITION, click the banner, descend in style
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
