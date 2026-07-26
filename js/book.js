/* ============================================================
   THESMALLBOOK — BOOK DETAIL PAGE
   Lessons, mark-as-read, HQ text-to-speech, share-card image
   generator, quote images, checkable plans, related books.
   ============================================================ */

(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const book = BOOKS.find((b) => b.id === id) || BOOKS[0];
  const idx = BOOKS.indexOf(book);

  document.title = `${book.title} — TheSmallBook`;
  TSB.achv.award("first-open");
  TSB.lastRead.set(book.id);

  /* ---------- HERO ---------- */
  document.getElementById("cover").src = book.cover;
  document.getElementById("cover").alt = `${book.title} cover`;
  document.getElementById("cat").textContent = book.category;
  document.getElementById("title").textContent = book.title;
  document.getElementById("author").textContent = `by ${book.author} · ${book.year}`;
  document.getElementById("oneliner").textContent = book.oneLiner;

  function drawBadges() {
    const read = TSB.progress.forBook(book.id).length;
    document.getElementById("badges").innerHTML = `
      <span class="badge badge--yellow">⏱ ${book.readTime} read</span>
      <span class="badge badge--green">${read}/${book.lessons.length} lessons read</span>
      <span class="badge badge--pink">${book.quotes.length} key quotes</span>`;
  }
  drawBadges();

  /* ---------- ACTION BAR ---------- */
  const bar = document.getElementById("actionbar");
  const fav = TSB.bookmarks.has(book.id);
  bar.innerHTML = `
    <button class="btn ${fav ? "btn--red" : ""}" id="favBtn">${fav ? "❤️ SAVED" : "🤍 SAVE"}</button>
    <button class="btn btn--blue" id="shareBtn">🎴 SHARE CARD</button>
    <button class="btn" id="expandBtn">⤵ EXPAND ALL</button>
    <button class="btn" id="fontBtn">🔠 TEXT SIZE</button>`;

  document.getElementById("favBtn").addEventListener("click", (e) => {
    const on = TSB.bookmarks.toggle(book.id);
    e.target.textContent = on ? "❤️ SAVED" : "🤍 SAVE";
    e.target.classList.toggle("btn--red", on);
  });

  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast"; t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* ============================================================
     SHARE CARD GENERATOR
     Renders a branded 1080x1350 neo-brutalist card (canvas),
     then shares it as an IMAGE via the native share sheet
     (WhatsApp/IG ready) — falls back to download.
     ============================================================ */
  const PALETTES = [
    { bg: "#ffc800", fg: "#111111" },
    { bg: "#ff90e8", fg: "#111111" },
    { bg: "#00c48c", fg: "#111111" },
    { bg: "#4d7cff", fg: "#ffffff" },
    { bg: "#ff8a3d", fg: "#111111" }
  ];

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    words.forEach((w) => {
      if (ctx.measureText((line + " " + w).trim()).width > maxWidth && line) {
        lines.push(line.trim()); line = w;
      } else line += " " + w;
    });
    if (line.trim()) lines.push(line.trim());
    return lines;
  }

  function drawDots(ctx, W, H) {
    ctx.fillStyle = "rgba(17,17,17,.08)";
    for (let x = 22; x < W; x += 46)
      for (let y = 22; y < H; y += 46) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
  }

  function drawBrandBar(ctx, W, H) {
    // black branding strip at the bottom
    const barH = 130;
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, H - barH, W, barH);
    ctx.fillStyle = "#ffc800";
    ctx.font = "900 46px 'Archivo Black', Arial";
    ctx.textAlign = "left";
    ctx.fillText("📕 THESMALLBOOK", 60, H - barH + 62);
    ctx.fillStyle = "#f2ede2";
    ctx.font = "bold 26px 'Space Grotesk', Arial";
    ctx.fillText("EVERY BOOK. EVERY LESSON. ZERO FLUFF.", 60, H - barH + 100);
    // yellow accent square
    ctx.fillStyle = "#ffc800";
    ctx.fillRect(W - 130, H - barH + 30, 70, 70);
    ctx.strokeStyle = "#f2ede2"; ctx.lineWidth = 5;
    ctx.strokeRect(W - 130, H - barH + 30, 70, 70);
    ctx.fillStyle = "#111";
    ctx.font = "900 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("✦", W - 95, H - barH + 80);
    ctx.textAlign = "left";
  }

  async function renderBookCard() {
    const W = 1080, H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const pal = PALETTES[idx % PALETTES.length];

    // background
    ctx.fillStyle = "#f2ede2";
    ctx.fillRect(0, 0, W, H);
    drawDots(ctx, W, H);

    // main tilted card
    ctx.save();
    ctx.translate(W / 2, 560);
    ctx.rotate(-0.015);
    const cw = W - 150, ch = 880;
    ctx.fillStyle = "#111";
    ctx.fillRect(-cw / 2 + 16, -ch / 2 + 16, cw, ch); // hard shadow
    ctx.fillStyle = pal.bg;
    ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.lineWidth = 9; ctx.strokeStyle = "#111";
    ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);
    ctx.restore();

    // cover image (tilted, bordered)
    const img = await loadImage(book.cover);
    const covW = 300, covH = 430;
    ctx.save();
    ctx.translate(W / 2, 330);
    ctx.rotate(0.035);
    ctx.fillStyle = "#111";
    ctx.fillRect(-covW / 2 + 12, -covH / 2 + 12, covW, covH);
    if (img) {
      ctx.drawImage(img, -covW / 2, -covH / 2, covW, covH);
    } else {
      ctx.fillStyle = "#fffdf5";
      ctx.fillRect(-covW / 2, -covH / 2, covW, covH);
      ctx.fillStyle = "#111"; ctx.font = "120px Arial"; ctx.textAlign = "center";
      ctx.fillText("📕", 0, 40);
    }
    ctx.lineWidth = 8; ctx.strokeStyle = "#111";
    ctx.strokeRect(-covW / 2, -covH / 2, covW, covH);
    ctx.restore();

    // title (max 2 lines, auto-shrink for long titles)
    ctx.fillStyle = pal.fg;
    ctx.textAlign = "center";
    let titleSize = book.title.length > 30 ? 50 : 64;
    ctx.font = `900 ${titleSize}px 'Archivo Black', Arial`;
    let titleLines = wrapText(ctx, book.title.toUpperCase(), W - 320);
    if (titleLines.length > 2) {
      titleSize = 42;
      ctx.font = `900 ${titleSize}px 'Archivo Black', Arial`;
      titleLines = wrapText(ctx, book.title.toUpperCase(), W - 300).slice(0, 3);
    }
    let y = 640;
    titleLines.forEach((ln) => { ctx.fillText(ln, W / 2, y); y += titleSize + 12; });

    // author
    ctx.font = "bold 32px 'Space Grotesk', Arial";
    ctx.fillText(("by " + book.author).toUpperCase(), W / 2, y + 4);
    y += 58;

    // one-liner (capped to remaining space above pills)
    ctx.font = "600 31px 'Space Grotesk', Arial";
    const olLines = wrapText(ctx, "\u201C" + book.oneLiner + "\u201D", W - 340);
    const pillY = 1035;
    const maxOl = Math.max(1, Math.floor((pillY - 40 - y) / 44));
    olLines.slice(0, maxOl).forEach((ln, i) => {
      const isLast = i === maxOl - 1 && olLines.length > maxOl;
      ctx.fillText(isLast ? ln + "..." : ln, W / 2, y);
      y += 44;
    });

    // stats pills
    y = pillY;
    const pills = [`⏱ ${book.readTime}`, `${book.lessons.length} LESSONS`, book.category.toUpperCase()];
    ctx.font = "bold 26px 'Space Grotesk', Arial";
    let totalW = 0;
    const padX = 26, gap = 18;
    const widths = pills.map((p) => ctx.measureText(p).width + padX * 2);
    totalW = widths.reduce((a, b) => a + b, 0) + gap * (pills.length - 1);
    let px = (W - totalW) / 2;
    pills.forEach((p, i) => {
      ctx.fillStyle = "#fffdf5";
      ctx.fillRect(px, y, widths[i], 54);
      ctx.strokeStyle = "#111"; ctx.lineWidth = 5;
      ctx.strokeRect(px, y, widths[i], 54);
      ctx.fillStyle = "#111";
      ctx.fillText(p, px + widths[i] / 2, y + 37);
      px += widths[i] + gap;
    });

    drawBrandBar(ctx, W, H);
    return canvas;
  }

  async function renderLessonCard(lessonIdx) {
    const l = book.lessons[lessonIdx];
    const W = 1080, H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const pal = PALETTES[lessonIdx % PALETTES.length];

    ctx.fillStyle = "#f2ede2";
    ctx.fillRect(0, 0, W, H);
    drawDots(ctx, W, H);

    // header tag
    ctx.fillStyle = "#111";
    ctx.fillRect(76, 86, 420, 60);
    ctx.fillStyle = "#ffc800";
    ctx.font = "900 30px 'Archivo Black', Arial";
    ctx.textAlign = "left";
    ctx.fillText("🧠 LESSON " + String(lessonIdx + 1).padStart(2, "0"), 96, 128);

    // main card
    const pad = 70, top = 180, ch = 950;
    ctx.fillStyle = "#111";
    ctx.fillRect(pad + 14, top + 14, W - pad * 2, ch);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(pad, top, W - pad * 2, ch);
    ctx.lineWidth = 9; ctx.strokeStyle = "#111";
    ctx.strokeRect(pad, top, W - pad * 2, ch);

    // lesson title
    ctx.fillStyle = pal.fg;
    ctx.font = "900 54px 'Archivo Black', Arial";
    let y = top + 110;
    wrapText(ctx, l.title.toUpperCase(), W - pad * 2 - 120).slice(0, 4).forEach((ln) => {
      ctx.fillText(ln, pad + 60, y); y += 64;
    });
    y += 8;

    // divider
    ctx.fillRect(pad + 60, y, W - pad * 2 - 120, 6);
    y += 60;

    // summary (trimmed)
    ctx.font = "600 31px 'Space Grotesk', Arial";
    let summary = l.summary;
    const sumLines = wrapText(ctx, summary, W - pad * 2 - 120);
    const maxLines = Math.floor((top + ch - 200 - y) / 44);
    sumLines.slice(0, maxLines).forEach((ln, i) => {
      const isLast = i === maxLines - 1 && sumLines.length > maxLines;
      ctx.fillText(isLast ? ln.replace(/.{3}$/, "...") : ln, pad + 60, y);
      y += 44;
    });

    // book attribution inside card
    y = top + ch - 90;
    ctx.font = "bold 28px 'Space Grotesk', Arial";
    ctx.fillText("— " + book.title.toUpperCase() + ", " + book.author, pad + 60, y);

    drawBrandBar(ctx, W, H);
    return canvas;
  }

  async function shareCanvas(canvas, filename, text) {
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) { toast("❌ Could not create image"); return; }
    const file = new File([blob], filename, { type: "image/png" });
    TSB.achv.award("sharer");
    // native share with the image itself (mobile share sheets)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "TheSmallBook", text });
        return;
      } catch (e) { /* user cancelled or unsupported — fall through */ }
    }
    // fallback: download the card
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("🎴 Share card downloaded — post it anywhere!");
  }

  document.getElementById("shareBtn").addEventListener("click", async () => {
    toast("🎨 Creating your share card...");
    const canvas = await renderBookCard();
    shareCanvas(canvas, `thesmallbook-${book.id}.png`,
      `📕 ${book.title} — every lesson summarized on TheSmallBook`);
  });

  /* ---------- FONT SIZE ---------- */
  let fontLevel = TSB.get("tsb_fontsize", 0);
  applyFont();
  document.getElementById("fontBtn").addEventListener("click", () => {
    fontLevel = (fontLevel + 1) % 3;
    TSB.set("tsb_fontsize", fontLevel);
    applyFont();
    toast(["🔠 Normal text", "🔠 Large text", "🔠 Extra large text"][fontLevel]);
  });
  function applyFont() {
    document.body.classList.remove("fontsize-1", "fontsize-2");
    if (fontLevel > 0) document.body.classList.add("fontsize-" + fontLevel);
  }

  /* ---------- BIG IDEA ---------- */
  document.getElementById("bigidea").textContent = book.bigIdea;

  /* ============================================================
     HIGH-QUALITY TEXT-TO-SPEECH
     - picks the best available natural voice
     - splits text into sentence chunks (no mid-text cutoffs)
     - keep-alive workaround for Chrome's 15s speech bug
     ============================================================ */
  let VOICES = [];
  function refreshVoices() { VOICES = speechSynthesis ? speechSynthesis.getVoices() : []; }
  if ("speechSynthesis" in window) {
    refreshVoices();
    speechSynthesis.onvoiceschanged = refreshVoices;
  }

  function bestVoice() {
    const en = VOICES.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
    if (!en.length) return null;
    // preference order: premium/natural cloud voices first
    const ranks = [
      (v) => /natural|neural|premium|enhanced/i.test(v.name) ? 0 : 99,
      (v) => /^Google (UK English Female|UK English Male|US English)/i.test(v.name) ? 1 : 99,
      (v) => /Microsoft (Aria|Jenny|Guy|Sonia|Ryan|Libby)/i.test(v.name) ? 2 : 99,
      (v) => /Samantha|Daniel|Karen|Moira|Tessa/i.test(v.name) ? 3 : 99,
      (v) => !v.localService ? 4 : 99,
      () => 5
    ];
    const score = (v) => Math.min(...ranks.map((r) => r(v)));
    return en.sort((a, b) => score(a) - score(b))[0];
  }

  function splitIntoChunks(text, maxLen = 220) {
    const sentences = text.match(/[^.!?]+[.!?]+["']?|\s*[^.!?]+$/g) || [text];
    const chunks = [];
    let cur = "";
    sentences.forEach((s) => {
      if ((cur + s).length > maxLen && cur) { chunks.push(cur.trim()); cur = s; }
      else cur += s;
    });
    if (cur.trim()) chunks.push(cur.trim());
    return chunks;
  }

  let speakingBtn = null;
  let speechQueue = [];
  let keepAlive = null;

  function stopSpeech() {
    speechQueue = [];
    if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
    speechSynthesis.cancel();
    if (speakingBtn) {
      speakingBtn.classList.remove("speaking");
      speakingBtn.textContent = "🔊 LISTEN";
      speakingBtn = null;
    }
  }

  function speakChunks(chunks, btn) {
    const voice = bestVoice();
    speechQueue = [...chunks];
    function next() {
      if (!speechQueue.length || speakingBtn !== btn) {
        if (speakingBtn === btn) stopSpeech();
        return;
      }
      const u = new SpeechSynthesisUtterance(speechQueue.shift());
      if (voice) u.voice = voice;
      u.rate = 0.97;    // slightly slower = clearer
      u.pitch = 1.0;
      u.volume = 1.0;
      u.onend = next;
      u.onerror = () => stopSpeech();
      speechSynthesis.speak(u);
    }
    // Chrome pauses long speech after ~15s — keep it alive
    keepAlive = setInterval(() => {
      if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        speechSynthesis.resume();
      }
    }, 10000);
    next();
  }

  /* ---------- LESSONS ---------- */
  const lessonsWrap = document.getElementById("lessons");
  const readSet = new Set(TSB.progress.forBook(book.id));

  book.lessons.forEach((l, i) => {
    const d = document.createElement("div");
    d.className = "lesson" + (i === 0 ? " open" : "");
    d.id = "lesson-" + i;
    d.innerHTML = `
      <div class="lesson__head">
        <div class="lesson__num">${readSet.has(i) ? "✓" : String(i + 1).padStart(2, "0")}</div>
        <div class="lesson__titlebox">
          <div class="lesson__title">${l.title}</div>
          <div class="lesson__chapter">${l.chapter}</div>
        </div>
        <div class="lesson__toggle">+</div>
      </div>
      <div class="lesson__body">
        <p>${l.summary}</p>
        <div class="callout callout--example"><strong class="tag">📖 Example from the book</strong><br>${l.example}</div>
        <div class="callout callout--action"><strong class="tag">⚡ Do this</strong><br>${l.action}</div>
        <div class="lesson__tools">
          <button class="minibtn ${readSet.has(i) ? "active" : ""}" data-read="${i}">${readSet.has(i) ? "✓ READ" : "MARK AS READ"}</button>
          <button class="minibtn" data-listen="${i}">🔊 LISTEN</button>
          <button class="minibtn" data-sharelesson="${i}">🎴 SHARE CARD</button>
        </div>
      </div>`;
    d.querySelector(".lesson__head").addEventListener("click", () => d.classList.toggle("open"));
    lessonsWrap.appendChild(d);
  });

  /* mark as read */
  lessonsWrap.querySelectorAll("[data-read]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = +btn.dataset.read;
      TSB.progress.markRead(book.id, i);
      btn.classList.add("active");
      btn.textContent = "✓ READ";
      document.querySelector(`#lesson-${i} .lesson__num`).textContent = "✓";
      drawBadges();
      if (TSB.progress.forBook(book.id).length >= book.lessons.length) {
        TSB.achv.award("book-complete");
        toast("🏆 Book complete! Amazing work.");
      }
    });
  });

  /* listen buttons */
  lessonsWrap.querySelectorAll("[data-listen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!("speechSynthesis" in window)) { toast("🔇 Speech not supported on this browser"); return; }
      if (speakingBtn === btn) { stopSpeech(); return; }
      stopSpeech();
      const l = book.lessons[+btn.dataset.listen];
      const text = `${l.title}. ${l.summary} Here's an example from the book. ${l.example} And here's what to do. ${l.action}`;
      speakingBtn = btn;
      btn.classList.add("speaking");
      btn.textContent = "⏹ STOP";
      speakChunks(splitIntoChunks(text), btn);
    });
  });
  window.addEventListener("beforeunload", () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); });

  /* share lesson as card */
  lessonsWrap.querySelectorAll("[data-sharelesson]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const i = +btn.dataset.sharelesson;
      toast("🎨 Creating your share card...");
      const canvas = await renderLessonCard(i);
      shareCanvas(canvas, `thesmallbook-${book.id}-lesson-${i + 1}.png`,
        `🧠 "${book.lessons[i].title}" — from ${book.title}, on TheSmallBook`);
    });
  });

  /* expand / collapse all */
  let expanded = false;
  document.getElementById("expandBtn").addEventListener("click", (e) => {
    expanded = !expanded;
    document.querySelectorAll(".lesson").forEach((l) => l.classList.toggle("open", expanded));
    e.target.textContent = expanded ? "⤴ COLLAPSE ALL" : "⤵ EXPAND ALL";
  });

  /* deep link */
  if (location.hash.startsWith("#lesson-")) {
    const n = +location.hash.slice(8);
    const target = document.getElementById("lesson-" + n);
    if (target) {
      target.classList.add("open");
      setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }

  /* ---------- QUOTES + IMAGE GENERATOR ---------- */
  const quotesWrap = document.getElementById("quotes");
  book.quotes.forEach((q, qidx) => {
    const d = document.createElement("div");
    d.className = "quote";
    d.textContent = q;
    const btn = document.createElement("button");
    btn.className = "quote__share";
    btn.title = "Share as image card";
    btn.textContent = "🎴";
    btn.addEventListener("click", async () => {
      toast("🎨 Creating your quote card...");
      const canvas = await renderQuoteCard(q, qidx);
      shareCanvas(canvas, `thesmallbook-${book.id}-quote-${qidx + 1}.png`,
        `💬 From ${book.title} — on TheSmallBook`);
    });
    d.appendChild(btn);
    quotesWrap.appendChild(d);
  });

  async function renderQuoteCard(quote, qidx) {
    const W = 1080, H = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const pal = PALETTES[qidx % PALETTES.length];

    ctx.fillStyle = "#f2ede2";
    ctx.fillRect(0, 0, W, H);
    drawDots(ctx, W, H);

    const pad = 90;
    ctx.fillStyle = "#111";
    ctx.fillRect(pad + 16, pad + 16, W - pad * 2, H - pad * 2 - 60);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(pad, pad, W - pad * 2, H - pad * 2 - 60);
    ctx.lineWidth = 9; ctx.strokeStyle = "#111";
    ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2 - 60);

    ctx.fillStyle = pal.fg;
    ctx.textAlign = "left";
    ctx.font = "900 170px Georgia";
    ctx.fillText("\u201C", pad + 50, pad + 200);

    ctx.font = "bold 52px 'Space Grotesk', Arial";
    const lines = wrapText(ctx, quote, W - pad * 2 - 140);
    const startY = (H - 60) / 2 - (lines.length * 66) / 2 + 60;
    lines.forEach((ln, i) => ctx.fillText(ln, pad + 70, startY + i * 66));

    ctx.fillRect(pad + 70, H - pad - 210, W - pad * 2 - 140, 5);
    ctx.font = "bold 33px 'Space Grotesk', Arial";
    ctx.fillText(`${book.title.toUpperCase()} — ${book.author.toUpperCase()}`, pad + 70, H - pad - 150);

    drawBrandBar(ctx, W, H);
    return canvas;
  }

  /* ---------- CHECKABLE ACTION PLAN ---------- */
  const planWrap = document.getElementById("plan");
  const doneSteps = new Set(TSB.plans.forBook(book.id));
  book.actionPlan.forEach((step, i) => {
    const li = document.createElement("li");
    li.textContent = step;
    li.className = "checkable" + (doneSteps.has(i) ? " done" : "");
    li.addEventListener("click", () => {
      const on = TSB.plans.toggle(book.id, i, book.actionPlan.length);
      li.classList.toggle("done", on);
    });
    planWrap.appendChild(li);
  });

  /* ---------- RELATED BOOKS ---------- */
  (function () {
    const wrap = document.getElementById("related");
    if (!wrap) return;
    const rel = BOOKS.filter((b) => b.id !== book.id && b.category === book.category).slice(0, 3);
    while (rel.length < 3) {
      const r = BOOKS[Math.floor(Math.random() * BOOKS.length)];
      if (r.id !== book.id && !rel.includes(r)) rel.push(r);
    }
    wrap.innerHTML = rel.map((r) => `
      <a href="book.html?id=${r.id}">
        <img src="${r.cover}" alt="${r.title}">
        <div><div class="t">${r.title}</div><div class="a">${r.author}</div></div>
      </a>`).join("");
  })();

  /* ---------- PREV / NEXT + SHORTCUTS ---------- */
  const prev = BOOKS[(idx - 1 + BOOKS.length) % BOOKS.length];
  const next = BOOKS[(idx + 1) % BOOKS.length];
  document.getElementById("prevBook").href = `book.html?id=${prev.id}`;
  document.getElementById("prevBook").innerHTML = `← ${prev.title}`;
  document.getElementById("nextBook").href = `book.html?id=${next.id}`;
  document.getElementById("nextBook").innerHTML = `${next.title} →`;

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "ArrowLeft") location.href = `book.html?id=${prev.id}`;
    if (e.key === "ArrowRight") location.href = `book.html?id=${next.id}`;
    if (e.key.toLowerCase() === "d") TSB.theme.toggle();
    if (e.key === "Escape") { stopSpeech(); document.querySelectorAll(".modal.open").forEach((m) => m.classList.remove("open")); }
  });

  /* ---------- SCROLL REVEAL ---------- */
  const targets = document.querySelectorAll(".lesson, .quote, .section-head, .plan__box, .bigidea__box, .related a");
  targets.forEach((t) => t.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.1 });
  targets.forEach((t) => io.observe(t));
})();
