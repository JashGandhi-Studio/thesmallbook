/* ============================================================
   THESMALLBOOK - 💀 THE GRAVEYARD PAGE
   Renders failure cases as gravestone cards with expandable
   autopsies: story → fatal mistake → lesson → related book.
   ============================================================ */

(function () {
  const F = window.FAILURES || [];
  const grid = document.getElementById("graveGrid") || document.createElement("main");
  const searchInput = document.getElementById("graveSearch");
  if (window.TSB) { try { window.TSB.achv.award("ghoul", true); } catch (e) {} } /* silent - no toast on entry */
  const filterWrap = document.getElementById("graveFilters");

  const CAT_META = {
    "ALL":      { label: "ALL GRAVES", emoji: "💀", color: "#9aa2ad" },
    "STARTUP":  { label: "STARTUPS",   emoji: "🚀", color: "#3ec9e6" },
    "MONEY":    { label: "MONEY",      emoji: "💸", color: "#00c48c" },
    "FRAUD":    { label: "FRAUD",      emoji: "🃏", color: "#D23A3A" },
    "EGO":      { label: "EGO",        emoji: "👑", color: "#b28dff" },
    "BUSINESS": { label: "BUSINESS",   emoji: "🏢", color: "#4d7cff" },
    "TRUST":    { label: "TRUST",      emoji: "🤝", color: "#ffc800" },
    "HISTORY":  { label: "HISTORY",    emoji: "🏛️", color: "#d8b56a" },
    "FAME":     { label: "FAME",       emoji: "⭐", color: "#ff9b3d" }
  };

  /* fun cause-of-death stamps, deterministic per grave */
  const CAUSES = {
    STARTUP:  ["CAUSE OF DEATH: BURN RATE", "CAUSE OF DEATH: NO ONE ASKED FOR IT", "CAUSE OF DEATH: SCALED THE LOSSES", "CAUSE OF DEATH: HYPE OVERDOSE"],
    MONEY:    ["CAUSE OF DEATH: LEVERAGE", "CAUSE OF DEATH: 'THIS TIME IS DIFFERENT'", "CAUSE OF DEATH: FREE LUNCH POISONING", "CAUSE OF DEATH: RISK BLINDNESS"],
    FRAUD:    ["CAUSE OF DEATH: THE TRUTH LEAKED", "CAUSE OF DEATH: FAKE IT TILL YOU CAN'T", "CAUSE OF DEATH: AUDIT ALLERGY", "CAUSE OF DEATH: NUMBERS WERE FICTION"],
    EGO:      ["CAUSE OF DEATH: TERMINAL EGO", "CAUSE OF DEATH: BELIEVED OWN PRESS", "CAUSE OF DEATH: ALLERGIC TO 'NO'", "CAUSE OF DEATH: MIRROR ADDICTION"],
    BUSINESS: ["CAUSE OF DEATH: IGNORED THE FUTURE", "CAUSE OF DEATH: COMFORT ZONE COLLAPSE", "CAUSE OF DEATH: SPREADSHEET MYOPIA", "CAUSE OF DEATH: SLOW-MOTION DENIAL"],
    TRUST:    ["CAUSE OF DEATH: MISPLACED TRUST", "CAUSE OF DEATH: NOBODY CHECKED", "CAUSE OF DEATH: BLIND FAITH", "CAUSE OF DEATH: UNVERIFIED PROMISES"],
    HISTORY:  ["CAUSE OF DEATH: HUBRIS, CLASSIC EDITION", "CAUSE OF DEATH: IGNORED THE WARNINGS", "CAUSE OF DEATH: EMPIRE BRAIN", "CAUSE OF DEATH: LEARNED NOTHING IN TIME"],
    FAME:     ["CAUSE OF DEATH: ENTOURAGE FEES", "CAUSE OF DEATH: YES-MEN OVERDOSE", "CAUSE OF DEATH: SPOTLIGHT BLINDNESS", "CAUSE OF DEATH: FAME ≠ FINANCE"]
  };
  function causeOf(f) {
    const list = CAUSES[f.category] || CAUSES.BUSINESS;
    let h = 0;
    for (const ch of f.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return list[h % list.length];
  }

  /* 🆕 fresh badge - driven by config (edit NEW_GRAVES_THIS_WEEK weekly) */
  const FRESH = new Set((window.TSB_CONFIG && TSB_CONFIG.NEW_GRAVES_THIS_WEEK) || []);

  let activeCat = "ALL";
  let query = "";
  let sortMode = "default";

  /* parse "$4.6B in 4 months" / "₹14,000 crore ($2B)" → dollars (rough, for sorting/stats) */
  function lossUSD(f) {
    const s = String(f.loss || "");
    let best = 0;
    const dollar = [...s.matchAll(/\$([\d,.]+)\s*(T|trillion|B|billion|M|million|K)?/gi)];
    dollar.forEach((m) => {
      let n = parseFloat(m[1].replace(/,/g, ""));
      const unit = (m[2] || "").toUpperCase();
      if (unit.startsWith("T")) n *= 1e12;
      else if (unit.startsWith("B")) n *= 1e9;
      else if (unit.startsWith("M")) n *= 1e6;
      else if (unit.startsWith("K")) n *= 1e3;
      if (n > best) best = n;
    });
    const crore = s.match(/₹\s*([\d,.]+)\s*(lakh\s*crore|crore)/i);
    if (crore) {
      let n = parseFloat(crore[1].replace(/,/g, ""));
      n *= /lakh/i.test(crore[2]) ? 1.2e10 : 1.2e5; /* v336 fix: 1 crore = 10M rupees, about $120k; 1 lakh crore about $12B */
      if (n > best) best = n;
    }
    return best;
  }
  function fmtUSD(n) {
    if (n >= 1e12) return "$" + (n / 1e12).toFixed(1) + "T";
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(0) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(0) + "M";
    return "$" + Math.round(n).toLocaleString();
  }
  function yearNum(f) {
    const s = String(f.year);
    const m = s.match(/\d{1,4}/);
    if (!m) return 0;
    return /BC/i.test(s) ? -(+m[0]) : +m[0];
  }

  /* stats */
  const el = (id) => document.getElementById(id);
  if (el("gStatCases")) animate(el("gStatCases"), F.length);
  if (el("gStatCats")) animate(el("gStatCats"), Object.keys(CAT_META).length - 1);
  function animate(node, target) {
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 25));
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(t); }
      node.textContent = cur;
    }, 40);
  }

  /* filters */
  Object.keys(CAT_META).forEach((cat) => {
    const b = document.createElement("button");
    b.className = "chip" + (cat === "ALL" ? " active" : "");
    b.textContent = CAT_META[cat].emoji + " " + CAT_META[cat].label;
    b.addEventListener("click", () => {
      activeCat = cat;
      filterWrap.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      b.classList.add("active");
      render();
    });
    filterWrap.appendChild(b);
  });

  searchInput.addEventListener("input", (e) => {
    query = e.target.value.trim().toLowerCase();
    render();
  });

  /* sort modes */
  const sortWrap = document.getElementById("graveSort");
  if (sortWrap) sortWrap.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sort]");
    if (!b) return;
    sortMode = b.dataset.sort;
    sortWrap.querySelectorAll(".gravesort__btn").forEach((x) => x.classList.toggle("active", x === b));
    render();
  });

  /* live data feed */
  function updateFeed(results) {
    const el2 = (id) => document.getElementById(id);
    if (!el2("gfResults")) return;
    el2("gfResults").textContent = results.length;
    let burned = 0; results.forEach((f) => { burned += lossUSD(f); });
    el2("gfBurned").textContent = burned ? fmtUSD(burned) + "+" : "$0";
    const catCount = {};
    results.forEach((f) => { catCount[f.category] = (catCount[f.category] || 0) + 1; });
    const top = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
    el2("gfCause").textContent = top ? ((CAT_META[top[0]] || {}).emoji || "") + " " + top[0] : "-";
    const eraCount = {};
    results.forEach((f) => { const y = yearNum(f); if (y) { const era = Math.floor(y / 10) * 10; eraCount[era] = (eraCount[era] || 0) + 1; } });
    const topEra = Object.entries(eraCount).sort((a, b) => b[1] - a[1])[0];
    el2("gfEra").textContent = topEra ? topEra[0] + "s" : "-";
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function firstSent(text, n) {
    var m = String(text || "").replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) || [];
    return m.slice(0, n || 1).join(" ").trim();
  }
  function graveExcerpt(f) {
    var deep = (window.GRAVE_DEEP || {})[f.id] || {};
    var parts = [];
    if (deep.origin) parts.push(firstSent(deep.origin, 1));
    if (deep.fall) parts.push(firstSent(deep.fall, 1));
    if (!parts.length) parts.push(firstSent(f.story, 2));
    var out = parts.join(" ");
    return out.length > 260 ? out.slice(0, 257).replace(/[,;:\s]+$/, "") + "…" : out;
  }
  function buildGrave(f, opts) {
    const o = opts || {};
    const color = (CAT_META[f.category] || {}).color || "#9aa2ad";
    const d = document.createElement("div");
    d.className = "grave";
    d.style.setProperty("--gcat", color);
    d.dataset.graveId = f.id;
    d.innerHTML = `
      <div class="grave__stone">
        <span class="grave__rip">R.I.P.</span>
        <span class="grave__emoji">${f.emoji}</span>
        <span class="grave__year">${esc(f.year)}</span>
      </div>
      <div class="grave__main">
        <div class="grave__name">${esc(f.name)}</div>
        <div class="grave__epitaph">${esc(f.title)}</div>
        <div class="grave__meta">
          <span class="grave__loss">💸 ${esc(f.loss)}</span>
          <span class="grave__cat" translate="no">${(CAT_META[f.category] || {}).emoji || "💀"} ${esc(f.category)}</span>
          <span class="grave__cause" translate="no">${causeOf(f)}</span>
          ${o.medal ? `<span class="grave__medal" translate="no">${o.medal} TOP BURN</span>` : ""}
          ${FRESH.has(f.id) ? `<span class="grave__fresh" translate="no">🩸 FRESH GRAVE</span>` : ""}
        </div>
        <p class="grave__excerpt">${esc(graveExcerpt(f))}</p>
        <span class="grave__hint" translate="no">📖 TAP FOR THE FULL AUTOPSY - HOW IT STARTED → THE FALL → THE LESSON</span>
      </div>`;
    d.addEventListener("click", function () { openAutopsy(f); });
    return d;
  }

  function shuffleGraves(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function render() {
    if (window.TSB_GY2) return; /* v336: the new graveyard draws its own list */
    let results = F.filter((f) => {
      if (activeCat !== "ALL" && f.category !== activeCat) return false;
      if (!query) return true;
      return (f.name + " " + f.title + " " + f.story + " " + f.lesson + " " + f.year)
        .toLowerCase().includes(query);
    });

    if (sortMode === "burned") results.sort((a, b) => lossUSD(b) - lossUSD(a));
    else if (sortMode === "newest") results.sort((a, b) => yearNum(b) - yearNum(a));
    else if (sortMode === "oldest") results.sort((a, b) => yearNum(a) - yearNum(b));
    else shuffleGraves(results); /* v267: classic mode reshuffles every visit - it always feels freshly turned */

    updateFeed(results);
    grid.innerHTML = "";
    if (!results.length) {
      grid.innerHTML = `<div class="empty"><span>🪦</span>No corpses match.<br>The graveyard is big - try another word.</div>`;
      return;
    }

    const MEDALS = ["🥇", "🥈", "🥉"];
    results.forEach((f, i) => {
      const medal = sortMode === "burned" && i < 3 ? MEDALS[i] : "";
      const g = buildGrave(f, { medal });
      g.style.setProperty("--i", i % 12);
      grid.appendChild(g);
    });
    observeReveals();
  }




  /* ============================================================
     💀 GRAVE SHARE CARDS - R.I.P. story format (1080×1920)
     Dark theme, tombstone, loss tag, lesson - status-ready.
     ============================================================ */
  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
  }

  function gwrap(ctx, text, maxWidth) {
    const lines = []; let line = "";
    const push = (w) => {
      if (ctx.measureText((line + " " + w).trim()).width <= maxWidth) { line = (line + " " + w).trim(); return; }
      if (line) { lines.push(line); line = ""; }
      if (ctx.measureText(w).width <= maxWidth) { line = w; return; }
      let chunk = "";
      for (const ch of w) { if (ctx.measureText(chunk + ch).width > maxWidth && chunk) { lines.push(chunk); chunk = ""; } chunk += ch; }
      line = chunk;
    };
    String(text).split(/\s+/).forEach(push);
    if (line.trim()) lines.push(line.trim());
    return lines;
  }

  function liveGraveText(graveEl, sel, fallback) {
    const el = graveEl ? graveEl.querySelector(sel) : null;
    const t = el ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim() : "";
    return t || fallback || "";
  }

  /* ============================================================
     🎴 THE GRAVE CARD (v345)

     One card, one story, made to be posted. Portrait 4:5 at 1080x1350,
     which is what WhatsApp, Instagram and X all crop kindly, drawn on the
     app's own paper rather than a black rectangle so it looks like the
     book it came from.

     The rule while drawing: no emoji (they render differently on every
     phone), no font that has not finished loading, no line that can spill
     outside its box. Everything is measured, wrapped, and cut with an
     ellipsis if a long autopsy runs long.

     Sharing is a sheet: you SEE the card before it leaves, then Share,
     Download or Copy. On a phone Share hands the PNG to WhatsApp; on a
     desktop the same button copies or downloads, never dead-ends.
     ============================================================ */
  var CARD_W = 1080, CARD_H = 1350;
  var INK = "#16130F", PAPER = "#FBF8F1", MUTED = "#6E6658",
      YELLOW = "#FFC800", RED = "#D7263D";
  var BODY_F = "'Space Grotesk', Arial, Helvetica, sans-serif";
  var HEAD_F = "'Archivo Black', 'Arial Black', Arial, sans-serif";

  function cardFonts() {
    return new Promise(function (resolve) {
      var done = false, fin = function () { if (!done) { done = true; resolve(); } };
      var t = setTimeout(fin, 420);
      try {
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { clearTimeout(t); fin(); });
        else { clearTimeout(t); fin(); }
      } catch (e) { clearTimeout(t); fin(); }
    });
  }
  function face(size, weight, family) { return (weight || 900) + " " + size + "px " + (family || HEAD_F); }

  /* shorten a single over-long word so nothing ever spills past a margin */
  function cut(ctx, text, maxW) {
    var s = String(text || "").replace(/\s+/g, " ").trim();
    if (ctx.measureText(s).width <= maxW) return s;
    var lo = 0, hi = s.length;
    while (lo < hi) {
      var mid = Math.ceil((lo + hi) / 2);
      if (ctx.measureText(s.slice(0, mid) + "\u2026").width <= maxW) lo = mid; else hi = mid - 1;
    }
    return s.slice(0, Math.max(1, lo)).replace(/[\s,;:.\u2014-]+$/, "") + "\u2026";
  }

  /* greedy wrap; caps at maxLines and ellipsizes the last line only if the
     text really did not fit. no fixed box heights anywhere. */
  function wrap(ctx, text, maxW, maxLines) {
    var words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    var out = [], line = "", i;
    for (i = 0; i < words.length; i++) {
      var next = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(next).width <= maxW) { line = next; continue; }
      if (line) out.push(line);
      line = words[i];
      if (ctx.measureText(line).width > maxW) { line = cut(ctx, line, maxW); }
    }
    if (line) out.push(line);
    if (out.length > maxLines) {
      out = out.slice(0, maxLines);
      /* give the ellipsis room by dropping whole words, never letters */
      var ln = out[maxLines - 1];
      while (ln && ctx.measureText(ln + "\u2026").width > maxW) ln = ln.replace(/\s*\S+$/, "");
      out[maxLines - 1] = (ln || out[maxLines - 1].slice(0, 1)) + "\u2026";
    }
    return out;
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /* ============================================================
     🎴 THE GRAVE CARD (v345)

     1080x1350, which is the 4:5 that WhatsApp, Instagram and X all crop
     kindly. Drawn on the app's own paper so a posted card looks like it
     came out of the book, not out of a template.

     Two rules while drawing: everything is measured before it is placed
     (so no sentence is ever sliced by a fixed box), and the type steps
     down a size if a long autopsy needs the room. Nothing here depends
     on an emoji font, a network image, or the user's theme.
     ============================================================ */
  async function renderGraveCard(f) {
    await cardFonts();
    var W = CARD_W, H = CARD_H, M = 78, BOXW = W - M * 2;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    ctx.textAlign = "left"; ctx.textBaseline = "top";

    /* the autopsy on screen wins, so a translated grave makes a translated
       card. fall back to the record itself. */
    var graveEl = [].slice.call(document.querySelectorAll(".autopsy")).filter(function (g) { return g.dataset.graveId === f.id; })[0]
      || [].slice.call(document.querySelectorAll(".grave")).filter(function (g) { return g.dataset.graveId === f.id; })[0];
    if (!graveEl) {
      var gs = document.querySelector(".gyc.on");
      var gt = gs && gs.querySelector(".gyc-top__t");
      if (gs && gt && gt.textContent.trim() === String(f.name).trim()) graveEl = gs;
    }
    var tName = liveGraveText(graveEl, ".autopsy__name, .gyc-name, .grave__name", f.name).toUpperCase();
    var tTitle = liveGraveText(graveEl, ".autopsy__epitaph, .gyc-ep, .grave__epitaph", f.title || "");
    var tMistake = liveGraveText(graveEl, ".autopsy__sec--mistake p, .gyc-sec--mistake p, .grave__section--mistake p", f.mistake || "");
    var tLesson = liveGraveText(graveEl, ".autopsy__sec--lesson p, .gyc-sec--lesson p, .grave__section--lesson p", f.lesson || "");
    var tLoss = String(f.loss || "").replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\s]+/u, "").trim();
    var tCause = causeOf(f).replace(/^CAUSE OF DEATH:\s*/i, "").toUpperCase();
    var no = F.indexOf(f) + 1;

    /* ---------- one layout pass per type size, smallest that fits ---------- */
    function measure(S) {
      var L = {};
      L.S = S;
      L.name = Math.round((tName.length > 26 ? 60 : tName.length > 15 ? 80 : 96) * S);
      ctx.font = face(L.name, 900);
      L.nLines = wrap(ctx, tName, BOXW, 3);
      L.nameLH = Math.round(L.name * 1.0);

      L.meta = Math.round(29 * S);
      ctx.font = face(L.meta, 700, BODY_F);
      L.metaText = cut(ctx, [f.year, f.category].filter(Boolean).join("  \u00B7  ").toUpperCase(), BOXW - 260);
      L.metaLH = Math.round(42 * S);

      L.ep = Math.round(44 * S);
      L.epLH = Math.round(L.ep * 1.26);
      ctx.font = "italic 600 " + L.ep + "px Georgia, 'Times New Roman', serif";
      L.epLines = tTitle ? wrap(ctx, /“|”|^["']/.test(tTitle) ? tTitle : "\u201C" + tTitle + "\u201D", BOXW, 2) : [];

      L.causeH = Math.round(50 * S);
      L.cause = Math.round(26 * S);
      ctx.font = face(L.cause, 900);

      L.gap = Math.round(28 * S);

      L.lossSize = Math.round(28 * S);
      L.lossLH = Math.round(38 * S);
      ctx.font = face(L.lossSize, 900);
      L.lossLines = wrap(ctx, "LOST  " + tLoss.toUpperCase(), BOXW - 56, 2);
      L.tagH = Math.round(26 * S) + L.lossLines.length * L.lossLH + Math.round(20 * S);

      L.body = Math.round(35 * S);
      L.bodyLH = Math.round(L.body * 1.34);
      L.label = Math.round(25 * S);
      L.inner = Math.round(32 * S);
      var innerW = BOXW - L.inner * 2;
      L.boxHead = L.inner + Math.round(28 * S) + Math.round(12 * S);
      ctx.font = face(L.body, 500, BODY_F);
      L.mLines = wrap(ctx, tMistake, innerW, 4);
      L.lLines = wrap(ctx, tLesson, innerW, 4);
      L.mH = L.boxHead + L.mLines.length * L.bodyLH + L.inner;
      L.lH = L.boxHead + L.lLines.length * L.bodyLH + L.inner;

      L.endH = Math.round(64 * S);
      L.footH = 118;
      L.top = 92 + Math.round(42 * S);
      L.nLines.forEach(function () {});

      var y = L.top;
      L.yName = y; y += L.nLines.length * L.nameLH + Math.round(4 * S);
      L.yMeta = y; y += L.metaLH;
      L.yRule = y; y += 8 + Math.round(18 * S);
      L.yEp = y; if (L.epLines.length) y += L.epLines.length * L.epLH + Math.round(4 * S);
      L.yCause = y + Math.round(6 * S); y = L.yCause + L.causeH + L.gap;
      L.yTag = y; y += L.tagH + L.gap;
      L.yMistake = y; y += L.mH + L.gap;
      L.yLesson = y; y += L.lH;
      L.endTop = H - L.footH - Math.round(24 * S) - L.endH;
      L.fits = y <= L.endTop - Math.max(24, Math.round(20 * S));
      L.slack = (L.endTop - Math.max(36, Math.round(26 * S))) - y;
      return L;
    }

    /* start big and step down: a four-word autopsy should look like a
       poster, a 600-character one should still breathe inside its boxes */
    var SCALES = [1.3, 1.22, 1.14, 1.06, 1, 0.94, 0.88, 0.82, 0.76, 0.7, 0.64];
    var L = null;
    for (var si = 0; si < SCALES.length; si++) { L = measure(SCALES[si]); if (L.fits) break; }
    /* whatever room is left goes into the gaps, a little at a time, so the
       page never pools one big hole in the middle of the card */
    if (L.slack > 0) {
      var each = Math.max(0, Math.min(Math.round(30 * L.S), Math.round(L.slack / 3)));
      L.yTag += each; L.yMistake += each * 2; L.yLesson += each * 3;
      L.slack -= each * 3;
    }
    if (L.slack > 0) { L.yLesson += L.slack; }

    /* ---------- paper ---------- */
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(22,19,15,.05)";
    for (var dx = 30; dx < W; dx += 40) for (var dy = 30; dy < H; dy += 40) { ctx.beginPath(); ctx.arc(dx, dy, 2, 0, 7); ctx.fill(); }
    var wash = ctx.createRadialGradient(W * .5, 280, 40, W * .5, 280, 540);
    wash.addColorStop(0, "rgba(255,200,0,.20)");
    wash.addColorStop(1, "rgba(255,200,0,0)");
    ctx.fillStyle = wash; ctx.fillRect(0, 0, W, 760);

    /* ---------- top strip ---------- */
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, 92);
    ctx.textBaseline = "middle";
    ctx.fillStyle = YELLOW; ctx.font = face(28, 900);
    ctx.fillText("THE SMALLBOOK", M, 47);
    var bw = ctx.measureText("THE SMALLBOOK").width;
    ctx.fillStyle = "rgba(251,248,241,.70)"; ctx.font = face(23, 500, BODY_F);
    ctx.fillText("THE GRAVEYARD", M + bw + 26, 47);
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(251,248,241,.82)"; ctx.font = face(23, 500, BODY_F);
    ctx.fillText("AUTOPSY " + String(no).padStart(3, "0") + " / " + F.length, W - M, 47);
    ctx.textAlign = "left";

    /* ---------- the name ---------- */
    ctx.textBaseline = "top";
    ctx.fillStyle = INK; ctx.font = face(L.name, 900);
    var yy = L.yName;
    L.nLines.forEach(function (ln, i) {
      var size = i === 0 ? L.name : Math.round(L.name * .86);
      ctx.font = face(size, 900);
      ctx.fillText(ln, M, yy);
      yy += L.nameLH;
    });

    /* ---------- year, category, cause ---------- */
    ctx.font = face(L.meta, 700, BODY_F); ctx.fillStyle = MUTED;
    ctx.fillText(L.metaText, M, L.yMeta + 4);
    ctx.fillStyle = RED; ctx.fillRect(M, L.yRule, 96, 8);

    if (L.epLines.length) {
      ctx.fillStyle = INK; ctx.font = "italic 600 " + L.ep + "px Georgia, 'Times New Roman', serif";
      yy = L.yEp;
      L.epLines.forEach(function (ln) { ctx.fillText(ln, M, yy); yy += L.epLH; });
    }

    /* cause of death: a black chip, the sharpest line on the card */
    ctx.font = face(L.cause, 900);
    var causeTxt = cut(ctx, "CAUSE  " + tCause, BOXW - 56);
    ctx.fillStyle = INK;
    roundRect(ctx, M, L.yCause, ctx.measureText(causeTxt).width + 56, L.causeH, 10); ctx.fill();
    ctx.fillStyle = YELLOW;
    ctx.textBaseline = "middle";
    ctx.fillText(causeTxt, M + 28, L.yCause + L.causeH / 2 + 1);
    ctx.textBaseline = "top";

    /* ---------- what it cost ---------- */
    ctx.fillStyle = RED;
    roundRect(ctx, M, L.yTag, BOXW, L.tagH, 14); ctx.fill();
    ctx.fillStyle = "#FFF7EF"; ctx.font = face(L.lossSize, 900);
    ctx.textBaseline = "top";
    L.lossLines.forEach(function (ln, i) { ctx.fillText(ln, M + 28, L.yTag + 26 + i * L.lossLH); });

    /* ---------- the mistake ---------- */
    ctx.fillStyle = "rgba(215,38,61,.07)";
    roundRect(ctx, M, L.yMistake, BOXW, L.mH, 22); ctx.fill();
    ctx.strokeStyle = "rgba(215,38,61,.5)"; ctx.lineWidth = 3;
    roundRect(ctx, M, L.yMistake, BOXW, L.mH, 22); ctx.stroke();
    ctx.fillStyle = RED; ctx.font = face(L.label, 900);
    ctx.fillText("THE FATAL MISTAKE", M + L.inner, L.yMistake + L.inner);
    ctx.fillStyle = INK; ctx.font = face(L.body, 500, BODY_F);
    L.mLines.forEach(function (ln, i) {
      ctx.fillText(ln, M + L.inner, L.yMistake + L.boxHead + i * L.bodyLH);
    });

    /* ---------- the lesson ---------- */
    ctx.fillStyle = YELLOW;
    roundRect(ctx, M, L.yLesson, BOXW, L.lH, 22); ctx.fill();
    ctx.fillStyle = INK; ctx.font = face(L.label, 900);
    ctx.fillText("THE LESSON - FREE FOR YOU", M + L.inner, L.yLesson + L.inner);
    ctx.font = face(L.body, 500, BODY_F);
    L.lLines.forEach(function (ln, i) {
      ctx.fillText(ln, M + L.inner, L.yLesson + L.boxHead + i * L.bodyLH);
    });

    /* ---------- where to read the rest ---------- */
    ctx.strokeStyle = "rgba(22,19,15,.22)"; ctx.lineWidth = 2;
    ctx.setLineDash([9, 9]);
    ctx.beginPath(); ctx.moveTo(M, L.endTop); ctx.lineTo(W - M, L.endTop); ctx.stroke();
    ctx.setLineDash([]);
    var endSize = Math.round(23 * L.S);
    ctx.font = face(endSize, 900, BODY_F);
    var linkTxt = "thesmallbook.in/graveyard";
    var linkW = ctx.measureText(linkTxt).width;
    ctx.fillStyle = MUTED; ctx.font = face(endSize, 700, BODY_F);
    var endW = BOXW - linkW - 34;
    var endPick = ["THE FALL, THE FALLOUT AND THE ANTIDOTE ARE FREE",
                   "THE REST OF THIS AUTOPSY IS FREE",
                   "READ THE WHOLE STORY"]
      .filter(function (t) { return ctx.measureText(t).width <= endW; })[0];
    ctx.fillText(endPick || "", M, L.endTop + 20);
    ctx.textAlign = "right";
    ctx.fillStyle = INK; ctx.font = face(endSize, 900, BODY_F);
    ctx.fillText(linkTxt, W - M, L.endTop + 20);
    ctx.textAlign = "left";

    /* ---------- footer ---------- */
    ctx.fillStyle = INK; ctx.fillRect(0, H - L.footH, W, L.footH);
    ctx.fillStyle = RED; ctx.fillRect(0, H - L.footH, W, 6);
    ctx.textBaseline = "middle";
    ctx.fillStyle = YELLOW; ctx.font = face(30, 900);
    ctx.fillText("thesmallbook.in", M, H - L.footH / 2 + 4);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(251,248,241,.80)"; ctx.font = face(22, 500, BODY_F);
    ctx.fillText("THEY PAID FULL PRICE. YOUR LESSON IS FREE.", W - M, H - L.footH / 2 + 4);
    ctx.textAlign = "left";
    return canvas;
  }

  /* ---------- the sheet: you see it before it leaves ---------- */
  var shareSheetEl = null, shareBlob = null, shareName = "";
  function buildShareSheet() {
    if (shareSheetEl) return shareSheetEl;
    var d = document.createElement("div");
    d.id = "gvShare";
    d.className = "gvs";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-modal", "true");
    d.setAttribute("aria-label", "Share this grave");
    d.innerHTML =
      '<div class="gvs__card" role="document">' +
        '<i class="gvs__grab" aria-hidden="true"></i>' +
        '<div class="gvs__hd"><b>🎴 Your grave card</b><button class="gvs__x" type="button" aria-label="Close">✕</button></div>' +
        '<div class="gvs__img"><img alt="Grave card, 1080 by 1350"></div>' +
        '<div class="gvs__row">' +
          '<button class="gvs__b gvs__b--share" type="button" data-gshare>Share</button>' +
          '<button class="gvs__b" type="button" data-gdl>Download</button>' +
          '<button class="gvs__b" type="button" data-gcopy>Copy</button>' +
        '</div>' +
        '<p class="gvs__note">1080 × 1350. Posts straight to WhatsApp, Instagram or X.</p>' +
      '</div>';
    document.body.appendChild(d);
    shareSheetEl = d;   /* v346: without this the sheet could never be closed */

    d.addEventListener("click", function (e) {
      var b = e.target.closest("[data-gshare],[data-gdl],[data-gcopy],.gvs__x");
      if (b) return;                       /* buttons handle themselves */
      closeShareSheet();                   /* tap anywhere on the dim room */
    });
    d.querySelector("[data-gdl]").addEventListener("click", function () { downloadShare(); });
    d.querySelector("[data-gshare]").addEventListener("click", function () { shareNow(this); });
    d.querySelector("[data-gcopy]").addEventListener("click", function () { copyShare(this); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && d.classList.contains("on")) { e.stopPropagation(); closeShareSheet(); } });

    /* swipe the card down to put it away - the gesture every phone sheet has */
    var card = d.querySelector(".gvs__card"), y0 = null, dy = 0;
    card.addEventListener("touchstart", function (e) { if (e.touches.length !== 1) return; y0 = e.touches[0].clientY; dy = 0; card.style.transition = "none"; }, { passive: true });
    card.addEventListener("touchmove", function (e) {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      card.style.transform = "translateY(" + dy + "px)";
    }, { passive: true });
    card.addEventListener("touchend", function () {
      card.style.transition = ""; card.style.transform = "";
      var gone = dy; y0 = null; dy = 0;
      if (gone > 90) closeShareSheet();
    });
    return d;
  }
  var shareLastFocus = null;
  function openShareSheet(blob, filename, text) {
    var d = buildShareSheet();
    shareBlob = blob; shareName = filename; d.__text = text;
    shareLastFocus = document.activeElement;
    var img = d.querySelector(".gvs__img img");
    if (d.__url) { try { URL.revokeObjectURL(d.__url); } catch (e) {} }
    d.__url = URL.createObjectURL(blob);
    img.src = d.__url;
    d.classList.add("on");
    document.documentElement.classList.add("gvs-lock");
    setTimeout(function () { try { d.querySelector("[data-gshare]").focus({ preventScroll: true }); } catch (e) {} }, 120);
  }
  function closeShareSheet() {
    var d = shareSheetEl; if (!d) return;
    d.classList.remove("on");
    document.documentElement.classList.remove("gvs-lock");
    /* v346: closing is total - the image is released, the focus goes back to
       the grave that opened it, and the scroll lock never lingers. */
    try { if (d.__url) { URL.revokeObjectURL(d.__url); d.__url = null; } } catch (e) {}
    try { var im = d.querySelector(".gvs__img img"); if (im) im.removeAttribute("src"); } catch (e) {}
    try { if (shareLastFocus && shareLastFocus.focus) shareLastFocus.focus({ preventScroll: true }); } catch (e) {}
    shareLastFocus = null;
  }
  /* a hard reset used when a native share comes back into a locked page */
  function clearShareLock() {
    try { document.documentElement.classList.remove("gvs-lock"); } catch (e) {}
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && shareSheetEl && !shareSheetEl.classList.contains("on")) clearShareLock();
  });
  function fileOf() { return new File([shareBlob], shareName, { type: "image/png" }); }
  function downloadShare() {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(shareBlob);
    a.download = shareName;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast("🎴 Saved. Post it anywhere.");
  }
  async function shareNow(btn) {
    var file = fileOf();
    var can = false;
    try { can = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { can = false; }
    if (can) {
      try {
        await navigator.share({ files: [file], title: "TheSmallBook", text: (shareSheetEl && shareSheetEl.__text) || "" });
        if (window.TSB) { try { TSB.achv.award("sharer"); } catch (eA) {} }
        closeShareSheet();
        return;
      } catch (err) {
        /* v346 · CANCELLED MEANS CANCELLED. Backing out of the phone's share
           sheet used to fall through to a silent download, which is why the
           card felt like it would not close. Now: cancel = stay, try again
           whenever you like. A real failure still offers the file. */
        var name = (err && err.name) || "";
        if (name === "AbortError" || name === "NotAllowedError") { try { btn.focus(); } catch (e) {} return; }
        downloadShare();
        return;
      }
    }
    downloadShare();
  }
  async function copyShare(btn) {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": shareBlob })]);
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy"; }, 1400);
        return;
      }
    } catch (e) {}
    downloadShare();
  }

  /* kept for graveyard2.js and any older caller: hand a canvas in, get the
     same preview sheet instead of an instant download */
  async function shareGraveCanvas(canvas, filename, text) {
    var blob = await new Promise(function (r) { canvas.toBlob(r, "image/png"); });
    if (!blob) { toast("\u274C Could not create the image"); return; }
    openShareSheet(blob, filename, text);
  }

  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-shareGrave]");
    if (!btn) return;
    e.stopPropagation();
    const f = F.find((x) => x.id === btn.dataset.sharegrave || x.id === btn.getAttribute("data-shareGrave"));
    if (!f) return;
    toast("🎴 Drawing your card…");
    try {
      const canvas = await renderGraveCard(f);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      if (!blob) { toast("❌ Could not create the image"); return; }
      openShareSheet(blob, "graveyard-" + f.id + ".png",
        f.name + " · " + (f.year || "") + ". " + (f.lesson || "The lesson is free on TheSmallBook.") + " thesmallbook.in");
      if (window.TSB) TSB.achv.award("sharer");
    } catch (err) { toast("❌ Could not create the image"); }
  });


  /* scroll reveal (re-runs after each render) */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.08 });
  function observeReveals() {
    document.querySelectorAll(".grave:not(.reveal), .stat:not(.reveal), .section-head:not(.reveal)").forEach((t) => {
      t.classList.add("reveal");
      io.observe(t);
    });
  }

  render();
  observeReveals();

  /* ============================================================
     ⛏️ THE AUTOPSY - full-screen reading view (v260).
     The grave card is the headstone; this is the story beneath it:
     how it started → the fall → the fatal mistake → the lesson.
     Opens like a page, reads like a case file, closes with ✕ / back.
     ============================================================ */
  var autopsyEl = null, autopsyLastFocus = null;

  function closeAutopsy(fromHistory) {
    if (!autopsyEl) return;
    autopsyEl.classList.remove("autopsy--on");
    document.documentElement.classList.remove("autopsy-lock");
    var el = autopsyEl;
    autopsyEl = null;
    setTimeout(function () { el.remove(); }, 280);
    if (!fromHistory && location.hash === "#grave=" + el.dataset.graveId) {
      try { history.pushState("", document.title, location.pathname + location.search); } catch (e) {}
    }
    if (autopsyLastFocus && autopsyLastFocus.focus) { try { autopsyLastFocus.focus(); } catch (e) {} }
  }

  /* ============================================================
     v264 · THE FACE OF THE GRAVE - every grave shows its photo,
     fetched live from the free record (Wikipedia, keyless, CORS).
     Display only - credited and linked back, never rehosted.
     ============================================================ */
  var graveImgCache = {};
  function gFetch(url, ms) {
    return new Promise(function (res) {
      var done = false;
      function out(v) { if (!done) { done = true; res(v); } }
      try {
        if (typeof fetch !== "function") return out(null);
        var t = setTimeout(function () { out(null); }, ms || 9000);
        fetch(url).then(function (r) { return r.json(); }).then(function (j) { clearTimeout(t); out(j); })
          .catch(function () { clearTimeout(t); out(null); });
      } catch (e) { out(null); }
    });
  }
  function graveWikiImages(f) {
    if (graveImgCache[f.id] !== undefined) return Promise.resolve(graveImgCache[f.id]);
    var gen = "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
      encodeURIComponent(f.name) + "&gsrlimit=1&prop=pageimages%7Cimages&piprop=thumbnail&pithumbsize=760" +
      "&imlimit=50&format=json&origin=*";
    return gFetch(gen).then(function (j) {
      try {
        var pages = j.query.pages, k = Object.keys(pages)[0], p = pages[k];
        if (!p || p.missing !== undefined) { graveImgCache[f.id] = null; return null; }
        var title = p.title;
        var hero = p.thumbnail && p.thumbnail.source ? { url: p.thumbnail.source, title: title } : null;
        var skip = /(icon|logo|edit|question|commons|wiki|ambox|arrow|symbol|stub|padlock|disambig|text_document|replace|translation|blank|flagmap|blank)/i;
        var files = [];
        try { (p.images || []).forEach(function (im) {
          var t = im.title || "";
          if (/\.(jpe?g|png|gif)$/i.test(t) && !skip.test(t) && files.length < 6) files.push(t.replace(/ /g, "_"));
        }); } catch (e2) {}
        if (!files.length) { graveImgCache[f.id] = { hero: hero, gallery: [], title: title }; return graveImgCache[f.id]; }
        var info = "https://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json&origin=*&titles=" +
          encodeURIComponent(files.join("|"));
        return gFetch(info).then(function (j2) {
          var gallery = [];
          try {
            var pg = j2.query.pages;
            Object.keys(pg).forEach(function (pk) {
              var ii = pg[pk].imageinfo && pg[pk].imageinfo[0];
              if (ii && ii.thumburl) gallery.push({ url: ii.thumburl, file: pg[pk].title.replace("File:", "") });
            });
          } catch (e3) {}
          graveImgCache[f.id] = { hero: hero, gallery: gallery.slice(0, 4), title: title };
          return graveImgCache[f.id];
        });
      } catch (e) { graveImgCache[f.id] = null; return null; }
    });
  }
  function wikiLink(title) {
    return "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(title).replace(/ /g, "_"));
  }
  function mountGraveImages(f) {
    var scroll = autopsyEl.querySelector(".autopsy__scroll");
    var hero = autopsyEl.querySelector(".autopsy__hero");
    if (!scroll || !hero) return;
    var fig = document.createElement("figure");
    fig.className = "autopsy__pic autopsy__pic--wait";
    hero.after(fig);
    graveWikiImages(f).then(function (r) {
      if (!autopsyEl || !fig.parentNode) return;
      if (!r || !r.hero) { fig.parentNode.removeChild(fig); return; }
      fig.className = "autopsy__pic";
      fig.innerHTML = '<img src="' + esc(r.hero.url) + '" alt="' + esc(f.name) + '" loading="lazy">' +
        '<figcaption translate="no">📷 THE FACE OF THE GRAVE</figcaption>';
      if (r.gallery && r.gallery.length > 1) {
        var gal = document.createElement("div");
        gal.className = "autopsy__gal";
        gal.innerHTML = r.gallery.map(function (g) {
          return '<figure><img src="' + esc(g.url) + '" alt="" loading="lazy"></figure>';
        }).join("");
        var bk = autopsyEl.querySelector(".autopsy__book") || autopsyEl.querySelector(".autopsy__more");
        if (bk) bk.before(gal);
      }
    }).catch(function () { if (fig.parentNode) fig.parentNode.removeChild(fig); });
  }

  function openAutopsy(f) {
    closeAutopsy(true);
    autopsyLastFocus = document.activeElement;
    var deep = (window.GRAVE_DEEP || {})[f.id] || {};
    var origin = deep.origin || f.story;
    var fall = deep.fall || "";
    var color = (CAT_META[f.category] || {}).color || "#9aa2ad";
    var idx = F.indexOf(f) + 1;
    autopsyEl = document.createElement("div");
    autopsyEl.className = "autopsy";
    autopsyEl.dataset.graveId = f.id;
    autopsyEl.setAttribute("role", "dialog");
    autopsyEl.setAttribute("aria-label", f.name + " - the full story");
    autopsyEl.innerHTML = `
      <div class="autopsy__veil" data-autopsy-close></div>
      <article class="autopsy__page">
        <header class="autopsy__top">
          <span class="autopsy__case" translate="no">CASE FILE #${idx} · ${esc(f.category)}</span>
          <button class="autopsy__x" data-autopsy-close aria-label="Close the story">✕</button>
        </header>
        <div class="autopsy__progress" aria-hidden="true"><i></i></div>
        <div class="autopsy__scroll">
          <div class="autopsy__hero" style="--gcat:${color}">
            <div class="autopsy__stone" aria-hidden="true">
              <span class="autopsy__rip" translate="no">R.I.P.</span>
              <span class="autopsy__emoji">${f.emoji}</span>
              <span class="autopsy__year">${esc(f.year)}</span>
            </div>
            <h1 class="autopsy__name">${esc(f.name)}</h1>
            <p class="autopsy__epitaph">${esc(f.title)}</p>
            <div class="autopsy__stamps" translate="no">
              <span class="autopsy__stamp autopsy__stamp--loss">💸 ${esc(f.loss)}</span>
              <span class="autopsy__stamp">${causeOf(f)}</span>
            </div>
          </div>

          <section class="autopsy__sec">
            <h2 class="autopsy__h" translate="no">🌱 How it started</h2>
            <p>${esc(origin)}</p>
          </section>

          ${fall ? `
          <section class="autopsy__sec">
            <h2 class="autopsy__h" translate="no">📉 The fall</h2>
            <p>${esc(fall)}</p>
          </section>` : ""}

          <section class="autopsy__sec autopsy__sec--mistake">
            <h2 class="autopsy__h autopsy__h--mistake" translate="no">☠️ The fatal mistake</h2>
            <p>${esc(f.mistake)}</p>
          </section>

          <section class="autopsy__sec autopsy__sec--lesson">
            <h2 class="autopsy__h autopsy__h--lesson" translate="no">🧠 The lesson - free for you</h2>
            <p>${esc(f.lesson)}</p>
          </section>

          ${f.book ? `
          <a class="autopsy__book" href="book.html?id=${f.book}">
            <span translate="no">📕 THE ANTIDOTE</span>
            <strong>${esc(f.bookTitle || "")} →</strong>
          </a>` : ""}

          <button class="grave__share" data-shareGrave="${f.id}" translate="no">🎴 SHARE THIS GRAVE</button>
          <p class="autopsy__fine" translate="no">They paid the tuition. Your lesson is free. 💛</p>
        </div>
      </article>`;
    document.body.appendChild(autopsyEl);
    document.documentElement.classList.add("autopsy-lock");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { autopsyEl.classList.add("autopsy--on"); });
    });
    var scroller = autopsyEl.querySelector(".autopsy__scroll");
    var bar = autopsyEl.querySelector(".autopsy__progress i");
    scroller.addEventListener("scroll", function () {
      var max = scroller.scrollHeight - scroller.clientHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, scroller.scrollTop / max) : 1) + ")";
    }, { passive: true });
    try { history.pushState("", document.title, "#grave=" + f.id); } catch (e) {}
    setTimeout(function () { autopsyEl && autopsyEl.querySelector(".autopsy__x").focus(); }, 350);
    /* v264 · the face of the grave - fetched quietly, hidden offline */
    try { mountGraveImages(f); } catch (e) {}
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-autopsy]")) {
      var id = e.target.closest("[data-autopsy]").getAttribute("data-autopsy");
      var f = F.find(function (x) { return x.id === id; });
      if (f) openAutopsy(f);
      return;
    }
    if (e.target.closest("[data-autopsy-close]")) closeAutopsy();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && autopsyEl) closeAutopsy();
  });
  window.addEventListener("popstate", function () {
    if (autopsyEl) closeAutopsy(true);
  });

  /* v261 · export */
  window.TSB_GRAVE = { openAutopsy: openAutopsy, CAT_META: CAT_META, causeOf: causeOf, lossUSD: lossUSD, fmtUSD: fmtUSD,
    yearNum: yearNum, renderGraveCard: renderGraveCard, shareGraveCanvas: shareGraveCanvas, graveWikiImages: graveWikiImages, wikiLink: wikiLink, toast: toast };

  /* ============================================================
     v266 · FRESH GRAVES - the grid refills itself, silently.
     Keyless public data (Wikipedia bankruptcy registers + Hacker
     News post-mortems), cached six hours, hidden when offline.
     ============================================================ */
  function gFetchJSON(url, ms) {
    return new Promise(function (res) {
      var done = false;
      function out(v) { if (!done) { done = true; res(v); } }
      try {
        if (typeof fetch !== "function") return out(null);
        var t = setTimeout(function () { out(null); }, ms || 9000);
        fetch(url).then(function (r) { return r.json(); }).then(function (j) { clearTimeout(t); out(j); })
          .catch(function () { clearTimeout(t); out(null); });
      } catch (e) { out(null); }
    });
  }
  function wikiBankrupt(year) {
    var cats = ["Category:Companies that filed for Chapter 11 bankruptcy in " + year, "Category:" + year + " bankruptcies"];
    function tryCat(i) {
      if (i >= cats.length) return Promise.resolve([]);
      var url = "https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=" +
        encodeURIComponent(cats[i]) + "&cmlimit=25&cmtype=page&format=json&origin=*";
      return gFetchJSON(url).then(function (j) {
        var ms = [];
        try { ms = (j.query.categorymembers || []).map(function (m) { return m.title; })
          .filter(function (t) { return !/^(List|Category|Outline|Template)/i.test(t); }); } catch (e) {}
        return ms.length ? ms : tryCat(i + 1);
      });
    }
    return tryCat(0);
  }
  function wikiExtract(title) {
    var url = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exintro=1&format=json&origin=*&titles=" +
      encodeURIComponent(title);
    return gFetchJSON(url).then(function (j) {
      try { var pages = j.query.pages, k = Object.keys(pages)[0];
        return { title: pages[k].title, text: pages[k].extract || "" }; } catch (e) { return null; }
    });
  }
  function hnStories(q, days) {
    var since = Math.floor(Date.now() / 1000) - (days || 21) * 86400;
    var url = "https://hn.algolia.com/api/v1/search_by_date?query=" + encodeURIComponent(q) +
      "&tags=story&numericFilters=created_at_i>" + since + "&hitsPerPage=8";
    return gFetchJSON(url).then(function (j) {
      try { return (j.hits || []).filter(function (h) { return h.title; }).map(function (h) {
        return { title: h.title, url: h.url || ("https://news.ycombinator.com/item?id=" + h.objectID),
          points: h.points || 0, comments: h.num_comments || 0 };
      }); } catch (e) { return []; }
    });
  }
  function firstSentences(text, n) {
    var m = String(text || "").replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) || [];
    return m.slice(0, n || 2).join(" ").trim();
  }
  function buildWireData(force) {
    var KEY = "tsb_wire_cache", TTL = 6 * 3600 * 1000;
    try { if (!force) { var c = JSON.parse(localStorage.getItem(KEY)); if (c && Date.now() - c.t < TTL) return Promise.resolve(c.data); } } catch (e) {}
    var year = new Date().getFullYear();
    return Promise.all([wikiBankrupt(year), wikiBankrupt(year - 1), hnStories("startup shut down", 21), hnStories("bankruptcy", 21)])
      .then(function (r) {
        var graves = (r[0] || []).concat(r[1] || []).slice(0, 16);
        var seen = {}, stories = [];
        (r[2] || []).concat(r[3] || []).forEach(function (s) {
          var k = s.title.toLowerCase();
          if (seen[k]) return; seen[k] = 1;
          if (/ask hn|show hn|tell hn/i.test(s.title)) return;
          stories.push(s);
        });
        stories.sort(function (a, b) { return b.points - a.points; });
        stories = stories.slice(0, 10);
        var data = { graves: graves, stories: stories, year: year };
        try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), data: data })); } catch (e) {}
        return data;
      });
  }
  try { window.TSB_GRAVE.buildWireData = buildWireData; window.TSB_GRAVE.wikiExtract = wikiExtract; window.TSB_GRAVE.firstSentences = firstSentences; } catch (eW) {}
  var freshOffset = 0; /* every refresh turns the next batch - the pool never runs dry */
  function freshBlock(data, opts) {
    var wrap = document.createElement("div");
    wrap.id = "freshWrap";
    var h = '<div class="section-head freshhead"><h2 translate="no">🩸 Fresh Graves - fetched live</h2><div class="line"></div>' +
      '<button class="freshhead__btn" id="freshMore" type="button" translate="no">↻ TURN UP NEW ONES</button></div>' +
      '<p class="freshtxt" translate="no">The graveyard is never finished. Newly bankrupt companies from the public registers + failure post-mortems filed by founders who watched it happen. <b>Tap the button - a fresh batch every time, for as long as the world keeps failing.</b></p>';
    var cards = (data.companies || []).map(function (c) {
      return '<div class="fgrave"><div class="fgrave__top"><span class="fgrave__rip" translate="no">R.I.P.</span><span class="fgrave__yr">2025-' + new Date().getFullYear() + '</span></div>' +
        "<b>" + esc(c.name) + "</b>" +
        "<p>" + esc(c.story) + "</p>" +
        '<button class="agrave agrave--sm" type="button" data-wiki="' + esc(c.title) + '" translate="no">📄 READ THE FREE RECORD \\u2192</button></div>';
    }).join("");
    var reports = (data.stories || []).map(function (s) {
      var dom = ""; try { dom = s.url ? new URL(s.url).hostname.replace(/^www\./, "") : "-"; } catch (e) { dom = "-"; }
      return '<a class="freport" href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
        '<span class="freport__tag" translate="no">FIELD REPORT</span>' +
        "<b>" + esc(s.title) + "</b>" +
        "<i>" + esc(dom) + " · ▲ " + s.points + " · 💬 " + s.comments + "</i></a>";
    }).join("");
    wrap.innerHTML = h +
      (cards ? '<div class="fgravegrid">' + cards + "</div>" : "") +
      (reports ? '<div class="frepgrid">' + reports + "</div>" : "");
    return wrap;
  }
  function sliceFresh(w) {
    /* rotate the pool: each tap serves the NEXT six, wrapping around forever */
    var pool = (w.graves || []);
    var out = [];
    if (pool.length) {
      for (var i = 0; i < pool.length && out.length < 6; i++) {
        out.push(pool[(freshOffset + i) % pool.length]);
      }
      freshOffset = (freshOffset + 6) % pool.length;
    }
    return out;
  }
  function mountFresh(force) {
    var grid = document.getElementById("graveGrid");
    if (!grid) return;
    buildWireData(force).then(function (w) {
      var companies = sliceFresh(w);
      var extracts = companies.map(function (c) {
        return wikiExtract(c).then(function (r) {
          return { name: c, story: r && r.text ? firstSentences(r.text, 2) : "", title: r && r.title ? r.title : c };
        });
      });
      return Promise.all(extracts).then(function (rows) {
        var data = { companies: rows.filter(function (r) { return r.story; }), stories: (w.stories || []).slice(0, 6) };
        if (!data.companies.length && !data.stories.length) return;
        var old = document.getElementById("freshWrap");
        var block = freshBlock(data);
        if (old) { old.parentNode.replaceChild(block, old); }
        else grid.parentNode.insertBefore(block, grid.nextSibling);
        var more = block.querySelector("#freshMore");
        if (more) more.addEventListener("click", function () {
          more.disabled = true; more.textContent = "… turning the earth";
          mountFresh(true);
        });
      });
    }).catch(function () {});
  }
  if (!window.TSB_GY2) setTimeout(function () { mountFresh(false); }, 2600);

  /* the free-record reader - same UI as the autopsy, in-app */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-wiki]");
    if (!b) return;
    var title = b.getAttribute("data-wiki");
    var ov = document.createElement("div");
    ov.className = "autopsy autopsy--doc autopsy--on";
    ov.id = "tsbDoc";
    ov.innerHTML = '<div class="autopsy__veil" data-doc-close></div>' +
      '<article class="autopsy__page">' +
      '<header class="autopsy__top"><span class="autopsy__case" translate="no">THE FREE RECORD · WIKIPEDIA</span>' +
      '<button class="autopsy__x" data-doc-close aria-label="Close">✕</button></header>' +
      '<div class="autopsy__progress"><i style="transform:scaleX(1)"></i></div>' +
      '<div class="autopsy__scroll" id="tsbDocBody"><div class="askel" style="height:22px;width:60%"></div><div class="askel"></div><div class="askel"></div><div class="askel" style="width:80%"></div></div>' +
      "</article>";
    document.body.appendChild(ov);
    document.documentElement.classList.add("autopsy-lock");
    wikiExtract(title).then(function (r) {
      var body = document.getElementById("tsbDocBody");
      if (!body) return;
      var paras = r && r.text ? r.text.split(/\n+/).filter(function (p) { return p.length > 60; }).slice(0, 8) : [];
      body.innerHTML = paras.length
        ? paras.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
          '<a class="autopsy__doclink" target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/' + encodeURIComponent(String(title).replace(/ /g, "_")) + '" translate="no">READ THE FULL RECORD \u2192</a>'
        : '<p class="freshtxt">The record is quiet on this one.</p>';
    });
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-doc-close]")) {
      var el = document.getElementById("tsbDoc");
      if (el) { el.classList.remove("autopsy--on"); setTimeout(function () { if (el.parentNode) el.remove(); }, 260); }
      document.documentElement.classList.remove("autopsy-lock");
    }
  });

  /* ============================================================
     💀 THE IDEA AUTOPSY ENGINE:
     Interactive diagnostic matching ideas against 400 autopsies.
     ============================================================ */
  (function initIdeaAutopsy() {
    var form = document.getElementById("iaForm");
    var resCard = document.getElementById("iaResultCard");
    var chips = document.querySelectorAll("#iaArchetypes [data-arch]");
    if (!form || !resCard) return;

    var curArch = "saas";
    chips.forEach(function (btn) {
      btn.addEventListener("click", function () {
        chips.forEach(function (b) {
          b.classList.remove("on");
          b.style.background = "#fff";
        });
        btn.classList.add("on");
        btn.style.background = "var(--yellow,#ffc800)";
        curArch = btn.getAttribute("data-arch");
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var idea = (document.getElementById("iaIdeaName").value || "").trim();
      var dist = document.getElementById("iaDist").value;
      var margin = document.getElementById("iaMargin").value;
      var moat = document.getElementById("iaMoat").value;

      var riskScore = 60;
      if (margin === "loss") riskScore += 24;
      else if (margin === "slim") riskScore += 14;

      if (dist === "ads") riskScore += 16;
      else if (dist === "outbound") riskScore += 8;

      if (moat === "speed") riskScore += 18;
      else if (moat === "network") riskScore -= 12;
      else if (moat === "ip") riskScore -= 14;

      riskScore = Math.min(96, Math.max(48, riskScore));

      var syndrome = "";
      var gravePicks = [];
      var antidoteBook = "";
      var antidoteSlug = "";
      var tests = [];

      if (curArch === "qcom" || margin === "loss") {
        syndrome = "The Subsidized Illusion & Terminal Unit Economics";
        gravePicks = ["webvan", "fast", "moviepass"];
        antidoteBook = "The Lean Startup (Eric Ries)";
        antidoteSlug = "the-lean-startup";
        tests = [
          "Deliver your first 50 orders manually with positive gross contribution on order #1.",
          "Refuse to subsidize customer acquisition or shipping with venture capital.",
          "Identify why customer retention drops when prices match true cost of service."
        ];
      } else if (curArch === "hardware") {
        syndrome = "The Hardware Working Capital & Cash-Cycle Trap";
        gravePicks = ["pebble", "jawbone", "juicero"];
        antidoteBook = "Shoe Dog (Phil Knight)";
        antidoteSlug = "shoe-dog";
        tests = [
          "Collect full non-refundable pre-orders before placing manufacturing POs.",
          "Model supply chain delays of 6 months and ensure runway survives zero revenue.",
          "Clarify why Apple, Samsung or Xiaomi will not clone the core feature into their next OS update."
        ];
      } else if (dist === "ads" && (curArch === "d2c" || margin === "slim")) {
        syndrome = "The Meta/Google CAC Death Spiral";
        gravePicks = ["quirky", "fab", "solyndra"];
        antidoteBook = "The Mom Test (Rob Fitzpatrick)";
        antidoteSlug = "the-mom-test";
        tests = [
          "Acquire your first 100 paying customers purely through organic community and word of mouth.",
          "Calculate 90-day repeat purchase rate before spending a single dollar on ad networks.",
          "Verify that customer lifetime value is at least 3.5x blended customer acquisition cost."
        ];
      } else if (moat === "speed" && curArch === "saas") {
        syndrome = "The Feature-Not-A-Product Incumbent Squeeze";
        gravePicks = ["quibi", "vine", "segway"];
        antidoteBook = "Zero to One (Peter Thiel)";
        antidoteSlug = "zero-to-one";
        tests = [
          "Identify the proprietary workflow data that creates 10x switching costs for users.",
          "Interview 10 potential buyers and ask why they will still pay if a tech giant releases this for free.",
          "Build distribution advantages into the product itself rather than relying on speed alone."
        ];
      } else {
        syndrome = "Premature Scaling & Synthetic Market Seduction";
        gravePicks = ["theranos", "ftx", "friendster"];
        antidoteBook = "Good Strategy Bad Strategy (Richard Rumelt)";
        antidoteSlug = "good-strategy-bad-strategy";
        tests = [
          "Validate organic pull where users scream when the prototype goes down.",
          "Conduct 15 neutral Mom Test interviews without pitching the solution.",
          "Build one focused wedge that solves an urgent hair-on-fire problem."
        ];
      }

      var corpseCards = gravePicks.map(function (gid) {
        var match = F.filter(function (x) { return x.id === gid; })[0];
        if (!match) return "";
        return '<a href="#grave=' + match.id + '" style="display:flex;align-items:center;gap:10px;background:#fff;border:var(--bw) solid var(--edge);border-radius:14px;padding:8px 12px;text-decoration:none;color:var(--ink,#111);box-shadow:var(--sh-1);">' +
          '<span style="font-size:20px;">' + (match.emoji || "💀") + '</span>' +
          '<div style="flex:1;min-width:0;">' +
            '<b style="display:block;font-size:12.5px;font-family:var(--font-head);">' + esc(match.name) + '</b>' +
            '<span style="font-size:11px;color:#c92a2a;font-weight:700;">Burned: ' + esc(match.burned || "$50M+") + ' · Died ' + esc(match.year || "") + '</span>' +
          '</div>' +
          '<span style="font-size:12px;font-weight:800;color:var(--ink,#111);">VIEW AUTOPSY ›</span>' +
        '</a>';
      }).filter(Boolean).join("");

      var riskColor = riskScore >= 75 ? "#c92a2a" : (riskScore >= 60 ? "#d97706" : "#2f8f5b");

      resCard.style.display = "block";
      resCard.innerHTML =
        '<div style="background:var(--surface,#fff);border:var(--bw) solid var(--edge);border-radius:20px;padding:18px;box-shadow:var(--sh-2);">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-bottom:var(--bw) solid var(--edge);padding-bottom:10px;margin-bottom:12px;">' +
            '<div>' +
              '<span style="font:800 10px var(--font-head);letter-spacing:1px;color:var(--muted,#666);text-transform:uppercase;">AUTOPSY REPORT</span>' +
              '<h3 style="font:800 18px var(--font-head);margin:2px 0 0;color:var(--ink,#111);">“' + esc(idea) + '”</h3>' +
            '</div>' +
            '<div style="background:' + riskColor + ';color:#fff;border:var(--bw) solid var(--edge);border-radius:14px;padding:6px 12px;text-align:center;">' +
              '<div style="font:800 9.5px var(--font-head);letter-spacing:1px;">MORTALITY RISK</div>' +
              '<div style="font:800 20px var(--font-head);">' + riskScore + '%</div>' +
            '</div>' +
          '</div>' +

          '<div style="margin-bottom:14px;">' +
            '<b style="display:block;font:800 11px var(--font-head);letter-spacing:1px;color:#c92a2a;text-transform:uppercase;margin-bottom:4px;">🚨 PRIMARY FATAL SYNDROME</b>' +
            '<div style="font:700 15px var(--font-head);color:var(--ink,#111);">' + esc(syndrome) + '</div>' +
          '</div>' +

          (corpseCards ? (
            '<div style="margin-bottom:14px;">' +
              '<b style="display:block;font:800 10.5px var(--font-head);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">💀 CORPSES THAT DIED OF THIS EXACT SYNDROME:</b>' +
              '<div style="display:flex;flex-direction:column;gap:7px;">' + corpseCards + '</div>' +
            '</div>'
          ) : '') +

          '<div style="background:#fff8db;border:var(--bw) solid var(--edge);border-radius:14px;padding:12px;margin-bottom:14px;">' +
            '<b style="display:block;font:800 10.5px var(--font-head);letter-spacing:1px;text-transform:uppercase;color:#854d0e;margin-bottom:4px;">💊 RECOMMENDED BOOK ANTIDOTE:</b>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
              '<span style="font:700 13px var(--font-body);color:var(--ink,#111);">📖 ' + esc(antidoteBook) + '</span>' +
              '<a href="book.html?id=' + esc(antidoteSlug) + '" style="background:var(--yellow,#ffc800);border:var(--bw) solid var(--edge);border-radius:12px;padding:5px 10px;font:800 11px var(--font-head);color:#111;text-decoration:none;box-shadow:var(--sh-1);">READ SUMMARY FREE →</a>' +
            '</div>' +
          '</div>' +

          '<div>' +
            '<b style="display:block;font:800 10.5px var(--font-head);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">🛡️ 3 PRE-MORTEM RULES TO TEST THIS WEEK:</b>' +
            '<ol style="margin:0;padding-left:18px;font:600 12px/1.55 var(--font-body);color:var(--ink,#111);">' +
              tests.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
            '</ol>' +
          '</div>' +
        '</div>';

      try { resCard.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch(err) {}
    });

    var modal = document.getElementById("iaModal");
    var openBtn = document.getElementById("iaModalTrigger");
    var closeBtn = document.getElementById("iaModalClose");

    function openModal() {
      if (!modal) return;
      modal.hidden = false;
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
      var input = document.getElementById("iaIdeaName");
      if (input) setTimeout(function () { input.focus(); }, 100);
    }

    function closeModal() {
      if (!modal) return;
      modal.hidden = true;
      modal.style.display = "none";
      document.body.style.overflow = "";
      if (location.hash === "#autopsy") {
        try { history.replaceState(null, "", location.pathname); } catch (e) {}
      }
    }

    if (openBtn) openBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal();
      });
    }
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal && !modal.hidden) closeModal();
    });

    if (location.hash === "#autopsy") {
      setTimeout(openModal, 300);
    }
    window.addEventListener("hashchange", function () {
      if (location.hash === "#autopsy") openModal();
    });
  })();

  /* deep-link: graveyard.html#grave=thomas-cook opens the reader */
  if (/^#grave=/.test(location.hash)) {
    var deepId = decodeURIComponent(location.hash.replace("#grave=", ""));
    var deepF = F.find(function (x) { return x.id === deepId; });
    if (deepF && !window.TSB_GY2) setTimeout(function () { openAutopsy(deepF); }, 600);
  }
})();
