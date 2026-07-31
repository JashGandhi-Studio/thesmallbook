/* ============================================================
   THESMALLBOOK — 💀 THE GRAVEYARD PAGE
   Renders failure cases as gravestone cards with expandable
   autopsies: story → fatal mistake → lesson → related book.
   ============================================================ */

(function () {
  const F = window.FAILURES || [];
  const grid = document.getElementById("graveGrid");
  const searchInput = document.getElementById("graveSearch");
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

  /* first 60 entries in failures.js are the freshest wave */
  const FRESH = new Set(F.slice(0, 60).map((f) => f.id));

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

  function buildGrave(f, opts) {
    const o = opts || {};
    const color = (CAT_META[f.category] || {}).color || "#9aa2ad";
    const d = document.createElement("div");
    d.className = "grave" + (o.open ? " open" : "");
    d.style.setProperty("--gcat", color);
    d.dataset.graveId = f.id;
    d.innerHTML = `
      <div class="grave__head">
        <div class="grave__stone">
          <span class="grave__rip">R.I.P.</span>
          <span class="grave__emoji">${f.emoji}</span>
          <span class="grave__year">${esc(f.year)}</span>
        </div>
        <div class="grave__titles">
          <div class="grave__name">${esc(f.name)}</div>
          <div class="grave__epitaph">${esc(f.title)}</div>
          <div class="grave__meta">
            <span class="grave__loss">💸 ${esc(f.loss)}</span>
            <span class="grave__cat" translate="no">${(CAT_META[f.category] || {}).emoji || "💀"} ${esc(f.category)}</span>
            ${o.medal ? `<span class="grave__medal" translate="no">${o.medal} TOP BURN</span>` : ""}
            ${FRESH.has(f.id) ? `<span class="grave__fresh" translate="no">🩸 FRESH GRAVE</span>` : ""}
          </div>
        </div>
        <div class="grave__dig" aria-hidden="true"></div>
      </div>
      <div class="grave__body">
        <div class="grave__cause" translate="no">${causeOf(f)}</div>
        <div class="grave__section">
          <div class="grave__label grave__label--story">📜 WHAT HAPPENED</div>
          <p>${esc(f.story)}</p>
        </div>
        <div class="grave__section grave__section--mistake">
          <div class="grave__label grave__label--mistake">☠️ THE FATAL MISTAKE</div>
          <p>${esc(f.mistake)}</p>
        </div>
        <div class="grave__section grave__section--lesson">
          <div class="grave__label grave__label--lesson">🧠 THE LESSON (FREE FOR YOU)</div>
          <p>${esc(f.lesson)}</p>
        </div>
        ${f.book ? `
        <a class="grave__book" href="book.html?id=${f.book}">
          📕 THE ANTIDOTE — READ: <strong>${esc(f.bookTitle)}</strong> →
        </a>` : ""}
        <button class="grave__share" data-shareGrave="${f.id}" translate="no">🎴 SHARE THIS GRAVE</button>
      </div>`;
    d.querySelector(".grave__head").addEventListener("click", () => d.classList.toggle("open"));
    return d;
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

    updateFeed(results);
    grid.innerHTML = "";
    if (!results.length) {
      grid.innerHTML = `<div class="empty"><span>🪦</span>No corpses match.<br>The graveyard is big — try another word.</div>`;
      return;
    }

    const defaultView = !query && activeCat === "ALL" && sortMode === "default";
    const MEDALS = ["🥇", "🥈", "🥉"];
    results.forEach((f, i) => {
      const medal = sortMode === "burned" && i < 3 ? MEDALS[i] : "";
      const g = buildGrave(f, { open: defaultView && i === 0, medal });
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
})();
