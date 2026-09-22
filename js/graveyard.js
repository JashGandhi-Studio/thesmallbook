/* ============================================================
   THESMALLBOOK — 💀 THE GRAVEYARD PAGE
   Renders failure cases as gravestone cards with expandable
   autopsies: story → fatal mistake → lesson → related book.
   ============================================================ */

(function () {
  const F = window.FAILURES || [];
  const grid = document.getElementById("graveGrid");
  const searchInput = document.getElementById("graveSearch");
  if (window.TSB) { try { window.TSB.achv.award("ghoul", true); } catch (e) {} } /* silent — no toast on entry */
  const filterWrap = document.getElementById("graveFilters");

  const CAT_META = {
    "ALL":      { label: "ALL GRAVES", emoji: "💀", color: "#9aa2ad" },
    "STARTUP":  { label: "STARTUPS",   emoji: "🚀", color: "#3ec9e6" },
    "MONEY":    { label: "MONEY",      emoji: "💸", color: "#00c48c" },
    "FRAUD":    { label: "FRAUD",      emoji: "🃏", color: "#ff4d4d" },
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

  /* 🆕 fresh badge — driven by config (edit NEW_GRAVES_THIS_WEEK weekly) */
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
      n *= /lakh/i.test(crore[2]) ? 1.2e9 * 100 : 1.2e5 * 1000; // ≈$120k per crore
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
    el2("gfCause").textContent = top ? ((CAT_META[top[0]] || {}).emoji || "") + " " + top[0] : "—";
    const eraCount = {};
    results.forEach((f) => { const y = yearNum(f); if (y) { const era = Math.floor(y / 10) * 10; eraCount[era] = (eraCount[era] || 0) + 1; } });
    const topEra = Object.entries(eraCount).sort((a, b) => b[1] - a[1])[0];
    el2("gfEra").textContent = topEra ? topEra[0] + "s" : "—";
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
        <span class="grave__hint" translate="no">📖 TAP FOR THE FULL AUTOPSY — HOW IT STARTED → THE FALL → THE LESSON</span>
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
    let results = F.filter((f) => {
      if (activeCat !== "ALL" && f.category !== activeCat) return false;
      if (!query) return true;
      return (f.name + " " + f.title + " " + f.story + " " + f.lesson + " " + f.year)
        .toLowerCase().includes(query);
    });

    if (sortMode === "burned") results.sort((a, b) => lossUSD(b) - lossUSD(a));
    else if (sortMode === "newest") results.sort((a, b) => yearNum(b) - yearNum(a));
    else if (sortMode === "oldest") results.sort((a, b) => yearNum(a) - yearNum(b));
    else shuffleGraves(results); /* v267: classic mode reshuffles every visit — it always feels freshly turned */

    updateFeed(results);
    grid.innerHTML = "";
    if (!results.length) {
      grid.innerHTML = `<div class="empty"><span>🪦</span>No corpses match.<br>The graveyard is big — try another word.</div>`;
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
     💀 GRAVE SHARE CARDS — R.I.P. story format (1080×1920)
     Dark theme, tombstone, loss tag, lesson — status-ready.
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

  async function renderGraveCard(f) {
    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // live (translated) text if the grave is on screen
    const graveEl = [...document.querySelectorAll(".grave")].find(g => g.querySelector(`[data-shareGrave="${f.id}"]`));
    const tName = liveGraveText(graveEl, ".grave__name", f.name);
    const tTitle = liveGraveText(graveEl, ".grave__epitaph", f.title);
    const tMistake = liveGraveText(graveEl, ".grave__section--mistake p", f.mistake);
    const tLesson = liveGraveText(graveEl, ".grave__section--lesson p", f.lesson);

    // dark graveyard background
    ctx.fillStyle = "#120404";
    ctx.fillRect(0, 0, W, H);
    // faint dots
    ctx.fillStyle = "rgba(242,234,216,.05)";
    for (let x = 22; x < W; x += 46)
      for (let y = 22; y < H; y += 46) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }

    // top strip
    ctx.fillStyle = "#ff5252";
    ctx.fillRect(0, 0, W, 76);
    ctx.fillStyle = "#120404";
    ctx.font = "900 30px 'Archivo Black', Arial";
    ctx.textAlign = "center";
    ctx.fillText("💀 THE GRAVEYARD 💀", W / 2, 50);

    // tombstone
    ctx.save();
    ctx.translate(W / 2, 430);
    const tw = 400, th = 480;
    // stone shadow
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(-tw/2 + 14, th/2 + 14);
    ctx.lineTo(-tw/2 + 14, -th/2 + 200 + 14);
    ctx.arc(14, -th/2 + 200 + 14, tw/2, Math.PI, 0);
    ctx.lineTo(tw/2 + 14, th/2 + 14);
    ctx.closePath(); ctx.fill();
    // stone
    ctx.fillStyle = "#6b7280";
    ctx.beginPath();
    ctx.moveTo(-tw/2, th/2);
    ctx.lineTo(-tw/2, -th/2 + 200);
    ctx.arc(0, -th/2 + 200, tw/2, Math.PI, 0);
    ctx.lineTo(tw/2, th/2);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = "#f2ead8"; ctx.stroke();
    // engravings
    ctx.fillStyle = "#f2ead8";
    ctx.font = "900 44px 'Archivo Black', Arial";
    ctx.fillText("R.I.P.", 0, -130);
    ctx.font = "120px Arial";
    ctx.fillText(f.emoji, 0, 30);
    ctx.font = "bold 34px 'Space Grotesk', Arial";
    ctx.fillText(String(f.year), 0, 120);
    // grass line
    ctx.strokeStyle = "#f2ead8"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-tw/2 - 80, th/2 + 4); ctx.lineTo(tw/2 + 80, th/2 + 4); ctx.stroke();
    ctx.restore();

    // name
    ctx.fillStyle = "#f2ead8";
    ctx.textAlign = "center";
    let nSize = tName.length > 20 ? 56 : 68;
    ctx.font = `900 ${nSize}px 'Archivo Black', Arial`;
    let y = 780;
    gwrap(ctx, tName.toUpperCase(), W - 200).slice(0, 2).forEach((ln) => { ctx.fillText(ln, W / 2, y); y += nSize + 10; });

    // epitaph
    ctx.fillStyle = "#b3a98f";
    ctx.font = "600 32px 'Space Grotesk', Arial";
    gwrap(ctx, tTitle, W - 240).slice(0, 2).forEach((ln) => { ctx.fillText(ln, W / 2, y); y += 44; });
    y += 16;

    // loss tag
    ctx.font = "bold 30px 'Space Grotesk', Arial";
    const lossTxt = "💸 " + f.loss;
    const lw = ctx.measureText(lossTxt).width + 60;
    ctx.fillStyle = "#ff5252";
    ctx.fillRect((W - lw) / 2, y - 6, lw, 58);
    ctx.strokeStyle = "#f2ead8"; ctx.lineWidth = 4;
    ctx.strokeRect((W - lw) / 2, y - 6, lw, 58);
    ctx.fillStyle = "#fff";
    ctx.fillText(lossTxt, W / 2, y + 34);
    y += 110;

    // fatal mistake box
    ctx.textAlign = "left";
    const pad = 90, inner = W - pad * 2 - 60;
    ctx.fillStyle = "#2b1414";
    ctx.fillRect(pad, y, W - pad * 2, 240);
    ctx.strokeStyle = "#ff5252"; ctx.lineWidth = 5;
    ctx.strokeRect(pad, y, W - pad * 2, 240);
    ctx.fillStyle = "#ff5252";
    ctx.font = "900 26px 'Archivo Black', Arial";
    ctx.fillText("☠️ THE FATAL MISTAKE", pad + 30, y + 48);
    ctx.fillStyle = "#f2ead8";
    ctx.font = "600 27px 'Space Grotesk', Arial";
    gwrap(ctx, tMistake, inner).slice(0, 4).forEach((ln, i) => ctx.fillText(ln, pad + 30, y + 96 + i * 38));
    y += 280;

    // lesson box
    ctx.fillStyle = "#10291f";
    ctx.fillRect(pad, y, W - pad * 2, 280);
    ctx.strokeStyle = "#00d99b"; ctx.lineWidth = 5;
    ctx.strokeRect(pad, y, W - pad * 2, 280);
    ctx.fillStyle = "#00d99b";
    ctx.font = "900 26px 'Archivo Black', Arial";
    ctx.fillText("🧠 THE LESSON (FREE FOR YOU)", pad + 30, y + 48);
    ctx.fillStyle = "#f2ead8";
    ctx.font = "600 27px 'Space Grotesk', Arial";
    gwrap(ctx, tLesson, inner).slice(0, 5).forEach((ln, i) => ctx.fillText(ln, pad + 30, y + 96 + i * 38));

    // brand bar
    const barH = 200;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, H - barH, W, barH);
    ctx.fillStyle = "#ff5252";
    ctx.fillRect(0, H - barH, W, 8);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffc800";
    ctx.font = "900 60px 'Archivo Black', Arial";
    ctx.fillText("📕 THESMALLBOOK", W / 2, H - barH + 92);
    ctx.fillStyle = "#f2ead8";
    ctx.font = "bold 28px 'Space Grotesk', Arial";
    ctx.fillText("THEY PAID FULL PRICE · YOUR LESSON IS FREE", W / 2, H - barH + 140);

    return canvas;
  }

  async function shareGraveCanvas(canvas, filename, text) {
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) { toast("❌ Could not create image"); return; }
    const file = new File([blob], filename, { type: "image/png" });
    if (window.TSB) TSB.achv.award("sharer");
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "TheSmallBook", text }); return; }
      catch (e) { /* cancelled — fall through */ }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("🎴 Grave card downloaded — post it anywhere!");
  }

  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-shareGrave]");
    if (!btn) return;
    e.stopPropagation();
    const f = F.find((x) => x.id === btn.dataset.sharegrave || x.id === btn.getAttribute("data-shareGrave"));
    if (!f) return;
    toast("🎨 Digging up your grave card...");
    const canvas = await renderGraveCard(f);
    shareGraveCanvas(canvas, `graveyard-${f.id}.png`, `💀 ${f.name} — ${f.loss}. The lesson is free on TheSmallBook.`);
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
     ⛏️ THE AUTOPSY — full-screen reading view (v260).
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
     v264 · THE FACE OF THE GRAVE — every grave shows its photo,
     fetched live from the free record (Wikipedia, keyless, CORS).
     Display only — credited and linked back, never rehosted.
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
    autopsyEl.setAttribute("aria-label", f.name + " — the full story");
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
            <h2 class="autopsy__h" translate="no">🌱 HOW IT STARTED</h2>
            <p>${esc(origin)}</p>
          </section>

          ${fall ? `
          <section class="autopsy__sec">
            <h2 class="autopsy__h" translate="no">📉 THE FALL</h2>
            <p>${esc(fall)}</p>
          </section>` : ""}

          <section class="autopsy__sec autopsy__sec--mistake">
            <h2 class="autopsy__h autopsy__h--mistake" translate="no">☠️ THE FATAL MISTAKE</h2>
            <p>${esc(f.mistake)}</p>
          </section>

          <section class="autopsy__sec autopsy__sec--lesson">
            <h2 class="autopsy__h autopsy__h--lesson" translate="no">🧠 THE LESSON — FREE FOR YOU</h2>
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
    /* v264 · the face of the grave — fetched quietly, hidden offline */
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
  window.TSB_GRAVE = { openAutopsy: openAutopsy, CAT_META: CAT_META };

  /* ============================================================
     v266 · FRESH GRAVES — the grid refills itself, silently.
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
  var freshOffset = 0; /* every refresh turns the next batch — the pool never runs dry */
  function freshBlock(data, opts) {
    var wrap = document.createElement("div");
    wrap.id = "freshWrap";
    var h = '<div class="section-head freshhead"><h2 translate="no">🩸 Fresh Graves — fetched live</h2><div class="line"></div>' +
      '<button class="freshhead__btn" id="freshMore" type="button" translate="no">↻ TURN UP NEW ONES</button></div>' +
      '<p class="freshtxt" translate="no">The graveyard is never finished. Newly bankrupt companies from the public registers + failure post-mortems filed by founders who watched it happen. <b>Tap the button — a fresh batch every time, for as long as the world keeps failing.</b></p>';
    var cards = (data.companies || []).map(function (c) {
      return '<div class="fgrave"><div class="fgrave__top"><span class="fgrave__rip" translate="no">R.I.P.</span><span class="fgrave__yr">2025–' + new Date().getFullYear() + '</span></div>' +
        "<b>" + esc(c.name) + "</b>" +
        "<p>" + esc(c.story) + "</p>" +
        '<button class="agrave agrave--sm" type="button" data-wiki="' + esc(c.title) + '" translate="no">📄 READ THE FREE RECORD \\u2192</button></div>';
    }).join("");
    var reports = (data.stories || []).map(function (s) {
      var dom = ""; try { dom = s.url ? new URL(s.url).hostname.replace(/^www\./, "") : "—"; } catch (e) { dom = "—"; }
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
  setTimeout(function () { mountFresh(false); }, 2600);

  /* the free-record reader — same UI as the autopsy, in-app */
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

  /* deep-link: graveyard.html#grave=thomas-cook opens the reader */
  if (/^#grave=/.test(location.hash)) {
    var deepId = decodeURIComponent(location.hash.replace("#grave=", ""));
    var deepF = F.find(function (x) { return x.id === deepId; });
    if (deepF) setTimeout(function () { openAutopsy(deepF); }, 600);
  }
})();
