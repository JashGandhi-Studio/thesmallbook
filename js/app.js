/* ============================================================
   THESMALLBOOK, HOMEPAGE APP
   Grid, fuzzy search, filters, sorting, bookmarks, progress,
   continue-reading, lesson of the day, gamification, shortcuts.
   ============================================================ */

(function () {
  const grid = document.getElementById("grid");
  const HEART_ON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="#E5484D" stroke="#E5484D" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.5 3.7 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>', HEART_OFF = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.5 3.7 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';
  const searchInput = document.getElementById("searchInput");
  const filterWrap = document.getElementById("filters");
  const sortSel = document.getElementById("sortSel");
  const statBooks = document.getElementById("statBooks");
  const statLessons = document.getElementById("statLessons");
  const statCats = document.getElementById("statCats");
  const statMins = document.getElementById("statMins");

  const LATEST_20_NEW = new Set([
    "the-intellectuals-and-society",
    "zen-mind-beginners-mind",
    "the-third-pillar",
    "alchemy-rory-sutherland",
    "the-great-derangement",
    "the-effective-engineer",
    "the-brahmagupta-scrolls",
    "the-courtyard-stories",
    "the-curious-investor",
    "the-sovereign-individual",
    "the-kirana-ledger",
    "the-zero-discount-diner",
    "the-first-hundred-patrons",
    "the-midnight-dispatch",
    "the-silent-partner-tax",
    "the-unclaimed-shelf",
    "the-reputation-audit",
    "the-apprentice-hour",
    "the-founders-warranty",
    "the-patient-capitalist"
  ]);

  function isNew(id) { return LATEST_20_NEW.has(id); }
  function isOrig(id) { try { return ((window.TSB_CONFIG && TSB_CONFIG.ORIGINALS) || []).indexOf(id) >= 0; } catch (e) { return false; } }

  let activeCat = "ALL";
  let query = "";
  let sortMode = TSB.get("tsb_view2", "shelves") === "grid" ? "default" : "shelves";

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
    /* v333: what the reader sees is calm (no emoji, no shouting); the text
       stays the filter key every other script already compares against */
    const shown = label === "ALL" ? "All" : label === "❤️ MY SHELF" ? "My shelf" : label === "🇮🇳 INDIAN" ? "Indian authors" : label;
    b.setAttribute("data-label", shown);
    b.setAttribute("aria-label", shown);
    if (label === "❤️ MY SHELF") b.classList.add("chip--heart");
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
      if (sortMode === "shelves") {
        /* asking for shelves always shows the shelves, not a filtered grid */
        activeCat = "ALL"; query = "";
        if (searchInput) searchInput.value = "";
        document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.textContent === "ALL"));
      }
      // remember the view style (shelves vs classic) across visits
      TSB.set("tsb_view2", sortMode === "shelves" ? "shelves" : "grid");
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
      searchLiveOut.innerHTML = `<div class="search-live-empty">No titles match “${escHTML(v)}”. Press search to look inside every lesson.</div>`;
      return;
    }

    searchLiveOut.style.display = "flex";
    const topHits = hits.slice(0, 6);
    let html = `<div class="search-live-header"><span>${hits.length} ${hits.length === 1 ? "book" : "books"}</span></div>`;
    topHits.forEach((b) => {
      html += `
        <a class="search-hit-item" href="book.html?id=${encodeURIComponent(b.id)}">
          <img class="search-hit-cover" src="${escHTML(b.cover)}" alt="" loading="lazy" onerror="this.style.display='none'">
          <div class="search-hit-info">
            <div class="search-hit-title">${escHTML(b.title)}</div>
            <div class="search-hit-meta">${escHTML(b.author)}</div>
          </div>
          <svg class="search-hit-go" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
        </a>`;
    });

    if (hits.length > 6) {
      html += `
        <div class="search-live-footer">
          <button type="button" id="searchLiveMoreBtn">See all ${hits.length}</button>
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
    /* v336: lesson text arrives on the first real search, then results refresh */
    if (query && query.length >= 4 && window.TSB_LESSONS && !render._all) { render._all = 1; TSB_LESSONS.all(function () { render(); }); }
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
      const qSafe = String(query || "").replace(/[&<>"']/g, "");
      const fe = (ic, t, p, extra) => `<div class="fe fe--lib"><span class="fe-ic">${ic}</span><b>${t}</b><p>${p}</p>${extra || ""}</div>`;
      const msg = activeCat === "❤️ MY SHELF" && !query
        ? fe('<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.5 3.7 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>', "Your shelf is empty", "Tap the heart on any book to keep it here.")
        : activeCat === "🇮🇳 INDIAN" && !query
        ? fe('<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>', "Indian books are on the way", "New ones land every week.")
        : fe('<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>', query ? "Not on the shelf yet" : "No books here", query ? "Check the spelling, or ask us to add <i>" + qSafe + "</i>." : "Try another shelf or a search.",
            query ? `<button type="button" class="fe-btn rq-inline" data-request="${qSafe}">Request this book</button>` : "");
      grid.innerHTML = msg;
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

    paintCount(results.length);
    const BATCH = 30;
    let shownN = 0;
    function addBatch() {
      results.slice(shownN, shownN + BATCH).forEach((b, i) => addCard(b, i));
      shownN = Math.min(results.length, shownN + BATCH);
      bindFavs();
      const old = grid.querySelector(".lb-more"); if (old) old.remove();
      if (shownN < results.length) {
        const m = document.createElement("div"); m.className = "lb-more"; m.setAttribute("aria-hidden", "true");
        grid.appendChild(m);
        if ("IntersectionObserver" in window) {
          const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); addBatch(); } }, { rootMargin: "900px 0px" });
          io.observe(m);
        } else { setTimeout(addBatch, 60); }
      }
    };
    const addCard = (b, i) => {
      const read = TSB.progress.forBook(b.id).length;
      const pct = Math.round((read / b.lessons.length) * 100);
      const fav = TSB.bookmarks.has(b.id);
      const a = document.createElement("a");
      a.className = "card";
      const lessonHit = query && b._lessonHit !== null && b._lessonHit !== undefined ? b._lessonHit : null;
      a.href = `book.html?id=${b.id}` + (lessonHit !== null ? `#lesson-${lessonHit}` : "");
      a.style.animationDelay = `${Math.min(i, 10) * 40}ms`;
      a.innerHTML = `
        <div class="card__top">
          ${isNew(b.id) ? `<span class="card__new" translate="no">✦ NEW</span>` : ""}
          ${isOrig(b.id) ? `<span class="card__orig" translate="no">✦ TSB ORIGINAL</span>` : ""}
          <span class="card__cat">${b.category}</span>
          <span class="card__time">⏱ ${b.readTime}</span>
          <img class="card__cover" src="${b.cover}" alt="${b.title} cover" loading="lazy">
          <button class="card__fav ${fav ? "on" : ""}" data-fav="${b.id}" aria-label="Save to my shelf">${fav ? HEART_ON : HEART_OFF}</button>
        </div>
        ${pct > 0 ? `<div class="card__progress"><em>${pct === 100 ? "✓ DONE" : pct + "%"}</em><span style="width:${pct}%"></span></div>` : ""}
        <div class="card__body">
          <div class="card__title">${b.title}</div>
          <div class="card__author">${/^unknown$/i.test(b.author || "") || !b.author ? "TheSmallBook Original" : "by " + escHTML(b.author)} · ${b.year}</div>
          <div class="card__tag">${b.tagline || b.oneLiner || ""}</div>
          ${lessonHit !== null ? `<div class="card__hit" translate="no">🔍 FOUND INSIDE: <strong>${b.lessons[lessonHit].title}</strong></div>` : ""}
          <div class="card__footer">
            <span class="card__lessons">${read > 0 ? read + "/" : ""}${b.lessons.length} lessons</span>
            <span class="card__go">READ IT →</span>
          </div>
        </div>`;
      grid.appendChild(a);
    };
    addBatch();
  }

  /* the small line above the books says how many are showing */
  function paintCount(n) {
    const tb = document.querySelector(".toolbar"); if (!tb) return;
    let c = document.getElementById("lbCount");
    if (!c) { c = document.createElement("span"); c.id = "lbCount"; c.className = "lb-count"; tb.insertBefore(c, tb.firstChild); }
    const where = activeCat === "ALL" ? "" : activeCat === "❤️ MY SHELF" ? " on your shelf" : activeCat === "🇮🇳 INDIAN" ? " by Indian authors" : " in " + activeCat;
    c.textContent = query ? n + (n === 1 ? " match" : " matches") : (sortMode === "shelves" && activeCat === "ALL" ? "For you" : n + (n === 1 ? " book" : " books") + where);
    /* the pill always names the order you are looking at */
    if (sortSel) {
      const showingShelves = sortMode === "shelves" && activeCat === "ALL" && !query;
      if (sortMode === "shelves") sortSel.value = showingShelves ? "shelves" : "default";
    }
  }

  function bindFavs() {
    grid.querySelectorAll("[data-fav]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const on = TSB.bookmarks.toggle(btn.dataset.fav);
        btn.classList.toggle("on", on);
        btn.innerHTML = on ? HEART_ON : HEART_OFF;
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
        ${isOrig(b.id) ? `<span class="card__orig" translate="no">✦ TSB ORIGINAL</span>` : ""}
        <span class="card__cat">${b.category}</span>
        <span class="card__time">⏱ ${b.readTime}</span>
        <img class="card__cover" src="${b.cover}" alt="${b.title} cover" loading="lazy">
        <button class="card__fav ${fav ? "on" : ""}" data-fav="${b.id}" aria-label="Save to my shelf">${fav ? HEART_ON : HEART_OFF}</button>
      </div>
      ${pct > 0 ? `<div class="card__progress"><em>${pct === 100 ? "✓ DONE" : pct + "%"}</em><span style="width:${pct}%"></span></div>` : ""}
      <div class="card__body">
        <div class="card__title">${b.title}</div>
        <div class="card__author">${/^unknown$/i.test(b.author || "") || !b.author ? "TheSmallBook Original" : "by " + escHTML(b.author)} · ${b.year}</div>
        <div class="card__tag">${b.tagline || b.oneLiner || ""}</div>
        <div class="card__footer">
          <span class="card__lessons">${read > 0 ? read + "/" : ""}${b.lessons.length} lessons</span>
          <span class="card__go">READ IT →</span>
        </div>
      </div>`;
  }

  /* v333 SHELVES: rows you can swipe, like a good bookshop. Each row shows a
     handful, "See all" opens the whole shelf, and the page stays light. */
  const CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  /* Originals are written here, so they never say "Unknown" */
  function byLine(b) { return (!b.author || /^unknown$/i.test(b.author)) ? (isOrig(b.id) ? "TheSmallBook Original" : "TheSmallBook") : b.author; }
  function lbCard(b) {
    const read = TSB.progress.forBook(b.id).length;
    const pct = Math.round((read / b.lessons.length) * 100);
    return `<a class="lb-card" href="book.html?id=${b.id}">
      <span class="lb-cover"><img src="${b.cover}" alt="" loading="lazy" decoding="async">${isOrig(b.id) ? '<em class="lb-tag">Original</em>' : (isNew(b.id) ? '<em class="lb-tag lb-tag--new">New</em>' : "")}${pct > 0 ? `<i class="lb-prog"><s style="width:${pct}%"></s></i>` : ""}</span>
      <b>${escHTML(b.title)}</b><small>${escHTML(byLine(b))}</small></a>`;
  }
  function makeShelfRow(label, emoji, books, catForSeeAll, note) {
    const row = document.createElement("section");
    row.className = "lb-row";
    const max = 14;
    row.innerHTML = `<div class="lb-row__hd"><div><h3>${label}</h3>${note ? `<p>${note}</p>` : ""}</div>` +
      (catForSeeAll && books.length > 3 ? `<button type="button" class="lb-see" data-seeall="${escHTML(catForSeeAll)}">See all ${books.length}${CHEV}</button>` : "") + `</div>` +
      `<div class="lb-row__sc">${books.slice(0, max).map(lbCard).join("")}</div>`;
    const seeAll = row.querySelector("[data-seeall]");
    if (seeAll) seeAll.addEventListener("click", () => {
      const target = seeAll.dataset.seeall;
      document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.textContent === target));
      activeCat = target;
      try { sessionStorage.setItem("tsb_filter_touched", "1"); } catch (e) {}
      render();
      const f = document.getElementById("filters"); if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return row;
  }

  function renderShelves(all) {
    paintCount(all.length);
    const byId = {}; all.forEach((b) => { byId[b.id] = b; });
    const used = {};
    const add = (label, list, see, note) => { if (list.length) grid.appendChild(makeShelfRow(label, "", list, see, note)); };
    /* 1 what you are in the middle of */
    const going = all.filter((b) => { const r = TSB.progress.forBook(b.id).length; return r > 0 && r < b.lessons.length; });
    add("Continue reading", going, null, null);
    /* 2 the shelf you picked when you joined */
    let starter = [];
    try { starter = JSON.parse(localStorage.getItem("tsb_starter_shelf")) || []; } catch (e) {}
    add("Your starter shelf", starter.map((id) => byId[id]).filter(Boolean), null, "Picked for you when you joined");
    /* 3 saved books */
    add("My shelf", all.filter((b) => TSB.bookmarks.has(b.id)), "❤️ MY SHELF", null);
    /* 4 new and original */
    add("New this week", all.filter((b) => isNew(b.id)), null, null);
    add("TheSmallBook Originals", all.filter((b) => isOrig(b.id)), null, "Written here, nowhere else");
    /* 5 the shelves you care about first, then the rest */
    let lead = [];
    try { lead = (JSON.parse(localStorage.getItem("tsb_interests") || "[]") || []).map((x) => String(x).toLowerCase()); } catch (e) {}
    const order = cats.slice().sort((a, b) => (lead.indexOf(a.toLowerCase()) < 0 ? 99 : lead.indexOf(a.toLowerCase())) - (lead.indexOf(b.toLowerCase()) < 0 ? 99 : lead.indexOf(b.toLowerCase())));
    add("By Indian authors", all.filter((b) => TSB.isIndianBook(b.id)), "🇮🇳 INDIAN", null);
    order.forEach((c) => add(c, all.filter((b) => b.category === c), c, null));
    /* 6 one calm way into everything */
    const allBtn = document.createElement("div");
    allBtn.className = "lb-all";
    allBtn.innerHTML = `<button type="button">Browse all ${all.length} books${CHEV}</button>`;
    allBtn.querySelector("button").addEventListener("click", () => {
      sortMode = "default"; if (sortSel) sortSel.value = "default";
      TSB.set("tsb_view2", "grid"); render();
      const f = document.getElementById("filters"); if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    grid.appendChild(allBtn);
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
  function getTodayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function localDayNum() {
    const n = new Date();
    return Math.floor((n.getTime() - n.getTimezoneOffset() * 60000) / 864e5);
  }

  /* Dynamically sources daily spark from the entire 520-book / 4,343-lesson library */
  function getTodaySpark(dayNum, offset) {
    if (dayNum == null) dayNum = localDayNum();
    const off = offset || 0;
    const flat = [];
    if (typeof BOOKS !== "undefined" && Array.isArray(BOOKS)) {
      BOOKS.forEach((b) => {
        if (b && Array.isArray(b.lessons)) {
          b.lessons.forEach((l, i) => flat.push({ b, l, i }));
        }
      });
    }
    if (!flat.length) return null;

    let prefs = null;
    try { prefs = JSON.parse(localStorage.getItem("tsb_prefs")); } catch (e) {}
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const GOAL_CAT = {
      "self": "Self-Improvement", "money": "Money & Finance",
      "business": "Business & Startups", "people": "Psychology & People",
      "creativity": "Creativity", "productivity": "Productivity",
      "power": "Power & Strategy"
    };
    const goalCat = prefs && GOAL_CAT[prefs.goal] ? GOAL_CAT[prefs.goal] : null;

    let pool = flat;
    let isPersonalized = false;
    if (goalCat && !isWeekend) {
      const catPool = flat.filter((x) => x.b.category === goalCat);
      if (catPool.length >= 10) {
        pool = catPool;
        isPersonalized = true;
      }
    }

    // High-dispersion prime stride 137 ensures zero consecutive repeats across days
    const effectiveIndex = Math.abs((dayNum + off) * 137 + 41) % pool.length;
    const pick = pool[effectiveIndex];
    const b = pick.b;
    const l = pick.l;

    let quote = "";
    if (b.quotes && b.quotes.length > 0) {
      quote = b.quotes[Math.abs(dayNum + off) % b.quotes.length];
    } else if (l.summary) {
      quote = l.summary.split(".")[0].trim() + ".";
    } else {
      quote = l.title;
    }

    const takeaway = l.action || b.oneLiner || b.bigIdea || "";

    return {
      bookId: b.id,
      book: b.title,
      author: b.author,
      cover: b.cover,
      category: b.category,
      lessonIndex: pick.i,
      lessonTitle: l.title,
      quote: quote,
      takeaway: takeaway,
      personalized: isPersonalized
    };
  }

  function isSparkDone() {
    return localStorage.getItem("tsb_spark_done_" + getTodayKey()) === "1";
  }

  function markSparkDone() {
    localStorage.setItem("tsb_spark_done_" + getTodayKey(), "1");
    if (window.TSB && window.TSB.streak && window.TSB.streak.touch) {
      window.TSB.streak.touch();
    }
    try {
      if (window.TSB && window.TSB.sound && window.TSB.sound.play) window.TSB.sound.play("ding");
    } catch (e) {}
    if (window.confetti) {
      try { window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } }); } catch (eC) {}
    }
  }

  window.getTodaySpark = getTodaySpark;
  window.isSparkDone = isSparkDone;
  window.markSparkDone = markSparkDone;

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

        <div style="background:var(--bg,#f6f1e8);border:var(--bw) solid var(--edge);border-radius:20px;padding:14px;margin-bottom:18px;">
          <b style="display:block;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px;color:var(--ink,#111);">🛡️ HABIT SHIELD ACTIVE</b>
          <span style="font-size:12px;color:var(--sub,#666);line-height:1.4;display:block;">
            Never miss twice. Even when life gets busy, complete your 60-second daily spark to protect your streak.
          </span>
        </div>

        <button type="button" id="streakShareBtn" style="width:100%;background:var(--yellow,#ffc800);border:var(--bw) solid var(--edge);border-radius:20px;padding:12px;font:800 13px var(--font-head);cursor:pointer;box-shadow:var(--sh-2);margin-bottom:8px;">
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

    function msToMidnight() {
      const n = new Date();
      const mid = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 2);
      return Math.max(1000, mid.getTime() - n.getTime());
    }

    let shownDay = -1;
    let sparkOffset = 0;

    function draw(force) {
      const dayNum = localDayNum();
      if (!force && dayNum === shownDay && sparkOffset === 0) return;
      shownDay = dayNum;

      const spark = getTodaySpark(dayNum, sparkOffset);
      if (!spark) return;

      const streak = (window.TSB && window.TSB.streak) ? window.TSB.streak.count() : 0;
      const done = isSparkDone();

      wrap.innerHTML = `
        <div class="lod__box">
          <button type="button" class="lod__streak" id="lodStreakBtn" title="View streak flame and weekly rings">
            🔥 <span>${streak}d</span>
          </button>
          <img class="lod__thumb" src="${escHTML(spark.cover)}" alt="" loading="lazy">
          <div class="lod__content">
            <div class="lod__headrow">
              <span class="lod__badge">⚡ 60s SPARK</span>
              <span class="lod__sep">·</span>
              <span class="lod__book">${escHTML(spark.book)}</span>
              <span class="lod__author">by ${escHTML(spark.author)}</span>
              ${spark.personalized ? `<span class="lod__badge" style="background:#eaf5ea;color:#1e6b2e;border-color:var(--ink);">FOR YOU</span>` : ''}
              <button type="button" class="lod__shuffle" id="lodShuffleBtn" title="Get another 60-second spark from the library">
                🔄 Another
              </button>
            </div>
            <div class="lod__quote">“${escHTML(spark.quote)}”</div>
            ${spark.takeaway ? `<div class="lod__takeaway">${escHTML(spark.takeaway)}</div>` : ''}
          </div>
          <a class="lod__btn ${done ? 'done' : ''}" id="lodSparkBtn" href="book.html?id=${encodeURIComponent(spark.bookId)}#lesson-${spark.lessonIndex + 1}">
            ${done ? '✓ IGNITED 🔥' : 'READ 60s →'}
          </a>
        </div>`;

      const strBtn = document.getElementById("lodStreakBtn");
      if (strBtn) strBtn.addEventListener("click", openStreakSheet);

      const shufBtn = document.getElementById("lodShuffleBtn");
      if (shufBtn) {
        shufBtn.addEventListener("click", () => {
          sparkOffset++;
          draw(true);
        });
      }

      const actBtn = document.getElementById("lodSparkBtn");
      if (actBtn && !done) {
        actBtn.addEventListener("click", () => {
          markSparkDone();
        });
      }
    }

    draw(true);

    // Auto-refresh exactly at local midnight
    function scheduleMidnight() {
      setTimeout(() => {
        shownDay = -1;
        sparkOffset = 0;
        draw(true);
        scheduleMidnight();
      }, msToMidnight());
    }
    scheduleMidnight();

    // Refresh when returning to tab / waking device
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        const curDay = localDayNum();
        if (curDay !== shownDay) {
          shownDay = -1;
          sparkOffset = 0;
          draw(true);
        }
      }
    });

    window.addEventListener("pageshow", () => {
      const curDay = localDayNum();
      if (curDay !== shownDay) {
        shownDay = -1;
        sparkOffset = 0;
        draw(true);
      }
    });

    // Heartbeat every 30s to detect midnight transition across sleep
    setInterval(() => {
      const curDay = localDayNum();
      if (curDay !== shownDay) {
        shownDay = -1;
        sparkOffset = 0;
        draw(true);
      }
    }, 30000);
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
        '<div class="grave-transition__sub">they paid full price · you keep the lesson</div>';
      document.body.appendChild(ov);
    }
    requestAnimationFrame(() => ov.classList.add("on"));
    setTimeout(() => { location.href = banner.href; }, 950);
  });
})();
