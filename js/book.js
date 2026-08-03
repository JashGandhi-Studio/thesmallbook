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

  /* ---------- 📖 BUY THE FULL BOOK (Amazon affiliate) ---------- */
  (function () {
    const meta = document.querySelector(".bookhero__meta");
    if (!meta) return;
    const a = document.createElement("a");
    a.className = "buybtn buybtn--soft";
    a.href = TSB.amazonLink(book.title, book.author, book.id);
    a.target = "_blank";
    a.rel = "noopener sponsored";
    a.setAttribute("translate", "no");
    a.innerHTML = `📖 GET THE FULL BOOK <span class="buybtn__amz">on Amazon →</span>`;
    meta.appendChild(a);
  })();

  /* ---------- ACTION BAR ---------- */
  const bar = document.getElementById("actionbar");
  const fav = TSB.bookmarks.has(book.id);
  bar.innerHTML = `
    <button class="btn ${fav ? "btn--red" : ""}" id="favBtn">${fav ? "❤️ SAVED" : "🤍 SAVE"}</button>
    <button class="btn btn--blue" id="shareBtn">🎴 SHARE CARD</button>
    <button class="btn btn--green" id="shareLinkBtn" translate="no">🔗 SHARE LINK</button>
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
     SHARE CARD GENERATOR v2 — STORY FORMAT (1080×1920)
     • Uses the LIVE on-screen text — so cards come out in
       whatever language the reader is using (Hindi, Hinglish...)
     • WhatsApp-status / Instagram-story ready with full branding
     ============================================================ */
  const PALETTES = [
    /* solids */
    { bg: "#ffc800", fg: "#111111" },
    { bg: "#ff90e8", fg: "#111111" },
    { bg: "#00c48c", fg: "#111111" },
    { bg: "#4d7cff", fg: "#ffffff" },
    { bg: "#ff8a3d", fg: "#111111" },
    { bg: "#b28dff", fg: "#111111" },
    { bg: "#ff4d4d", fg: "#ffffff" },
    { bg: "#3ec9e6", fg: "#111111" },
    { bg: "#111111", fg: "#ffc800" },
    { bg: "#fffdf5", fg: "#111111" },
    /* gradient mixes */
    { bg: "#ffc800", bg2: "#ff8a3d", fg: "#111111" },   // sunset gold
    { bg: "#ff90e8", bg2: "#b28dff", fg: "#111111" },   // candy floss
    { bg: "#00c48c", bg2: "#3ec9e6", fg: "#111111" },   // mint ocean
    { bg: "#4d7cff", bg2: "#b28dff", fg: "#ffffff" },   // twilight
    { bg: "#ff4d4d", bg2: "#ff8a3d", fg: "#ffffff" },   // lava
    { bg: "#ff90e8", bg2: "#ffc800", fg: "#111111" },   // bubblegum sun
    { bg: "#3ec9e6", bg2: "#4d7cff", fg: "#ffffff" },   // deep sea
    { bg: "#111111", bg2: "#4a3800", fg: "#ffc800" },   // midnight gold
    { bg: "#1a0533", bg2: "#4d1a66", fg: "#ff90e8" },   // neon night
    { bg: "#00c48c", bg2: "#ffc800", fg: "#111111" }    // tropic punch
  ];

  /* paint a palette onto a canvas region (solid or diagonal gradient mix) */
  function paintPalette(ctx, pal, W, H) {
    if (pal.bg2) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, pal.bg);
      g.addColorStop(1, pal.bg2);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = pal.bg;
    }
    ctx.fillRect(0, 0, W, H);
  }

  /* --- live (translated) text helpers --- */
  function liveText(sel, fallback) {
    const el = typeof sel === "string" ? document.querySelector(sel) : sel;
    const t = el ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim() : "";
    return t || fallback || "";
  }
  function liveCallout(lessonIdx, cls) {
    const el = document.querySelector(`#lesson-${lessonIdx} .${cls}`);
    if (!el) return "";
    const clone = el.cloneNode(true);
    const tag = clone.querySelector("strong.tag");
    if (tag) tag.remove();
    return (clone.innerText || clone.textContent || "").replace(/\s+/g, " ").trim();
  }
  function liveLesson(i) {
    return {
      title: liveText(`#lesson-${i} .lesson__title`, book.lessons[i].title),
      chapter: liveText(`#lesson-${i} .lesson__chapter`, book.lessons[i].chapter),
      summary: liveText(`#lesson-${i} .lesson__body p`, book.lessons[i].summary),
      example: liveCallout(i, "callout--example") || book.lessons[i].example,
      action: liveCallout(i, "callout--action") || book.lessons[i].action
    };
  }
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      img.onload = () => finish(img);
      img.onerror = () => finish(null);
      // safety: never hang the card on a slow/stuck image
      setTimeout(() => finish(null), 2500);
      img.src = src;
    });
  }

  /* wrapText v2 — handles long words + scripts without spaces (中文, 日本語) */
  function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let line = "";
    const pushWord = (w) => {
      if (ctx.measureText((line + " " + w).trim()).width <= maxWidth) {
        line = (line + " " + w).trim();
        return;
      }
      if (line) { lines.push(line); line = ""; }
      if (ctx.measureText(w).width <= maxWidth) { line = w; return; }
      // word longer than the line (CJK / URLs): split by character
      let chunk = "";
      for (const ch of w) {
        if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
          lines.push(chunk); chunk = "";
        }
        chunk += ch;
      }
      line = chunk;
    };
    text.split(/\s+/).forEach(pushWord);
    if (line.trim()) lines.push(line.trim());
    return lines;
  }

  function drawDots(ctx, W, H) {
    ctx.fillStyle = "rgba(17,17,17,.08)";
    for (let x = 22; x < W; x += 46)
      for (let y = 22; y < H; y += 46) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
  }

  function drawBrandBar(ctx, W, H) {
    // black branding strip — clean, no URL (let them ask for the link 😉)
    const barH = 200;
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, H - barH, W, barH);
    // yellow top edge accent
    ctx.fillStyle = "#ffc800";
    ctx.fillRect(0, H - barH, W, 8);
    // centered branding — bigger and bolder now that it owns the space
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffc800";
    ctx.font = "900 60px 'Archivo Black', Arial";
    ctx.fillText("📕 THESMALLBOOK", W / 2, H - barH + 92);
    ctx.fillStyle = "#f2ede2";
    ctx.font = "bold 28px 'Space Grotesk', Arial";
    ctx.fillText("150+ BOOKS · 740+ LESSONS · FREE FOREVER", W / 2, H - barH + 140);
    ctx.textAlign = "left";
  }

  async function renderBookCard() {
    // STORY FORMAT: 1080×1920 — full-bleed for WhatsApp status / IG stories
    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const pal = PALETTES[idx % 8]; // bright solids for card fills

    // live (translated) content
    const tTitle = liveText("#title", book.title);
    const tAuthor = liveText("#author", "by " + book.author);
    const tOneliner = liveText("#oneliner", book.oneLiner);
    const tCategory = liveText("#cat", book.category);

    // background
    ctx.fillStyle = "#f2ede2";
    ctx.fillRect(0, 0, W, H);
    drawDots(ctx, W, H);

    // top ticker strip
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, 76);
    ctx.fillStyle = "#ffc800";
    ctx.font = "900 30px 'Archivo Black', Arial";
    ctx.textAlign = "center";
    ctx.fillText("✦ MUST-READ BREAKDOWN ✦", W / 2, 50);

    // category pill
    ctx.font = "bold 26px 'Space Grotesk', Arial";
    const catW = ctx.measureText(tCategory.toUpperCase()).width + 56;
    ctx.fillStyle = "#111";
    ctx.fillRect((W - catW) / 2, 120, catW, 54);
    ctx.fillStyle = "#f2ede2";
    ctx.fillText(tCategory.toUpperCase(), W / 2, 156);

    // big tilted color card
    ctx.save();
    ctx.translate(W / 2, 900);
    ctx.rotate(-0.012);
    const cw = W - 130, ch = 1280;
    ctx.fillStyle = "#111";
    ctx.fillRect(-cw / 2 + 18, -ch / 2 + 18, cw, ch);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.lineWidth = 10; ctx.strokeStyle = "#111";
    ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);
    ctx.restore();

    // cover image — large, centered
    const img = await loadImage(book.cover);
    const covW = 380, covH = 545;
    ctx.save();
    ctx.translate(W / 2, 520);
    ctx.rotate(0.03);
    ctx.fillStyle = "#111";
    ctx.fillRect(-covW / 2 + 14, -covH / 2 + 14, covW, covH);
    if (img) {
      ctx.drawImage(img, -covW / 2, -covH / 2, covW, covH);
    } else {
      ctx.fillStyle = "#fffdf5";
      ctx.fillRect(-covW / 2, -covH / 2, covW, covH);
      ctx.fillStyle = "#111"; ctx.font = "140px Arial"; ctx.textAlign = "center";
      ctx.fillText("📕", 0, 50);
    }
    ctx.lineWidth = 9; ctx.strokeStyle = "#111";
    ctx.strokeRect(-covW / 2, -covH / 2, covW, covH);
    ctx.restore();

    // title (auto-shrink)
    ctx.fillStyle = pal.fg;
    ctx.textAlign = "center";
    let titleSize = tTitle.length > 30 ? 58 : 72;
    ctx.font = `900 ${titleSize}px 'Archivo Black', Arial`;
    let titleLines = wrapText(ctx, tTitle.toUpperCase(), W - 300);
    if (titleLines.length > 2) {
      titleSize = 48;
      ctx.font = `900 ${titleSize}px 'Archivo Black', Arial`;
      titleLines = wrapText(ctx, tTitle.toUpperCase(), W - 280).slice(0, 3);
    }
    let y = 900;
    titleLines.forEach((ln) => { ctx.fillText(ln, W / 2, y); y += titleSize + 14; });

    // author
    ctx.font = "bold 34px 'Space Grotesk', Arial";
    ctx.fillText(tAuthor.toUpperCase(), W / 2, y + 8);
    y += 76;

    // divider
    ctx.fillRect(W / 2 - 90, y - 20, 180, 6);
    y += 36;

    // one-liner — big and readable
    ctx.font = "600 38px 'Space Grotesk', Arial";
    const olLines = wrapText(ctx, "\u201C" + tOneliner + "\u201D", W - 300);
    const pillY = 1460;
    const maxOl = Math.max(1, Math.floor((pillY - 50 - y) / 54));
    olLines.slice(0, maxOl).forEach((ln, i) => {
      const isLast = i === maxOl - 1 && olLines.length > maxOl;
      ctx.fillText(isLast ? ln + "..." : ln, W / 2, y);
      y += 54;
    });

    // stats pills
    y = pillY;
    const pills = [`⏱ ${book.readTime}`, `${book.lessons.length} LESSONS`];
    ctx.font = "bold 30px 'Space Grotesk', Arial";
    const padX = 30, gap = 20;
    const widths = pills.map((p) => ctx.measureText(p).width + padX * 2);
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (pills.length - 1);
    let px = (W - totalW) / 2;
    pills.forEach((p, i) => {
      ctx.fillStyle = "#fffdf5";
      ctx.fillRect(px, y, widths[i], 62);
      ctx.strokeStyle = "#111"; ctx.lineWidth = 5;
      ctx.strokeRect(px, y, widths[i], 62);
      ctx.fillStyle = "#111";
      ctx.fillText(p, px + widths[i] / 2, y + 42);
      px += widths[i] + gap;
    });

    // call to action
    ctx.fillStyle = "#111";
    ctx.font = "bold 30px 'Space Grotesk', Arial";
    ctx.fillText("📖 READ THE FULL BREAKDOWN — FREE", W / 2, 1620);

    drawBrandBar(ctx, W, H);
    return canvas;
  }

  async function renderLessonCard(lessonIdx) {
    // STORY FORMAT: 1080×1920 — live translated lesson content
    const l = liveLesson(lessonIdx);
    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const pal = PALETTES[lessonIdx % 8]; // bright solids for card fills
    const tTitle = liveText("#title", book.title);

    ctx.fillStyle = "#f2ede2";
    ctx.fillRect(0, 0, W, H);
    drawDots(ctx, W, H);

    // header tag
    ctx.textAlign = "left";
    ctx.fillStyle = "#111";
    ctx.fillRect(70, 70, 460, 70);
    ctx.fillStyle = "#ffc800";
    ctx.font = "900 34px 'Archivo Black', Arial";
    ctx.fillText("🧠 LESSON " + String(lessonIdx + 1).padStart(2, "0"), 92, 118);

    // small tilted book cover top-right — instant brand recognition
    const covImg = await loadImage(book.cover);
    ctx.save();
    ctx.translate(W - 165, 125);
    ctx.rotate(0.05);
    const cvW = 130, cvH = 180;
    ctx.fillStyle = "#111";
    ctx.fillRect(-cvW / 2 + 8, -cvH / 2 + 8, cvW, cvH);
    if (covImg) {
      ctx.drawImage(covImg, -cvW / 2, -cvH / 2, cvW, cvH);
    } else {
      ctx.fillStyle = "#fffdf5";
      ctx.fillRect(-cvW / 2, -cvH / 2, cvW, cvH);
      ctx.fillStyle = "#111"; ctx.font = "60px Arial"; ctx.textAlign = "center";
      ctx.fillText("📕", 0, 20);
      ctx.textAlign = "left";
    }
    ctx.lineWidth = 6; ctx.strokeStyle = "#111";
    ctx.strokeRect(-cvW / 2, -cvH / 2, cvW, cvH);
    ctx.restore();
    ctx.textAlign = "left";

    // main card
    const pad = 60, top = 190, chH = 1450;
    ctx.fillStyle = "#111";
    ctx.fillRect(pad + 16, top + 16, W - pad * 2, chH);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(pad, top, W - pad * 2, chH);
    ctx.lineWidth = 10; ctx.strokeStyle = "#111";
    ctx.strokeRect(pad, top, W - pad * 2, chH);

    const inner = W - pad * 2 - 120;
    let y = top + 110;

    // lesson title
    ctx.fillStyle = pal.fg;
    let tSize = l.title.length > 60 ? 46 : 56;
    ctx.font = `900 ${tSize}px 'Archivo Black', Arial`;
    wrapText(ctx, l.title.toUpperCase(), inner).slice(0, 4).forEach((ln) => {
      ctx.fillText(ln, pad + 60, y); y += tSize + 12;
    });
    y += 10;

    // divider
    ctx.fillRect(pad + 60, y, inner, 6);
    y += 64;

    // summary — bigger text, more of it
    ctx.font = "600 34px 'Space Grotesk', Arial";
    const actionZone = 300; // reserved for the DO THIS box
    const sumLines = wrapText(ctx, l.summary, inner);
    const maxLines = Math.floor((top + chH - actionZone - y) / 50);
    sumLines.slice(0, maxLines).forEach((ln, i) => {
      const isLast = i === maxLines - 1 && sumLines.length > maxLines;
      ctx.fillText(isLast ? ln + "..." : ln, pad + 60, y);
      y += 50;
    });

    // DO THIS box (live translated action)
    const boxY = top + chH - 250;
    ctx.fillStyle = "#111";
    ctx.fillRect(pad + 46, boxY - 8, inner + 28, 200);
    ctx.fillStyle = "#fffdf5";
    ctx.fillRect(pad + 38, boxY - 16, inner + 28, 200);
    ctx.lineWidth = 5; ctx.strokeStyle = "#111";
    ctx.strokeRect(pad + 38, boxY - 16, inner + 28, 200);
    ctx.fillStyle = "#111";
    ctx.font = "900 26px 'Archivo Black', Arial";
    const doLabel = liveText(`#lesson-${lessonIdx} .callout--action strong.tag`, "DO THIS").replace(/[⚡]/g, "").trim().toUpperCase() || "DO THIS";
    ctx.fillText("⚡ " + doLabel, pad + 66, boxY + 24);
    ctx.font = "600 28px 'Space Grotesk', Arial";
    wrapText(ctx, l.action, inner - 30).slice(0, 3).forEach((ln, i) => {
      ctx.fillText(ln, pad + 66, boxY + 68 + i * 40);
    });

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

  /* 🔗 share the page LINK (WhatsApp-friendly — brings traffic, not just brand) */
  document.getElementById("shareLinkBtn").addEventListener("click", async () => {
    const url = location.origin + location.pathname + "?id=" + book.id;
    const text = `📕 ${book.title} — ${book.oneLiner}\n\nFree breakdown (${book.lessons.length} lessons, ${book.readTime}):`;
    if (navigator.share) {
      try { await navigator.share({ title: `${book.title} — TheSmallBook`, text, url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(text + "\n" + url);
      toast("🔗 Link copied — paste it anywhere!");
    } catch (e) {
      // last-resort fallback
      const ta = document.createElement("textarea");
      ta.value = text + "\n" + url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast("🔗 Link copied — paste it anywhere!"); }
      catch (err) { toast("Copy failed — long-press the URL bar instead"); }
      ta.remove();
    }
    if (window.TSB) TSB.achv.award("sharer");
  });

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
     HIGH-QUALITY TEXT-TO-SPEECH v2 — LANGUAGE AWARE
     • Speaks the LIVE on-screen text (translated if translated)
     • Picks the best voice FOR THAT LANGUAGE (Hindi voice for
       Hindi, Gujarati for Gujarati, etc.)
     • Hinglish/Gujlish are Roman script — but they're Hindi/
       Gujarati WORDS, so we speak the original script via the
       matching Indian voice for natural pronunciation.
     ============================================================ */
  let VOICES = [];
  function refreshVoices() { VOICES = speechSynthesis ? speechSynthesis.getVoices() : []; }
  if ("speechSynthesis" in window) {
    refreshVoices();
    speechSynthesis.onvoiceschanged = refreshVoices;
  }

  /* Android/Chrome often return an EMPTY voice list at first — poll until ready */
  function voicesReady(timeoutMs = 2500) {
    return new Promise((resolve) => {
      refreshVoices();
      if (VOICES.length) return resolve(VOICES);
      const start = Date.now();
      const t = setInterval(() => {
        refreshVoices();
        if (VOICES.length || Date.now() - start > timeoutMs) {
          clearInterval(t);
          resolve(VOICES);
        }
      }, 150);
    });
  }

  /* Android reports "hi_IN", desktop "hi-IN" — normalize both */
  function normLang(l) { return String(l || "").toLowerCase().replace(/_/g, "-"); }
  function baseLang(l) { return normLang(l).split("-")[0]; }

  /* full regional tags help the OS engine pick the right voice even
     when the voices list is empty (Android Google TTS) */
  const SPEECH_REGION = {
    hi: "hi-IN", gu: "gu-IN", mr: "mr-IN", ta: "ta-IN", te: "te-IN",
    kn: "kn-IN", ml: "ml-IN", bn: "bn-IN", pa: "pa-IN", ur: "ur-IN", or: "or-IN",
    en: "en-IN", es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-BR",
    ar: "ar-SA", ja: "ja-JP", ko: "ko-KR", ru: "ru-RU", it: "it-IT", "zh-cn": "zh-CN"
  };
  function regionTag(lang) {
    const n = normLang(lang);
    return SPEECH_REGION[n] || SPEECH_REGION[baseLang(n)] || lang;
  }

  /* current reading language: what's actually on screen */
  function currentSpeechLang() {
    const saved = (window.TSB_LANG && TSB_LANG.get()) || "en";
    if (saved === "en") return "en";
    if (saved === "hi-Latn") return "hi";  // Hinglish = Hindi words
    if (saved === "gu-Latn") return "gu";  // Gujlish = Gujarati words
    return saved; // hi, gu, mr, ta, es, fr ... (zh-CN handled below)
  }

  function bestVoice(langCode) {
    const want = normLang(regionTag(langCode));      // e.g. "hi-in"
    const wantBase = baseLang(langCode);             // e.g. "hi"
    // exact region match first (hi-IN / hi_IN), then any dialect of the language
    let pool = VOICES.filter((v) => normLang(v.lang) === want);
    if (!pool.length) pool = VOICES.filter((v) => baseLang(v.lang) === wantBase);
    // IMPORTANT: no cross-language fallback — an English voice reading Hindi
    // text is what made TTS feel "English-only". Return null instead: the
    // utterance keeps voice unset + lang="hi-IN", and the OS engine
    // (Google TTS on Android) speaks it natively even with an empty list.
    if (!pool.length) return null;
    const ranks = [
      (v) => /natural|neural|premium|enhanced|wavenet/i.test(v.name) ? 0 : 99,
      (v) => /^Google/i.test(v.name) ? 1 : 99,
      (v) => /^Microsoft/i.test(v.name) ? 2 : 99,
      (v) => !v.localService ? 3 : 99,
      () => 4
    ];
    const score = (v) => Math.min(...ranks.map((r) => r(v)));
    return pool.sort((a, b) => score(a) - score(b))[0];
  }

  /* punctuation set covers Devanagari danda + CJK stops */
  function splitIntoChunks(text, maxLen = 160) {
    const sentences = text.match(/[^.!?।॥。！？]+[.!?।॥。！？]+["']?|\s*[^.!?।॥。！？]+$/g) || [text];
    const chunks = [];
    let cur = "";
    sentences.forEach((s) => {
      if ((cur + s).length > maxLen && cur) { chunks.push(cur.trim()); cur = s; }
      else cur += s;
    });
    if (cur.trim()) chunks.push(cur.trim());
    return chunks.filter(Boolean);
  }

  let speakingBtn = null;
  let speechQueue = [];
  let keepAlive = null;

  function stopSpeech() {
    speechQueue = [];
    currentUtterance = null;
    if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
    speechSynthesis.cancel();
    if (speakingBtn) {
      speakingBtn.classList.remove("speaking");
      speakingBtn.textContent = "🔊 LISTEN";
      speakingBtn = null;
    }
  }

  /* TTS v3 — fixes abrupt stops:
     1. utterance kept in a live reference (Chrome GC used to kill speech mid-sentence)
     2. spurious "interrupted/canceled" errors no longer kill the queue
     3. real errors SKIP to the next chunk instead of stopping everything
     4. pause/resume keep-alive only on desktop Chrome (it BREAKS Android TTS)
     5. tiny gap between chunks avoids Chrome's speak-after-end race
     6. watchdog restarts the queue if the engine silently dies */
  let currentUtterance = null; // MUST stay referenced or Chrome garbage-collects mid-speech

  async function speakChunks(chunks, btn) {
    const lang = currentSpeechLang();
    await voicesReady();                 // Android: voice list loads late — wait for it
    const voice = bestVoice(lang);
    const tag = regionTag(lang);         // "hi" → "hi-IN" etc.
    if (lang !== "en" && !voice && VOICES.length) {
      // voices exist but none for this language — engine will still try via lang tag
      toast("🔊 " + tag + " voice not installed — asking device engine directly");
    }
    speechQueue = [...chunks];
    const isAndroid = /android/i.test(navigator.userAgent);
    const isDesktopChrome = /chrome/i.test(navigator.userAgent) && !isAndroid && !/edge|edg\//i.test(navigator.userAgent);
    let chunkStarted = 0;

    function next() {
      if (speakingBtn !== btn) return;               // user pressed stop / another button
      if (!speechQueue.length) { stopSpeech(); return; } // finished naturally
      try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {}
      const u = new SpeechSynthesisUtterance(speechQueue.shift());
      currentUtterance = u;                          // hold the reference (fix #1)
      if (voice) u.voice = voice;
      // Always set the full regional tag ("hi-IN", "gu-IN"): with no matching
      // voice object, Android/desktop engines still switch language from this.
      u.lang = voice ? voice.lang : tag;
      u.rate = 0.95;
      u.pitch = 1.0;
      u.volume = 1.0;
      u.onstart = () => { chunkStarted = Date.now(); };
      u.onend = () => { currentUtterance = null; setTimeout(next, 60); };  // fix #5
      u.onerror = (e) => {                           // fix #2 + #3
        currentUtterance = null;
        const err = e && e.error;
        if (err === "interrupted" || err === "canceled") return; // stop was intentional
        setTimeout(next, 120);                       // skip bad chunk, keep reading
      };
      speechSynthesis.speak(u);
    }

    /* fix #4: Chrome desktop 15s cutoff needs pause/resume; Android dies from it */
    if (keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
      if (speakingBtn !== btn) return;
      if (isDesktopChrome && speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        speechSynthesis.resume();
      }
      /* fix #6: watchdog — engine silently dead but queue not finished? restart */
      if (!speechSynthesis.speaking && !speechSynthesis.pending && speechQueue.length &&
          Date.now() - chunkStarted > 3000) {
        next();
      }
    }, 5000);
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
        showCompleteCelebration();
      }
    });
  });

  /* ---------- 🏆 BOOK COMPLETE CELEBRATION ---------- */
  function showCompleteCelebration() {
    if (document.getElementById("completeModal")) return;
    const ov = document.createElement("div");
    ov.className = "modal open";
    ov.id = "completeModal";
    ov.innerHTML = `
      <div class="modal__box celebmodal">
        <div class="celebmodal__emoji">🏆</div>
        <h3>BOOK COMPLETE!</h3>
        <p class="celebmodal__sub">You just absorbed <strong>${book.lessons.length} lessons</strong> from
        <strong>${book.title}</strong> — most people never finish the book. You finished the wisdom.</p>
        <a class="buybtn celebmodal__buy" href="${TSB.amazonLink(book.title, book.author, book.id)}" target="_blank" rel="noopener sponsored" translate="no">
          📖 OWN THE FULL BOOK <span class="buybtn__amz">it goes 10x deeper →</span>
        </a>
        <div class="celebmodal__row">
          <button class="btn" id="celebShare">🎴 SHARE THE WIN</button>
          <button class="btn btn--ink" id="celebClose">KEEP READING</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    // mini confetti
    try {
      for (let i = 0; i < 24; i++) {
        const c = document.createElement("span");
        c.className = "confetti";
        c.textContent = ["🎉","✨","📕","🏆"][i % 4];
        c.style.left = Math.random() * 100 + "vw";
        c.style.animationDelay = (Math.random() * 0.7) + "s";
        c.style.fontSize = (14 + Math.random() * 18) + "px";
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 3200);
      }
    } catch (e) {}
    ov.querySelector("#celebClose").addEventListener("click", () => ov.remove());
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); });
    const shareBtn = ov.querySelector("#celebShare");
    if (shareBtn) shareBtn.addEventListener("click", () => {
      ov.remove();
      const sb = document.getElementById("shareBtn");
      if (sb) sb.click();
    });
  }

  /* ---------- 📊 READING PROGRESS BAR ---------- */
  (function () {
    const bar = document.createElement("div");
    bar.className = "readbar";
    bar.innerHTML = `<span class="readbar__fill"></span>`;
    document.body.appendChild(bar);
    const fill = bar.querySelector(".readbar__fill");
    let ticking = false;
    function update() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      fill.style.width = pct + "%";
      bar.classList.toggle("show", window.scrollY > 120);
    }
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    }, { passive: true });
    update();
  })();

  /* ---------- 📑 STICKY LESSON JUMP-NAV ---------- */
  (function () {
    if (!book.lessons.length) return;
    const fab = document.createElement("button");
    fab.className = "lessonnav__fab";
    fab.setAttribute("aria-label", "Jump to lesson");
    fab.setAttribute("translate", "no");
    fab.innerHTML = `📑 <span class="lessonnav__count">1/${book.lessons.length}</span>`;
    const panel = document.createElement("div");
    panel.className = "lessonnav__panel";
    panel.innerHTML = book.lessons.map((l, i) =>
      `<a class="lessonnav__item" href="#lesson-${i}" data-jump="${i}">
        <span class="lessonnav__num">${String(i + 1).padStart(2, "0")}</span>
        <span class="lessonnav__title">${l.title}</span>
        <span class="lessonnav__check" data-navcheck="${i}">${TSB.progress.forBook(book.id).includes(i) ? "✓" : ""}</span>
      </a>`).join("") +
      `<a class="lessonnav__item lessonnav__item--plan" href="#plan-section" data-jump="plan">
        <span class="lessonnav__num">⚡</span><span class="lessonnav__title">Action Plan</span><span></span>
      </a>`;
    document.body.appendChild(fab);
    document.body.appendChild(panel);

    fab.addEventListener("click", () => {
      panel.classList.toggle("open");
      fab.classList.toggle("open");
    });
    panel.addEventListener("click", (e) => {
      const item = e.target.closest("[data-jump]");
      if (!item) return;
      e.preventDefault();
      panel.classList.remove("open");
      fab.classList.remove("open");
      const target = item.dataset.jump === "plan"
        ? document.getElementById("plan")
        : document.getElementById("lesson-" + item.dataset.jump);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        if (item.dataset.jump !== "plan") {
          const card = document.getElementById("lesson-" + item.dataset.jump);
          if (card && !card.classList.contains("open")) {
            const head = card.querySelector(".lesson__head");
            if (head) head.click();
          }
        }
      }
    });
    // close when clicking outside
    document.addEventListener("click", (e) => {
      if (!panel.contains(e.target) && !fab.contains(e.target)) {
        panel.classList.remove("open");
        fab.classList.remove("open");
      }
    });
    // show fab only after scrolling past the hero; track current lesson
    const counter = fab.querySelector(".lessonnav__count");
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const past = window.scrollY > 420;
        fab.classList.toggle("show", past);
        if (!past) return;
        let cur = 0;
        for (let i = 0; i < book.lessons.length; i++) {
          const el = document.getElementById("lesson-" + i);
          if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = i;
        }
        counter.textContent = (cur + 1) + "/" + book.lessons.length;
      });
    }, { passive: true });

    // deep-link support: book.html?id=x#lesson-N opens + scrolls to that lesson
    if (location.hash && location.hash.startsWith("#lesson-")) {
      const n = parseInt(location.hash.slice(8), 10);
      const card = document.getElementById("lesson-" + n);
      if (card) setTimeout(() => {
        const head = card.querySelector(".lesson__head");
        if (head && !card.classList.contains("open")) head.click();
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  })();

  /* listen buttons — speak the LIVE (translated) lesson text */
  lessonsWrap.querySelectorAll("[data-listen]").forEach((btn) => {
    btn.setAttribute("translate", "no");
    btn.addEventListener("click", () => {
      if (!("speechSynthesis" in window)) { toast("🔇 Speech not supported on this browser"); return; }
      if (speakingBtn === btn) { stopSpeech(); return; }
      stopSpeech();
      const i = +btn.dataset.listen;
      const l = liveLesson(i); // live = translated when page is translated
      const text = `${l.title}. ${l.summary} ${l.example} ${l.action}`;
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
  const quoteSpins = {};
  book.quotes.forEach((q, qidx) => {
    const d = document.createElement("div");
    d.className = "quote";
    d.textContent = q;
    const btn = document.createElement("button");
    btn.className = "quote__share";
    btn.title = "Share as image card";
    btn.textContent = "🎴";
    btn.setAttribute("translate", "no");
    btn.addEventListener("click", async () => {
      toast("🎨 Creating your quote card...");
      // LIVE text — translated if the page is translated
      const liveQ = liveText(d, q).replace(/🎴/g, "").trim();
      // fresh palette each tap: same quote cycles through all 20 looks
      const spin = (quoteSpins[qidx] = (quoteSpins[qidx] || 0) + 1);
      const palIdx = (qidx + spin * 7) % PALETTES.length;
      const canvas = await renderQuoteCard(liveQ, palIdx);
      shareCanvas(canvas, `thesmallbook-${book.id}-quote-${qidx + 1}.png`,
        `💬 From ${liveText("#title", book.title)} — on TheSmallBook`);
    });
    d.appendChild(btn);
    quotesWrap.appendChild(d);
  });


  async function renderQuoteCard(quote, qidx) {
    // STORY FORMAT: 1080×1920 — full-bleed quote for status/stories
    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const pal = PALETTES[qidx % PALETTES.length];
    const tTitle = liveText("#title", book.title);

    // full-color background for maximum status impact (solid or gradient mix)
    paintPalette(ctx, pal, W, H);
    // subtle dots in the fg color (works for any palette)
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = pal.fg;
    for (let x = 22; x < W; x += 46)
      for (let y = 22; y < H; y += 46) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
    ctx.restore();

    // top strip
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, 76);
    ctx.fillStyle = "#ffc800";
    ctx.font = "900 30px 'Archivo Black', Arial";
    ctx.textAlign = "center";
    ctx.fillText("✦ WORDS THAT HIT ✦", W / 2, 50);
    ctx.textAlign = "left";

    // giant quote mark
    ctx.fillStyle = pal.fg;
    ctx.font = "900 300px Georgia";
    ctx.fillText("\u201C", 80, 460);

    // quote text — auto-size: bigger for short quotes
    let qSize = quote.length < 90 ? 72 : quote.length < 180 ? 58 : 46;
    ctx.font = `bold ${qSize}px 'Space Grotesk', Arial`;
    let lines = wrapText(ctx, quote, W - 220);
    // shrink if overflowing the space
    while (lines.length * (qSize + 16) > 900 && qSize > 34) {
      qSize -= 6;
      ctx.font = `bold ${qSize}px 'Space Grotesk', Arial`;
      lines = wrapText(ctx, quote, W - 220);
    }
    const blockH = lines.length * (qSize + 16);
    let y = 520 + Math.max(0, (900 - blockH) / 2);
    lines.forEach((ln) => { ctx.fillText(ln, 110, y); y += qSize + 16; });

    // attribution box
    y = Math.min(y + 60, 1580);
    ctx.fillStyle = "#111";
    ctx.fillRect(110, y - 8, W - 220, 110);
    ctx.fillStyle = "#fffdf5";
    ctx.fillRect(98, y - 20, W - 220, 110);
    ctx.lineWidth = 5; ctx.strokeStyle = "#111";
    ctx.strokeRect(98, y - 20, W - 220, 110);
    ctx.fillStyle = "#111";
    ctx.font = "900 30px 'Archivo Black', Arial";
    const attr = wrapText(ctx, tTitle.toUpperCase(), W - 300)[0] || "";
    ctx.fillText(attr, 126, y + 22);
    ctx.font = "bold 26px 'Space Grotesk', Arial";
    ctx.fillText("— " + book.author.toUpperCase(), 126, y + 62);

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

  /* buy nudge under the action plan */
  (function () {
    const wrap = document.getElementById("plan");
    if (!wrap || !wrap.parentElement) return;
    const box = document.createElement("a");
    box.className = "buynudge";
    box.href = TSB.amazonLink(book.title, book.author, book.id);
    box.target = "_blank";
    box.rel = "noopener sponsored";
    box.innerHTML = `<strong>Loved the lessons?</strong> The full book goes 10x deeper — <span>own it on Amazon 📖</span>`;
    wrap.parentElement.appendChild(box);
  })();

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
